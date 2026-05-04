const express = require('express');
const bcrypt  = require('bcrypt');
const db      = require('../config/db');

const router = express.Router();

const SALT_ROUNDS = 10;

// ── Helpers ────────────────────────────────────────────────────────────────

/**
 * Generate a 6-digit numeric OTP string.
 */
function generateOTP() {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

// ── GET /login ─────────────────────────────────────────────────────────────
router.get('/login', (req, res) => {
  if (req.session.user) {
    return req.session.user.role === 'admin'
      ? res.redirect('/admin/home')
      : res.redirect('/reviewee/dashboard');
  }
  res.render('auth/login');
});

// ── POST /login ────────────────────────────────────────────────────────────
router.post('/login', async (req, res) => {
  const { email, password } = req.body;

  if (!email || !password) {
    return res.redirect('/login?error=1');
  }

  try {
    const [rows] = await db.query(
      `SELECT id, role, first_name AS firstName, last_name AS lastName,
              email, exam_level AS examLevel,
              is_verified AS isVerified, is_enrolled AS isEnrolled, is_onboarded AS isOnboarded,
              password
       FROM users WHERE email = ?`,
      [email]
    );

    if (rows.length === 0) {
      return res.redirect('/login?error=1');
    }

    const user = rows[0];

    // Compare password — supports both bcrypt hashes and plaintext (demo seed)
    let passwordMatch = false;
    if (user.password.startsWith('$2b$') || user.password.startsWith('$2a$')) {
      passwordMatch = await bcrypt.compare(password, user.password);
    } else {
      // Plaintext fallback for demo seed users — remove once all seeds are hashed
      passwordMatch = (password === user.password);
    }

    if (!passwordMatch) {
      return res.redirect('/login?error=1');
    }

    // Strip the password hash from session data — never expose it
    const { password: _pw, ...safeUser } = user;
    req.session.user = safeUser;

    console.log(`[Auth] Login: ${user.email} (${user.role})`);

    if (user.role === 'admin') {
      return res.redirect('/admin/home');
    }

    // Reviewee: check onboarding state
    if (!user.isOnboarded) {
      return res.redirect('/reviewee/onboarding');
    }

    return res.redirect('/reviewee/dashboard');

  } catch (err) {
    console.error('[Auth] Login error:', err);
    return res.redirect('/login?error=1');
  }
});

// ── GET /logout ────────────────────────────────────────────────────────────
router.get('/logout', (req, res) => {
  req.session.destroy(() => {
    res.redirect('/login');
  });
});

// ── POST /signup ───────────────────────────────────────────────────────────
// Blueprint §5.1: Real DB insert with bcrypt hash + OTP generation
router.post('/signup', async (req, res) => {
  const { email, password, confirm_password } = req.body;

  // ── Validation ──────────────────────────────────────────────────────────
  if (!email || !password || !confirm_password) {
    return res.redirect('/signup?error=missing_fields');
  }

  if (password !== confirm_password) {
    return res.redirect('/signup?error=password_mismatch');
  }

  if (password.length < 8) {
    return res.redirect('/signup?error=password_too_short');
  }

  try {
    // Check email uniqueness
    const [existing] = await db.query(
      'SELECT id FROM users WHERE email = ?',
      [email]
    );
    if (existing.length > 0) {
      return res.redirect('/signup?error=email_taken');
    }

    // Hash password
    const passwordHash = await bcrypt.hash(password, SALT_ROUNDS);

    // Insert user (unverified, name filled later)
    const [result] = await db.query(
      `INSERT INTO users (role, first_name, last_name, email, password, is_verified, is_enrolled)
       VALUES ('reviewee', '', '', ?, ?, FALSE, FALSE)`,
      [email, passwordHash]
    );

    const userId = result.insertId;

    // Store context in session for the OTP step
    req.session.pendingEmail  = email;
    req.session.pendingUserId = userId;

    console.log(`[Auth] Signup success for ${email}. OTP screen active (Any 6-digit code will work for now).`);

    return res.redirect('/signup-success');

  } catch (err) {
    console.error('[Auth] Signup error:', err);
    return res.redirect('/signup?error=server_error');
  }
});

// ── POST /verify-email ─────────────────────────────────────────────────────
// Blueprint §5.2: Real OTP check against email_verifications table
// BYPASSED: Currently accepts any 6-digit code for easier testing.
router.post('/verify-email', async (req, res) => {
  const email  = req.session.pendingEmail;
  const userId = req.session.pendingUserId;

  if (!email || !userId) {
    return res.redirect('/signup');
  }

  // Collect OTP
  let otpInput = req.body.otp || '';
  if (!otpInput) {
    const digits = ['otp1','otp2','otp3','otp4','otp5','otp6']
      .map(k => (req.body[k] || '').trim())
      .join('');
    otpInput = digits;
  }

  if (!otpInput || otpInput.length !== 6) {
    return res.redirect('/signup-success?error=invalid_otp');
  }

  try {
    // Mark user as verified
    await db.query('UPDATE users SET is_verified = TRUE WHERE id = ?', [userId]);

    // Fetch full user record for session
    const [rows] = await db.query(
      `SELECT id, role, email, is_verified AS isVerified, is_enrolled AS isEnrolled
       FROM users WHERE id = ?`,
      [userId]
    );
    const user = rows[0];

    // Log the user in
    req.session.user = user;
    delete req.session.pendingEmail;
    delete req.session.pendingUserId;

    console.log(`[Auth] OTP Verified (Bypassed) for ${email}`);

    // Redirect to onboarding
    return res.redirect('/reviewee/onboarding');

  } catch (err) {
    console.error('[Auth] OTP verification error:', err);
    return res.redirect('/signup-success?error=server_error');
  }
});

// ── POST /forgot-password ──────────────────────────────────────────────────
// Step-transition is handled client-side; server sends (or mocks) reset OTP
router.post('/forgot-password', async (req, res) => {
  const { email } = req.body;

  if (!email) return res.redirect('/forgot-password');

  try {
    const [rows] = await db.query(
      'SELECT id FROM users WHERE email = ? AND is_verified = TRUE',
      [email]
    );

    if (rows.length === 0) {
      // Do not reveal whether the email exists — just redirect silently
      req.session.resetEmail = email;
      return res.redirect('/forgot-password?step=2');
    }

    const userId = rows[0].id;
    const otp = generateOTP();
    const otpHash = await bcrypt.hash(otp, SALT_ROUNDS);
    const expiresAt = new Date(Date.now() + 15 * 60 * 1000);

    await db.query(
      'DELETE FROM email_verifications WHERE user_id = ?',
      [userId]
    );
    await db.query(
      `INSERT INTO email_verifications (user_id, otp_hash, expires_at)
       VALUES (?, ?, ?)`,
      [userId, otpHash, expiresAt]
    );

    req.session.resetEmail  = email;
    req.session.resetUserId = userId;

    // TODO: Send real email (simulated for demo)
    console.log(`[Auth] Password reset OTP for ${email}: ${otp}  (demo — would be emailed)`);

    return res.redirect('/forgot-password?step=2');

  } catch (err) {
    console.error('[Auth] Forgot password error:', err);
    return res.redirect('/forgot-password');
  }
});

// ── POST /verify-otp ───────────────────────────────────────────────────────
// Verifies the password-reset OTP
router.post('/verify-otp', async (req, res) => {
  const userId = req.session.resetUserId;
  const email  = req.session.resetEmail;

  if (!userId || !email) {
    return res.redirect('/forgot-password');
  }

  let otpInput = req.body.otp || '';
  if (!otpInput) {
    const digits = ['otp1','otp2','otp3','otp4','otp5','otp6']
      .map(k => (req.body[k] || '').trim())
      .join('');
    otpInput = digits;
  }

  if (!otpInput || otpInput.length !== 6) {
    return res.redirect('/forgot-password?step=2&error=invalid_otp');
  }

  try {
    const [verifications] = await db.query(
      `SELECT id, otp_hash FROM email_verifications
       WHERE user_id = ? AND used = FALSE AND expires_at > NOW()
       ORDER BY created_at DESC LIMIT 1`,
      [userId]
    );

    if (verifications.length === 0) {
      return res.redirect('/forgot-password?step=2&error=otp_expired');
    }

    const record = verifications[0];
    const isValid = await bcrypt.compare(otpInput, record.otp_hash);

    if (!isValid) {
      return res.redirect('/forgot-password?step=2&error=invalid_otp');
    }

    // Mark OTP used, store a reset-authorized flag in session
    await db.query(
      'UPDATE email_verifications SET used = TRUE WHERE id = ?',
      [record.id]
    );

    req.session.resetAuthorized = true;

    return res.redirect('/reset-password');

  } catch (err) {
    console.error('[Auth] OTP verify error:', err);
    return res.redirect('/forgot-password?step=2&error=server_error');
  }
});

// ── POST /reset-password ───────────────────────────────────────────────────
// Updates password after OTP-verified reset flow
router.post('/reset-password', async (req, res) => {
  const userId = req.session.resetUserId;

  if (!userId || !req.session.resetAuthorized) {
    return res.redirect('/forgot-password');
  }

  const { password, confirm_password } = req.body;

  if (!password || password !== confirm_password || password.length < 8) {
    return res.redirect('/reset-password?error=invalid');
  }

  try {
    const passwordHash = await bcrypt.hash(password, SALT_ROUNDS);

    await db.query(
      'UPDATE users SET password = ? WHERE id = ?',
      [passwordHash, userId]
    );

    // Clean up session reset state
    delete req.session.resetEmail;
    delete req.session.resetUserId;
    delete req.session.resetAuthorized;

    console.log(`[Auth] Password reset successful for user ${userId}`);
    return res.redirect('/login');

  } catch (err) {
    console.error('[Auth] Password reset error:', err);
    return res.redirect('/reset-password?error=server_error');
  }
});

module.exports = router;
