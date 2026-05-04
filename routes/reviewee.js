const express  = require('express');
const bcrypt    = require('bcrypt');
const requireAuth              = require('../middleware/requireAuth');
const requireReviewee          = require('../middleware/requireReviewee');
const requireOnboarded         = require('../middleware/requireOnboarded');
const requireEnrolled          = require('../middleware/requireEnrolled');
const requireDiagnosticComplete = require('../middleware/requireDiagnosticComplete');
const db = require('../config/db');
const profileFormSurvey = require('../lib/profileFormSurvey');

const router = express.Router();

// Shorthand guard chains (Blueprint §12.2)
const authReviewee         = [requireAuth, requireReviewee];
const authOnboarded        = [requireAuth, requireReviewee, requireOnboarded];
const authEnrolled         = [requireAuth, requireReviewee, requireOnboarded, requireEnrolled];
const authDiagDone         = [requireAuth, requireReviewee, requireOnboarded, requireEnrolled, requireDiagnosticComplete];

/* ── helpers ──────────────────────────────────────────────── */
const DOMAIN_COLORS = {
  'Verbal Ability':      '#818cf8',
  'Numerical Ability':   '#ff9933',
  'Analytical Ability':  '#2dd4bf',
  'Clerical Ability':    '#f472b6',
  'General Information': '#60a5fa',
};

function parseJson(val, fallback) {
  if (!val) return fallback;
  if (typeof val === 'object') return val;
  try { return JSON.parse(val); } catch { return fallback; }
}

function formatMaterialType(dbType) {
  const typeMap = {
    'lesson_module': 'Lesson Module',
    'practice_set': 'Practice Set',
    'mock_exam': 'Mock Exam',
    'reference_sheet': 'Reference Sheet'
  };
  return typeMap[dbType] || 'Material';
}

function formatMaterialDifficulty(dbVal) {
  const m = { basic: 'Basic', intermediate: 'Intermediate', advanced: 'Advanced' };
  if (!dbVal) return 'Intermediate';
  const k = String(dbVal).toLowerCase();
  return m[k] || dbVal;
}

async function getProgRow(userId) {
  try {
    const [ratings] = await db.query(
      `SELECT dr.theta, d.name AS domainName 
       FROM domain_ratings dr 
       JOIN domains d ON dr.domain_id = d.id 
       WHERE dr.user_id = ?`,
      [userId]
    );

    const [userRows] = await db.query('SELECT streak FROM users WHERE id = ?', [userId]);
    const streak = userRows.length ? userRows[0].streak : 0;

    const [profileRows] = await db.query('SELECT completed_at FROM learner_profiles WHERE user_id = ?', [userId]);
    const onboardedAt = profileRows.length ? profileRows[0].completed_at : null;

    const [diagRows] = await db.query(
      'SELECT completed_at, correct_count, total_questions FROM diagnostic_sessions WHERE user_id = ? AND status = "completed" LIMIT 1',
      [userId]
    );

    const [practiceRows] = await db.query(
      `SELECT ps.id, ps.started_at as startedAt, ps.completed_at as endedAt,
              ps.total_questions as questionCount, ps.correct_count, ps.time_taken_s as timeTakenS,
              ps.mode,
              GROUP_CONCAT(DISTINCT d.name ORDER BY d.name SEPARATOR ', ') as domainNames
       FROM practice_sessions ps
       LEFT JOIN session_answers sa ON ps.id = sa.session_id
       LEFT JOIN questions q ON sa.question_id = q.id
       LEFT JOIN question_domains qd ON q.id = qd.question_id
       LEFT JOIN domains d ON qd.domain_id = d.id
       WHERE ps.user_id = ? AND ps.status = 'completed'
       GROUP BY ps.id
       ORDER BY ps.started_at DESC`,
      [userId]
    );

    const quizHistory = practiceRows.map(r => ({
      id: r.id,
      startedAt: r.startedAt,
      endedAt: r.endedAt,
      questionCount: r.questionCount,
      score: r.questionCount > 0 ? Math.round((r.correct_count / r.questionCount) * 100) : 0,
      domains: r.domainNames ? r.domainNames.split(', ') : ['All Domains'],
      durationMins: r.timeTakenS ? Math.round(r.timeTakenS / 60) : null,
      mode: r.mode || 'practice',
    }));

    const [historyRows] = await db.query(
      `SELECT d.name as domain, h.theta, h.recorded_at 
       FROM domain_rating_history h
       JOIN domains d ON h.domain_id = d.id
       WHERE h.user_id = ?
       ORDER BY h.recorded_at ASC`,
      [userId]
    );

    const domainScoreHistory = {};
    historyRows.forEach(h => {
      if (!domainScoreHistory[h.domain]) domainScoreHistory[h.domain] = [];
      const score = Math.round((h.theta / 2400) * 100);
      const dateStr = new Date(h.recorded_at).toLocaleDateString('en-PH', { month: 'short', day: 'numeric' });
      domainScoreHistory[h.domain].push({ t: dateStr, score });
    });

    // Overall history: avg score per session date
    const overallHistory = quizHistory
      .slice()
      .reverse()
      .map(s => ({
        t: new Date(s.startedAt).toLocaleDateString('en-PH', { month: 'short', day: 'numeric' }),
        score: s.score,
      }));
    if (overallHistory.length) domainScoreHistory['Overall'] = overallHistory;

    // ── Activity calendar (last 16 weeks = 112 days)
    const now = new Date();
    const cutoffCal = new Date(now);
    cutoffCal.setDate(cutoffCal.getDate() - 112);
    const activityMap = {};
    practiceRows.forEach(r => {
      if (r.startedAt) {
        const d = new Date(r.startedAt);
        if (d >= cutoffCal) {
          const key = d.toISOString().slice(0, 10);
          activityMap[key] = (activityMap[key] || 0) + 1;
        }
      }
    });

    // ── Day streak (consecutive days from today going back)
    let dayStreak = 0;
    for (let i = 0; i < 365; i++) {
      const d = new Date(now);
      d.setDate(now.getDate() - i);
      const key = d.toISOString().slice(0, 10);
      if (activityMap[key]) dayStreak++;
      else if (i > 0) break; // allow today to be empty (haven't studied yet today)
    }

    // ── Week streak (consecutive calendar weeks with ≥1 session)
    const weekMs = 7 * 86400000;
    let weekStreak = 0;
    for (let w = 0; w < 52; w++) {
      const wEnd   = new Date(now.getTime() - w * weekMs);
      const wStart = new Date(wEnd.getTime() - weekMs);
      const hasSession = practiceRows.some(r => {
        const d = new Date(r.startedAt);
        return d >= wStart && d <= wEnd;
      });
      if (hasSession) weekStreak++;
      else if (w > 0) break;
    }

    // ── Consistency score (fraction of last 8 weeks with ≥1 session, 0-100)
    const activeWeeks = new Set();
    practiceRows.forEach(r => {
      if (r.startedAt) {
        const weekIdx = Math.floor((now - new Date(r.startedAt)) / weekMs);
        if (weekIdx < 8) activeWeeks.add(weekIdx);
      }
    });
    const consistencyScore = Math.round((activeWeeks.size / 8) * 100);

    // ── Domain deep-dive
    const [deepDiveRows] = await db.query(
      `SELECT d.name as domain, dr.theta,
              COUNT(DISTINCT sa.session_id) as sessionCount,
              COUNT(sa.id) as totalQ,
              SUM(CASE WHEN sa.is_correct THEN 1 ELSE 0 END) as correctQ
       FROM domain_ratings dr
       JOIN domains d ON dr.domain_id = d.id
       LEFT JOIN question_domains qd ON qd.domain_id = dr.domain_id
       LEFT JOIN session_answers sa ON sa.question_id = qd.question_id
       LEFT JOIN practice_sessions ps ON sa.session_id = ps.id AND ps.user_id = ?
       WHERE dr.user_id = ?
       GROUP BY d.name, dr.theta, dr.domain_id`,
      [userId, userId]
    );

    // Best session per domain
    const domainBestMap = {};
    quizHistory.forEach(s => {
      (s.domains || []).forEach(dn => {
        if (!domainBestMap[dn] || s.score > domainBestMap[dn]) domainBestMap[dn] = s.score;
      });
    });

    const domainDeepDive = deepDiveRows.map(r => ({
      domain:       r.domain,
      theta:        Math.round(r.theta),
      current:      Math.round((r.theta / 2400) * 100),
      sessionCount: Number(r.sessionCount) || 0,
      totalQ:       Number(r.totalQ)       || 0,
      correctQ:     Number(r.correctQ)     || 0,
      accuracy:     r.totalQ > 0 ? Math.round((r.correctQ / r.totalQ) * 100) : 0,
      bestSession:  domainBestMap[r.domain] || 0,
    }));

    // ── Day streak from actual consecutive days (not just last 7)
    const calculatedStreak = dayStreak;

    const domainProgress = ratings.map(r => ({
      domain: r.domainName,
      current: Math.round((r.theta / 2400) * 100),
    }));

    const avgTheta = ratings.length > 0 
      ? ratings.reduce((sum, r) => sum + r.theta, 0) / ratings.length 
      : 0;

    return {
      readinessScore: avgTheta ? Math.round((avgTheta / 2400) * 100) : 0,
      readinessChange: 0,
      streak: calculatedStreak,
      weekStreak,
      consistencyScore,
      activityMap,
      scoreHistory: [],
      domainProgress,
      domainDeepDive,
      stats: {
        diagnosticCompletedAt: diagRows.length ? diagRows[0].completed_at : null,
        diagnosticScore: diagRows.length ? Math.round((diagRows[0].correct_count / diagRows[0].total_questions) * 100) : 0,
        profileCompletedAt: onboardedAt,
        sessions: quizHistory,
        domainScoreHistory,
        totalSessions: practiceRows.length,
        totalQuestions: practiceRows.reduce((sum, p) => sum + p.questionCount, 0),
        avgSessionMins: quizHistory.length
          ? Math.round(quizHistory.filter(s => s.durationMins != null).reduce((sum, s) => sum + (s.durationMins || 0), 0) / Math.max(1, quizHistory.filter(s => s.durationMins != null).length))
          : 0,
      }
    };
  } catch (err) {
    console.error('getProgRow error:', err);
    return null;
  }
}

