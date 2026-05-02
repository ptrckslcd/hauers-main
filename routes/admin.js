const express       = require('express');
const path          = require('path');
const requireAdmin  = require('../middleware/requireAdmin');
const db            = require('../config/db');

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

router.get('/system-settings', requireAdmin, (req, res) => {
  res.render('admin/account-settings');
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

/* ── API: all users ─────────────────────────────────────────── */
router.get('/api/users', requireAdmin, async (req, res) => {
  try {
    const [rows] = await db.query("SELECT id, role, first_name as firstName, last_name as lastName, email, is_verified, exam_level as examLevel, joined_at, last_active, readiness_score as readinessScore, streak FROM users WHERE role = 'reviewee'");
    res.json({ users: rows, total: rows.length });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Database error' });
  }
});

/* ── API: single user ───────────────────────────────────────── */
router.get('/api/users/:id', requireAdmin, async (req, res) => {
  try {
    const [rows] = await db.query("SELECT id, role, first_name as firstName, last_name as lastName, email, is_verified, exam_level as examLevel, joined_at, last_active, readiness_score as readinessScore, streak FROM users WHERE id = ? AND role = 'reviewee'", [req.params.id]);
    if (rows.length === 0) return res.status(404).json({ error: 'Not found' });
    res.json(rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Database error' });
  }
});

/* ── API: all questions (admin — includes answers) ─────────── */
router.get('/api/questions', requireAdmin, async (req, res) => {
  try {
    const [rows] = await db.query('SELECT * FROM questions');
    const questions = rows.map(q => ({
      ...q,
      choices: typeof q.choices === 'string' ? JSON.parse(q.choices) : q.choices
    }));
    res.json({ questions, total: questions.length });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Database error' });
  }
});

/* ── API: create question ──────────────────────────────────── */
router.post('/api/questions', requireAdmin, async (req, res) => {
  try {
    const { question, domain, difficulty, choices, answer } = req.body || {};
    const validDomains = ['Verbal Ability', 'Numerical Ability', 'Clerical Ability'];
    const validDifficulties = ['Easy', 'Medium', 'Hard'];

    if (!question || typeof question !== 'string' || !question.trim())
      return res.status(400).json({ error: 'Question text is required.' });
    if (!validDomains.includes(domain))
      return res.status(400).json({ error: 'Invalid domain.' });
    if (!validDifficulties.includes(difficulty))
      return res.status(400).json({ error: 'Invalid difficulty.' });
    if (!Array.isArray(choices) || choices.length !== 4 || choices.some(c => !c || !String(c).trim()))
      return res.status(400).json({ error: 'All four choices are required.' });
    if (!answer || !choices.includes(answer))
      return res.status(400).json({ error: 'Correct answer must match one of the choices.' });

    const choicesJson = JSON.stringify(choices.map(c => String(c).trim()));

    const [result] = await db.query(
      'INSERT INTO questions (question, choices, answer, domain, difficulty) VALUES (?, ?, ?, ?, ?)',
      [question.trim(), choicesJson, String(answer).trim(), domain, difficulty]
    );

    const newQ = {
      id: result.insertId,
      question: question.trim(),
      choices: choices.map(c => String(c).trim()),
      answer: String(answer).trim(),
      domain,
      difficulty,
    };
    
    res.status(201).json({ success: true, question: newQ });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Database error' });
  }
});

/* ── API: update question ──────────────────────────────────── */
router.put('/api/questions/:id', requireAdmin, async (req, res) => {
  try {
    const id = parseInt(req.params.id, 10);
    const { question, domain, difficulty, choices, answer } = req.body || {};
    const validDomains = ['Verbal Ability', 'Numerical Ability', 'Clerical Ability'];
    const validDifficulties = ['Easy', 'Medium', 'Hard'];

    if (!question || typeof question !== 'string' || !question.trim())
      return res.status(400).json({ error: 'Question text is required.' });
    if (!validDomains.includes(domain))
      return res.status(400).json({ error: 'Invalid domain.' });
    if (!validDifficulties.includes(difficulty))
      return res.status(400).json({ error: 'Invalid difficulty.' });
    if (!Array.isArray(choices) || choices.length !== 4 || choices.some(c => !c || !String(c).trim()))
      return res.status(400).json({ error: 'All four choices are required.' });
    if (!answer || !choices.includes(answer))
      return res.status(400).json({ error: 'Correct answer must match one of the choices.' });

    const choicesJson = JSON.stringify(choices.map(c => String(c).trim()));

    const [result] = await db.query(
      'UPDATE questions SET question = ?, choices = ?, answer = ?, domain = ?, difficulty = ? WHERE id = ?',
      [question.trim(), choicesJson, String(answer).trim(), domain, difficulty, id]
    );

    if (result.affectedRows === 0) {
      return res.status(404).json({ error: 'Question not found.' });
    }

    res.json({
      success: true,
      question: {
        id,
        question: question.trim(),
        choices: choices.map(c => String(c).trim()),
        answer: String(answer).trim(),
        domain,
        difficulty,
      }
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Database error' });
  }
});

/* ── API: delete question ──────────────────────────────────── */
router.delete('/api/questions/:id', requireAdmin, async (req, res) => {
  try {
    const id = parseInt(req.params.id, 10);
    const [result] = await db.query('DELETE FROM questions WHERE id = ?', [id]);
    
    if (result.affectedRows === 0) {
      return res.status(404).json({ error: 'Question not found.' });
    }
    
    res.json({ success: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Database error' });
  }
});

/* ── API: search ─────────────────────────────────────────────── */
router.get('/api/search', requireAdmin, async (req, res) => {
  try {
    const { q = '', scope = 'questions', domain = 'all', difficulty = 'all' } = req.query;
    const query = q.toLowerCase().trim();

    if (scope === 'questions') {
      let sql = 'SELECT * FROM questions WHERE 1=1';
      const params = [];

      if (domain !== 'all') {
        sql += ' AND domain = ?';
        params.push(domain);
      }
      if (difficulty !== 'all') {
        sql += ' AND difficulty = ?';
        params.push(difficulty);
      }

      const [rows] = await db.query(sql, params);
      
      let results = rows.map(q => ({
        ...q,
        choices: typeof q.choices === 'string' ? JSON.parse(q.choices) : q.choices
      }));

      if (query) {
        results = results.filter(qn =>
          qn.question.toLowerCase().includes(query) ||
          qn.domain.toLowerCase().includes(query)   ||
          qn.choices.some(c => c.toLowerCase().includes(query))
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

/* ── API: admin dashboard stats ─────────────────────────── */
router.get('/api/dashboard', requireAdmin, async (req, res) => {
  try {
    // We execute some basic SELECT queries for analytics as instructed
    const [userRows] = await db.query("SELECT * FROM users WHERE role = 'reviewee'");
    const totalUsers = userRows.length || 1; // avoid div by 0 for mocks
    
    let totalScore = 0;
    let countsByLevel = { 'Professional': 0, 'Sub-professional': 0, 'Both': 0 };
    
    userRows.forEach(u => {
      totalScore += (u.readiness_score || 0);
      if (u.exam_level) {
        if (!countsByLevel[u.exam_level]) countsByLevel[u.exam_level] = 0;
        countsByLevel[u.exam_level]++;
      }
    });

    const avgReadiness = userRows.length > 0 ? Math.round(totalScore / userRows.length) : 68;

    const usersByLevel = Object.keys(countsByLevel).map(level => ({
      level,
      count: countsByLevel[level]
    }));

    res.json({
      totalUsers: userRows.length,
      activeReviewees: userRows.length,
      avgReadiness: avgReadiness,
      recentSignups: userRows.length,
      passRate: 34, // Mocked complex analytic
      weakestCommonDomains: ['Numerical Ability', 'Analytical Ability'],
      domainAverages: [
        { domain: 'Verbal Ability',      avg: 72 },
        { domain: 'Numerical Ability',   avg: 54 },
        { domain: 'Analytical Ability',  avg: 61 },
        { domain: 'Clerical Ability',    avg: 75 },
        { domain: 'General Information', avg: 66 },
      ],
      usersByLevel: usersByLevel.length ? usersByLevel : [
        { level: 'Professional',     count: 58 },
        { level: 'Sub-professional', count: 41 },
        { level: 'Both',             count: 27 },
      ],
      recentActivity: [
        { type: 'signup',     text: 'New user registered: Juan D.',             time: '2 min ago'  },
        { type: 'diagnostic', text: 'Maria S. completed diagnostic — score 74',  time: '18 min ago' },
        { type: 'signup',     text: 'New user registered: Carlo M.',            time: '45 min ago' },
      ],
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

/* ── API: materials management ──────────────────────────── */
router.get('/api/materials', requireAdmin, async (req, res) => {
  try {
    const [rows] = await db.query('SELECT * FROM materials');
    res.json({ materials: rows, total: rows.length });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Database error' });
  }
});

router.post('/api/materials', requireAdmin, async (req, res) => {
  try {
    const { title, desc, domain, type, difficulty, estMinutes, recommended, icon } = req.body || {};
    
    const [result] = await db.query(
      'INSERT INTO materials (title, `desc`, domain, type, difficulty, estMinutes, recommended, icon) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
      [title, desc, domain, type, difficulty, estMinutes, recommended ? 1 : 0, icon || '📖']
    );
    
    res.status(201).json({ success: true, id: result.insertId });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Database error' });
  }
});

router.put('/api/materials/:id', requireAdmin, async (req, res) => {
  try {
    const id = parseInt(req.params.id, 10);
    const { title, desc, domain, type, difficulty, estMinutes, recommended, icon } = req.body || {};
    
    const [result] = await db.query(
      'UPDATE materials SET title = ?, `desc` = ?, domain = ?, type = ?, difficulty = ?, estMinutes = ?, recommended = ?, icon = ? WHERE id = ?',
      [title, desc, domain, type, difficulty, estMinutes, recommended ? 1 : 0, icon || '📖', id]
    );
    
    if (result.affectedRows === 0) return res.status(404).json({ error: 'Not found' });
    res.json({ success: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Database error' });
  }
});

router.delete('/api/materials/:id', requireAdmin, async (req, res) => {
  try {
    const id = parseInt(req.params.id, 10);
    const [result] = await db.query('DELETE FROM materials WHERE id = ?', [id]);
    if (result.affectedRows === 0) return res.status(404).json({ error: 'Not found' });
    res.json({ success: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Database error' });
  }
});

module.exports = router;
