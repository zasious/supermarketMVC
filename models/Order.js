const db = require('../db');

const Order = {
  createFromCart: (userId, productIds, cb) => {
    // Allow calling with (userId, cb)
    if (typeof productIds === 'function') {
      cb = productIds;
      productIds = [];
    }

    if (!productIds || !productIds.length) {
      return cb(new Error('No items selected for checkout'));
    }

    const filterClause = productIds && productIds.length ? ' AND ci.product_id IN (?)' : '';
    const cartSql = `
      SELECT ci.product_id, ci.quantity, p.price, p.productName, p.quantity AS stock
      FROM cart_items ci
      JOIN products p ON p.id = ci.product_id
      WHERE ci.user_id = ?${filterClause}
    `;
    const cartParams = productIds && productIds.length ? [userId, productIds] : [userId];

    db.beginTransaction((err) => {
      if (err) return cb(err);

      db.query(cartSql, cartParams, (err, items) => {
        if (err) {
          return db.rollback(() => cb(err));
        }
        if (!items.length) {
          return db.rollback(() => cb(new Error('Cart is empty')));
        }

        // Validate stock
        for (const item of items) {
          if (item.quantity > item.stock) {
            return db.rollback(() => cb(new Error(`Not enough stock for ${item.productName}`)));
          }
        }

        const totalAmount = items.reduce((sum, i) => sum + (i.price * i.quantity), 0);

        const orderInsert = 'INSERT INTO orders (user_id, total_amount, created_at) VALUES (?, ?, NOW())';
        db.query(orderInsert, [userId, totalAmount], (err, result) => {
          if (err) {
            return db.rollback(() => cb(err));
          }
          const orderId = result.insertId;

          // Insert order items
          const orderItemsValues = items.map(i => [orderId, userId, i.product_id, i.quantity, i.price]);
          const orderItemsSql = 'INSERT INTO order_items (order_id, user_id, product_id, quantity, price) VALUES ?';
          db.query(orderItemsSql, [orderItemsValues], (err) => {
            if (err) {
              return db.rollback(() => cb(err));
            }

            // Update product stock
            const updatePromises = items.map(i => new Promise((resolve, reject) => {
              const updateSql = 'UPDATE products SET quantity = quantity - ? WHERE id = ? AND quantity >= ?';
              db.query(updateSql, [i.quantity, i.product_id, i.quantity], (err2, res2) => {
                if (err2) return reject(err2);
                if (res2.affectedRows === 0) return reject(new Error(`Not enough stock for ${i.productName}`));
                resolve();
              });
            }));

            Promise.all(updatePromises)
              .then(() => {
                // Remove only the checked-out items from the cart
                db.query('DELETE FROM cart_items WHERE user_id = ? AND product_id IN (?)', [userId, productIds], (err) => {
                  if (err) {
                    return db.rollback(() => cb(err));
                  }
                  db.commit((err) => {
                    if (err) {
                      return db.rollback(() => cb(err));
                    }
                    cb(null, orderId);
                  });
                });
              })
              .catch((err) => db.rollback(() => cb(err)));
          });
        });
      });
    });
  },

  getOrdersByUser: (userId, cb) => {
    const sql = `
      SELECT 
        o.id AS order_id,
        o.created_at,
        o.total_amount,
        oi.quantity,
        oi.price,
        oi.product_id,
        p.productName
      FROM orders o
      JOIN order_items oi ON oi.order_id = o.id
      JOIN products p ON p.id = oi.product_id
      WHERE o.user_id = ?
      ORDER BY o.created_at DESC, oi.id ASC
    `;
    db.query(sql, [userId], cb);
  },

  getAllOrdersWithUsers: (cb) => {
    const sql = `
      SELECT 
        o.id AS order_id,
        o.created_at,
        o.total_amount,
        u.id AS user_id,
        u.username,
        u.email,
        oi.product_id,
        oi.quantity,
        oi.price,
        p.productName
      FROM orders o
      JOIN users u ON u.id = o.user_id
      JOIN order_items oi ON oi.order_id = o.id
      JOIN products p ON p.id = oi.product_id
      ORDER BY o.created_at DESC, oi.id ASC
    `;
    db.query(sql, cb);
  },

  getReviewsForOrders: (orderIds, cb) => {
    if (!orderIds || !orderIds.length) return cb(null, []);
    const sql = `
      SELECT r.order_id, r.id, r.rating, r.comment, r.created_at, u.username
      FROM reviews r
      JOIN users u ON u.id = r.user_id
      WHERE r.order_id IN (?)
      ORDER BY r.created_at DESC
    `;
    db.query(sql, [orderIds], cb);
  },

  getOrderForUser: (orderId, userId, cb) => {
    const sql = `
      SELECT 
        o.id AS order_id,
        o.created_at,
        o.total_amount,
        o.user_id,
        u.username,
        u.email,
        oi.quantity,
        oi.price,
        oi.product_id,
        p.productName
      FROM orders o
      JOIN users u ON u.id = o.user_id
      JOIN order_items oi ON oi.order_id = o.id
      JOIN products p ON p.id = oi.product_id
      WHERE o.id = ? AND o.user_id = ?
    `;
    db.query(sql, [orderId, userId], cb);
  },

  getReviewsForOrder: (orderId, cb) => {
    const sql = `
      SELECT r.id, r.rating, r.comment, r.created_at, r.product_id, u.username, u.id AS user_id
      FROM reviews r
      JOIN users u ON u.id = r.user_id
      WHERE r.order_id = ?
      ORDER BY r.created_at DESC
    `;
    db.query(sql, [orderId], cb);
  },

  addOrUpdateReview: (orderId, productId, userId, rating, comment, cb) => {
    const checkSql = 'SELECT id FROM reviews WHERE order_id = ? AND product_id = ? AND user_id = ? LIMIT 1';
    db.query(checkSql, [orderId, productId, userId], (err, rows) => {
      if (err) return cb(err);
      if (rows.length) {
        const updateSql = 'UPDATE reviews SET rating = ?, comment = ?, created_at = NOW() WHERE order_id = ? AND product_id = ? AND user_id = ?';
        return db.query(updateSql, [rating, comment, orderId, productId, userId], cb);
      }
      const insertSql = 'INSERT INTO reviews (order_id, product_id, user_id, rating, comment, created_at) VALUES (?, ?, ?, ?, ?, NOW())';
      db.query(insertSql, [orderId, productId, userId, rating, comment], cb);
    });
  }
};

module.exports = Order;