async function getExamDate(userId) {
  try {
    const [rows] = await db.query(
      `SELECT CASE
          WHEN target_exam_date IS NULL OR YEAR(target_exam_date) < 2000 THEN NULL
          ELSE DATE_FORMAT(target_exam_date, '%Y-%m-%d')
        END AS target_exam_date
       FROM learner_profiles
       WHERE user_id = ?
       LIMIT 1`,
      [userId]
    );
    return rows.length ? rows[0].target_exam_date : null;
  } catch (err) {
    console.error('getExamDate error:', err);
    return null;
  }
}

function startOfWeekMonday(d) {
  const x = new Date(d);
  const day = x.getDay();
  const diff = day === 0 ? -6 : 1 - day;
  x.setDate(x.getDate() + diff);
  x.setHours(0, 0, 0, 0);
  return x;
}

function endOfWeekSunday(monday) {
  const x = new Date(monday);
  x.setDate(x.getDate() + 6);
  x.setHours(23, 59, 59, 999);
  return x;
}

function calendarDaysBetween(a, b) {
  const ua = Date.UTC(a.getFullYear(), a.getMonth(), a.getDate());
  const ub = Date.UTC(b.getFullYear(), b.getMonth(), b.getDate());
  return Math.floor((ub - ua) / 86400000);
}

function phaseBounds(totalWeeks) {
  const t = Math.max(totalWeeks, 4);
  const p1 = Math.max(1, Math.ceil(t * 0.15));
  const p2 = p1 + Math.max(1, Math.ceil(t * 0.40));
  const p3 = p2 + Math.max(1, Math.ceil(t * 0.30));
  return { p1, p2, p3, p4: t };
}

