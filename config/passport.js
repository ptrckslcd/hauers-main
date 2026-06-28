require('dotenv').config();

const passport = require('passport');
const { Strategy: GoogleStrategy } = require('passport-google-oauth20');
const db = require('./db');

const allowedDomain = String(process.env.GOOGLE_ALLOWED_DOMAIN || 'my.cspc.edu.ph').toLowerCase();

function normalizeEmail(email) {
  return String(email || '').trim().toLowerCase();
}

function emailBelongsToDomain(email) {
  return normalizeEmail(email).endsWith(`@${allowedDomain}`);
}

function isVerifiedClaim(value) {
  return value === true || value === 'true' || value === 1 || value === '1';
}

function pickNames(profile, email) {
  const nameParts = String(profile?.displayName || '').trim().split(/\s+/).filter(Boolean);
  return {
    firstName: String(profile?.name?.givenName || nameParts[0] || email.split('@')[0] || 'Reviewee').trim(),
    lastName: String(profile?.name?.familyName || nameParts.slice(1).join(' ') || 'User').trim()
  };
}

function buildSessionUser(userRow) {
  return {
    id: userRow.id,
    role: userRow.role,
    firstName: userRow.firstName,
    lastName: userRow.lastName,
    email: userRow.email,
    examLevel: userRow.examLevel,
    isVerified: !!userRow.isVerified,
    isEnrolled: !!userRow.isEnrolled,
    isOnboarded: !!userRow.isOnboarded,
    isApproved: !!userRow.isApproved,
    isSuspended: !!userRow.isSuspended,
    authProvider: userRow.authProvider || 'local',
    providerId: userRow.providerId || null,
    oauthEmailVerified: !!userRow.oauthEmailVerified
  };
}

function isOnboardedFlag(value) {
  return value === 1 || value === true || value === '1';
}

async function fetchUserOnboardedStatus(userId) {
  const [rows] = await db.query(
    'SELECT is_onboarded AS isOnboarded FROM users WHERE id = ? LIMIT 1',
    [userId]
  );
  return rows.length ? isOnboardedFlag(rows[0].isOnboarded) : false;
}

async function fetchUserByEmail(email) {
  const [rows] = await db.query(
    `SELECT id,
            role,
            first_name AS firstName,
            last_name AS lastName,
            email,
            exam_level AS examLevel,
            is_verified AS isVerified,
            is_enrolled AS isEnrolled,
            is_onboarded AS isOnboarded,
            is_approved AS isApproved,
            is_suspended AS isSuspended,
            auth_provider AS authProvider,
            provider_id AS providerId,
            oauth_email_verified AS oauthEmailVerified,
            password
       FROM users
      WHERE LOWER(email) = LOWER(?)
      LIMIT 1`,
    [email]
  );

  return rows[0] || null;
}

async function fetchWhitelistEntry(email) {
  const [rows] = await db.query(
    `SELECT rw.id,
            rw.email,
            rw.first_name AS firstName,
            rw.last_name AS lastName,
            rw.batch_id AS batchId,
            rw.enrollment_code_id AS enrollmentCodeId,
            rw.is_active AS isActive,
            rw.claimed_by_user_id AS claimedByUserId,
            rw.claimed_at AS claimedAt,
            b.exam_level AS batchExamLevel,
            ec.code AS enrollmentCode
       FROM reviewee_whitelist rw
       LEFT JOIN batches b ON b.id = rw.batch_id
       LEFT JOIN enrollment_codes ec ON ec.id = rw.enrollment_code_id
      WHERE LOWER(rw.email) = LOWER(?)
      LIMIT 1`,
    [email]
  );

  return rows[0] || null;
}

