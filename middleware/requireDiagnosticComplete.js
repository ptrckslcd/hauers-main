const db = require('../config/db');

/**
 * requireDiagnosticComplete — Blueprint §5.4, §12.1
 * Blocks access to practice, progress, study-plan, and materials pages
 * until the user has at least one completed diagnostic session.
 * Redirects to the diagnostic gate page.
 */
module.exports = async (req, res, next) => {
  if (!req.session.user) {
    return res.redirect('/login');
  }

  try {
    const [rows] = await db.query(
      `SELECT id FROM diagnostic_sessions
       WHERE user_id = ? AND status = 'completed'
       LIMIT 1`,
      [req.session.user.id]
    );

    if (rows.length === 0) {
      return res.redirect('/reviewee/diagnostic?gate=requireDiag');
    }

    next();
  } catch (err) {
    console.error('[Middleware] requireDiagnosticComplete error:', err);
    return res.redirect('/reviewee/diagnostic');
  }
};
