const db = require('../db');

const Cart = {
  ensureCart: (userId, cb) => {
    const sql = 'INSERT IGNORE INTO cart (user_id, created_at) VALUES (?, NOW())';
    db.query(sql, [userId], cb);
  },

  getItems: (userId, cb) => {
    const sql = `
      SELECT 
        ci.product_id,
        ci.quantity,
        p.productName AS productName,
        p.price,
        p.image,
        p.quantity AS stock
      FROM cart_items ci
      JOIN products p ON p.id = ci.product_id
      WHERE ci.user_id = ?
      ORDER BY ci.id DESC
    `;
    db.query(sql, [userId], cb);
  },

  addOrIncrement: (userId, productId, qty, cb) => {
    if (qty <= 0) {
      return cb(new Error('Quantity must be at least 1'));
    }
    const checkStock = `
      SELECT 
        p.quantity AS stock, 
        IFNULL(ci.quantity, 0) AS cartQty
      FROM products p
      LEFT JOIN cart_items ci ON ci.product_id = p.id AND ci.user_id = ?
      WHERE p.id = ?
    `;
    db.query(checkStock, [userId, productId], (err, rows) => {
      if (err) return cb(err);
      if (!rows.length) return cb(new Error('Product not found'));
      const { stock, cartQty } = rows[0];
      if (stock <= 0) return cb(new Error('Product is out of stock'));
      if (cartQty + qty > stock) return cb(new Error('Not enough stock available'));

      if (cartQty > 0) {
        const update = 'UPDATE cart_items SET quantity = quantity + ? WHERE user_id = ? AND product_id = ?';
        return db.query(update, [qty, userId, productId], cb);
      }
      const insert = 'INSERT INTO cart_items (user_id, product_id, quantity, added_at) VALUES (?, ?, ?, NOW())';
      db.query(insert, [userId, productId, qty], cb);
    });
  },

  updateQuantity: (userId, productId, qty, cb) => {
    if (qty <= 0) {
      const del = 'DELETE FROM cart_items WHERE user_id = ? AND product_id = ?';
      return db.query(del, [userId, productId], cb);
    }
    const checkStock = 'SELECT quantity FROM products WHERE id = ?';
    db.query(checkStock, [productId], (err, rows) => {
      if (err) return cb(err);
      if (!rows.length) return cb(new Error('Product not found'));
      const stock = rows[0].quantity;
      if (qty > stock) return cb(new Error('Quantity exceeds available stock'));
      const sql = 'UPDATE cart_items SET quantity = ? WHERE user_id = ? AND product_id = ?';
      db.query(sql, [qty, userId, productId], cb);
    });
  },

  removeItem: (userId, productId, cb) => {
    const sql = 'DELETE FROM cart_items WHERE user_id = ? AND product_id = ?';
    db.query(sql, [userId, productId], cb);
  },

  clear: (userId, cb) => {
    const sql = 'DELETE FROM cart_items WHERE user_id = ?';
    db.query(sql, [userId], cb);
  }
};

module.exports = Cart;