async function applyAutoEnrollment(userId, whitelistEntry) {
  if (!whitelistEntry || !whitelistEntry.batchId) {
    return { enrolled: false };
  }

  const [batchRows] = await db.query(
    'SELECT id, exam_level AS examLevel, status FROM batches WHERE id = ? LIMIT 1',
    [whitelistEntry.batchId]
  );

  if (!batchRows.length || batchRows[0].status !== 'active') {
    throw new Error('Whitelist batch is not active.');
  }

  const batch = batchRows[0];
  const examLevel = whitelistEntry.batchExamLevel || batch.examLevel || null;

  if (whitelistEntry.enrollmentCodeId) {
    // Returning onboarded users must not be blocked by one-time code lifecycle checks.
    if (await fetchUserOnboardedStatus(userId)) {
      return { enrolled: true, batchId: whitelistEntry.batchId, examLevel: examLevel || null };
    }

    const [codes] = await db.query(
      `SELECT id, batch_id AS batchId, max_uses AS maxUses, used_count AS usedCount, is_active AS isActive, expires_at AS codeExpiresAt
         FROM enrollment_codes
        WHERE id = ?
        LIMIT 1`,
      [whitelistEntry.enrollmentCodeId]
    );

    if (!codes.length || !codes[0].isActive || codes[0].usedCount >= codes[0].maxUses) {
      throw new Error('Assigned enrollment code is unavailable.');
    }

    if (codes[0].codeExpiresAt && new Date(codes[0].codeExpiresAt) < new Date()) {
      throw new Error('Assigned enrollment code has expired.');
    }

    const code = codes[0];
    const [insertResult] = await db.query(
      `INSERT INTO enrollments (user_id, batch_id, enrollment_code_id)
       SELECT ?, ?, ?
       WHERE NOT EXISTS (
         SELECT 1 FROM enrollments WHERE user_id = ? AND batch_id = ?
       )`,
      [userId, code.batchId, code.id, userId, code.batchId]
    );

    if (insertResult.affectedRows > 0) {
      await db.query('UPDATE enrollment_codes SET used_count = used_count + 1 WHERE id = ?', [code.id]);
    }
    await db.query(
      `UPDATE users
          SET batch_id = ?,
              exam_level = COALESCE(?, exam_level),
              is_enrolled = TRUE,
              is_approved = TRUE
        WHERE id = ?`,
      [code.batchId, examLevel, userId]
    );

    const [domains] = await db.query(
      `SELECT id
         FROM domains
        WHERE exam_level = ? OR exam_level = 'both'`,
      [examLevel || 'both']
    );

    for (const domain of domains) {
      await db.query(
        `INSERT IGNORE INTO domain_ratings (user_id, domain_id, theta, k_factor, sessions_count)
         VALUES (?, ?, 1200.0, 48.0, 0)`,
        [userId, domain.id]
      );
    }

    return { enrolled: true, batchId: code.batchId, examLevel };
  }

  const [insertResult] = await db.query(
    `INSERT INTO enrollments (user_id, batch_id, enrollment_code_id)
     SELECT ?, ?, NULL
     WHERE NOT EXISTS (
       SELECT 1 FROM enrollments WHERE user_id = ? AND batch_id = ?
     )`,
    [userId, whitelistEntry.batchId, userId, whitelistEntry.batchId]
  );

  if (insertResult.affectedRows === 0) {
    return { enrolled: true, batchId: whitelistEntry.batchId, examLevel };
  }

  await db.query(
    `UPDATE users
        SET batch_id = ?,
            exam_level = COALESCE(?, exam_level),
            is_enrolled = TRUE,
            is_approved = TRUE
      WHERE id = ?`,
    [whitelistEntry.batchId, examLevel, userId]
  );

  const [domains] = await db.query(
    `SELECT id
       FROM domains
      WHERE exam_level = ? OR exam_level = 'both'`,
    [examLevel || 'both']
  );

  for (const domain of domains) {
    await db.query(
      `INSERT IGNORE INTO domain_ratings (user_id, domain_id, theta, k_factor, sessions_count)
       VALUES (?, ?, 1200.0, 48.0, 0)`,
      [userId, domain.id]
    );
  }

  return { enrolled: true, batchId: whitelistEntry.batchId, examLevel };
}

