const db = require('../db');

const AdminController = {
  dashboard: (req, res, next) => {
    const data = {};
    db.query('SELECT COUNT(*) AS count FROM products', (err, rows) => {
      if (err) return next(err);
      data.inventoryCount = rows[0].count || 0;
      db.query('SELECT COUNT(*) AS count FROM users', (err2, rows2) => {
        if (err2) return next(err2);
        data.userCount = rows2[0].count || 0;
        db.query('SELECT COUNT(*) AS count, COALESCE(SUM(total_amount),0) AS revenue FROM orders', (err3, rows3) => {
          if (err3) return next(err3);
          data.orderCount = rows3[0].count || 0;
          data.revenue = rows3[0].revenue || 0;
          const recentSql = `
            SELECT o.id, o.created_at, o.total_amount, u.username
            FROM orders o
            JOIN users u ON u.id = o.user_id
            ORDER BY o.created_at DESC
            LIMIT 5
          `;
          db.query(recentSql, (err4, recent) => {
            if (err4) return next(err4);
            res.render('adminDashboard', {
              user: req.session.user,
              stats: data,
              recentOrders: recent || []
            });
          });
        });
      });
    });
  },

  listUsers: (req, res, next) => {
    const sql = 'SELECT id, username, email, address, contact, role FROM users ORDER BY id DESC';
    db.query(sql, (err, users = []) => {
      if (err) return next(err);
      res.render('adminUsers', { users });
    });
  },

  deleteUser: (req, res, next) => {
    const userId = Number(req.params.id);
    if (!userId) {
      req.flash('error', 'Invalid user');
      return res.redirect('/admin/users');
    }
    // Prevent deleting self
    if (req.session.user && req.session.user.id === userId) {
      req.flash('error', 'You cannot delete your own account.');
      return res.redirect('/admin/users');
    }
    const sql = 'DELETE FROM users WHERE id = ?';
    db.query(sql, [userId], (err) => {
      if (err) return next(err);
      req.flash('success', 'User deleted');
      res.redirect('/admin/users');
    });
  }
};

module.exports = AdminController;
