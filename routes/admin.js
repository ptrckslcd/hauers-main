const express       = require('express');
const path          = require('path');
const fs            = require('fs');
const crypto        = require('crypto');
const multer        = require('multer');
const requireAdmin  = require('../middleware/requireAdmin');
const db            = require('../config/db');
const profileFormSurvey = require('../lib/profileFormSurvey');
const platformSettings = require('../lib/platformSettings');

const MATERIALS_UPLOAD_DIR = path.join(__dirname, '..', 'public', 'uploads', 'materials');
if (!fs.existsSync(MATERIALS_UPLOAD_DIR)) {
  fs.mkdirSync(MATERIALS_UPLOAD_DIR, { recursive: true });
}
const materialsStorage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, MATERIALS_UPLOAD_DIR),
  filename: (_req, file, cb) => {
    const ext = path.extname(file.originalname || '').toLowerCase();
    const base = `${Date.now()}-${crypto.randomBytes(6).toString('hex')}`;
    cb(null, base + (ext || ''));
  },
});
const materialsUpload = multer({
  storage: materialsStorage,
  limits: { fileSize: 30 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    const allowed = new Set([
      'application/pdf',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'application/msword',
    ]);
    if (allowed.has(file.mimetype)) return cb(null, true);
    cb(new Error('Only PDF and Word documents are allowed.'));
  },
});

const MAT_TYPES = new Set(['lesson_module', 'practice_set', 'mock_exam', 'reference_sheet']);
const MAT_STATUS = new Set(['published', 'draft']);
const MAT_EXAM = new Set(['professional', 'subprofessional', 'both']);
const DIFF_TO_DB = { easy: 'basic', medium: 'intermediate', hard: 'advanced' };
const DIFF_FROM_DB = { basic: 'easy', intermediate: 'medium', advanced: 'hard' };

function mapDifficultyToDbStrict(ui) {
  const k = String(ui || '').toLowerCase();
  return DIFF_TO_DB[k] || null;
}

const router = express.Router();

router.get('/home', requireAdmin, (req, res) => {
  res.render('admin/dashboard');
});

router.get('/reviewees', requireAdmin, (req, res) => {
  res.render('admin/users');
});

router.get('/reviewees/:id', requireAdmin, (req, res) => {
  res.render('admin/user-detail');
});

router.get('/question-bank', requireAdmin, (req, res) => {
  res.render('admin/question-bank');
});

router.get('/question-bank/:id', requireAdmin, (req, res) => {
  res.render('admin/question-detail');
});

router.get('/profile-form', requireAdmin, (req, res) => {
  res.render('admin/profile-form');
});

router.get('/reports', requireAdmin, (req, res) => {
  res.render('admin/analytics');
});

router.get('/materials', requireAdmin, (req, res) => {
  res.render('admin/materials');
});

router.get('/announcements', requireAdmin, (req, res) => {
  res.render('admin/announcements');
});

router.get('/batches', requireAdmin, (req, res) => {
  res.render('admin/batches');
});

router.get('/settings', requireAdmin, (req, res) => {
  res.render('admin/account-settings');
});

/* ── API: Batches & Enrollment ───────────────────────────── */

router.get('/api/batches', requireAdmin, async (req, res) => {
  try {
    const [batches] = await db.query(`
      SELECT b.*, COUNT(DISTINCT e.id) AS enrollment_count
      FROM batches b
      LEFT JOIN enrollments e ON e.batch_id = b.id
      GROUP BY b.id
      ORDER BY b.created_at DESC
    `);
    res.json({ batches });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Database error' });
  }
});

router.get('/api/batches/:id', requireAdmin, async (req, res) => {
  try {
    const batchId = parseInt(req.params.id, 10);
    const [[batch]] = await db.query(`
      SELECT b.*, COUNT(DISTINCT e.id) AS enrollment_count
      FROM batches b
      LEFT JOIN enrollments e ON e.batch_id = b.id
      WHERE b.id = ?
      GROUP BY b.id
    `, [batchId]);
    if (!batch) return res.status(404).json({ error: 'Not found' });
    res.json({ batch });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Database error' });
  }
});

