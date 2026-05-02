const express = require('express');
const path = require('path');
const session = require('express-session');

const webRoutes = require('./routes/web');
const authRoutes = require('./routes/auth');
const revieweeRoutes = require('./routes/reviewee');
const adminRoutes = require('./routes/admin');

const logger = require('./middleware/logger');
const injectUser = require('./middleware/injectUser');

const app = express();

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
    secret: 'hauers-secret-key',
    resave: false,
    saveUninitialized: false
  })
);

// attach current user to request
app.use(injectUser);

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