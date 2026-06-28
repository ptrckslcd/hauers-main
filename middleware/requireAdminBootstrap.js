const db = require('../config/db');

const SETUP_TOKEN = 'ac5be80e46376f290724c6d8da686cdadaae2756f0765125';

module.exports = async (req, res, next) => {
  try {
    // One-time use: if any admin exists, permanently block and redirect
    const [rows] = await db.query("SELECT COUNT(*) AS adminCount FROM users WHERE role = 'admin'");
    const adminCount = Number(rows?.[0]?.adminCount || 0);
    if (adminCount > 0) {
      req.app.locals.adminBootstrapEnabled = false;
      return res.redirect('/login');
    }

    // Token gate: must match the exact hardcoded token
    const suppliedToken = String(req.query.token || req.body.bootstrap_token || '').trim();
    if (!suppliedToken || suppliedToken !== SETUP_TOKEN) {
      return res.redirect('/login');
    }

    next();
  } catch (err) {
    console.error('[Bootstrap] Gate error:', err);
    return res.status(500).send('Server error');
  }
};