router.post('/api/batches', requireAdmin, async (req, res) => {
  try {
    const { name, exam_level, start_date, end_date, max_capacity, status } = req.body || {};
    const userId = req.session.user.id;
    if (!name || !exam_level || !start_date || !end_date) {
      return res.status(400).json({ error: 'Missing required fields' });
    }
    const lvl = ['professional', 'subprofessional'].includes(String(exam_level).toLowerCase())
      ? String(exam_level).toLowerCase()
      : null;
    if (!lvl) return res.status(400).json({ error: 'Invalid exam level' });
    const st = ['draft', 'active', 'closed'].includes(status) ? status : 'draft';
    const cap = max_capacity === '' || max_capacity == null ? null : Math.max(0, parseInt(max_capacity, 10) || 0);

    const [result] = await db.query(
      `INSERT INTO batches (name, exam_level, start_date, end_date, max_capacity, status, created_by)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [String(name).trim(), lvl, start_date, end_date, cap, st, userId]
    );
    res.json({ success: true, batchId: result.insertId });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Database error' });
  }
});

router.put('/api/batches/:id', requireAdmin, async (req, res) => {
  try {
    const batchId = parseInt(req.params.id, 10);
    const { name, exam_level, start_date, end_date, max_capacity, status } = req.body || {};
    if (!name || !exam_level || !start_date || !end_date) {
      return res.status(400).json({ error: 'Missing required fields' });
    }
    const lvl = ['professional', 'subprofessional'].includes(String(exam_level).toLowerCase())
      ? String(exam_level).toLowerCase()
      : null;
    if (!lvl) return res.status(400).json({ error: 'Invalid exam level' });
    if (!['draft', 'active', 'closed'].includes(status)) {
      return res.status(400).json({ error: 'Invalid status' });
    }
    const cap = max_capacity === '' || max_capacity == null ? null : Math.max(0, parseInt(max_capacity, 10) || 0);

    const [r] = await db.query(
      `UPDATE batches SET name = ?, exam_level = ?, start_date = ?, end_date = ?, max_capacity = ?, status = ?
       WHERE id = ?`,
      [String(name).trim(), lvl, start_date, end_date, cap, status, batchId]
    );
    if (r.affectedRows === 0) return res.status(404).json({ error: 'Not found' });
    res.json({ success: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Database error' });
  }
});

function codeDisplayStatus(row) {
  if (!row.is_active) return 'revoked';
  if (row.expires_at && new Date(row.expires_at) < new Date()) return 'expired';
  if (row.used_count >= row.max_uses) return 'used';
  return 'available';
}

router.get('/api/batches/:id/codes', requireAdmin, async (req, res) => {
  try {
    const batchId = parseInt(req.params.id, 10);
    const [codes] = await db.query(
      `SELECT ec.id, ec.code, ec.batch_id, ec.max_uses, ec.used_count, ec.expires_at, ec.is_active, ec.created_at,
              GROUP_CONCAT(DISTINCT CONCAT(u.first_name, ' ', u.last_name) ORDER BY e.enrolled_at SEPARATOR ', ') AS usedByNames,
              MIN(e.enrolled_at) AS firstUsedAt
       FROM enrollment_codes ec
       LEFT JOIN enrollments e ON e.enrollment_code_id = ec.id
       LEFT JOIN users u ON u.id = e.user_id
       WHERE ec.batch_id = ?
       GROUP BY ec.id
       ORDER BY ec.created_at DESC`,
      [batchId]
    );
    const enriched = codes.map(c => ({
      ...c,
      displayStatus: codeDisplayStatus(c),
    }));
    res.json({ codes: enriched });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Database error' });
  }
});

router.get('/api/batches/:id/codes/export', requireAdmin, async (req, res) => {
  try {
    const batchId = parseInt(req.params.id, 10);
    const [codes] = await db.query(
      `SELECT ec.id, ec.code, ec.max_uses, ec.used_count, ec.expires_at, ec.is_active, ec.created_at,
              GROUP_CONCAT(DISTINCT CONCAT(u.first_name, ' ', u.last_name) ORDER BY e.enrolled_at SEPARATOR '; ') AS usedByNames,
              MIN(e.enrolled_at) AS firstUsedAt
       FROM enrollment_codes ec
       LEFT JOIN enrollments e ON e.enrollment_code_id = ec.id
       LEFT JOIN users u ON u.id = e.user_id
       WHERE ec.batch_id = ?
       GROUP BY ec.id
       ORDER BY ec.created_at DESC`,
      [batchId]
    );
    const esc = v => {
      if (v == null) return '';
      const s = String(v);
      if (/[",\n]/.test(s)) return `"${s.replace(/"/g, '""')}"`;
      return s;
    };
    const header = 'code,max_uses,used_count,status,expires_at,first_used_at,used_by,created_at';
    const lines = codes.map(c => {
      const st = codeDisplayStatus(c);
      return [
        esc(c.code),
        c.max_uses,
        c.used_count,
        st,
        c.expires_at || '',
        c.firstUsedAt || '',
        esc(c.usedByNames || ''),
        c.created_at,
      ].join(',');
    });
    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename="hauers-batch-${batchId}-codes.csv"`);
    res.send('\uFEFF' + [header, ...lines].join('\n'));
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Database error' });
  }
});

router.post('/api/batches/:id/codes', requireAdmin, async (req, res) => {
  try {
    const batchId = parseInt(req.params.id, 10);
    const { quantity = 1, max_uses = 1, expires_at } = req.body || {};
    const n = Math.min(Math.max(parseInt(quantity, 10) || 1, 1), 500);
    const maxU = Math.max(1, parseInt(max_uses, 10) || 1);
    const exp = expires_at && String(expires_at).trim() ? String(expires_at).trim() : null;

    const inserted = [];
    for (let i = 0; i < n; i++) {
      let code;
      let ok = false;
      for (let attempt = 0; attempt < 12 && !ok; attempt++) {
        code = crypto.randomBytes(4).toString('hex').toUpperCase();
        try {
          const [result] = await db.query(
            'INSERT INTO enrollment_codes (code, batch_id, max_uses, expires_at) VALUES (?, ?, ?, ?)',
            [code, batchId, maxU, exp]
          );
          inserted.push({ id: result.insertId, code });
          ok = true;
        } catch (e) {
          if (e.code !== 'ER_DUP_ENTRY') throw e;
        }
      }
      if (!ok) return res.status(500).json({ error: 'Could not generate unique code' });
    }

    res.json({ success: true, codes: inserted, count: inserted.length });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Database error' });
  }
});

router.post('/api/enrollment-codes/:id/revoke', requireAdmin, async (req, res) => {
  try {
    const id = parseInt(req.params.id, 10);
    const [r] = await db.query('UPDATE enrollment_codes SET is_active = FALSE WHERE id = ?', [id]);
    if (r.affectedRows === 0) return res.status(404).json({ error: 'Not found' });
    res.json({ success: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Database error' });
  }
});

/* ── API: update admin profile ──────────────────────────── */
router.post('/api/profile/update', requireAdmin, async (req, res) => {
  try {
    const { firstName, lastName, email } = req.body || {};

    if (!firstName?.trim() || !lastName?.trim() || !email?.trim()) {
      return res.status(400).json({ error: 'First name, last name, and email are required.' });
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
      return res.status(400).json({ error: 'Please enter a valid email address.' });
    }

    const userId = req.session.user.id;
    await db.query(
      'UPDATE users SET first_name = ?, last_name = ?, email = ? WHERE id = ?',
      [firstName.trim(), lastName.trim(), email.trim(), userId]
    );

    req.session.user.firstName = firstName.trim();
    req.session.user.lastName  = lastName.trim();
    req.session.user.email     = email.trim();

    res.json({
      success: true,
      user: {
        firstName: req.session.user.firstName,
        lastName:  req.session.user.lastName,
        email:     req.session.user.email,
      },
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Database error' });
  }
});

/* ── API: change admin password ────────────────────────── */
router.post('/api/settings/password', requireAdmin, async (req, res) => {
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
    const [rows] = await db.query('SELECT password FROM users WHERE id = ?', [userId]);

    if (rows.length === 0 || rows[0].password !== currentPassword) {
      return res.status(400).json({ error: 'Current password is incorrect.' });
    }

    await db.query('UPDATE users SET password = ? WHERE id = ?', [newPassword, userId]);

    res.json({ success: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Database error' });
  }
});

/* ═══════════════════════════════════════════════════════════
   ADMIN SETTINGS — Platform configuration + maintenance
   ═══════════════════════════════════════════════════════════ */

async function tryLogServerError(req, err) {
  try {
    await db.query(
      'CREATE TABLE IF NOT EXISTS system_error_logs (id INT AUTO_INCREMENT PRIMARY KEY, route VARCHAR(255) DEFAULT NULL, message TEXT NOT NULL, stack MEDIUMTEXT DEFAULT NULL, created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP)'
    );
    await db.query(
      'INSERT INTO system_error_logs (route, message, stack) VALUES (?, ?, ?)',
      [req?.originalUrl || null, String(err?.message || 'Unknown error'), err?.stack ? String(err.stack).slice(0, 60000) : null]
    );
  } catch (_) {}
}

router.get('/api/settings/platform', requireAdmin, async (_req, res) => {
  try {
    const settings = await platformSettings.getPlatformSettings(db);
    res.json({ settings });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Database error' });
  }
});

router.post('/api/settings/platform', requireAdmin, async (req, res) => {
  try {
    const adminId = req.session.user.id;
    const { settings } = req.body || {};
    if (!platformSettings.validateSettingsPayload(settings)) {
      return res.status(400).json({ error: 'Invalid settings payload.' });
    }
    const saved = await platformSettings.savePlatformSettings(db, settings, adminId);
    res.json({ success: true, settings: saved });
  } catch (err) {
    console.error(err);
    await tryLogServerError(req, err);
    res.status(500).json({ error: 'Database error' });
  }
});

router.post('/api/settings/maintenance/clear-stale-sessions', requireAdmin, async (req, res) => {
  try {
    const days = Math.max(1, Math.min(3650, Number(req.body?.days || 30)));
    const cutoff = `DATE_SUB(NOW(), INTERVAL ${Math.round(days)} DAY)`;

    const [r1] = await db.query(
      `DELETE FROM practice_sessions
        WHERE status <> 'completed' AND started_at < ${cutoff}`
    );
    const [r2] = await db.query(
      `DELETE FROM diagnostic_sessions
        WHERE status <> 'completed' AND started_at < ${cutoff}`
    );
    res.json({ success: true, days, deleted: { practice: r1.affectedRows || 0, diagnostic: r2.affectedRows || 0 } });
  } catch (err) {
    console.error(err);
    await tryLogServerError(req, err);
    res.status(500).json({ error: 'Database error' });
  }
});

router.post('/api/settings/maintenance/archive-inactive-users', requireAdmin, async (_req, res) => {
  try {
    const [r] = await db.query(
      `UPDATE users u
         JOIN batches b ON b.id = u.batch_id
          SET u.is_suspended = 1
        WHERE u.role = 'reviewee'
          AND u.batch_id IS NOT NULL
          AND b.end_date < DATE_SUB(CURDATE(), INTERVAL 2 YEAR)`
    );
    res.json({ success: true, affected: r.affectedRows || 0 });
  } catch (err) {
    console.error(err);
    await tryLogServerError(req, err);
    res.status(500).json({ error: 'Database error' });
  }
});

router.get('/api/settings/logs', requireAdmin, async (req, res) => {
  try {
    const limit = Math.max(1, Math.min(100, Number(req.query?.limit || 100)));
    await db.query(
      'CREATE TABLE IF NOT EXISTS system_error_logs (id INT AUTO_INCREMENT PRIMARY KEY, route VARCHAR(255) DEFAULT NULL, message TEXT NOT NULL, stack MEDIUMTEXT DEFAULT NULL, created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP)'
    );
    const [rows] = await db.query(
      'SELECT id, route, message, created_at FROM system_error_logs ORDER BY id DESC LIMIT ?',
      [limit]
    );
    res.json({ logs: rows });
  } catch (err) {
    console.error(err);
    await tryLogServerError(req, err);
    res.status(500).json({ error: 'Database error' });
  }
});

/* ── API: all reviewees (enriched) ─────────────────────────── */
router.get('/api/users', requireAdmin, async (req, res) => {
  try {
    const [rows] = await db.query(`
      SELECT
        u.id,
        u.first_name        AS firstName,
        u.last_name         AS lastName,
        u.email,
        u.is_verified       AS isVerified,
        u.is_enrolled       AS isEnrolled,
        u.is_suspended      AS isSuspended,
        u.is_approved       AS isApproved,
        u.exam_level        AS examLevel,
        u.streak,
        u.last_active       AS lastActive,
        u.created_at        AS joinedAt,
        b.name              AS batchName,
        b.id                AS batchId,
        e.enrolled_at       AS enrolledAt,
        ds.status           AS diagnosticStatus,
        ds.completed_at     AS diagnosticCompletedAt
      FROM users u
      LEFT JOIN batches b ON b.id = u.batch_id
      LEFT JOIN enrollments e ON e.user_id = u.id AND e.batch_id = u.batch_id
      LEFT JOIN (
        SELECT ds.user_id, ds.status, ds.completed_at
        FROM diagnostic_sessions ds
        INNER JOIN (
          SELECT user_id, MAX(completed_at) AS mx
          FROM diagnostic_sessions
          WHERE status = 'completed' AND completed_at IS NOT NULL
          GROUP BY user_id
        ) latest ON latest.user_id = ds.user_id AND latest.mx = ds.completed_at
        WHERE ds.status = 'completed'
      ) ds ON ds.user_id = u.id
      WHERE u.role = 'reviewee'
      ORDER BY u.created_at DESC
    `);
    res.json({ users: rows, total: rows.length });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Database error' });
  }
});

/* ── API: single reviewee (full detail) ────────────────────── */
router.get('/api/users/:id', requireAdmin, async (req, res) => {
  try {
    const uid = parseInt(req.params.id, 10);

    const [[user]] = await db.query(`
      SELECT
        u.id,
        u.first_name        AS firstName,
        u.last_name         AS lastName,
        u.email,
        u.is_verified       AS isVerified,
        u.is_enrolled       AS isEnrolled,
        u.is_suspended      AS isSuspended,
        u.is_approved       AS isApproved,
        u.exam_level        AS examLevel,
        u.streak,
        u.last_active       AS lastActive,
        u.created_at        AS joinedAt,
        b.name              AS batchName,
        b.id                AS batchId,
        e.enrolled_at       AS enrolledAt
      FROM users u
      LEFT JOIN batches b ON b.id = u.batch_id
      LEFT JOIN enrollments e ON e.user_id = u.id AND e.batch_id = u.batch_id
      WHERE u.id = ? AND u.role = 'reviewee'
    `, [uid]);

    if (!user) return res.status(404).json({ error: 'Not found' });

    /* Learner profile */
    const [[lp]] = await db.query(
      `SELECT target_exam_date, study_hours_per_week, preferred_study_time, primary_device, completed_at,
              custom_field_responses
       FROM learner_profiles WHERE user_id = ?`, [uid]);

    /* Domain self-ratings */
    const [selfRatings] = await db.query(
      `SELECT d.name AS domain, r.self_rating AS rating
       FROM learner_domain_self_ratings r
       JOIN domains d ON d.id = r.domain_id
       WHERE r.user_id = ? ORDER BY d.sort_order`, [uid]);

    /* Diagnostic session */
    const [[diag]] = await db.query(
      `SELECT status, completed_at, total_questions, correct_count
       FROM diagnostic_sessions
       WHERE user_id = ? AND status = 'completed'
       ORDER BY completed_at DESC LIMIT 1`, [uid]);

    /* Learner profile form responses (SurveyJS keys in custom_field_responses) */
    let customJson = {};
    if (lp?.custom_field_responses) {
      try {
        customJson =
          typeof lp.custom_field_responses === 'string'
            ? JSON.parse(lp.custom_field_responses)
            : lp.custom_field_responses;
      } catch {
        customJson = {};
      }
    }
    if (!customJson || typeof customJson !== 'object') customJson = {};
    const schemaJsonRev = await profileFormSurvey.getProfileFormSchemaJson(db);
    const formColsRev = profileFormSurvey.extractSchemaColumns(schemaJsonRev);
    const formResponses = formColsRev.map((c) => ({
      question: c.label,
      answer: profileFormSurvey.formatCustomJsonValue(customJson[c.field_key]),
    }));

    res.json({ user, learnerProfile: lp || null, selfRatings, diagnostic: diag || null, formResponses });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Database error' });
  }
});

/* ── API: reset enrollment ──────────────────────────────────── */
router.post('/api/reviewees/:id/reset-enrollment', requireAdmin, async (req, res) => {
  try {
    const uid = parseInt(req.params.id, 10);
    await db.query('DELETE FROM enrollments WHERE user_id = ?', [uid]);
    await db.query('UPDATE users SET batch_id = NULL, is_enrolled = FALSE WHERE id = ?', [uid]);
    res.json({ success: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Database error' });
  }
});

/* ── API: suspend / unsuspend ────────────────────────────────── */
router.post('/api/reviewees/:id/suspend', requireAdmin, async (req, res) => {
  try {
    const uid = parseInt(req.params.id, 10);
    const { suspend } = req.body;                     // true = suspend, false = unsuspend
    await db.query('UPDATE users SET is_suspended = ? WHERE id = ? AND role = "reviewee"',
      [suspend ? 1 : 0, uid]);
    res.json({ success: true, isSuspended: !!suspend });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Database error' });
  }
});

/* ── API: approve (bypass enrollment code gate) ─────────────── */
router.post('/api/reviewees/:id/approve', requireAdmin, async (req, res) => {
  try {
    const uid = parseInt(req.params.id, 10);
    await db.query('UPDATE users SET is_approved = TRUE WHERE id = ? AND role = "reviewee"', [uid]);
    res.json({ success: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Database error' });
  }
});

/* ── helpers ──────────────────────────────────────────────── */
function normalizeQuestion(q, domainRows) {
  return {
    id: q.id,
    question_text: q.question_text,
    choice_a: q.choice_a,
    choice_b: q.choice_b,
    choice_c: q.choice_c,
    choice_d: q.choice_d,
    correct_choice: q.correct_choice,
    explanation: q.explanation || null,
    difficulty: q.difficulty,
    exam_level: q.exam_level,
    melo_difficulty: q.melo_difficulty,
    status: q.status,
    created_at: q.created_at,
    updated_at: q.updated_at,
    domains: domainRows || [],
  };
}

/* ── API: list questions — with filtering ──────────────────── */
router.get('/api/questions', requireAdmin, async (req, res) => {
  try {
    const { q = '', domain_id = '', exam_level = '', difficulty = '', status = '' } = req.query;
    let sql = `
      SELECT q.*,
             GROUP_CONCAT(d.id ORDER BY d.sort_order SEPARATOR ',') AS domain_ids,
             GROUP_CONCAT(d.name ORDER BY d.sort_order SEPARATOR '||') AS domain_names
        FROM questions q
        LEFT JOIN question_domains qd ON qd.question_id = q.id
        LEFT JOIN domains d ON d.id = qd.domain_id
       WHERE 1=1`;
    const params = [];

    if (q.trim()) {
      sql += ' AND (q.question_text LIKE ? OR q.choice_a LIKE ? OR q.choice_b LIKE ? OR q.choice_c LIKE ? OR q.choice_d LIKE ?)';
      const like = '%' + q.trim() + '%';
      params.push(like, like, like, like, like);
    }
    if (domain_id) {
      sql += ' AND EXISTS (SELECT 1 FROM question_domains qd2 WHERE qd2.question_id = q.id AND qd2.domain_id = ?)';
      params.push(Number(domain_id));
    }
    if (exam_level) { sql += ' AND q.exam_level = ?'; params.push(exam_level); }
    if (difficulty) { sql += ' AND q.difficulty = ?'; params.push(difficulty); }
    if (status)     { sql += ' AND q.status = ?';     params.push(status); }

    sql += ' GROUP BY q.id ORDER BY q.id DESC';

    const [rows] = await db.query(sql, params);

    // KPI counts (no filters applied, always full set)
    const [[{ total }]]    = await db.query("SELECT COUNT(*) AS total FROM questions");
    const [[{ active }]]   = await db.query("SELECT COUNT(*) AS active FROM questions WHERE status='active'");
    const [[{ draft }]]    = await db.query("SELECT COUNT(*) AS draft FROM questions WHERE status='draft'");
    const [[{ archived }]] = await db.query("SELECT COUNT(*) AS archived FROM questions WHERE status='archived'");

    // Domain list for filters
    const [domainList] = await db.query('SELECT id, name, exam_level FROM domains ORDER BY sort_order');

    const questions = rows.map(r => ({
      id: r.id,
      question_text: r.question_text,
      choice_a: r.choice_a,
      choice_b: r.choice_b,
      choice_c: r.choice_c,
      choice_d: r.choice_d,
      correct_choice: r.correct_choice,
      explanation: r.explanation || null,
      difficulty: r.difficulty,
      exam_level: r.exam_level,
      melo_difficulty: r.melo_difficulty,
      status: r.status,
      created_at: r.created_at,
      domain_ids: r.domain_ids ? r.domain_ids.split(',').map(Number) : [],
      domain_names: r.domain_names ? r.domain_names.split('||') : [],
    }));

    res.json({ questions, total, active, draft, archived, domains: domainList });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Database error' });
  }
});

/* ── API: single question with usage stats ─────────────────── */
router.get('/api/questions/:id', requireAdmin, async (req, res) => {
  try {
    const id = parseInt(req.params.id, 10);
    const [[q]] = await db.query('SELECT * FROM questions WHERE id = ?', [id]);
    if (!q) return res.status(404).json({ error: 'Question not found.' });

    const [domainRows] = await db.query(
      'SELECT d.id, d.name, d.code FROM question_domains qd JOIN domains d ON d.id = qd.domain_id WHERE qd.question_id = ? ORDER BY d.sort_order',
      [id]
    );

    // Usage: practice sessions
    const [[practiceStats]] = await db.query(
      `SELECT COUNT(*) AS times_seen,
              SUM(CASE WHEN is_correct = 1 THEN 1 ELSE 0 END) AS times_correct
         FROM session_answers WHERE question_id = ?`,
      [id]
    );
    // Usage: diagnostic sessions
    const [[diagStats]] = await db.query(
      `SELECT COUNT(*) AS times_seen,
              SUM(CASE WHEN is_correct = 1 THEN 1 ELSE 0 END) AS times_correct
         FROM diagnostic_answers WHERE question_id = ?`,
      [id]
    );

    const times_seen    = (Number(practiceStats.times_seen)    || 0) + (Number(diagStats.times_seen)    || 0);
    const times_correct = (Number(practiceStats.times_correct) || 0) + (Number(diagStats.times_correct) || 0);

    res.json({
      question: normalizeQuestion(q, domainRows),
      usage: { times_seen, times_correct },
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Database error' });
  }
});

/* ── API: create question ──────────────────────────────────── */
router.post('/api/questions', requireAdmin, async (req, res) => {
  try {
    const {
      question_text, choice_a, choice_b, choice_c, choice_d,
      correct_choice, explanation, difficulty, exam_level,
      melo_difficulty, status, domain_ids,
    } = req.body || {};

    if (!question_text?.trim()) return res.status(400).json({ error: 'Question text is required.' });
    if (!choice_a?.trim() || !choice_b?.trim() || !choice_c?.trim() || !choice_d?.trim())
      return res.status(400).json({ error: 'All four choices are required.' });
    if (!['a','b','c','d'].includes(correct_choice))
      return res.status(400).json({ error: 'Correct choice must be a, b, c, or d.' });
    if (!['easy','medium','hard'].includes(difficulty))
      return res.status(400).json({ error: 'Invalid difficulty.' });
    if (!['professional','subprofessional','both'].includes(exam_level))
      return res.status(400).json({ error: 'Invalid exam level.' });
    if (!['active','draft'].includes(status))
      return res.status(400).json({ error: 'Status must be active or draft.' });

    const melo = parseFloat(melo_difficulty) || 1200.0;
    const userId = req.session?.user?.id || null;

    const [result] = await db.query(
      `INSERT INTO questions (question_text, choice_a, choice_b, choice_c, choice_d,
         correct_choice, explanation, difficulty, exam_level, melo_difficulty, status, created_by)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        question_text.trim(), choice_a.trim(), choice_b.trim(), choice_c.trim(), choice_d.trim(),
        correct_choice, explanation?.trim() || null, difficulty, exam_level, melo, status, userId,
      ]
    );

    const qid = result.insertId;

    if (Array.isArray(domain_ids) && domain_ids.length) {
      const vals = domain_ids.map(did => [qid, Number(did), 1.0]);
      await db.query('INSERT IGNORE INTO question_domains (question_id, domain_id, weight) VALUES ?', [vals]);
    }

    const [[created]] = await db.query('SELECT * FROM questions WHERE id = ?', [qid]);
    const [domRows] = await db.query(
      'SELECT d.id, d.name, d.code FROM question_domains qd JOIN domains d ON d.id = qd.domain_id WHERE qd.question_id = ? ORDER BY d.sort_order',
      [qid]
    );

    res.status(201).json({ success: true, question: normalizeQuestion(created, domRows) });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Database error' });
  }
});

