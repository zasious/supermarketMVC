// Landing page controller
const PageController = {
  showHome: (req, res) => {
    res.render('index', { user: req.session.user, hideAuthLinks: true });
  }
};

module.exports = PageController;
