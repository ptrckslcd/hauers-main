const express = require('express');
const path = require('path');
const requireAuth = require('../middleware/requireAuth');
const db = require('../config/db');

const router = express.Router();

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

async function getProgRow(userId) {
  const [rows] = await db.query('SELECT * FROM progress_metrics WHERE user_id = ?', [userId]);
  if (!rows.length) return null;
  const r = rows[0];
  return {
    readinessScore:    r.readinessScore    || 0,
    readinessChange:   r.readinessChange   || 0,
    streak:            r.streak            || 0,
    scoreHistory:      parseJson(r.scoreHistory,   []),
    domainProgress:    parseJson(r.domainProgress, []),
    stats:             parseJson(r.stats,           {}),
  };
}

async function getExamDate(userId) {
  const [rows] = await db.query('SELECT examDate FROM study_plans WHERE user_id = ?', [userId]);
  return rows.length ? rows[0].examDate : null;
}

/* ── API: dashboard data ─────────────────────────────────── */
router.get('/api/dashboard', requireAuth, async (req, res) => {
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

    // Today's recommended materials — up to 5 from weakest domains
    let recommendedMaterials = [];
    try {
      if (weakDomains.length) {
        const placeholders = weakDomains.map(() => '?').join(',');
        const [mats] = await db.query(
          `SELECT * FROM materials WHERE domain IN (${placeholders}) ORDER BY recommended DESC, estMinutes ASC LIMIT 5`,
          weakDomains
        );
        recommendedMaterials = mats;
      } else {
        const [mats] = await db.query('SELECT * FROM materials ORDER BY recommended DESC LIMIT 5');
        recommendedMaterials = mats;
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
    const { firstName, lastName, email, examLevel } = req.body || {};

    if (!firstName || !firstName.trim() || !lastName || !lastName.trim() || !email || !email.trim()) {
      return res.status(400).json({ error: 'First name, last name, and email are required.' });
    }

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
      return res.status(400).json({ error: 'Please enter a valid email address.' });
    }

    const userId = req.session.user.id;
    await db.query(
      'UPDATE users SET first_name = ?, last_name = ?, email = ?, exam_level = ? WHERE id = ?',
      [firstName.trim(), lastName.trim(), email.trim(), examLevel || req.session.user.examLevel, userId]
    );

    req.session.user.firstName = firstName.trim();
    req.session.user.lastName  = lastName.trim();
    req.session.user.email     = email.trim();
    if (examLevel) req.session.user.examLevel = examLevel;

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

/* ── API: quiz questions with answers (practice mode) ─────────── */
router.get('/api/quiz', requireAuth, async (req, res) => {
  try {
    const { domain } = req.query;
    let sql = 'SELECT * FROM questions';
    const params = [];
    if (domain && domain !== 'all') {
      sql += ' WHERE domain = ?';
      params.push(domain);
    }
    const [rows] = await db.query(sql, params);
    const questions = rows.map(q => ({
      ...q,
      choices: parseJson(q.choices, []),
    }));
    res.json({ questions });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Database error' });
  }
});

/* ── API: study plan ─────────────────────────────────────────────────── */
router.get('/api/study-plan', requireAuth, async (req, res) => {
  try {
    const user = req.session.user;
    const [rows] = await db.query('SELECT * FROM study_plans WHERE user_id = ?', [user.id]);

    if (rows.length === 0) {
      return res.json({});
    }

    const plan = rows[0];
    res.json({
      examDate:    plan.examDate,
      totalWeeks:  plan.totalWeeks,
      currentWeek: plan.currentWeek,
      weeklyGoal:  parseJson(plan.weeklyGoal,  null),
      dailyTasks:  parseJson(plan.dailyTasks,  null),
      phases:      parseJson(plan.planPhases,  null),
      resources:   [],
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Database error' });
  }
});

/* ── API: session history ────────────────────────────────── */
router.get('/api/sessions', requireAuth, async (req, res) => {
  try {
    const prog = await getProgRow(req.session.user.id);
    const sessions = (prog?.stats?.sessions) || [];
    res.json({ sessions });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Database error' });
  }
});

/* ── API: record completed session ─────────────────────── */
router.post('/api/sessions', requireAuth, async (req, res) => {
  try {
    const userId = req.session.user.id;
    const { startedAt, endedAt, questionCount, domains, domainDeltas, score } = req.body || {};

    const [rows] = await db.query('SELECT * FROM progress_metrics WHERE user_id = ?', [userId]);
    if (!rows.length) return res.status(404).json({ error: 'No progress record found' });

    const prog  = rows[0];
    const stats = parseJson(prog.stats, {});
    const sessions = stats.sessions || [];

    const newSession = {
      id:            Date.now(),
      startedAt:     startedAt  || new Date().toISOString(),
      endedAt:       endedAt    || new Date().toISOString(),
      questionCount: questionCount || 0,
      domains:       domains    || [],
      score:         score      || 0,
      domainDeltas:  domainDeltas || {},
    };
    sessions.unshift(newSession);

    // Update domainScoreHistory
    const domainScoreHistory = stats.domainScoreHistory || {};
    const todayStr = new Date().toISOString().slice(0, 10);
    (domains || []).forEach(d => {
      if (!domainScoreHistory[d]) domainScoreHistory[d] = [];
      const delta = (domainDeltas || {})[d] || 0;
      const last  = domainScoreHistory[d].slice(-1)[0];
      const prev  = last ? last.score : 0;
      domainScoreHistory[d].push({ t: todayStr, score: Math.min(100, Math.max(0, prev + delta)) });
    });

    stats.sessions            = sessions;
    stats.domainScoreHistory  = domainScoreHistory;
    stats.totalSessions       = sessions.length;
    stats.totalQuestions      = (stats.totalQuestions || 0) + (questionCount || 0);

    await db.query(
      'UPDATE progress_metrics SET stats = ? WHERE user_id = ?',
      [JSON.stringify(stats), userId]
    );

    res.json({ success: true, session: newSession });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Database error' });
  }
});

/* ── API: progress ─────────────────────────────────────── */
router.get('/api/progress', requireAuth, async (req, res) => {
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
      scoreHistory:      prog.scoreHistory,
      domainProgress:    prog.domainProgress,
      domainScoreHistory: stats.domainScoreHistory || {},
      examDate:          examDate || null,
      stats: {
        totalSessions:  stats.totalSessions  || 0,
        totalQuizzes:   stats.totalSessions  || 0,
        avgSessionMins: stats.avgSessionMins || 0,
        totalQuestions: stats.totalQuestions || 0,
        diagnosticCompletedAt: stats.diagnosticCompletedAt || null,
      },
      quizHistory:  (stats.sessions || []).slice(0, 10),
      achievements: [],
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Database error' });
  }
});

/* ── API: materials ─────────────────────────────────────── */
router.get('/api/materials', requireAuth, async (req, res) => {
  try {
    const user = req.session.user;
    const prog = await getProgRow(user.id);
    const domainProgress = prog?.domainProgress ?? [];
    const weakDomains = domainProgress.filter(d => d.current < 70).map(d => d.domain);

    const [rows] = await db.query('SELECT * FROM materials');
    res.json({ materials: rows, recommendedDomains: weakDomains.length ? weakDomains : [] });
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
      let sql = 'SELECT * FROM materials WHERE 1=1';
      const params = [];

      if (domain !== 'all') {
        sql += ' AND domain = ?';
        params.push(domain);
      }
      if (type !== 'all') {
        sql += ' AND type = ?';
        params.push(type);
      }

      const [rows] = await db.query(sql, params);
      let results = rows;

      if (query) {
        results = results.filter(m =>
          (m.title  && m.title.toLowerCase().includes(query))  ||
          (m.desc   && m.desc.toLowerCase().includes(query))   ||
          (m.domain && m.domain.toLowerCase().includes(query)) ||
          (m.type   && m.type.toLowerCase().includes(query))
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
    const [rows] = await db.query('SELECT * FROM questions');
    const sanitized = rows.map(q => {
      const { answer, ...rest } = q;
      return {
        ...rest,
        choices: parseJson(rest.choices, []),
      };
    });
    res.json({ questions: sanitized, duration: 45 * 60 });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Database error' });
  }
});

/* ── API: submit diagnostic and persist results ───────── */
router.post('/api/diagnostic/submit', requireAuth, async (req, res) => {
  try {
    const userId = req.session.user.id;
    const { answers } = req.body || {};
    if (!answers || typeof answers !== 'object') {
      return res.status(400).json({ error: 'answers required' });
    }

    const [rows] = await db.query('SELECT id, answer, domain FROM questions');
    const questions = rows;

    const domainMap = {};
    let totalCorrect = 0;

    questions.forEach(q => {
      const correct = answers[q.id] === q.answer;
      if (correct) totalCorrect++;
      if (!domainMap[q.domain]) domainMap[q.domain] = { total: 0, correct: 0 };
      domainMap[q.domain].total++;
      if (correct) domainMap[q.domain].correct++;
    });

    const overallScore = questions.length
      ? Math.round((totalCorrect / questions.length) * 100)
      : 0;

    const domainScores = Object.entries(domainMap).map(([domain, { total, correct }]) => ({
      domain,
      score:   Math.round((correct / total) * 100),
      correct,
      total,
    }));

    const weakDomains = domainScores
      .filter(d => d.score < 70)
      .sort((a, b) => a.score - b.score)
      .map(d => d.domain);

    const grade =
      overallScore >= 90 ? 'Excellent' :
      overallScore >= 80 ? 'Above Average' :
      overallScore >= 70 ? 'Average' : 'Needs Improvement';

    /* ── Persist to progress_metrics ─────────────────── */
    const todayStr = new Date().toISOString().slice(0, 10);
    const now      = new Date().toISOString();

    const domainProgressArr = domainScores.map(d => ({
      domain:   d.domain,
      baseline: d.score,
      current:  d.score,
      target:   80,
      color:    DOMAIN_COLORS[d.domain] || '#888',
    }));

    // Build initial domainScoreHistory from this first baseline
    const domainScoreHistory = {};
    domainScores.forEach(d => {
      domainScoreHistory[d.domain] = [{ t: todayStr, score: d.score }];
    });

    const [existing] = await db.query('SELECT * FROM progress_metrics WHERE user_id = ?', [userId]);

    if (existing.length) {
      // Preserve existing domainScoreHistory if re-taking diagnostic
      const oldStats = parseJson(existing[0].stats, {});
      const oldDSH   = oldStats.domainScoreHistory || {};
      domainScores.forEach(d => {
        const hist = oldDSH[d.domain] || [];
        hist.push({ t: todayStr, score: d.score });
        domainScoreHistory[d.domain] = hist;
      });

      const newStats = {
        ...oldStats,
        diagnosticCompletedAt: now,
        domainScoreHistory,
        sessions: oldStats.sessions || [],
      };

      await db.query(
        `UPDATE progress_metrics
         SET readinessScore = ?, readinessChange = ?,
             domainProgress = ?, stats = ?
         WHERE user_id = ?`,
        [
          overallScore,
          overallScore - (existing[0].readinessScore || 0),
          JSON.stringify(domainProgressArr),
          JSON.stringify(newStats),
          userId,
        ]
      );
    } else {
      const newStats = {
        diagnosticCompletedAt: now,
        domainScoreHistory,
        sessions: [],
      };
      await db.query(
        `INSERT INTO progress_metrics
         (user_id, readinessScore, readinessChange, streak, domainProgress, stats)
         VALUES (?, ?, ?, ?, ?, ?)`,
        [userId, overallScore, 0, 0, JSON.stringify(domainProgressArr), JSON.stringify(newStats)]
      );
    }

    res.json({ overallScore, correct: totalCorrect, total: questions.length, domainScores, weakDomains, grade });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Database error' });
  }
});

/* ── API: change password ───────────────────────────────── */
router.post('/api/settings/password', requireAuth, async (req, res) => {
  try {
    const { currentPassword, newPassword, confirmPassword } = req.body || {};

    if (!currentPassword || !newPassword || !confirmPassword) {
      return res.status(400).json({ error: 'All fields are required.' });
    }
    if (newPassword.length < 6) {
      return res.status(400).json({ error: 'New password must be at least 6 characters.' });
    }
    if (newPassword !== confirmPassword) {
      return res.status(400).json({ error: 'New passwords do not match.' });
    }

    const userId = req.session.user.id;
    const [urows] = await db.query('SELECT password FROM users WHERE id = ?', [userId]);

    if (!urows.length || urows[0].password !== currentPassword) {
      return res.status(400).json({ error: 'Current password is incorrect.' });
    }

    await db.query('UPDATE users SET password = ? WHERE id = ?', [newPassword, userId]);
    res.json({ success: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Database error' });
  }
});

/* ── Page routes ─────────────────────────────────────────── */
router.get('/dashboard', requireAuth, (req, res) => res.render('app/dashboard'));
router.get('/onboarding', requireAuth, (req, res) => res.render('app/onboarding'));
router.get('/learner-profile', requireAuth, (req, res) => res.render('app/learner-profile'));
router.get('/diagnostic', requireAuth, (req, res) => res.render('app/diagnostic'));
router.get('/diagnostic-result', requireAuth, (req, res) => res.render('app/diagnostic-result'));
router.get('/quiz', requireAuth, (req, res) => res.render('app/quiz'));
router.get('/study-plan', requireAuth, (req, res) => res.render('app/study-plan'));
router.get('/progress', requireAuth, (req, res) => res.render('app/progress'));
router.get('/materials', requireAuth, (req, res) => res.render('app/materials'));
router.get('/settings', requireAuth, (req, res) => res.render('app/account-settings'));
router.get('/review', requireAuth, (req, res) => res.render('app/review'));

module.exports = router;
