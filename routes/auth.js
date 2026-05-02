const express = require('express');
const path = require('path');
const db = require('../config/db'); // Connect to our new MySQL db

const router = express.Router();

router.get('/login', (req, res) => {
  res.render('auth/login');
});

router.post('/login', async (req, res) => {
  const { email, password } = req.body;

  try {
    // Query the database to find the user with the provided credentials
    const [rows] = await db.query(
      'SELECT id, role, first_name AS firstName, last_name AS lastName, email, exam_level AS examLevel, is_verified AS isVerified FROM users WHERE email = ? AND password = ?',
      [email, password]
    );

    if (rows.length === 0) {
      return res.redirect('/login?error=1');
    }

    const user = rows[0];
    console.log(`User logged in: ${user.email} (${user.role})`);

    // Store user data in session
    req.session.user = user;

    // Redirect based on role
    if (user.role === 'admin') {
      return res.redirect('/admin/home');
    }

    return res.redirect('/reviewee/dashboard');
  } catch (error) {
    console.error('Error during login:', error);
    return res.redirect('/login?error=1');
  }
});

router.get('/logout', (req, res) => {
  req.session.destroy(() => {
    res.redirect('/login');
  });
});

// ── Auth flow POST routes ────────────────────────────────────────────
router.post('/signup', (req, res) => {
  // TODO: create user, send OTP email
  // Store email in session so verify-email can log the user in
  req.session.pendingEmail = req.body.email;
  res.redirect('/signup-success');
});

router.post('/verify-email', async (req, res) => {
  // TODO: actual OTP verification here
  const email = req.session.pendingEmail;
  if (!email) return res.redirect('/signup');

  try {
    // Check if user already exists
    let [rows] = await db.query('SELECT * FROM users WHERE email = ?', [email]);
    
    if (rows.length === 0) {
      // Mock insertion for our new signup until fuller signup logic implemented
      await db.query(
        `INSERT INTO users (email, password, role, first_name, last_name, is_verified) 
         VALUES (?, 'password123', 'reviewee', 'New', 'User', 1)`, 
        [email]
      );
      // Retrieve the newly inserted user
      [rows] = await db.query('SELECT id, role, first_name AS firstName, last_name AS lastName, email, exam_level AS examLevel, is_verified AS isVerified FROM users WHERE email = ?', [email]);
    }
    
    req.session.user = rows[0];
    delete req.session.pendingEmail;
    res.redirect('/email-verified');
  } catch (err) {
    console.error('Registration Error:', err);
    res.redirect('/signup');
  }
});

router.post('/forgot-password', (req, res) => {
  // TODO: send password-reset OTP
  // Step-transition is handled client-side; this handles JS-disabled fallback
  res.redirect('/forgot-password');
});

router.post('/verify-otp', (req, res) => {
  // TODO: verify OTP, attach reset token to session
  res.redirect('/reset-password');
});

router.post('/reset-password', (req, res) => {
  // TODO: validate token, update password
  res.redirect('/login');
});

module.exports = router;
