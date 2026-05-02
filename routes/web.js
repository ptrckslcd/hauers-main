const express = require('express');
const path = require('path');

const router = express.Router();

router.get('/', (req, res) => {
  res.render('public/landing');
});

router.get('/signup', (req, res) => {
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
