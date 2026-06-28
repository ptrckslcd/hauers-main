/**
 * requireReviewee — Blueprint §12.1
 * Allows only authenticated reviewees. Returns 403 for non-reviewees.
 */
module.exports = (req, res, next) => {
  if (!req.session.user) {
    return res.redirect('/login');
  }

  if (req.session.user.role !== 'reviewee') {
    return res.status(403).render('errors/403', {
      message: 'This area is for reviewees only.'
    });
  }

  if (req.session.user.isSuspended) {
    return res.status(403).render('errors/403', {
      message: 'This account has been suspended.'
    });
  }

  next();
};