function localDateKey(d) {
  const x = new Date(d);
  const y = x.getFullYear();
  const m = String(x.getMonth() + 1).padStart(2, '0');
  const day = String(x.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

function sessionMatchesPlanDay(s, iso, domain) {
  if (!s.startedAt) return false;
  if (localDateKey(s.startedAt) !== iso) return false;
  const doms = s.domains || [];
  if (!doms.length) return false;
  const needle = (domain || '').toLowerCase().replace(' ability', '');
  return doms.some(dd => {
    const h = (dd || '').toLowerCase();
    return h.includes(needle) || needle.includes(h.replace(' ability', '').split(' ')[0]);
  });
}

async function buildStudyPlanForUser(userId) {
  const DEFAULT_DOMAINS = [
    'Verbal Ability',
    'Numerical Ability',
    'Analytical Ability',
    'Clerical Ability',
    'General Information',
  ];

  const examDateStr = await getExamDate(userId);
  const prog = await getProgRow(userId);
  const now = new Date();

  let domainOrdered = DEFAULT_DOMAINS;
  if (prog?.domainProgress?.length) {
    domainOrdered = [...prog.domainProgress]
      .sort((a, b) => a.current - b.current)
      .map(d => d.domain);
  }

  const diagAt = prog?.stats?.diagnosticCompletedAt
    ? new Date(prog.stats.diagnosticCompletedAt)
    : new Date(now.getTime() - 84 * 86400000);
  diagAt.setHours(0, 0, 0, 0);

  let exam = examDateStr ? new Date(examDateStr + 'T12:00:00') : null;
  if (!exam || exam < now) {
    exam = new Date(now);
    exam.setDate(exam.getDate() + 84);
  }

  const totalDays = Math.max(7, calendarDaysBetween(diagAt, exam));
  const totalWeeks = Math.max(1, Math.ceil(totalDays / 7));
  const daysSinceStart = Math.max(0, calendarDaysBetween(diagAt, now));
  const currentWeek = Math.min(totalWeeks, Math.max(1, Math.floor(daysSinceStart / 7) + 1));
  const weeksRemaining = Math.max(0, Math.ceil(calendarDaysBetween(now, exam) / 7));

  const { p1, p2, p3, p4 } = phaseBounds(totalWeeks);
  let phaseIdx = 0;
  if (currentWeek > p1) phaseIdx = 1;
  if (currentWeek > p2) phaseIdx = 2;
  if (currentWeek > p3) phaseIdx = 3;

  const sessionsTarget = [3, 5, 4, 5][phaseIdx] || 4;

  const sessions = prog?.stats?.sessions || [];
  const monday = startOfWeekMonday(now);
  const weekEnd = endOfWeekSunday(monday);
  const completedThisWeek = sessions.filter(s => {
    const t = new Date(s.startedAt);
    return t >= monday && t <= weekEnd;
  }).length;

  const dayNames = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
  const pattern = [0, 1, 2, 3, 4, 0, 1];
  const dailySchedule = pattern.map((pi, i) => {
    const d = new Date(monday);
    d.setDate(d.getDate() + i);
    const iso = localDateKey(d);
    const domain = domainOrdered[pi % domainOrdered.length];
    const estMinutes = pi % domainOrdered.length < 2 ? 35 : 28;
    const completed = sessions.some(s => sessionMatchesPlanDay(s, iso, domain));
    return { date: iso, day: dayNames[i], domain, estMinutes, completed };
  });

  const todayIso = localDateKey(now);
  const todayRow = dailySchedule.find(d => d.date === todayIso) || dailySchedule[0];

  const phases = [
    {
      id: 1,
      key: 'early',
      title: 'Phase 1: Early',
      label: 'Early preparation',
      weeks: `Weeks 1–${p1}`,
      items: [
        'Diagnostic baseline calibration',
        'All domains surveyed to map M-Elo starting points',
        'Light structured touch across every domain',
      ],
    },
    {
      id: 2,
      key: 'foundation',
      title: 'Phase 2: Foundation',
      label: 'Foundation',
      weeks: `Weeks ${p1 + 1}–${p2}`,
      items: [
        'Concentrated sessions on weaker domains',
        'Strong domains get maintenance reps (about one per week)',
        'Build a sustainable weekly rhythm',
      ],
    },
    {
      id: 3,
      key: 'consolidation',
      title: 'Phase 3: Consolidation',
      label: 'Consolidation',
      weeks: `Weeks ${p2 + 1}–${p3}`,
      items: [
        'Balanced mix across domains',
        'Pair practice with review materials',
        'Close gaps toward the passing benchmark',
      ],
    },
    {
      id: 4,
      key: 'preexam',
      title: 'Phase 4: Pre-exam',
      label: 'Pre-exam sprint',
      weeks: `Weeks ${p3 + 1}–${p4}`,
      items: [
        'Mixed timed and practice sessions',
        'Exam readiness monitoring',
        'Confidence and stamina building',
      ],
    },
  ].map((p, i) => ({
    ...p,
    done: i < phaseIdx,
    current: i === phaseIdx,
  }));

  const adjustments = [];
  try {
    const [hist] = await db.query(
      `SELECT d.name AS domain, h.theta, h.recorded_at
       FROM domain_rating_history h
       JOIN domains d ON h.domain_id = d.id
       WHERE h.user_id = ?
       ORDER BY h.recorded_at DESC
       LIMIT 48`,
      [userId]
    );
    const byDom = {};
    hist.forEach(row => {
      if (!byDom[row.domain]) byDom[row.domain] = [];
      byDom[row.domain].push({ theta: Number(row.theta), at: row.recorded_at });
    });
    Object.keys(byDom).forEach(dom => {
      const arr = byDom[dom];
      for (let i = 0; i < arr.length - 1; i++) {
        const newer = arr[i];
        const older = arr[i + 1];
        if (Number(newer.theta) < Number(older.theta) - 15) {
          const ds = new Date(newer.at).toLocaleDateString('en-PH', {
            year: 'numeric',
            month: 'short',
            day: 'numeric',
          });
          adjustments.push({
            date: ds,
            message: `${dom} moved up in weekly priority after a session score decline.`,
          });
          break;
        }
      }
    });
    adjustments.sort((a, b) => (a.date < b.date ? 1 : -1));
    adjustments.splice(6);
  } catch (_) {}

  if (!adjustments.length) {
    adjustments.push({
      date: now.toLocaleDateString('en-PH', { year: 'numeric', month: 'short', day: 'numeric' }),
      message: 'No automatic reprioritization yet. Adjustments appear when practice shifts your domain rankings.',
      isInfo: true,
    });
  }

  /* Profile preview card expects an array of string[] per day */
  const dailyTasks = dailySchedule.map(d => [
    `${d.domain} · ~${d.estMinutes} min focus`,
  ]);

  return {
    examDate: examDateStr || null,
    examDateDisplay: examDateStr
      ? new Date(examDateStr + 'T12:00:00').toLocaleDateString('en-PH', {
          month: 'long',
          day: 'numeric',
          year: 'numeric',
        })
      : null,
    profileUrl: '/reviewee/profile',
    weeksRemaining,
    totalWeeks,
    currentWeek,
    weeklySessions: { completed: completedThisWeek, target: sessionsTarget },
    today: { date: todayIso, domain: todayRow.domain, estMinutes: todayRow.estMinutes },
    dailySchedule,
    dailyTasks,
    phases,
    currentPhaseIndex: phaseIdx,
    adjustments,
  };
}

/* ── API: enrollment code (Blueprint §5.3) ───────────────── */
router.post('/api/enroll', authReviewee, async (req, res) => {
  const userId = req.session.user.id;
  const { enrollment_code } = req.body || {};

  if (!enrollment_code || !enrollment_code.trim()) {
    return res.status(400).json({ error: 'Enrollment code is required.' });
  }

  const code = enrollment_code.trim().toUpperCase();

  try {
    // 1. Find the code — must exist, be active, not expired, have remaining uses
    const [codes] = await db.query(
      `SELECT ec.*, b.exam_level AS batchExamLevel, b.name AS batchName,
              b.status AS batchStatus
       FROM enrollment_codes ec
       JOIN batches b ON ec.batch_id = b.id
       WHERE ec.code = ?
         AND ec.is_active = TRUE
         AND (ec.expires_at IS NULL OR ec.expires_at > NOW())
       LIMIT 1`,
      [code]
    );

    if (!codes.length) {
      return res.status(400).json({ error: 'Invalid or expired enrollment code.' });
    }

    const codeRow = codes[0];

    if (codeRow.batchStatus !== 'active') {
      return res.status(400).json({ error: 'This batch is no longer accepting enrollments.' });
    }

    if (codeRow.used_count >= codeRow.max_uses) {
      return res.status(400).json({ error: 'This enrollment code has already been fully used.' });
    }

    // 2. Check user is not already enrolled in this batch
    const [existing] = await db.query(
      'SELECT id FROM enrollments WHERE user_id = ? AND batch_id = ?',
      [userId, codeRow.batch_id]
    );
    if (existing.length) {
      return res.status(400).json({ error: 'You are already enrolled in this batch.' });
    }

    // 3. Create enrollment record
    await db.query(
      `INSERT INTO enrollments (user_id, batch_id, enrollment_code_id)
       VALUES (?, ?, ?)`,
      [userId, codeRow.batch_id, codeRow.id]
    );

    // 4. Update users: set exam_level, batch_id, is_enrolled
    await db.query(
      `UPDATE users
       SET exam_level = ?, batch_id = ?, is_enrolled = TRUE
       WHERE id = ?`,
      [codeRow.batchExamLevel, codeRow.batch_id, userId]
    );

    // 5. Increment code used_count
    await db.query(
      'UPDATE enrollment_codes SET used_count = used_count + 1 WHERE id = ?',
      [codeRow.id]
    );

    // 6. Initialize domain_ratings for all domains of this exam level (theta=1200, k=48)
    const [domains] = await db.query(
      `SELECT id FROM domains
       WHERE exam_level = ? OR exam_level = 'both'`,
      [codeRow.batchExamLevel]
    );

    for (const domain of domains) {
      await db.query(
        `INSERT IGNORE INTO domain_ratings (user_id, domain_id, theta, k_factor, sessions_count)
         VALUES (?, ?, 1200.0, 48.0, 0)`,
        [userId, domain.id]
      );
    }

    // 7. Update session so middleware guards re-evaluate correctly
    req.session.user.isEnrolled = true;
    req.session.user.examLevel  = codeRow.batchExamLevel;

    console.log(`[Enroll] User ${userId} enrolled in batch "${codeRow.batchName}" (${codeRow.batchExamLevel})`);

    req.session.save((err) => {
      if (err) {
        console.error('[Enroll] Session save error:', err);
        return res.status(500).json({ error: 'Failed to save session.' });
      }
      return res.json({
        success:   true,
        examLevel: codeRow.batchExamLevel,
        batchName: codeRow.batchName,
      });
    });

  } catch (err) {
    console.error('[Enroll] Error:', err);
    return res.status(500).json({ error: 'Server error. Please try again.' });
  }
});

/* ── API: dashboard data ─────────────────────────────────── */
router.get('/api/dashboard', authOnboarded, async (req, res) => {
  try {
    const user = req.session.user;
    const prog = await getProgRow(user.id);
    const examDate = await getExamDate(user.id);

    const readinessScore = prog?.readinessScore ?? 0;
    const streak         = prog?.streak         ?? 0;
    const domainProgress = prog?.domainProgress ?? [];
    const stats          = prog?.stats          ?? {};

    const pretestComplete = !!(stats.diagnosticCompletedAt);
    const sessions        = stats.sessions || [];
    const sessionCount    = sessions.length;

    const weakDomains  = domainProgress.filter(d => d.current < 70).map(d => d.domain);
    const domainScores = domainProgress.map(d => ({ domain: d.domain, score: d.current }));

    // Today's focus from study plan
    const todayNum = new Date().getDay();
    let todayFocus = null;
    try {
      const [focusRows] = await db.query(
        `SELECT spd.focus_label, spd.est_minutes, d.name AS domain
         FROM study_plans sp
         JOIN study_plan_weeks spw ON sp.id = spw.plan_id
         JOIN study_plan_days spd ON spw.id = spd.week_id
         JOIN domains d ON spd.domain_id = d.id
         WHERE sp.user_id = ?
           AND spd.day_of_week = ?
           AND CURDATE() BETWEEN spw.week_start AND spw.week_end
         LIMIT 1`,
        [user.id, todayNum]
      );
      if (focusRows.length) {
        todayFocus = focusRows[0];
      }
    } catch (_) {}

    if (!todayFocus && weakDomains.length) {
      // fallback
      todayFocus = {
        focus_label: 'Targeted Fundamentals',
        est_minutes: 30,
        domain: weakDomains[0]
      };
    }

    // Today's recommended materials — up to 3 from weakest domains
    let recommendedMaterials = [];
    try {
      if (weakDomains.length) {
        const placeholders = weakDomains.map(() => '?').join(',');
        const [mats] = await db.query(
          `SELECT m.id, m.title, m.description, m.type, m.difficulty, m.exam_level,
                  m.content_url, m.est_minutes AS estMinutes, d.name AS domain
           FROM materials m
           JOIN domains d ON m.domain_id = d.id
           WHERE d.name IN (${placeholders})
             AND m.status = 'published'
           ORDER BY CASE m.type
             WHEN 'practice_set' THEN 1
             WHEN 'lesson_module' THEN 2
             WHEN 'reference_sheet' THEN 3
             ELSE 4
           END, COALESCE(m.est_minutes, 9999) ASC, m.id DESC
           LIMIT 3`,
          weakDomains
        );
        recommendedMaterials = mats.map(m => ({
          ...m,
          type: formatMaterialType(m.type)
        }));
      } else {
        const [mats] = await db.query(
          `SELECT m.id, m.title, m.description, m.type, m.difficulty, m.exam_level,
                  m.content_url, m.est_minutes AS estMinutes, d.name AS domain
           FROM materials m
           JOIN domains d ON m.domain_id = d.id
           WHERE m.status = 'published'
           ORDER BY CASE m.type
             WHEN 'practice_set' THEN 1
             WHEN 'lesson_module' THEN 2
             WHEN 'reference_sheet' THEN 3
             ELSE 4
           END, COALESCE(m.est_minutes, 9999) ASC, m.id DESC
           LIMIT 3`
        );
        recommendedMaterials = mats.map(m => ({
          ...m,
          type: formatMaterialType(m.type)
        }));
      }
    } catch (_) {}

    let examCycleYear = new Date().getFullYear();
    if (examDate) {
      const d = new Date(examDate);
      if (!Number.isNaN(d.getTime())) examCycleYear = d.getFullYear();
    }

    const totalQuestions = stats.totalQuestions || 0;

    res.json({
      user: {
        firstName: user.firstName,
        lastName:  user.lastName,
        email:     user.email,
        examLevel: user.examLevel || 'Professional',
      },
      readinessScore,
      streak,
      pretestComplete,
      sessionCount,
      totalQuestions,
      examCycleYear,
      examDate:   examDate || null,
      todayFocus,
      recentActivity: sessions.slice(0, 3) || [],
      weakDomains: weakDomains.length ? weakDomains : [],
      recommendedMaterials,
      diagnostic: {
        latestScore: readinessScore || 0,
        domainScores: domainScores.length ? domainScores : [
          { domain: 'Verbal Ability',      score: 0 },
          { domain: 'Numerical Ability',   score: 0 },
          { domain: 'Analytical Ability',  score: 0 },
          { domain: 'Clerical Ability',    score: 0 },
          { domain: 'General Information', score: 0 },
        ],
      }
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Database error' });
  }
});

/* ── API: lightweight user info (all pages navbar) ─────── */
router.get('/api/user', requireAuth, (req, res) => {
  const u = req.session.user;
  res.json({
    firstName: u.firstName,
    lastName:  u.lastName,
    email:     u.email,
    examLevel: u.examLevel || 'Professional',
  });
});

/* ── API: full profile data ─────────────────────────────── */
router.get('/api/profile', requireAuth, async (req, res) => {
  try {
    const user = req.session.user;
    const prog = await getProgRow(user.id);
    const examDate = await getExamDate(user.id);

    const readinessScore = prog?.readinessScore ?? 0;
    const streak         = prog?.streak         ?? 0;
    const domainProgress = prog?.domainProgress ?? [];
    const stats          = prog?.stats          ?? {};

    const pretestComplete = !!(stats.diagnosticCompletedAt);
    const weakDomains  = domainProgress.filter(d => d.current < 70).map(d => d.domain);
    const domainScores = domainProgress.map(d => ({ domain: d.domain, score: d.current }));

    // Learner profile preferences
    const [[lpRow]] = await db.query(
      `SELECT target_exam_date, study_hours_per_week, preferred_study_time, primary_device
       FROM learner_profiles WHERE user_id = ?`,
      [user.id]
    );

    // Batch name
    const [[batchRow]] = await db.query(
      `SELECT b.name AS batchName
       FROM batches b
       JOIN users u ON u.batch_id = b.id
       WHERE u.id = ?`,
      [user.id]
    );

    // Domain self-ratings
    const [selfRatingRows] = await db.query(
      `SELECT d.name AS domain, ldsr.self_rating AS rating
       FROM learner_domain_self_ratings ldsr
       JOIN domains d ON d.id = ldsr.domain_id
       WHERE ldsr.user_id = ?
       ORDER BY d.name`,
      [user.id]
    );

    // Domain ELO thetas
    const [thetaRows] = await db.query(
      `SELECT d.name AS domain, dr.theta
       FROM domain_ratings dr
       JOIN domains d ON d.id = dr.domain_id
       WHERE dr.user_id = ?
       ORDER BY d.name`,
      [user.id]
    );

    // Member since
    const [[createdRow]] = await db.query(
      'SELECT created_at FROM users WHERE id = ?', [user.id]
    );

    res.json({
      user: {
        firstName: user.firstName,
        lastName:  user.lastName,
        email:     user.email,
        examLevel: user.examLevel || 'Professional',
        createdAt: createdRow?.created_at || null,
      },
      batchName:    batchRow?.batchName  || null,
      learnerProfile: lpRow || null,
      selfRatings:  selfRatingRows,
      domainThetas: thetaRows,
      readinessScore,
      streak,
      pretestComplete,
      examDate:   examDate || null,
      weakDomains,
      domainProgress,
      diagnostic: {
        latestScore: readinessScore || 0,
        domainScores,
      },
      sessions: (stats.sessions || []).length,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Database error' });
  }
});

/* ── API: update profile ────────────────────────────────── */
router.post('/api/profile/update', requireAuth, async (req, res) => {
  try {
    const { firstName, lastName, studyHours, preferredStudyTime, primaryDevice } = req.body || {};

    if (!firstName || !firstName.trim() || !lastName || !lastName.trim()) {
      return res.status(400).json({ error: 'First name and last name are required.' });
    }

    const userId = req.session.user.id;

    // Update name only — email and examLevel are identity fields, not user-editable
    await db.query(
      'UPDATE users SET first_name = ?, last_name = ? WHERE id = ?',
      [firstName.trim(), lastName.trim(), userId]
    );

    // Upsert learner profile preferences
    await db.query(
      `INSERT INTO learner_profiles (user_id, study_hours_per_week, preferred_study_time, primary_device)
       VALUES (?, ?, ?, ?)
       ON DUPLICATE KEY UPDATE
         study_hours_per_week = VALUES(study_hours_per_week),
         preferred_study_time = VALUES(preferred_study_time),
         primary_device       = VALUES(primary_device)`,
      [
        userId,
        studyHours      != null ? Number(studyHours)     : 5,
        preferredStudyTime || null,
        primaryDevice   || null,
      ]
    );

    req.session.user.firstName = firstName.trim();
    req.session.user.lastName  = lastName.trim();

    res.json({
      success: true,
      user: {
        firstName: req.session.user.firstName,
        lastName:  req.session.user.lastName,
        email:     req.session.user.email,
        examLevel: req.session.user.examLevel || 'Professional',
      },
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Database error' });
  }
});

/* ── API: Practice Session Start ────────────────────────────── */
router.post('/api/session/start', authDiagDone, async (req, res) => {
  const { domain, mode = 'practice', num_questions = 15, session_type = 'custom' } = req.body;
  const userId = req.session.user.id;
  try {
    const count = Math.min(Math.max(parseInt(num_questions) || 15, 5), 30);
    const params = [];
    let whereClauses = ["q.status = 'active'"];
    if (domain && domain !== 'All') {
      whereClauses.push('d.name = ?');
      params.push(domain);
    }
    const sql = `
      SELECT q.id, q.question_text, q.choice_a, q.choice_b, q.choice_c, q.choice_d, d.name AS domain
      FROM questions q
      JOIN question_domains qd ON q.id = qd.question_id
      JOIN domains d ON qd.domain_id = d.id
      WHERE ${whereClauses.join(' AND ')}
      ORDER BY RAND() LIMIT ?`;
    params.push(count);

    const [qRows] = await db.query(sql, params);
    const questions = qRows.map(q => ({
      id: q.id,
      question_text: q.question_text,
      choices: [q.choice_a, q.choice_b, q.choice_c, q.choice_d].filter(Boolean),
      domain: q.domain,
    }));

    const [uRows] = await db.query('SELECT batch_id FROM users WHERE id = ?', [userId]);
    const batchId = uRows[0]?.batch_id || 1;

    const [insertResult] = await db.query(
      `INSERT INTO practice_sessions (user_id, batch_id, session_type, mode, domain_filter, total_questions, status)
       VALUES (?, ?, ?, ?, ?, ?, 'in_progress')`,
      [userId, batchId, session_type, mode, (domain && domain !== 'All') ? domain : null, questions.length]
    );

    res.json({ sessionId: insertResult.insertId, questions, mode, total: questions.length });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Database error' });
  }
});

/* ── API: Practice Session Answer ───────────────────────────── */
router.post('/api/session/answer', authDiagDone, async (req, res) => {
  const { sessionId, questionId, chosenAnswerText, timeSpentMs } = req.body;
  const userId = req.session.user.id;
  
  let connection;
  try {
    connection = await db.getConnection();
    await connection.beginTransaction();

    // 1. Validate question & correct answer
    const [qRows] = await connection.query(`
      SELECT q.id, q.correct_choice, q.choice_a, q.choice_b, q.choice_c, q.choice_d,
             q.melo_difficulty, q.explanation, d.id as domain_id, d.name as domain_name
      FROM questions q
      JOIN question_domains qd ON q.id = qd.question_id
      JOIN domains d ON qd.domain_id = d.id
      WHERE q.id = ?
    `, [questionId]);
    
    if (!qRows.length) return res.status(404).json({ error: 'Question not found' });
    const q = qRows[0];
    
    let correctChoiceText = '';
    if (q.correct_choice === 'a') correctChoiceText = q.choice_a;
    if (q.correct_choice === 'b') correctChoiceText = q.choice_b;
    if (q.correct_choice === 'c') correctChoiceText = q.choice_c;
    if (q.correct_choice === 'd') correctChoiceText = q.choice_d;

    const isCorrect = (chosenAnswerText === correctChoiceText);

    // 2. M-Elo Update (Practice session k-factor = 16)
    let delta = 0;
    const [ratingsRows] = await connection.query('SELECT * FROM domain_ratings WHERE user_id = ? AND domain_id = ? FOR UPDATE', [userId, q.domain_id]);
    
    let rating = ratingsRows.length ? ratingsRows[0] : { theta: 1200.0, k_factor: 16.0 };
    
    const probability = 1 / (1 + Math.pow(10, (q.melo_difficulty - rating.theta) / 400));
    const actual = isCorrect ? 1 : 0;
    delta = rating.k_factor * (actual - probability);
    
    if (ratingsRows.length) {
      await connection.query('UPDATE domain_ratings SET theta = theta + ?, sessions_count = sessions_count + 1 WHERE id = ?', [delta, rating.id]);
    } else {
      await connection.query('INSERT INTO domain_ratings (user_id, domain_id, theta, k_factor, sessions_count) VALUES (?, ?, ?, ?, 1)', [userId, q.domain_id, rating.theta + delta, 16.0]);
    }

    // 3. Save Session Answer
    let selectedChoiceLetter = null;
    if (chosenAnswerText === q.choice_a) selectedChoiceLetter = 'a';
    if (chosenAnswerText === q.choice_b) selectedChoiceLetter = 'b';
    if (chosenAnswerText === q.choice_c) selectedChoiceLetter = 'c';
    if (chosenAnswerText === q.choice_d) selectedChoiceLetter = 'd';

    await connection.query(`
      INSERT INTO session_answers (session_id, question_id, selected_choice, is_correct, theta_delta_json, time_spent_ms)
      VALUES (?, ?, ?, ?, ?, ?)
    `, [sessionId, questionId, selectedChoiceLetter, isCorrect, JSON.stringify({ [q.domain_name]: delta }), timeSpentMs || 0]);

    if (isCorrect) {
      await connection.query('UPDATE practice_sessions SET correct_count = correct_count + 1 WHERE id = ?', [sessionId]);
    }

    await connection.commit();
    res.json({
      correct: isCorrect,
      correctAnswer: correctChoiceText,
      correctChoice: q.correct_choice,
      explanation: q.explanation || null,
      delta: Math.round(delta),
      domain: q.domain_name,
    });
  } catch (err) {
    if (connection) await connection.rollback();
    console.error(err);
    res.status(500).json({ error: 'Database error' });
  } finally {
    if (connection) connection.release();
  }
});

/* ── API: Practice Session End ──────────────────────────────── */
router.post('/api/session/end', authDiagDone, async (req, res) => {
  const { sessionId, timeTakenS } = req.body;
  try {
    const userId = req.session.user.id;
    await db.query(
      `UPDATE practice_sessions
       SET status = 'completed', completed_at = NOW(), time_taken_s = COALESCE(?, TIMESTAMPDIFF(SECOND, started_at, NOW()))
       WHERE id = ? AND user_id = ?`,
      [timeTakenS || null, sessionId, userId]
    );

    await db.query(`
      INSERT INTO domain_rating_history (user_id, domain_id, session_id, session_type, theta)
      SELECT user_id, domain_id, ?, 'practice', theta
      FROM domain_ratings WHERE user_id = ?
    `, [sessionId, userId]);

    res.json({ success: true, sessionId });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Database error' });
  }
});

/* ── API: Session Result ────────────────────────────────────── */
router.get('/api/session/result/:id', authDiagDone, async (req, res) => {
  const sessionId = parseInt(req.params.id);
  const userId = req.session.user.id;
  try {
    const [sessions] = await db.query(
      'SELECT * FROM practice_sessions WHERE id = ? AND user_id = ?',
      [sessionId, userId]
    );
    if (!sessions.length) return res.status(404).json({ error: 'Session not found' });
    const sess = sessions[0];

    const [answers] = await db.query(`
      SELECT sa.question_id, sa.selected_choice, sa.is_correct, sa.theta_delta_json, sa.time_spent_ms,
             q.question_text, q.choice_a, q.choice_b, q.choice_c, q.choice_d, q.correct_choice, q.explanation,
             d.name AS domain_name
      FROM session_answers sa
      JOIN questions q ON sa.question_id = q.id
      LEFT JOIN question_domains qd ON q.id = qd.question_id
      LEFT JOIN domains d ON qd.domain_id = d.id
      WHERE sa.session_id = ?
      GROUP BY sa.id
    `, [sessionId]);

    // Domain breakdown
    const domainMap = {};
    answers.forEach(a => {
      const dom = a.domain_name || 'General';
      if (!domainMap[dom]) domainMap[dom] = { domain: dom, total: 0, correct: 0, thetaDelta: 0 };
      domainMap[dom].total++;
      if (a.is_correct) domainMap[dom].correct++;
      try {
        const delta = JSON.parse(a.theta_delta_json || '{}');
        Object.values(delta).forEach(v => { domainMap[dom].thetaDelta += Number(v) || 0; });
      } catch {}
    });
    const domainBreakdown = Object.values(domainMap).map(d => ({
      domain: d.domain,
      total: d.total,
      correct: d.correct,
      score: d.total > 0 ? Math.round((d.correct / d.total) * 100) : 0,
      thetaDelta: Math.round(d.thetaDelta),
    })).sort((a, b) => a.score - b.score);

    // Top 3 wrong answers
    const choiceMap = c => ({ a: c.choice_a, b: c.choice_b, c: c.choice_c, d: c.choice_d });
    const wrongAnswers = answers.filter(a => !a.is_correct).slice(0, 3).map(a => {
      const cm = choiceMap(a);
      return {
        question_text: a.question_text,
        selected: a.selected_choice ? cm[a.selected_choice] : null,
        selectedLetter: a.selected_choice,
        correct: cm[a.correct_choice],
        correctLetter: a.correct_choice,
        explanation: a.explanation || null,
        domain: a.domain_name,
      };
    });

    const score = sess.total_questions > 0 ? Math.round((sess.correct_count / sess.total_questions) * 100) : 0;
    const weakestDomain = domainBreakdown[0]?.domain || null;

    res.json({
      sessionId: sess.id,
      score,
      correct: sess.correct_count,
      total: sess.total_questions,
      timeSecs: sess.time_taken_s,
      mode: sess.mode || 'practice',
      domainFilter: sess.domain_filter,
      domainBreakdown,
      wrongAnswers,
      weakestDomain,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Database error' });
  }
});

/* ── API: Session History ─────────────────────────────────── */
router.get('/api/sessions', authEnrolled, async (req, res) => {
  try {
    const userId = req.session.user.id;
    const [rows] = await db.query(
      `SELECT ps.id, ps.started_at as startedAt, ps.completed_at as endedAt, ps.total_questions as questionCount,
              ps.correct_count,
              GROUP_CONCAT(DISTINCT d.name SEPARATOR ', ') as domainNames
       FROM practice_sessions ps
       LEFT JOIN session_answers sa ON ps.id = sa.session_id
       LEFT JOIN questions q ON sa.question_id = q.id
       LEFT JOIN question_domains qd ON q.id = qd.question_id
       LEFT JOIN domains d ON qd.domain_id = d.id
       WHERE ps.user_id = ? AND ps.status = 'completed'
       GROUP BY ps.id
       ORDER BY ps.started_at DESC LIMIT 20`,
      [userId]
    );

    const sessions = rows.map(r => ({
      id: r.id,
      startedAt: r.startedAt,
      endedAt: r.endedAt,
      questionCount: r.questionCount,
      score: r.questionCount > 0 ? Math.round((r.correct_count / r.questionCount) * 100) : 0,
      domains: r.domainNames ? r.domainNames.split(', ') : ['All Domains']
    }));

    res.json({ sessions });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Database error' });
  }
});

/* ── API: progress ─────────────────────────────────────── */
router.get('/api/progress', authEnrolled, async (req, res) => {
  try {
    const user = req.session.user;
    const prog = await getProgRow(user.id);
    const examDate = await getExamDate(user.id);

    if (!prog) return res.json({});

    const stats = prog.stats || {};

    res.json({
      readinessScore:    prog.readinessScore,
      readinessChange:   prog.readinessChange,
      streak:            prog.streak,
      weekStreak:        prog.weekStreak        || 0,
      consistencyScore:  prog.consistencyScore  || 0,
      activityMap:       prog.activityMap       || {},
      scoreHistory:      prog.scoreHistory,
      domainProgress:    prog.domainProgress,
      domainDeepDive:    prog.domainDeepDive    || [],
      domainScoreHistory: stats.domainScoreHistory || {},
      examDate:          examDate || null,
      stats: {
        totalSessions:  stats.totalSessions  || 0,
        avgSessionMins: stats.avgSessionMins || 0,
        totalQuestions: stats.totalQuestions || 0,
        diagnosticCompletedAt: stats.diagnosticCompletedAt || null,
      },
      quizHistory:  (stats.sessions || []),
      achievements: [],
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Database error' });
  }
});

/* ── API: study plan (Blueprint §7.4) ───────────────────── */
router.get('/api/study-plan', authEnrolled, async (req, res) => {
  try {
    const payload = await buildStudyPlanForUser(req.session.user.id);
    res.json(payload);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Database error' });
  }
});

/* ── API: materials (library + recommendations, Blueprint §7.5) ── */
router.get('/api/materials', authEnrolled, async (req, res) => {
  try {
    const userId = req.session.user.id;
    let examLevel = (req.session.user.examLevel || 'professional').toLowerCase();
    if (examLevel !== 'professional' && examLevel !== 'subprofessional') {
      examLevel = 'professional';
    }

    const prog = await getProgRow(userId);
    const domainProgress = prog?.domainProgress ?? [];
    const weakDomains = domainProgress.filter(d => d.current < 70).map(d => d.domain);

    const [rows] = await db.query(
      `SELECT m.id, m.title, m.description, m.type, m.difficulty, m.exam_level,
              m.content_url AS contentUrl, m.content_html AS contentHtml,
              m.est_minutes AS estMinutes, d.name AS domain
       FROM materials m
       JOIN domains d ON m.domain_id = d.id
       WHERE m.status = 'published'
         AND (m.exam_level = ? OR m.exam_level = 'both')
       ORDER BY m.id DESC`,
      [examLevel]
    );

    const materials = rows.map(m => ({
      id: m.id,
      title: m.title,
      desc: m.description || '',
      domain: m.domain,
      type: formatMaterialType(m.type),
      typeKey: m.type,
      difficulty: formatMaterialDifficulty(m.difficulty),
      difficultyKey: m.difficulty,
      estMinutes: m.estMinutes,
      contentUrl: m.contentUrl || '',
      contentHtml: m.contentHtml || '',
    }));

    const weakSet = new Set(weakDomains);
    const recIds = [];
    const seen = new Set();
    for (const m of materials) {
      if (recIds.length >= 5) break;
      if (weakSet.has(m.domain) && !seen.has(m.id)) {
        recIds.push(m.id);
        seen.add(m.id);
      }
    }
    for (const m of materials) {
      if (recIds.length >= 5) break;
      if (!seen.has(m.id)) {
        recIds.push(m.id);
        seen.add(m.id);
      }
    }
    const recSet = new Set(recIds);
    materials.forEach(m => {
      m.isRecommended = recSet.has(m.id);
      m.recommended = m.isRecommended;
    });

    res.json({
      materials,
      recommendedDomains: weakDomains.length ? weakDomains : [],
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Database error' });
  }
});

/* ── API: search ─────────────────────────────────────────── */
router.get('/api/search', requireAuth, async (req, res) => {
  try {
    const { q = '', scope = 'materials', domain = 'all', type = 'all' } = req.query;
    const query = q.toLowerCase().trim();

    if (scope === 'materials') {
      let sql = `
        SELECT m.*, d.name AS domainName
          FROM materials m
          JOIN domains d ON d.id = m.domain_id
         WHERE 1=1`;
      const params = [];

      if (domain !== 'all') {
        sql += ' AND d.name = ?';
        params.push(domain);
      }
      if (type !== 'all') {
        sql += ' AND m.type = ?';
        params.push(type);
      }

      const [rows] = await db.query(sql, params);
      let results = rows.map(m => ({
        ...m,
        desc: m.description || '',
        domain: m.domainName,
      }));

      if (query) {
        results = results.filter(m =>
          (m.title && m.title.toLowerCase().includes(query)) ||
          (m.desc && m.desc.toLowerCase().includes(query)) ||
          (m.domain && m.domain.toLowerCase().includes(query)) ||
          (m.type && String(m.type).toLowerCase().includes(query))
        );
      }

      return res.json({ results, total: results.length, query });
    }

    res.status(400).json({ error: 'Unknown scope' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Database error' });
  }
});

/* ── API: diagnostic questions (answers stripped) ────────── */
router.get('/api/diagnostic', requireAuth, async (req, res) => {
  try {
    const user = req.session.user;
    const [rows] = await db.query(`
      SELECT q.id, q.question_text, q.choice_a, q.choice_b, q.choice_c, q.choice_d, q.difficulty, d.name AS domain
      FROM questions q
      JOIN question_domains qd ON q.id = qd.question_id
      JOIN domains d ON qd.domain_id = d.id
      WHERE q.exam_level = 'both' OR q.exam_level = ?
      ORDER BY RAND()
      LIMIT 15
    `, [user.examLevel || 'professional']);

    const sanitized = rows.map(q => ({
      id: q.id,
      domain: q.domain,
      difficulty: q.difficulty,
      question: q.question_text,
      choices: [q.choice_a, q.choice_b, q.choice_c, q.choice_d]
    }));

    res.json({ questions: sanitized, duration: 45 * 60 });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Database error' });
  }
});

/* ── API: submit diagnostic and persist results ───────── */
router.post('/api/diagnostic/submit', requireAuth, async (req, res) => {
  let connection;
  try {
    connection = await db.getConnection();
    await connection.beginTransaction();

    const userId = req.session.user.id;
    const { answers } = req.body || {};
    if (!answers || typeof answers !== 'object') {
      return res.status(400).json({ error: 'answers required' });
    }

    const questionIds = Object.keys(answers);
    if (questionIds.length === 0) {
      return res.status(400).json({ error: 'No answers submitted' });
    }

    // 1. Fetch questions submitted
    const [qRows] = await connection.query(`
      SELECT q.id, q.correct_choice, q.choice_a, q.choice_b, q.choice_c, q.choice_d, 
             q.melo_difficulty, qd.domain_id, d.name as domain_name
      FROM questions q
      JOIN question_domains qd ON q.id = qd.question_id
      JOIN domains d ON qd.domain_id = d.id
      WHERE q.id IN (?)
    `, [questionIds]);

    if (qRows.length === 0) {
       return res.status(400).json({ error: 'Invalid questions' });
    }

    // 2. Fetch existing domain ratings for user
    const [ratingsRows] = await connection.query('SELECT * FROM domain_ratings WHERE user_id = ?', [userId]);
    const ratingsMap = {};
    ratingsRows.forEach(r => ratingsMap[r.domain_id] = r);

    // Initialize missing domain ratings (Diagnostic uses k_factor = 48 initially)
    const [allDomains] = await connection.query('SELECT id FROM domains');
    for (const d of allDomains) {
      if (!ratingsMap[d.id]) {
        ratingsMap[d.id] = { domain_id: d.id, theta: 1200.0, k_factor: 48.0, sessions_count: 0 };
      }
    }

    let totalCorrect = 0;
    const domainMap = {}; 
    const diagnosticAnswers = [];

    // 3. Score questions and calculate M-Elo
    qRows.forEach(q => {
      const userAnswerText = answers[q.id];
      let correctChoiceText = '';
      if (q.correct_choice === 'a') correctChoiceText = q.choice_a;
      if (q.correct_choice === 'b') correctChoiceText = q.choice_b;
      if (q.correct_choice === 'c') correctChoiceText = q.choice_c;
      if (q.correct_choice === 'd') correctChoiceText = q.choice_d;

      const isCorrect = (userAnswerText === correctChoiceText);
      if (isCorrect) totalCorrect++;

      if (!domainMap[q.domain_name]) domainMap[q.domain_name] = { total: 0, correct: 0 };
      domainMap[q.domain_name].total++;
      if (isCorrect) domainMap[q.domain_name].correct++;

      // M-Elo Engine Update
      const rating = ratingsMap[q.domain_id];
      const probability = 1 / (1 + Math.pow(10, (q.melo_difficulty - rating.theta) / 400));
      const actual = isCorrect ? 1 : 0;
      rating.theta += rating.k_factor * (actual - probability);

      diagnosticAnswers.push([userId, null, q.id, userAnswerText, isCorrect]);
    });

    // 4. Save Diagnostic Session
    const [uRowsDiag] = await connection.query('SELECT batch_id FROM users WHERE id = ?', [userId]);
    const diagBatchId = uRowsDiag[0]?.batch_id || 1;
    const [diagLevelRows] = await connection.query('SELECT exam_level FROM users WHERE id = ?', [userId]);
    const diagExamLevel = diagLevelRows[0]?.exam_level || 'professional';
    const [sessionRes] = await connection.query(`
      INSERT INTO diagnostic_sessions (user_id, batch_id, exam_level, status, correct_count, total_questions)
      VALUES (?, ?, ?, 'completed', ?, ?)
    `, [userId, diagBatchId, diagExamLevel, totalCorrect, questionIds.length]);
    const sessionId = sessionRes.insertId;

    // 5. Save Diagnostic Answers
    if (diagnosticAnswers.length > 0) {
      diagnosticAnswers.forEach(ans => ans[1] = sessionId);
      await connection.query(`
        INSERT INTO diagnostic_answers (user_id, session_id, question_id, user_answer, is_correct)
        VALUES ?
      `, [diagnosticAnswers]);
    }

    // 6. Save Domain Ratings back
    for (const r of Object.values(ratingsMap)) {
      if (r.id) { // update existing
        await connection.query(`
          UPDATE domain_ratings SET theta = ?, sessions_count = sessions_count + 1 WHERE id = ?
        `, [r.theta, r.id]);
      } else { // insert new
        await connection.query(`
          INSERT INTO domain_ratings (user_id, domain_id, theta, k_factor, sessions_count)
          VALUES (?, ?, ?, ?, 1)
        `, [userId, r.domain_id, r.theta, 48.0]);
      }
    }

    // 6.5. Snapshot into history
    await connection.query(`
      INSERT INTO domain_rating_history (user_id, domain_id, session_id, session_type, theta)
      SELECT user_id, domain_id, ?, 'diagnostic', theta
      FROM domain_ratings
      WHERE user_id = ?
    `, [sessionId, userId]);

    // 7. Auto-generate study plan
    const [uRows] = await connection.query('SELECT batch_id FROM users WHERE id = ?', [userId]);
    const batchId = uRows[0]?.batch_id;

    if (batchId) {
      // Clear any existing plan
      await connection.query('DELETE FROM study_plans WHERE user_id = ?', [userId]);

      const [planRes] = await connection.query(
        'INSERT INTO study_plans (user_id, batch_id) VALUES (?, ?)',
        [userId, batchId]
      );
      const planId = planRes.insertId;

      // Get domains mapped to ID
      const [dRows] = await connection.query('SELECT id, name FROM domains');

      // Sort domains by M-Elo rating (weakest first)
      const sortedRatings = Object.values(ratingsMap).sort((a, b) => a.theta - b.theta);
      const defaultDomainId = dRows[0]?.id || 1;

      let planStart = new Date();
      const day = planStart.getDay();
      const diff = planStart.getDate() - day + (day === 0 ? -6 : 1);
      planStart.setDate(diff);

      for (let weekNum = 1; weekNum <= 4; weekNum++) {
        const weekStart = new Date(planStart);
        weekStart.setDate(planStart.getDate() + ((weekNum - 1) * 7));
        
        const weekEnd = new Date(weekStart);
        weekEnd.setDate(weekStart.getDate() + 6);

        const [weekRes] = await connection.query(
          'INSERT INTO study_plan_weeks (plan_id, week_number, week_start, week_end, phase_label) VALUES (?, ?, ?, ?, ?)',
          [planId, weekNum, weekStart.toISOString().slice(0, 10), weekEnd.toISOString().slice(0, 10), `Phase ${weekNum}`]
        );
        const weekId = weekRes.insertId;

        const daysData = [];
        for (let dayOfWeek = 0; dayOfWeek <= 6; dayOfWeek++) {
          // Cycle through weakest domains (top 3)
          const domainIndex = dayOfWeek % Math.min(3, sortedRatings.length);
          const dId = sortedRatings[domainIndex]?.domain_id || defaultDomainId;
          const dNameObj = dRows.find(d => d.id === dId);
          const dName = dNameObj ? dNameObj.name.replace(' Ability', '') : 'General';
          
          // Optionally make just one day a light day or rest day, but we'll leave it as active studying
          // to maximize flexibility for the reviewee.
          daysData.push([weekId, dayOfWeek, dId, `Review ${dName}`, 30, 0]);
        }
        
        await connection.query(
          'INSERT INTO study_plan_days (week_id, day_of_week, domain_id, focus_label, est_minutes, is_rest_day) VALUES ?',
          [daysData]
        );
      }
    }

    await connection.commit();

    // 7. Format frontend response
    const overallScore = questionIds.length ? Math.round((totalCorrect / questionIds.length) * 100) : 0;
    const domainScores = Object.entries(domainMap).map(([domain, { total, correct }]) => ({
      domain,
      score: Math.round((correct / total) * 100),
      correct,
      total,
    }));
    
    const weakDomains = domainScores.filter(d => d.score < 70).map(d => d.domain);
    const grade = overallScore >= 90 ? 'Excellent' : overallScore >= 80 ? 'Above Average' : overallScore >= 70 ? 'Average' : 'Needs Improvement';

    res.json({ overallScore, correct: totalCorrect, total: questionIds.length, domainScores, weakDomains, grade });

  } catch (err) {
    if (connection) await connection.rollback();
    console.error(err);
    res.status(500).json({ error: 'Database error' });
  } finally {
    if (connection) connection.release();
  }
});

/* ── API: request data deletion ─────────────────────────── */
router.post('/api/profile/request-deletion', requireAuth, async (req, res) => {
  try {
    const userId = req.session.user.id;
    const reason = (req.body?.reason || '').trim() || null;

    // Prevent duplicate pending requests
    const [[existing]] = await db.query(
      "SELECT id FROM deletion_requests WHERE user_id = ? AND status = 'pending' LIMIT 1",
      [userId]
    );
    if (existing) {
      return res.status(409).json({ error: 'You already have a pending deletion request.' });
    }

    await db.query(
      'INSERT INTO deletion_requests (user_id, reason) VALUES (?, ?)',
      [userId, reason]
    );
    res.json({ ok: true });
  } catch (err) {
    console.error('[Profile] Deletion request error:', err);
    res.status(500).json({ error: 'Failed to submit request.' });
  }
});

/* ── API: change password (bcrypt-aware) ────────────────── */
router.post('/api/settings/password', requireAuth, async (req, res) => {
  try {
    const { currentPassword, newPassword, confirmPassword } = req.body || {};

    if (!currentPassword || !newPassword || !confirmPassword) {
      return res.status(400).json({ error: 'All fields are required.' });
    }
    if (newPassword.length < 8) {
      return res.status(400).json({ error: 'New password must be at least 8 characters.' });
    }
    if (newPassword !== confirmPassword) {
      return res.status(400).json({ error: 'New passwords do not match.' });
    }

    const userId = req.session.user.id;
    const [urows] = await db.query('SELECT password FROM users WHERE id = ?', [userId]);
    if (!urows.length) return res.status(404).json({ error: 'User not found.' });

    const storedPw = urows[0].password;
    let isMatch = false;
    if (storedPw.startsWith('$2b$') || storedPw.startsWith('$2a$')) {
      isMatch = await bcrypt.compare(currentPassword, storedPw);
    } else {
      isMatch = (currentPassword === storedPw); // plaintext demo seed fallback
    }

    if (!isMatch) {
      return res.status(400).json({ error: 'Current password is incorrect.' });
    }

    const newHash = await bcrypt.hash(newPassword, 10);
    await db.query('UPDATE users SET password = ? WHERE id = ?', [newHash, userId]);
    res.json({ success: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Database error' });
  }
});

/* ── API: SurveyJS learner profile definition (onboarding step 3) ─ */
router.get('/api/profile-form', authReviewee, async (req, res) => {
  try {
    const schemaJson = await profileFormSurvey.getProfileFormSchemaJson(db);
    const surveyJson = profileFormSurvey.schemaToSurveyJson(schemaJson);
    res.json({ surveyJson });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Database error' });
  }
});

router.get('/api/profile-form-fields', authReviewee, (_req, res) => {
  res.status(410).json({
    error: 'Removed: use GET /reviewee/api/profile-form for the SurveyJS definition.',
  });
});

/* ── API: save learner profile (Blueprint §5.4) ──────────── */
router.post('/api/profile', authReviewee, async (req, res) => {
  const userId = req.session.user.id;
  const {
    first_name,
    last_name,
    target_exam_date,
    study_hours_per_week,
    preferred_study_time,
    primary_device,
    domain_self_ratings, // { "Verbal Ability": 3, ... }
    enrollment_code,
    custom_fields, // { field_key: value } from dynamic profile_form_fields
  } = req.body || {};

  try {
    // 1. Process optional enrollment code if provided
    if (enrollment_code && enrollment_code.trim()) {
      const code = enrollment_code.trim().toUpperCase();
      const [codes] = await db.query(
        `SELECT ec.*, b.exam_level AS batchExamLevel, b.name AS batchName, b.status AS batchStatus
         FROM enrollment_codes ec JOIN batches b ON ec.batch_id = b.id
         WHERE ec.code = ? AND ec.is_active = TRUE AND (ec.expires_at IS NULL OR ec.expires_at > NOW()) LIMIT 1`,
        [code]
      );

      if (!codes.length) return res.status(400).json({ error: 'Invalid or expired enrollment code.' });
      const codeRow = codes[0];
      if (codeRow.batchStatus !== 'active') return res.status(400).json({ error: 'This batch is no longer accepting enrollments.' });
      if (codeRow.used_count >= codeRow.max_uses) return res.status(400).json({ error: 'This enrollment code has already been fully used.' });

      const [existing] = await db.query('SELECT id FROM enrollments WHERE user_id = ? AND batch_id = ?', [userId, codeRow.batch_id]);
      if (!existing.length) {
        await db.query(`INSERT INTO enrollments (user_id, batch_id, enrollment_code_id) VALUES (?, ?, ?)`, [userId, codeRow.batch_id, codeRow.id]);
        await db.query(`UPDATE users SET exam_level = ?, batch_id = ?, is_enrolled = TRUE WHERE id = ?`, [codeRow.batchExamLevel, codeRow.batch_id, userId]);
        await db.query('UPDATE enrollment_codes SET used_count = used_count + 1 WHERE id = ?', [codeRow.id]);

        const [domains] = await db.query(`SELECT id FROM domains WHERE exam_level = ? OR exam_level = 'both'`, [codeRow.batchExamLevel]);
        for (const domain of domains) {
          await db.query(`INSERT IGNORE INTO domain_ratings (user_id, domain_id, theta, k_factor, sessions_count) VALUES (?, ?, 1200.0, 48.0, 0)`, [userId, domain.id]);
        }

        req.session.user.isEnrolled = true;
        req.session.user.examLevel  = codeRow.batchExamLevel;
      }
    }

    // 2. Update users table with name
    if (first_name && last_name) {
      await db.query(
        'UPDATE users SET first_name = ?, last_name = ? WHERE id = ?',
        [first_name, last_name, userId]
      );
      req.session.user.firstName = first_name;
      req.session.user.lastName = last_name;
    }

    let customJson = null;
    if (custom_fields && typeof custom_fields === 'object' && !Array.isArray(custom_fields)) {
      try {
        customJson = JSON.stringify(custom_fields);
      } catch (_) {
        customJson = null;
      }
    }

    // 3. Upsert learner_profiles
    await db.query(
      `INSERT INTO learner_profiles
         (user_id, target_exam_date, study_hours_per_week, preferred_study_time, primary_device, custom_field_responses, completed_at)
       VALUES (?, ?, ?, ?, ?, ?, NOW())
       ON DUPLICATE KEY UPDATE
         target_exam_date     = VALUES(target_exam_date),
         study_hours_per_week = VALUES(study_hours_per_week),
         preferred_study_time = VALUES(preferred_study_time),
         primary_device       = VALUES(primary_device),
         custom_field_responses = COALESCE(VALUES(custom_field_responses), custom_field_responses),
         completed_at         = NOW()`,
      [
        userId,
        target_exam_date  || null,
        study_hours_per_week || 5,
        preferred_study_time || null,
        primary_device   || null,
        customJson,
      ]
    );

    // Save per-domain self-ratings
    if (domain_self_ratings && typeof domain_self_ratings === 'object') {
      for (const [domainName, rating] of Object.entries(domain_self_ratings)) {
        const [domRows] = await db.query(
          'SELECT id FROM domains WHERE name = ? LIMIT 1',
          [domainName]
        );
        if (!domRows.length) continue;
        await db.query(
          `INSERT INTO learner_domain_self_ratings (user_id, domain_id, self_rating)
           VALUES (?, ?, ?)
           ON DUPLICATE KEY UPDATE self_rating = VALUES(self_rating)`,
          [userId, domRows[0].id, parseInt(rating) || 3]
        );
      }
    }

    console.log(`[Profile] Marking user ${userId} as onboarded.`);
    // 4. Mark as onboarded in DB and Session
    await db.query('UPDATE users SET is_onboarded = TRUE WHERE id = ?', [userId]);
    req.session.user.isOnboarded = true;

    req.session.save((err) => {
      if (err) {
        console.error('[Profile] Session save error:', err);
        return res.status(500).json({ error: 'Failed to save session.' });
      }
      return res.json({ success: true });
    });

  } catch (err) {
    console.error('[Profile] Save error:', err);
    return res.status(500).json({ error: 'Failed to save profile.' });
  }
});

/* ── Announcements API ──────────────────────────────────── */
router.get('/api/announcements', authOnboarded, async (req, res) => {
  const userId = req.session.user.id;
  try {
    const [[userRow]] = await db.query(
      'SELECT batch_id FROM users WHERE id = ?', [userId]
    );
    const batchId = userRow?.batch_id ?? null;

    const [rows] = await db.query(
      `SELECT a.id, a.title, a.body, a.category, a.target_type,
              a.publish_at, a.created_at,
              u.first_name AS authorFirstName, u.last_name AS authorLastName,
              (ar.read_at IS NOT NULL) AS isRead
       FROM announcements a
       JOIN users u ON a.published_by = u.id
       LEFT JOIN announcement_reads ar
              ON ar.announcement_id = a.id AND ar.user_id = ?
       WHERE a.status = 'published'
         AND a.publish_at <= NOW()
         AND (a.target_type = 'all'
              OR (a.target_type = 'batch' AND a.target_batch_id = ?))
       ORDER BY a.publish_at DESC`,
      [userId, batchId]
    );

    res.json({
      announcements: rows,
      unreadCount:   rows.filter(r => !r.isRead).length,
    });
  } catch (err) {
    console.error('[Announcements] API error:', err);
    res.status(500).json({ error: 'Failed to load announcements.' });
  }
});

router.post('/api/announcements/:id/read', authOnboarded, async (req, res) => {
  const userId = req.session.user.id;
  const annId  = Number(req.params.id);
  if (!annId) return res.status(400).json({ error: 'Invalid id.' });
  try {
    await db.query(
      'INSERT IGNORE INTO announcement_reads (user_id, announcement_id) VALUES (?, ?)',
      [userId, annId]
    );
    res.json({ ok: true });
  } catch (err) {
    console.error('[Announcements] Mark-read error:', err);
    res.status(500).json({ error: 'Failed to mark as read.' });
  }
});

/* ── Page routes (Blueprint §12.2 Guard Matrix) ──────────── */
router.get('/dashboard',         authOnboarded, (req, res) => res.render('app/dashboard'));
router.get('/announcements',     authOnboarded, (req, res) => res.render('app/announcements'));

// Onboarding: auth + reviewee only (not yet enrolled)
router.get('/onboarding',        authReviewee, (req, res) => res.render('app/onboarding'));

// Diagnostic: auth + reviewee + enrolled
router.get('/diagnostic',        authEnrolled, (req, res) => res.render('app/diagnostic'));
router.get('/diagnostic-result', authEnrolled, (req, res) => res.render('app/diagnostic-result'));

// Pages requiring enrollment (but not necessarily a completed diagnostic)
router.get('/review',            authEnrolled,  (req, res) => res.render('app/review'));
router.get('/review/session',    authDiagDone,  (req, res) => res.render('app/review-session'));
router.get('/review/result',     authDiagDone,  (req, res) => res.render('app/review-result'));
router.get('/quiz',              authDiagDone,  (req, res) => res.render('app/quiz'));
router.get('/study-plan',        authEnrolled, (req, res) => res.render('app/study-plan'));
router.get('/progress',          authEnrolled, (req, res) => res.render('app/progress'));
router.get('/materials',         authEnrolled, (req, res) => res.render('app/materials'));

// Profile and settings
router.get('/profile',           authOnboarded, (req, res) => res.render('app/learner-profile'));
router.get('/settings',          authReviewee, (req, res) => res.render('app/account-settings'));

module.exports = router;
