const PageController = {
  showHome: (req, res) => {
    if (req.session && req.session.user) {
      return req.session.user.role === 'admin'
        ? res.redirect('/admin/dashboard')
        : res.redirect('/shopping');
    }
    res.render('index', { user: req.session.user });
  }
};

module.exports = PageController;