/* ── API: update question ──────────────────────────────────── */
router.put('/api/questions/:id', requireAdmin, async (req, res) => {
  try {
    const id = parseInt(req.params.id, 10);
    const {
      question_text, choice_a, choice_b, choice_c, choice_d,
      correct_choice, explanation, difficulty, exam_level,
      melo_difficulty, status, domain_ids,
    } = req.body || {};

    if (!question_text?.trim()) return res.status(400).json({ error: 'Question text is required.' });
    if (!choice_a?.trim() || !choice_b?.trim() || !choice_c?.trim() || !choice_d?.trim())
      return res.status(400).json({ error: 'All four choices are required.' });
    if (!['a','b','c','d'].includes(correct_choice))
      return res.status(400).json({ error: 'Correct choice must be a, b, c, or d.' });
    if (!['easy','medium','hard'].includes(difficulty))
      return res.status(400).json({ error: 'Invalid difficulty.' });
    if (!['professional','subprofessional','both'].includes(exam_level))
      return res.status(400).json({ error: 'Invalid exam level.' });
    if (!['active','draft','archived'].includes(status))
      return res.status(400).json({ error: 'Invalid status.' });

    const melo = parseFloat(melo_difficulty) || 1200.0;

    const [result] = await db.query(
      `UPDATE questions SET question_text=?, choice_a=?, choice_b=?, choice_c=?, choice_d=?,
         correct_choice=?, explanation=?, difficulty=?, exam_level=?, melo_difficulty=?, status=?
       WHERE id=?`,
      [
        question_text.trim(), choice_a.trim(), choice_b.trim(), choice_c.trim(), choice_d.trim(),
        correct_choice, explanation?.trim() || null, difficulty, exam_level, melo, status, id,
      ]
    );

    if (result.affectedRows === 0) return res.status(404).json({ error: 'Question not found.' });

    if (Array.isArray(domain_ids)) {
      await db.query('DELETE FROM question_domains WHERE question_id = ?', [id]);
      if (domain_ids.length) {
        const vals = domain_ids.map(did => [id, Number(did), 1.0]);
        await db.query('INSERT IGNORE INTO question_domains (question_id, domain_id, weight) VALUES ?', [vals]);
      }
    }

    const [[updated]] = await db.query('SELECT * FROM questions WHERE id = ?', [id]);
    const [domRows] = await db.query(
      'SELECT d.id, d.name, d.code FROM question_domains qd JOIN domains d ON d.id = qd.domain_id WHERE qd.question_id = ? ORDER BY d.sort_order',
      [id]
    );

    res.json({ success: true, question: normalizeQuestion(updated, domRows) });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Database error' });
  }
});

