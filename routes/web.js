const express = require('express');
const path = require('path');
const db = require('../config/db');

const router = express.Router();

router.get('/', (req, res) => {
  res.render('public/landing');
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

  res.render('auth/signup');
});

router.get('/signup-success', (req, res) => {
  res.render('auth/signup-success');
});

router.get('/forgot-password', (req, res) => {
  res.render('auth/forgot-password');
});

router.get('/otp', (req, res) => {
  res.render('auth/otp');
});

router.get('/email-verified', (req, res) => {
  res.render('auth/email-verified');
});

router.get('/reset-password', (req, res) => {
  res.render('auth/reset-password');
});

router.get('/terms', (req, res) => {
  res.render('public/terms');
});

router.get('/privacy', (req, res) => {
  res.render('public/privacy');
});

module.exports = router;
