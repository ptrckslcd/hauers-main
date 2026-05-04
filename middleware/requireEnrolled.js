/**
 * requireEnrolled — Blueprint §5.4, §12.1
 * Allows only reviewees who have completed the enrollment code step.
 * If not enrolled, redirects to the current page with ?gate=requireEnrolled
 * which triggers the enrollment code modal to appear.
 */
const db = require('../config/db');

module.exports = async (req, res, next) => {
  if (!req.session.user) {
    return res.redirect('/login');
  }

  // Fallback: If session says not enrolled, double-check the DB
  if (!req.session.user.isEnrolled) {
    try {
      const [rows] = await db.query('SELECT is_enrolled FROM users WHERE id = ?', [req.session.user.id]);
      if (rows.length && rows[0].is_enrolled) {
        req.session.user.isEnrolled = true;
        return next();
      }
    } catch (err) {
      console.error('[Middleware] requireEnrolled DB fallback error:', err);
    }
    
    // Check if we already have the gate parameter to prevent infinite redirect loop
    if (req.originalUrl.includes('gate=requireEnrolled')) {
      // Gate parameter already exists, just allow the page to load so the modal can show
      return next();
    }
    
    // Redirect to current page with gate parameter so modal can show
    const currentUrl = req.originalUrl || req.url;
    const separator = currentUrl.includes('?') ? '&' : '?';
    return res.redirect(`${currentUrl}${separator}gate=requireEnrolled`);
  }

  next();
};
