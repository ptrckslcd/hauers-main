const db = require('../config/db');

/**
 * blockIfDiagnosticComplete
 * Prevents users from retaking the diagnostic test.
 * Redirects to dashboard if a completed diagnostic session exists.
 */
module.exports = async (req, res, next) => {
  if (!req.session.user) {
    return next();
  }

  try {
    const [rows] = await db.query(
      `SELECT id FROM diagnostic_sessions
       WHERE user_id = ? AND status = 'completed'
       LIMIT 1`,
      [req.session.user.id]
    );

    if (rows.length > 0) {
      return res.redirect('/reviewee/dashboard');
    }

    next();
  } catch (err) {
    console.error('[Middleware] blockIfDiagnosticComplete error:', err);
    next();
  }
};
