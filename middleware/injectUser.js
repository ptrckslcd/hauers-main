module.exports = (req, res, next) => {
  req.currentUser = req.session.user || null;
  next();
};