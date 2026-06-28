const express = require('express');
const path = require('path');
const session = require('express-session');
const passport = require('passport');
const crypto = require('crypto');

const webRoutes = require('./routes/web');
const authRoutes = require('./routes/auth');
const revieweeRoutes = require('./routes/reviewee');
const adminRoutes = require('./routes/admin');
const db = require('./config/db');

const logger = require('./middleware/logger');
const injectUser = require('./middleware/injectUser');

const app = express();
const isProduction = process.env.NODE_ENV === 'production';
const bootstrapToken = 'ac5be80e46376f290724c6d8da686cdadaae2756f0765125';

app.set('trust proxy', 1);
app.locals.adminBootstrapEnabled = false;
app.locals.adminBootstrapReady = false;
app.locals.adminBootstrapToken = bootstrapToken;

// configure ejs
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'ejs');

// built-in middleware
app.use(express.urlencoded({ extended: true }));
app.use(express.json());

// static files
app.use(express.static(path.join(__dirname, 'public')));

// custom middleware
app.use(logger);

// session
app.use(
  session({
    secret: process.env.SESSION_SECRET || 'hauers-secret-key',
    resave: false,
    saveUninitialized: false,
    cookie: {
      httpOnly: true,
      sameSite: 'lax',
      secure: isProduction
    }
  })
);

app.use(passport.initialize());

// attach current user to request
app.use(injectUser);

(async () => {
  try {
    const [rows] = await db.query("SELECT COUNT(*) AS adminCount FROM users WHERE role = 'admin'");
    const adminCount = Number(rows?.[0]?.adminCount || 0);
    app.locals.adminBootstrapEnabled = adminCount === 0;
    app.locals.adminBootstrapReady = true;

    if (adminCount === 0) {
      console.log(`[Bootstrap] No admin accounts found. Setup route available at /admin/setup?token=${bootstrapToken}`);
    }
  } catch (err) {
    app.locals.adminBootstrapEnabled = false;
    app.locals.adminBootstrapReady = true;
    console.error('[Bootstrap] Failed to initialize admin setup state:', err);
  }
})();

// routes
app.use('/', webRoutes);
app.use('/', authRoutes);
app.use('/reviewee', revieweeRoutes);
app.use('/admin', adminRoutes);

// 404 fallback
app.use((req, res) => {
  res.status(404).render('404');
});

module.exports = app;