async function upsertGoogleUser(req, profile) {
  const email = normalizeEmail(profile?.emails?.[0]?.value);
  if (!email) {
    throw new Error('google_email_missing');
  }

  if (!isVerifiedClaim(profile?._json?.email_verified)) {
    throw new Error('google_email_not_verified');
  }

  if (!emailBelongsToDomain(email)) {
    throw new Error('google_workspace_restricted');
  }

  const hostedDomain = normalizeEmail(profile?._json?.hd || '');
  if (hostedDomain && hostedDomain !== allowedDomain) {
    throw new Error('google_workspace_restricted');
  }

  const oauthSource = req?.session?.oauthSource;
  const names = pickNames(profile, email);
  const providerId = String(profile?.id || '').trim() || null;

  // ── 0. Setup/Activate Review Pipeline (session bridge) ─────────────────────
  if (oauthSource === 'setup_review' || oauthSource === 'activate_review') {
    const pending = req?.session?.pendingAdminSetup;
    if (!pending) throw new Error('missing_pending_setup');

    if (normalizeEmail(pending.email) !== email) {
      throw new Error('email_mismatch');
    }

    // Save the Google profile in session — no DB writes yet
    req.session.pendingGoogleProfile = {
      providerId,
      googleEmail: email,
      googleName: profile?.displayName || '',
    };

    return { pendingReview: true, role: 'admin', email };
  }

  // ── 1. Admin Activation Pipeline ───────────────────────────────────────────
  if (oauthSource === 'activate_admin') {
    const token = req?.session?.activationToken;
    if (!token) throw new Error('missing_activation_token');

    const [inviteRows] = await db.query(
      `SELECT * FROM admin_invitations WHERE token_hash = ? LIMIT 1`,
      [require('crypto').createHash('sha256').update(token).digest('hex')]
    );
    const invite = inviteRows[0] || null;
    if (!invite || invite.revoked_at || invite.accepted_at || new Date(invite.expires_at) < new Date()) {
      throw new Error('activation_link_invalid');
    }

    if (normalizeEmail(invite.email) !== email) {
      throw new Error('google_workspace_restricted');
    }

    let userRow = await fetchUserByEmail(email);
    if (userRow) {
      if (userRow.role !== 'admin') throw new Error('role_mismatch');
      await db.query(
        `UPDATE users
            SET auth_provider = 'google',
                provider_id = ?,
                is_verified = TRUE,
                is_enrolled = TRUE,
                is_onboarded = TRUE,
                is_approved = TRUE,
                oauth_email_verified = TRUE
          WHERE id = ?`,
        [providerId, userRow.id]
      );
    } else {
      const [insertResult] = await db.query(
        `INSERT INTO users
          (role, first_name, last_name, email, is_verified, is_enrolled, is_onboarded, is_approved, auth_provider, provider_id, oauth_email_verified)
         VALUES
          ('admin', ?, ?, ?, TRUE, TRUE, TRUE, TRUE, 'google', ?, TRUE)`,
        [names.firstName, names.lastName, email, providerId]
      );
      userRow = await fetchUserByEmail(email);
    }

    await db.query(
      `UPDATE admin_invitations
          SET accepted_by = ?, accepted_at = NOW()
        WHERE id = ?`,
      [userRow.id, invite.id]
    );

    return userRow;
  }

  // ── 2. Admin Binding Pipeline ──────────────────────────────────────────────
  if (oauthSource === 'bind_admin') {
    const sessionUser = req?.session?.user;
    if (!sessionUser || sessionUser.role !== 'admin') throw new Error('unauthorized_bind');
    if (normalizeEmail(sessionUser.email) !== email) throw new Error('email_mismatch');

    await db.query(
      `UPDATE users
          SET auth_provider = 'google',
              provider_id = ?,
              oauth_email_verified = TRUE
        WHERE id = ?`,
      [providerId, sessionUser.id]
    );

    return await fetchUserByEmail(email);
  }

  // ── 3. Standard Login/Signup (Omni-Channel) ────────────────────────────────
  let userRow = await fetchUserByEmail(email);

  if (userRow && userRow.role === 'admin') {
    // Ensure the admin is actually bound to Google
    if (userRow.authProvider !== 'google' && userRow.authProvider !== 'both') {
      if (!userRow.providerId || userRow.providerId !== providerId) {
        throw new Error('admin_google_not_bound');
      }
    }
    return userRow; // Log them in!
  }

  const whitelistEntry = await fetchWhitelistEntry(email);
  if (!whitelistEntry || !whitelistEntry.isActive) {
    throw new Error('email_not_whitelisted');
  }

  if (userRow && userRow.role !== 'reviewee') {
    throw new Error('role_mismatch');
  }

  if (userRow) {
    await db.query(
      `UPDATE users
          SET first_name = COALESCE(NULLIF(first_name, ''), ?),
              last_name = COALESCE(NULLIF(last_name, ''), ?),
              auth_provider = 'google',
              provider_id = COALESCE(?, provider_id),
              oauth_email_verified = TRUE,
              is_verified = TRUE,
              is_approved = TRUE
        WHERE id = ?`,
      [names.firstName, names.lastName, providerId, userRow.id]
    );
  } else {
    const [insertResult] = await db.query(
      `INSERT INTO users
        (role, first_name, last_name, email, password, is_verified, is_enrolled, is_onboarded, is_approved, auth_provider, provider_id, oauth_email_verified)
       VALUES
        ('reviewee', ?, ?, ?, NULL, TRUE, FALSE, FALSE, TRUE, 'google', ?, TRUE)`,
      [names.firstName, names.lastName, email, providerId]
    );

    userRow = await fetchUserByEmail(email);
    if (!userRow && insertResult?.insertId) {
      const [rows] = await db.query(
        `SELECT id,
                role,
                first_name AS firstName,
                last_name AS lastName,
                email,
                exam_level AS examLevel,
                is_verified AS isVerified,
                is_enrolled AS isEnrolled,
                is_onboarded AS isOnboarded,
                is_approved AS isApproved,
                is_suspended AS isSuspended,
                auth_provider AS authProvider,
                provider_id AS providerId,
                oauth_email_verified AS oauthEmailVerified
           FROM users
          WHERE id = ?
          LIMIT 1`,
        [insertResult.insertId]
      );
      userRow = rows[0] || null;
    }
  }

  if (!userRow) {
    throw new Error('google_oauth_failed');
  }

  // Returning users who are fully onboarded should not be blocked by invite code lifecycle checks.
  const alreadyOnboarded = await fetchUserOnboardedStatus(userRow.id);
  if (!alreadyOnboarded) {
    await applyAutoEnrollment(userRow.id, whitelistEntry);
  }

  await db.query(
    `UPDATE reviewee_whitelist
        SET claimed_by_user_id = COALESCE(claimed_by_user_id, ?),
            claimed_at = COALESCE(claimed_at, NOW())
      WHERE id = ?`,
    [userRow.id, whitelistEntry.id]
  );

  const [freshRows] = await db.query(
    `SELECT id,
            role,
            first_name AS firstName,
            last_name AS lastName,
            email,
            exam_level AS examLevel,
            is_verified AS isVerified,
            is_enrolled AS isEnrolled,
            is_onboarded AS isOnboarded,
            is_approved AS isApproved,
            is_suspended AS isSuspended,
            auth_provider AS authProvider,
            provider_id AS providerId,
            oauth_email_verified AS oauthEmailVerified
       FROM users
      WHERE id = ?
      LIMIT 1`,
    [userRow.id]
  );

  return buildSessionUser(freshRows[0]);
}

passport.use(
  new GoogleStrategy(
    {
      clientID: process.env.GOOGLE_CLIENT_ID || '',
      clientSecret: process.env.GOOGLE_CLIENT_SECRET || '',
      callbackURL: process.env.GOOGLE_CALLBACK_URL || 'http://localhost:3000/auth/google/callback',
      passReqToCallback: true,
    },
    async (req, _accessToken, _refreshToken, profile, done) => {
      try {
        const sessionUser = await upsertGoogleUser(req, profile);
        return done(null, sessionUser);
      } catch (err) {
        return done(null, false, { message: err.message || 'google_oauth_failed' });
      }
    }
  )
);

module.exports = passport;