/* ── API: archive question (soft delete) ───────────────────── */
router.post('/api/questions/:id/archive', requireAdmin, async (req, res) => {
  try {
    const id = parseInt(req.params.id, 10);
    const [result] = await db.query("UPDATE questions SET status='archived' WHERE id=?", [id]);
    if (result.affectedRows === 0) return res.status(404).json({ error: 'Question not found.' });
    res.json({ success: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Database error' });
  }
});

/* ── API: delete question (hard) ───────────────────────────── */
router.delete('/api/questions/:id', requireAdmin, async (req, res) => {
  try {
    const id = parseInt(req.params.id, 10);
    const [result] = await db.query('DELETE FROM questions WHERE id = ?', [id]);
    if (result.affectedRows === 0) return res.status(404).json({ error: 'Question not found.' });
    res.json({ success: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Database error' });
  }
});

/* ── API: admin dashboard stats ─────────────────────────── */
router.get('/api/dashboard', requireAdmin, async (req, res) => {
  try {
    // 1. Total Users
    const [[{ totalUsers }]] = await db.query("SELECT COUNT(*) as totalUsers FROM users WHERE role = 'reviewee'");
    
    // 2. Active Reviewees (practiced/diagnostic in last 7 days)
    const [[{ activeReviewees }]] = await db.query(`
      SELECT COUNT(DISTINCT user_id) as activeReviewees 
      FROM (
        SELECT user_id FROM practice_sessions WHERE started_at >= DATE_SUB(NOW(), INTERVAL 7 DAY)
        UNION
        SELECT user_id FROM diagnostic_sessions WHERE completed_at >= DATE_SUB(NOW(), INTERVAL 7 DAY)
      ) AS activity
    `);

    // 2.5 Pretest Completed
    const [[{ pretestCompleted }]] = await db.query("SELECT COUNT(DISTINCT user_id) as pretestCompleted FROM diagnostic_sessions WHERE status = 'completed'");

    // 3. Domain Averages
    const [domainRows] = await db.query(`
      SELECT d.name as domain, AVG(dr.theta) as avg_theta
      FROM domains d
      LEFT JOIN domain_ratings dr ON d.id = dr.domain_id
      GROUP BY d.id
    `);
    const domainAverages = domainRows.map(d => ({
      domain: d.domain,
      avg: d.avg_theta ? Math.round((d.avg_theta / 2400) * 100) : 0
    }));

    // 4. Overall Avg Readiness
    const avgReadiness = domainAverages.length > 0
      ? Math.round(domainAverages.reduce((sum, d) => sum + d.avg, 0) / domainAverages.length)
      : 0;

    // 5. Pass Rate (users with avg readiness >= 80%)
    const [userReadiness] = await db.query(`
      SELECT AVG(theta) as avg_user_theta
      FROM domain_ratings
      GROUP BY user_id
    `);
    const passingCount = userReadiness.filter(u => (u.avg_user_theta / 2400) >= 0.8).length;
    const passRate = totalUsers > 0 ? Math.round((passingCount / totalUsers) * 100) : 0;

    // 6. Users by Exam Level
    const [levelRows] = await db.query(`
      SELECT exam_level as level, COUNT(*) as count 
      FROM users 
      WHERE role = 'reviewee' AND exam_level IS NOT NULL
      GROUP BY exam_level
    `);
    const usersByLevel = levelRows.map(r => ({
      level: r.level.charAt(0).toUpperCase() + r.level.slice(1),
      count: r.count
    }));

    // 7. Recent Activity
    const [activityRows] = await db.query(`
      (SELECT 'signup' as type, CONCAT('New user registered: ', first_name, ' ', last_name) as text, created_at as time FROM users WHERE role = 'reviewee' ORDER BY created_at DESC LIMIT 5)
      UNION ALL
      (SELECT 'diagnostic' as type, CONCAT('User #', user_id, ' completed diagnostic — score ', correct_count) as text, completed_at as time FROM diagnostic_sessions WHERE status = 'completed' ORDER BY completed_at DESC LIMIT 5)
      ORDER BY time DESC LIMIT 5
    `);

    const timeAgo = (date) => {
      const seconds = Math.floor((new Date() - new Date(date)) / 1000);
      if (seconds < 60) return 'just now';
      const minutes = Math.floor(seconds / 60);
      if (minutes < 60) return `${minutes} min ago`;
      const hours = Math.floor(minutes / 60);
      if (hours < 24) return `${hours} hr ago`;
      return `${Math.floor(hours / 24)} d ago`;
    };

    const recentActivity = activityRows.map(a => ({
      type: a.type,
      text: a.text,
      time: timeAgo(a.time)
    }));

    res.json({
      totalUsers,
      pretestCompleted,
      activeReviewees,
      avgReadiness,
      recentSignups: totalUsers, // simple proxy
      passRate,
      weakestCommonDomains: domainAverages.filter(d => d.avg < 65).map(d => d.domain),
      domainAverages,
      usersByLevel,
      recentActivity
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Database error' });
  }
});

/* ── API: current admin user ─────────────────────────────── */
router.get('/api/user', requireAdmin, (req, res) => {
  const u = req.session.user;
  if (!u) return res.status(401).json({ error: 'Not authenticated' });
  res.json({ firstName: u.firstName, lastName: u.lastName, email: u.email });
});

/* ── API: materials management (schema: materials + domains) ─ */
function materialToAdminJson(row) {
  const url = row.content_url || '';
  let inferredMode = 'url';
  if (row.content_html && String(row.content_html).trim()) inferredMode = 'inline';
  else if (url.includes('/uploads/materials/')) inferredMode = 'file';
  return {
    id: row.id,
    title: row.title,
    description: row.description || '',
    domain_id: row.domain_id,
    domain_name: row.domain_name || null,
    type: row.type,
    difficulty: DIFF_FROM_DB[row.difficulty] || 'medium',
    difficulty_db: row.difficulty,
    exam_level: row.exam_level,
    est_minutes: row.est_minutes,
    status: row.status,
    content_url: url,
    content_html: row.content_html || '',
    content_mode: inferredMode,
    created_at: row.created_at,
  };
}

function tryUnlinkUploadedFile(contentUrl) {
  if (!contentUrl || typeof contentUrl !== 'string') return;
  if (!contentUrl.startsWith('/uploads/materials/')) return;
  const rel = contentUrl.replace(/^\//, '');
  const abs = path.join(__dirname, '..', 'public', rel);
  fs.unlink(abs, () => {});
}

async function resolveMaterialContentFields(body, file, existing) {
  const mode = String(body.content_mode || 'url').toLowerCase();
  let content_url = existing?.content_url || null;
  let content_html = existing?.content_html || null;

  if (mode === 'inline') {
    content_html = body.content_html != null ? String(body.content_html) : '';
    content_html = content_html.trim() || null;
    content_url = null;
    if (existing?.content_url?.startsWith('/uploads/materials/')) {
      tryUnlinkUploadedFile(existing.content_url);
    }
  } else if (mode === 'file') {
    content_html = null;
    if (file) {
      if (existing?.content_url?.startsWith('/uploads/materials/')) {
        tryUnlinkUploadedFile(existing.content_url);
      }
      content_url = '/uploads/materials/' + file.filename;
    } else if (existing) {
      content_url = existing.content_url;
    } else {
      content_url = null;
    }
  } else {
    content_html = null;
    let newUrl = body.content_url != null ? String(body.content_url).trim() : '';
    if (
      !newUrl &&
      existing?.content_url &&
      !existing.content_url.startsWith('/uploads/materials/')
    ) {
      newUrl = existing.content_url;
    }
    content_url = newUrl || null;
    if (
      existing?.content_url?.startsWith('/uploads/materials/') &&
      content_url !== existing.content_url
    ) {
      tryUnlinkUploadedFile(existing.content_url);
    }
  }

  const hasContent = !!(content_url && content_url.length) || !!(content_html && content_html.length);
  return { content_url, content_html, hasContent };
}

function materialsUploadMw(req, res, next) {
  materialsUpload.single('file')(req, res, (err) => {
    if (err) return res.status(400).json({ error: err.message || 'Invalid upload.' });
    next();
  });
}

router.get('/api/materials', requireAdmin, async (req, res) => {
  try {
    const { q = '', domain_id = '', type = '', difficulty = '', status = '' } = req.query;

    let sql = `
      SELECT m.*, d.name AS domain_name
        FROM materials m
        JOIN domains d ON d.id = m.domain_id
       WHERE 1=1`;
    const params = [];

    if (q.trim()) {
      sql += ' AND (m.title LIKE ? OR m.description LIKE ?)';
      const like = '%' + q.trim() + '%';
      params.push(like, like);
    }
    if (domain_id) {
      sql += ' AND m.domain_id = ?';
      params.push(Number(domain_id));
    }
    if (type && MAT_TYPES.has(type)) {
      sql += ' AND m.type = ?';
      params.push(type);
    }
    if (difficulty) {
      const dbDiff = mapDifficultyToDbStrict(difficulty);
      if (dbDiff) {
        sql += ' AND m.difficulty = ?';
        params.push(dbDiff);
      }
    }
    if (status && MAT_STATUS.has(status)) {
      sql += ' AND m.status = ?';
      params.push(status);
    }

    sql += ' ORDER BY m.id DESC';

    const [rows] = await db.query(sql, params);

    const [[{ total }]] = await db.query('SELECT COUNT(*) AS total FROM materials');
    const [[{ published }]] = await db.query("SELECT COUNT(*) AS published FROM materials WHERE status='published'");
    const [[{ draft }]] = await db.query("SELECT COUNT(*) AS draft FROM materials WHERE status='draft'");

    const [domains] = await db.query('SELECT id, name, exam_level FROM domains ORDER BY sort_order');

    res.json({
      materials: rows.map(r => materialToAdminJson(r)),
      total,
      published,
      draft,
      domains,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Database error' });
  }
});

router.get('/api/materials/:id', requireAdmin, async (req, res) => {
  try {
    const id = parseInt(req.params.id, 10);
    const [[row]] = await db.query(
      `SELECT m.*, d.name AS domain_name FROM materials m
       JOIN domains d ON d.id = m.domain_id WHERE m.id = ?`,
      [id]
    );
    if (!row) return res.status(404).json({ error: 'Not found' });
    res.json({ material: materialToAdminJson(row) });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Database error' });
  }
});

router.post('/api/materials', requireAdmin, materialsUploadMw, async (req, res) => {
  try {
    const mode = String((req.body || {}).content_mode || '').toLowerCase();
    if (req.file && mode !== 'file') {
      fs.unlink(req.file.path, () => {});
      req.file = undefined;
    }
    const b = req.body || {};
    const title = String(b.title || '').trim();
    if (!title) return res.status(400).json({ error: 'Title is required.' });

    const domain_id = Number(b.domain_id);
    if (!domain_id) return res.status(400).json({ error: 'Domain is required.' });

    const type = b.type;
    if (!MAT_TYPES.has(type)) return res.status(400).json({ error: 'Invalid material type.' });

    const dbDiff = mapDifficultyToDbStrict(b.difficulty);
    if (!dbDiff) return res.status(400).json({ error: 'Invalid difficulty.' });

    const exam_level = b.exam_level;
    if (!MAT_EXAM.has(exam_level)) return res.status(400).json({ error: 'Invalid exam level.' });

    const status = b.status;
    if (!MAT_STATUS.has(status)) return res.status(400).json({ error: 'Invalid status.' });

    const estRaw = b.est_minutes;
    const est_minutes = estRaw === '' || estRaw == null ? null : Math.max(0, parseInt(estRaw, 10) || 0);

    const description = b.description != null ? String(b.description).trim() : '';
    const descVal = description || null;

    const { content_url, content_html, hasContent } = await resolveMaterialContentFields(b, req.file, null);
    if (!hasContent) {
      return res.status(400).json({ error: 'Add a file, external URL, or inline content.' });
    }

    const userId = req.session?.user?.id || null;

    const [result] = await db.query(
      `INSERT INTO materials (domain_id, type, title, description, difficulty, exam_level,
         content_url, content_html, est_minutes, status, uploaded_by)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        domain_id, type, title, descVal, dbDiff, exam_level,
        content_url, content_html, est_minutes, status, userId,
      ]
    );

    const [[created]] = await db.query(
      `SELECT m.*, d.name AS domain_name FROM materials m
       JOIN domains d ON d.id = m.domain_id WHERE m.id = ?`,
      [result.insertId]
    );
    res.status(201).json({ success: true, material: materialToAdminJson(created) });
  } catch (err) {
    if (err.message && err.message.includes('Only PDF')) {
      return res.status(400).json({ error: err.message });
    }
    console.error(err);
    res.status(500).json({ error: 'Database error' });
  }
});

router.put('/api/materials/:id', requireAdmin, materialsUploadMw, async (req, res) => {
  try {
    const modePre = String((req.body || {}).content_mode || '').toLowerCase();
    if (req.file && modePre !== 'file') {
      fs.unlink(req.file.path, () => {});
      req.file = undefined;
    }
    const id = parseInt(req.params.id, 10);
    const [[existing]] = await db.query('SELECT * FROM materials WHERE id = ?', [id]);
    if (!existing) return res.status(404).json({ error: 'Not found' });

    const b = req.body || {};
    const title = String(b.title || '').trim();
    if (!title) return res.status(400).json({ error: 'Title is required.' });

    const domain_id = Number(b.domain_id);
    if (!domain_id) return res.status(400).json({ error: 'Domain is required.' });

    const type = b.type;
    if (!MAT_TYPES.has(type)) return res.status(400).json({ error: 'Invalid material type.' });

    const dbDiff = mapDifficultyToDbStrict(b.difficulty);
    if (!dbDiff) return res.status(400).json({ error: 'Invalid difficulty.' });

    const exam_level = b.exam_level;
    if (!MAT_EXAM.has(exam_level)) return res.status(400).json({ error: 'Invalid exam level.' });

    const status = b.status;
    if (!MAT_STATUS.has(status)) return res.status(400).json({ error: 'Invalid status.' });

    const estRaw = b.est_minutes;
    const est_minutes = estRaw === '' || estRaw == null ? null : Math.max(0, parseInt(estRaw, 10) || 0);

    const description = b.description != null ? String(b.description).trim() : '';
    const descVal = description || null;

    const { content_url, content_html, hasContent } = await resolveMaterialContentFields(b, req.file, existing);
    if (!hasContent) {
      return res.status(400).json({ error: 'Add a file, external URL, or inline content.' });
    }

    await db.query(
      `UPDATE materials SET domain_id=?, type=?, title=?, description=?, difficulty=?, exam_level=?,
         content_url=?, content_html=?, est_minutes=?, status=?
       WHERE id=?`,
      [domain_id, type, title, descVal, dbDiff, exam_level, content_url, content_html, est_minutes, status, id]
    );

    const [[updated]] = await db.query(
      `SELECT m.*, d.name AS domain_name FROM materials m
       JOIN domains d ON d.id = m.domain_id WHERE m.id = ?`,
      [id]
    );
    res.json({ success: true, material: materialToAdminJson(updated) });
  } catch (err) {
    if (err.message && err.message.includes('Only PDF')) {
      return res.status(400).json({ error: err.message });
    }
    console.error(err);
    res.status(500).json({ error: 'Database error' });
  }
});

router.delete('/api/materials/:id', requireAdmin, async (req, res) => {
  try {
    const id = parseInt(req.params.id, 10);
    const [[row]] = await db.query('SELECT content_url FROM materials WHERE id = ?', [id]);
    if (!row) return res.status(404).json({ error: 'Not found' });
    tryUnlinkUploadedFile(row.content_url);
    await db.query('DELETE FROM materials WHERE id = ?', [id]);
    res.json({ success: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Database error' });
  }
});

/* ═══════════════════════════════════════════════════════════
   ANNOUNCEMENTS (§8.7) — CRUD + scheduling + targeting
   ═══════════════════════════════════════════════════════════ */

function normalizeAnnCategory(v) {
  const s = String(v || '').toLowerCase();
  if (['general', 'schedule', 'important'].includes(s)) return s;
  return 'general';
}

function normalizeAnnTargetType(v) {
  const s = String(v || '').toLowerCase();
  if (['all', 'batch'].includes(s)) return s;
  return 'all';
}

function normalizeAnnStatus(v) {
  const s = String(v || '').toLowerCase();
  if (['published', 'draft'].includes(s)) return s;
  return 'draft';
}

function parsePublishAt(v) {
  if (!v) return null;
  const d = new Date(v);
  if (Number.isNaN(d.getTime())) return null;
  return d;
}

router.get('/api/announcements', requireAdmin, async (req, res) => {
  try {
    const [rows] = await db.query(
      `SELECT a.id, a.title, a.body, a.category, a.target_type, a.target_batch_id,
              a.status, a.publish_at, a.created_at,
              b.name AS batch_name,
              u.first_name AS authorFirstName, u.last_name AS authorLastName
         FROM announcements a
         LEFT JOIN batches b ON b.id = a.target_batch_id
         LEFT JOIN users u ON u.id = a.published_by
        ORDER BY a.publish_at DESC, a.created_at DESC, a.id DESC`
    );
    res.json({ announcements: rows });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Database error' });
  }
});

router.post('/api/announcements', requireAdmin, async (req, res) => {
  try {
    const adminId = req.session.user.id;
    const { title, body, category, target_type, target_batch_id, publish_at, status } = req.body || {};
    const t = String(title || '').trim();
    const b = String(body || '').trim();
    if (!t) return res.status(400).json({ error: 'Title is required.' });
    if (!b) return res.status(400).json({ error: 'Body is required.' });

    const cat = normalizeAnnCategory(category);
    const tgt = normalizeAnnTargetType(target_type);
    const st = normalizeAnnStatus(status);
    const pb = parsePublishAt(publish_at) || new Date();
    const batchId = tgt === 'batch' ? (target_batch_id ? Number(target_batch_id) : null) : null;
    if (tgt === 'batch' && !batchId) return res.status(400).json({ error: 'Select a batch.' });

    const [result] = await db.query(
      `INSERT INTO announcements
         (title, body, category, target_type, target_batch_id, published_by, status, publish_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [t, b, cat, tgt, batchId, adminId, st, pb]
    );
    const [[created]] = await db.query(
      `SELECT a.*, b.name AS batch_name
         FROM announcements a
         LEFT JOIN batches b ON b.id = a.target_batch_id
        WHERE a.id = ?`,
      [result.insertId]
    );
    res.status(201).json({ success: true, announcement: created });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Database error' });
  }
});

router.put('/api/announcements/:id', requireAdmin, async (req, res) => {
  try {
    const id = Number(req.params.id);
    if (!id) return res.status(400).json({ error: 'Invalid id.' });

    const { title, body, category, target_type, target_batch_id, publish_at, status } = req.body || {};
    const t = String(title || '').trim();
    const b = String(body || '').trim();
    if (!t) return res.status(400).json({ error: 'Title is required.' });
    if (!b) return res.status(400).json({ error: 'Body is required.' });

    const cat = normalizeAnnCategory(category);
    const tgt = normalizeAnnTargetType(target_type);
    const st = normalizeAnnStatus(status);
    const pb = parsePublishAt(publish_at) || new Date();
    const batchId = tgt === 'batch' ? (target_batch_id ? Number(target_batch_id) : null) : null;
    if (tgt === 'batch' && !batchId) return res.status(400).json({ error: 'Select a batch.' });

    const [result] = await db.query(
      `UPDATE announcements
          SET title = ?, body = ?, category = ?, target_type = ?, target_batch_id = ?, status = ?, publish_at = ?
        WHERE id = ?`,
      [t, b, cat, tgt, batchId, st, pb, id]
    );
    if (result.affectedRows === 0) return res.status(404).json({ error: 'Not found.' });

    const [[updated]] = await db.query(
      `SELECT a.*, b.name AS batch_name
         FROM announcements a
         LEFT JOIN batches b ON b.id = a.target_batch_id
        WHERE a.id = ?`,
      [id]
    );
    res.json({ success: true, announcement: updated });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Database error' });
  }
});

/* ═══════════════════════════════════════════════════════════
   REPORTS & ANALYTICS (§8.8) — privacy-safe aggregates only
   ═══════════════════════════════════════════════════════════ */

router.get('/api/reports/overview', requireAdmin, async (_req, res) => {
  try {
    const [byBatch] = await db.query(
      `SELECT b.id AS batch_id, b.name AS batch_name, b.exam_level,
              COUNT(u.id) AS total_reviewees,
              SUM(u.is_enrolled = 1) AS enrolled_reviewees,
              SUM(lp.completed_at IS NOT NULL) AS profile_complete,
              SUM(ds.status = 'completed') AS diagnostic_done,
              SUM(
                EXISTS(
                  SELECT 1 FROM practice_sessions ps
                   WHERE ps.user_id = u.id AND ps.started_at >= DATE_SUB(NOW(), INTERVAL 7 DAY)
                )
                OR EXISTS(
                  SELECT 1 FROM diagnostic_sessions ds2
                   WHERE ds2.user_id = u.id AND ds2.completed_at >= DATE_SUB(NOW(), INTERVAL 7 DAY)
                )
              ) AS active_7d
         FROM batches b
         LEFT JOIN users u ON u.batch_id = b.id AND u.role = 'reviewee'
         LEFT JOIN learner_profiles lp ON lp.user_id = u.id
         LEFT JOIN diagnostic_sessions ds ON ds.user_id = u.id AND ds.status = 'completed'
        GROUP BY b.id
        ORDER BY b.created_at DESC, b.id DESC`
    );

    const [readinessByBatch] = await db.query(
      `SELECT u.batch_id,
              AVG(user_avg_theta) AS avg_user_theta
         FROM (
           SELECT dr.user_id, AVG(dr.theta) AS user_avg_theta
             FROM domain_ratings dr
             GROUP BY dr.user_id
         ) t
         JOIN users u ON u.id = t.user_id
        WHERE u.role = 'reviewee' AND u.batch_id IS NOT NULL
        GROUP BY u.batch_id`
    );
    const readinessMap = new Map(readinessByBatch.map(r => [r.batch_id, r.avg_user_theta]));

    const batches = byBatch.map(r => {
      const enrolled = Number(r.enrolled_reviewees || 0);
      const diagDone = Number(r.diagnostic_done || 0);
      const active7d = Number(r.active_7d || 0);
      const avgTheta = readinessMap.get(r.batch_id) || null;
      const avgReadiness = avgTheta == null ? null : Math.round((avgTheta / 2400) * 100);
      return {
        batch_id: r.batch_id,
        batch_name: r.batch_name,
        exam_level: r.exam_level,
        total_reviewees: Number(r.total_reviewees || 0),
        avg_readiness: avgReadiness,
        completion_rate: enrolled ? Math.round((diagDone / enrolled) * 100) : 0,
        active_rate_7d: enrolled ? Math.round((active7d / enrolled) * 100) : 0,
      };
    });

    const [byLevel] = await db.query(
      `SELECT exam_level, COUNT(*) AS count
         FROM users
        WHERE role='reviewee' AND exam_level IS NOT NULL
        GROUP BY exam_level`
    );

    res.json({ batches, byLevel });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Database error' });
  }
});

router.get('/api/reports/domains', requireAdmin, async (_req, res) => {
  try {
    // Current cohort weakness ranking (avg theta per domain)
    const [rows] = await db.query(
      `SELECT d.id AS domain_id, d.name AS domain,
              AVG(dr.theta) AS avg_theta,
              SUM(dr.theta < 1920.0) AS below_passing,
              COUNT(dr.user_id) AS n_users
         FROM domains d
         LEFT JOIN domain_ratings dr ON dr.domain_id = d.id
        GROUP BY d.id
        ORDER BY avg_theta ASC`
    );

    // Trend: compare avg theta over last 14 days vs previous 14 days from domain_rating_history
    const [trendRows] = await db.query(
      `SELECT d.id AS domain_id,
              AVG(CASE WHEN h.recorded_at >= DATE_SUB(NOW(), INTERVAL 14 DAY) THEN h.theta END) AS avg_recent,
              AVG(CASE WHEN h.recorded_at <  DATE_SUB(NOW(), INTERVAL 14 DAY)
                        AND h.recorded_at >= DATE_SUB(NOW(), INTERVAL 28 DAY) THEN h.theta END) AS avg_prev
         FROM domains d
         LEFT JOIN domain_rating_history h ON h.domain_id = d.id
        GROUP BY d.id`
    );
    const trendMap = new Map(trendRows.map(r => [r.domain_id, { recent: r.avg_recent, prev: r.avg_prev }]));

    const domains = rows.map(r => {
      const n = Number(r.n_users || 0);
      const avgTheta = r.avg_theta == null ? null : Math.round(r.avg_theta);
      const below = Number(r.below_passing || 0);
      const belowPct = n ? Math.round((below / n) * 100) : 0;

      const t = trendMap.get(r.domain_id) || {};
      const recent = t.recent == null ? null : Number(t.recent);
      const prev = t.prev == null ? null : Number(t.prev);
      let trend = 'flat';
      if (recent != null && prev != null) {
        const delta = recent - prev;
        if (delta > 10) trend = 'improving';
        else if (delta < -10) trend = 'declining';
      }

      return {
        domain_id: r.domain_id,
        domain: r.domain,
        avg_theta: avgTheta,
        below_passing_pct: belowPct,
        trend,
      };
    });

    res.json({ domains });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Database error' });
  }
});

router.get('/api/reports/engagement', requireAdmin, async (_req, res) => {
  try {
    // Sessions per day (practice + diagnostic) over past 30 days
    const [perDay] = await db.query(
      `SELECT day, SUM(cnt) AS sessions
         FROM (
           SELECT DATE(started_at) AS day, COUNT(*) AS cnt
             FROM practice_sessions
            WHERE started_at >= DATE_SUB(CURDATE(), INTERVAL 29 DAY)
            GROUP BY DATE(started_at)
           UNION ALL
           SELECT DATE(started_at) AS day, COUNT(*) AS cnt
             FROM diagnostic_sessions
            WHERE started_at >= DATE_SUB(CURDATE(), INTERVAL 29 DAY)
            GROUP BY DATE(started_at)
         ) t
        GROUP BY day
        ORDER BY day ASC`
    );

    // Active reviewees in last 7 days
    const [[{ active7d }]] = await db.query(
      `SELECT COUNT(DISTINCT user_id) AS active7d
         FROM (
           SELECT user_id FROM practice_sessions WHERE started_at >= DATE_SUB(NOW(), INTERVAL 7 DAY)
           UNION
           SELECT user_id FROM diagnostic_sessions WHERE completed_at >= DATE_SUB(NOW(), INTERVAL 7 DAY)
         ) a`
    );

    // Average sessions per active reviewee per week (last 7 days)
    const [[{ sessions7d }]] = await db.query(
      `SELECT SUM(cnt) AS sessions7d
         FROM (
           SELECT COUNT(*) AS cnt FROM practice_sessions WHERE started_at >= DATE_SUB(NOW(), INTERVAL 7 DAY)
           UNION ALL
           SELECT COUNT(*) AS cnt FROM diagnostic_sessions WHERE started_at >= DATE_SUB(NOW(), INTERVAL 7 DAY)
         ) t`
    );
    const avgSessionsPerActivePerWeek = Number(active7d || 0)
      ? Number(sessions7d || 0) / Number(active7d || 1)
      : 0;

    // Peak usage hours (0-23) over past 30 days
    const [byHour] = await db.query(
      `SELECT hr, SUM(cnt) AS sessions
         FROM (
           SELECT HOUR(started_at) AS hr, COUNT(*) AS cnt
             FROM practice_sessions
            WHERE started_at >= DATE_SUB(NOW(), INTERVAL 30 DAY)
            GROUP BY HOUR(started_at)
           UNION ALL
           SELECT HOUR(started_at) AS hr, COUNT(*) AS cnt
             FROM diagnostic_sessions
            WHERE started_at >= DATE_SUB(NOW(), INTERVAL 30 DAY)
            GROUP BY HOUR(started_at)
         ) t
        GROUP BY hr
        ORDER BY hr ASC`
    );

    res.json({
      sessionsPerDay: perDay.map(r => ({ day: r.day, sessions: Number(r.sessions || 0) })),
      avgSessionsPerActivePerWeek: Math.round(avgSessionsPerActivePerWeek * 100) / 100,
      peakHours: byHour.map(r => ({ hour: Number(r.hr), sessions: Number(r.sessions || 0) })),
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Database error' });
  }
});

router.get('/api/reports/funnel', requireAdmin, async (_req, res) => {
  try {
    const [[{ registered }]] = await db.query(
      "SELECT COUNT(*) AS registered FROM users WHERE role='reviewee'"
    );
    const [[{ enrolled }]] = await db.query(
      "SELECT COUNT(*) AS enrolled FROM users WHERE role='reviewee' AND is_enrolled = 1"
    );
    const [[{ profileComplete }]] = await db.query(
      `SELECT COUNT(*) AS profileComplete
         FROM users u
         JOIN learner_profiles lp ON lp.user_id = u.id
        WHERE u.role='reviewee' AND lp.completed_at IS NOT NULL`
    );
    const [[{ diagnosticDone }]] = await db.query(
      `SELECT COUNT(DISTINCT user_id) AS diagnosticDone
         FROM diagnostic_sessions
        WHERE status='completed'`
    );
    const [[{ active7d }]] = await db.query(
      `SELECT COUNT(DISTINCT user_id) AS active7d
         FROM (
           SELECT user_id FROM practice_sessions WHERE started_at >= DATE_SUB(NOW(), INTERVAL 7 DAY)
           UNION
           SELECT user_id FROM diagnostic_sessions WHERE completed_at >= DATE_SUB(NOW(), INTERVAL 7 DAY)
         ) a`
    );

    const stages = [
      { key: 'registered', label: 'Registered', count: Number(registered || 0) },
      { key: 'enrolled', label: 'Enrolled', count: Number(enrolled || 0) },
      { key: 'profile', label: 'Profile complete', count: Number(profileComplete || 0) },
      { key: 'diagnostic', label: 'Diagnostic done', count: Number(diagnosticDone || 0) },
      { key: 'active', label: 'Active (7d)', count: Number(active7d || 0) },
    ];

    const withDrop = stages.map((s, idx) => {
      const prev = idx === 0 ? null : stages[idx - 1].count;
      const dropOff = prev && prev > 0 ? Math.round(((prev - s.count) / prev) * 100) : 0;
      return { ...s, dropOffPct: idx === 0 ? null : dropOff };
    });

    res.json({ stages: withDrop });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Database error' });
  }
});

router.get('/api/reports/compare', requireAdmin, async (req, res) => {
  try {
    const aId = req.query?.a ? Number(req.query.a) : null;
    const bId = req.query?.b ? Number(req.query.b) : null;
    if (!aId || !bId || aId === bId) {
      return res.status(400).json({ error: 'Provide two distinct batch ids as ?a=..&b=..' });
    }

    const [batches] = await db.query(
      'SELECT id, name, exam_level FROM batches WHERE id IN (?, ?)',
      [aId, bId]
    );
    if (batches.length !== 2) return res.status(404).json({ error: 'Batch not found.' });
    const batchMap = new Map(batches.map(x => [x.id, x]));

    async function batchMetrics(batchId) {
      const [[{ enrolled }]] = await db.query(
        "SELECT COUNT(*) AS enrolled FROM users WHERE role='reviewee' AND is_enrolled=1 AND batch_id = ?",
        [batchId]
      );
      const [[{ diagnosticDone }]] = await db.query(
        `SELECT COUNT(DISTINCT user_id) AS diagnosticDone
           FROM diagnostic_sessions
          WHERE status='completed' AND batch_id = ?`,
        [batchId]
      );
      const [[{ active7d }]] = await db.query(
        `SELECT COUNT(DISTINCT user_id) AS active7d
           FROM (
             SELECT user_id FROM practice_sessions WHERE batch_id = ? AND started_at >= DATE_SUB(NOW(), INTERVAL 7 DAY)
             UNION
             SELECT user_id FROM diagnostic_sessions WHERE batch_id = ? AND completed_at >= DATE_SUB(NOW(), INTERVAL 7 DAY)
           ) a`,
        [batchId, batchId]
      );
      const [[{ avgTheta }]] = await db.query(
        `SELECT AVG(user_avg_theta) AS avgTheta
           FROM (
             SELECT dr.user_id, AVG(dr.theta) AS user_avg_theta
               FROM domain_ratings dr
               JOIN users u ON u.id = dr.user_id
              WHERE u.batch_id = ?
              GROUP BY dr.user_id
           ) t`,
        [batchId]
      );
      const avgReadiness = avgTheta == null ? null : Math.round((Number(avgTheta) / 2400) * 100);

      const enrolledN = Number(enrolled || 0);
      return {
        enrolled: enrolledN,
        completion_rate: enrolledN ? Math.round((Number(diagnosticDone || 0) / enrolledN) * 100) : 0,
        active_rate_7d: enrolledN ? Math.round((Number(active7d || 0) / enrolledN) * 100) : 0,
        avg_readiness: avgReadiness,
      };
    }

    const [ma, mb] = await Promise.all([batchMetrics(aId), batchMetrics(bId)]);

    // Domain weakness distribution per batch (avg theta)
    const [domainA] = await db.query(
      `SELECT d.name AS domain, AVG(dr.theta) AS avg_theta
         FROM domains d
         LEFT JOIN domain_ratings dr ON dr.domain_id = d.id
         LEFT JOIN users u ON u.id = dr.user_id AND u.batch_id = ?
        WHERE u.id IS NOT NULL
        GROUP BY d.id
        ORDER BY d.sort_order, d.name`,
      [aId]
    );
    const [domainB] = await db.query(
      `SELECT d.name AS domain, AVG(dr.theta) AS avg_theta
         FROM domains d
         LEFT JOIN domain_ratings dr ON dr.domain_id = d.id
         LEFT JOIN users u ON u.id = dr.user_id AND u.batch_id = ?
        WHERE u.id IS NOT NULL
        GROUP BY d.id
        ORDER BY d.sort_order, d.name`,
      [bId]
    );

    const distA = domainA.map(r => ({ domain: r.domain, avg_theta: r.avg_theta == null ? null : Math.round(r.avg_theta) }));
    const distB = domainB.map(r => ({ domain: r.domain, avg_theta: r.avg_theta == null ? null : Math.round(r.avg_theta) }));

    res.json({
      a: { ...batchMap.get(aId), metrics: ma, domains: distA },
      b: { ...batchMap.get(bId), metrics: mb, domains: distB },
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Database error' });
  }
});

/* ═══════════════════════════════════════════════════════════
   PROFILE FORM (§8.6) — SurveyJS + responses
   ═══════════════════════════════════════════════════════════ */

router.get('/api/profile-form', requireAdmin, async (req, res) => {
  try {
    const schemaJson = await profileFormSurvey.getProfileFormSchemaJson(db);
    res.json({ schemaJson });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Database error' });
  }
});

router.post('/api/profile-form', requireAdmin, async (req, res) => {
  try {
    const { schemaJson } = req.body || {};
    if (!profileFormSurvey.validateSchemaPayload(schemaJson)) {
      return res.status(400).json({ error: 'Invalid schema: { questions: [...] } required.' });
    }
    await profileFormSurvey.saveProfileFormSchemaJson(db, schemaJson, req.session.user.id);
    res.json({ success: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Database error' });
  }
});

router.get('/api/profile-form/fields', requireAdmin, (_req, res) => {
  res.status(410).json({ error: 'Removed: use GET/PUT /admin/api/profile-form with SurveyJS JSON.' });
});
router.post('/api/profile-form/fields', requireAdmin, (_req, res) => {
  res.status(410).json({ error: 'Removed: use PUT /admin/api/profile-form with SurveyJS JSON.' });
});
router.put('/api/profile-form/fields/:id', requireAdmin, (_req, res) => {
  res.status(410).json({ error: 'Removed: use PUT /admin/api/profile-form with SurveyJS JSON.' });
});
router.delete('/api/profile-form/fields/:id', requireAdmin, (_req, res) => {
  res.status(410).json({ error: 'Removed: use PUT /admin/api/profile-form with SurveyJS JSON.' });
});
router.put('/api/profile-form/reorder', requireAdmin, (_req, res) => {
  res.status(410).json({ error: 'Removed: reorder in Survey Creator or PUT /admin/api/profile-form.' });
});

function csvEscape(v) {
  if (v == null) return '';
  const s = String(v);
  if (/[",\n\r]/.test(s)) return `"${s.replace(/"/g, '""')}"`;
  return s;
}

router.get('/api/profile-form/responses', requireAdmin, async (req, res) => {
  try {
    const schemaJson = await profileFormSurvey.getProfileFormSchemaJson(db);
    const colRows = profileFormSurvey.extractSchemaColumns(schemaJson);

    const [rows] = await db.query(
      `SELECT u.id AS user_id, u.first_name, u.last_name, u.email,
              lp.completed_at, lp.custom_field_responses
         FROM users u
         INNER JOIN learner_profiles lp ON lp.user_id = u.id
        WHERE u.role = 'reviewee' AND lp.completed_at IS NOT NULL
        ORDER BY lp.completed_at DESC`
    );

    const submissions = rows.map((r) => {
      let json = r.custom_field_responses;
      if (json != null && typeof json === 'string') {
        try {
          json = JSON.parse(json);
        } catch (_) {
          json = {};
        }
      }
      if (!json || typeof json !== 'object') json = {};
      const custom = {};
      for (const c of colRows) {
        custom[c.field_key] = profileFormSurvey.formatCustomJsonValue(json[c.field_key]);
      }
      return {
        userId: r.user_id,
        name: `${r.first_name || ''} ${r.last_name || ''}`.trim(),
        email: r.email,
        submittedAt: r.completed_at,
        custom,
      };
    });

    res.json({
      columns: colRows.map((c) => ({ field_key: c.field_key, label: c.label })),
      submissions,
      total: submissions.length,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Database error' });
  }
});

router.get('/api/profile-form/responses/export', requireAdmin, async (req, res) => {
  try {
    const schemaJson = await profileFormSurvey.getProfileFormSchemaJson(db);
    const colRows = profileFormSurvey.extractSchemaColumns(schemaJson);

    const [rows] = await db.query(
      `SELECT u.id AS user_id, u.first_name, u.last_name, u.email,
              lp.completed_at, lp.custom_field_responses
         FROM users u
         INNER JOIN learner_profiles lp ON lp.user_id = u.id
        WHERE u.role = 'reviewee' AND lp.completed_at IS NOT NULL
        ORDER BY lp.completed_at DESC`
    );

    const headers = ['user_id', 'name', 'email', 'submitted_at', ...colRows.map((c) => c.field_key)];
    const lines = [headers.map(csvEscape).join(',')];

    for (const r of rows) {
      let json = r.custom_field_responses;
      if (json != null && typeof json === 'string') {
        try {
          json = JSON.parse(json);
        } catch (_) {
          json = {};
        }
      }
      if (!json || typeof json !== 'object') json = {};
      const name = `${r.first_name || ''} ${r.last_name || ''}`.trim();
      const cells = [
        r.user_id,
        name,
        r.email || '',
        r.completed_at ? new Date(r.completed_at).toISOString() : '',
        ...colRows.map((c) => profileFormSurvey.formatCustomJsonValue(json[c.field_key])),
      ];
      lines.push(cells.map(csvEscape).join(','));
    }

    const bom = '\uFEFF';
    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', 'attachment; filename="learner-profile-responses.csv"');
    res.send(bom + lines.join('\r\n'));
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Database error' });
  }
});

router.get('/api/profile-form/responses/:userId', requireAdmin, async (req, res) => {
  try {
    const uid = parseInt(req.params.userId, 10);
    const [[user]] = await db.query(
      `SELECT id, first_name, last_name, email, exam_level, created_at
         FROM users WHERE id = ? AND role = 'reviewee'`,
      [uid]
    );
    if (!user) return res.status(404).json({ error: 'Reviewee not found.' });

    const [[lp]] = await db.query('SELECT * FROM learner_profiles WHERE user_id = ?', [uid]);

    const [domainRatings] = await db.query(
      `SELECT d.name AS domain, ldsr.self_rating AS rating
         FROM learner_domain_self_ratings ldsr
         JOIN domains d ON d.id = ldsr.domain_id
        WHERE ldsr.user_id = ?
        ORDER BY d.sort_order, d.name`,
      [uid]
    );

    let custom = {};
    if (lp?.custom_field_responses) {
      try {
        custom =
          typeof lp.custom_field_responses === 'string'
            ? JSON.parse(lp.custom_field_responses)
            : lp.custom_field_responses;
      } catch (_) {
        custom = {};
      }
    }

    const schemaJson = await profileFormSurvey.getProfileFormSchemaJson(db);
    const fieldDefs = profileFormSurvey.extractSchemaColumns(schemaJson).map((c) => ({
      field_key: c.field_key,
      label: c.label,
      field_type: 'survey',
      is_protected: false,
    }));

    res.json({
      user,
      learnerProfile: lp || null,
      domainRatings,
      customFieldResponses: custom || {},
      fieldDefs,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Database error' });
  }
});

module.exports = router;
