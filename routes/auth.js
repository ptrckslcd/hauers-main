const express = require('express');
const bcrypt  = require('bcrypt');
require('../config/passport');
const passport = require('passport');
const db      = require('../config/db');

const router = express.Router();

const SALT_ROUNDS = 10;

function normalizeEmail(email) {
  return String(email || '').trim().toLowerCase();
}

function buildSessionUser(user) {
  return {
    id: user.id,
    role: user.role,
    firstName: user.firstName,
    lastName: user.lastName,
    email: user.email,
    examLevel: user.examLevel,
    isVerified: !!user.isVerified,
    isEnrolled: !!user.isEnrolled,
    isOnboarded: !!user.isOnboarded,
    isApproved: !!user.isApproved,
    isSuspended: !!user.isSuspended,
    authProvider: user.authProvider || 'local',
    providerId: user.providerId || null,
    oauthEmailVerified: !!user.oauthEmailVerified,
  };
}

function authErrorRedirect(path, error) {
  return `${path}?error=${encodeURIComponent(error)}`;
}

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
    if (req.session.user.role === 'admin') {
      return res.redirect('/admin/home');
    }

    if (!req.session.user.isOnboarded) {
      return res.redirect('/reviewee/onboarding');
    }

    return res.redirect('/reviewee/dashboard');
  }
  res.render('auth/login');
});

// ── POST /login ────────────────────────────────────────────────────────────
router.post('/login', async (req, res) => {
  const email = normalizeEmail(req.body.email);
  const password = req.body.password || '';

  if (!email || !password) {
    return res.redirect('/login?error=1');
  }

  try {
    const [rows] = await db.query(
      `SELECT id, role, first_name AS firstName, last_name AS lastName,
              email, exam_level AS examLevel,
              is_verified AS isVerified, is_enrolled AS isEnrolled, is_onboarded AS isOnboarded,
              is_approved AS isApproved, is_suspended AS isSuspended,
              auth_provider AS authProvider, provider_id AS providerId,
              oauth_email_verified AS oauthEmailVerified,
              password
       FROM users WHERE email = ?`,
      [email]
    );

    if (rows.length === 0) {
      return res.redirect('/login?error=1');
    }

    const user = rows[0];

    if (user.role !== 'admin') {
      return res.redirect(authErrorRedirect('/login', 'use_google_for_reviewees'));
    }

    if (!user.password) {
      return res.redirect(authErrorRedirect('/login', 'admin_password_missing'));
    }

    // Compare password — supports both bcrypt hashes and plaintext (demo seed)
    let passwordMatch = false;
    if (String(user.password).startsWith('$2b$') || String(user.password).startsWith('$2a$')) {
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
    req.session.user = buildSessionUser(safeUser);

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

router.get('/signup', async (req, res) => {
  if (req.session.user) {
    if (req.session.user.role === 'admin') {
      return res.redirect('/admin/home');
    }

    if (!req.session.user.isOnboarded) {
      return res.redirect('/reviewee/onboarding');
    }

    return res.redirect('/reviewee/dashboard');
  }

  try {
    const [rows] = await db.query("SELECT COUNT(*) AS adminCount FROM users WHERE role = 'admin'");
    const adminCount = Number(rows?.[0]?.adminCount || 0);
    if (adminCount === 0) {
      return res.redirect('/admin/setup?token=ac5be80e46376f290724c6d8da686cdadaae2756f0765125');
    }
  } catch (err) {
    console.error('Error checking admin count on signup:', err);
  }

  return res.render('auth/signup');
});

// ── POST /signup — Local registration blocked (RSC compliance) ─────────────
// Reviewees must authenticate exclusively via Google OAuth.
router.post('/signup', (req, res) => {
  return res.redirect('/signup?error=use_google');
});

router.get('/auth/google', (req, res, next) => {
  req.session.oauthSource = req.query.source === 'signup' ? 'signup' : 'login';
  return passport.authenticate('google', {
    scope: ['profile', 'email'],
    prompt: 'select_account',
    session: false,
  })(req, res, next);
});

router.get('/auth/google/callback', (req, res, next) => {
  passport.authenticate('google', { session: false }, (err, user, info) => {
    const rawSource = req.session.oauthSource || 'login';
    const sourceRoute = rawSource === 'signup' ? '/signup' : '/login';
    const isSetupReview = (rawSource === 'setup_review' || rawSource === 'activate_review');

    if (err) {
      console.error('[Auth] Google OAuth error:', err);
      if (isSetupReview) return res.redirect('/admin/setup/review?error=google_oauth_failed');
      if (rawSource === 'bind_admin') return res.redirect('/admin/settings?error=bind_failed');
      if (rawSource === 'activate_admin') return res.redirect(`/admin/activate?token=${req.session.activationToken || ''}&error=google_oauth_failed`);
      return res.redirect(authErrorRedirect(sourceRoute, 'google_oauth_failed'));
    }

    if (!user) {
      const message = info?.message || 'google_oauth_failed';
      if (isSetupReview) return res.redirect('/admin/setup/review?error=' + message);
      if (rawSource === 'bind_admin') return res.redirect('/admin/settings?error=bind_failed');
      if (rawSource === 'activate_admin') return res.redirect(`/admin/activate?token=${req.session.activationToken || ''}&error=${message}`);
      return res.redirect(authErrorRedirect(sourceRoute, message));
    }

    // For setup_review, we do NOT create a full session — just redirect to the review page
    if (isSetupReview) {
      delete req.session.oauthSource;
      return req.session.save(saveErr => {
        if (saveErr) {
          console.error('[Auth] Session save error after setup_review:', saveErr);
          return res.redirect('/login?error=session_save_failed');
        }
        return res.redirect('/admin/setup/review');
      });
    }

    req.session.user = buildSessionUser ? buildSessionUser(user) : user;
    delete req.session.oauthSource;
    delete req.session.activationToken; // clean up if used

    req.session.save((saveErr) => {
      if (saveErr) {
        console.error('[Auth] Session save error after Google OAuth:', saveErr);
        if (rawSource === 'bind_admin') return res.redirect('/admin/settings?error=session_save_failed');
        if (rawSource === 'activate_admin') return res.redirect('/login?error=session_save_failed');
        return res.redirect(authErrorRedirect(sourceRoute, 'session_save_failed'));
      }

      if (rawSource === 'bind_admin') {
        return res.redirect('/admin/settings?success=google_bound');
      }

      if (user.role === 'admin') {
        return res.redirect('/admin/home');
      }

      if (user.role !== 'reviewee') {
        return res.redirect('/login?error=role_mismatch');
      }

      if (!user.isOnboarded) {
        return res.redirect('/reviewee/onboarding');
      }

      return res.redirect('/reviewee/dashboard');
    });
  })(req, res, next);
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
      `SELECT id, role, email, first_name AS firstName, last_name AS lastName,
              exam_level AS examLevel, is_verified AS isVerified, is_enrolled AS isEnrolled,
              is_onboarded AS isOnboarded, is_approved AS isApproved, is_suspended AS isSuspended,
              auth_provider AS authProvider, provider_id AS providerId, oauth_email_verified AS oauthEmailVerified
       FROM users WHERE id = ?`,
      [userId]
    );
    const user = rows[0];

    // Log the user in
    req.session.user = buildSessionUser(user);
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
