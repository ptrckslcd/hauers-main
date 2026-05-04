/**
 * requireOnboarded — Blueprint §5.4, §12.1
 * Allows only reviewees who have completed the profile setup (onboarding).
 * Redirects to onboarding if is_onboarded = false.
 */
const db = require('../config/db');

module.exports = async (req, res, next) => {
  if (!req.session.user) {
    return res.redirect('/login');
  }

  // Fallback: If session says not onboarded, double-check the DB
  if (!req.session.user.isOnboarded) {
    try {
      const [rows] = await db.query('SELECT is_onboarded FROM users WHERE id = ?', [req.session.user.id]);
      if (rows.length && rows[0].is_onboarded) {
        req.session.user.isOnboarded = true;
        return next();
      }
    } catch (err) {
      console.error('[Middleware] requireOnboarded DB fallback error:', err);
    }
    return res.redirect('/reviewee/onboarding?gate=requireOnboarded');
  }

  next();
};
