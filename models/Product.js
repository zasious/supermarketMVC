const db = require('../db');

const Product = {
    // User accessible methods
    getAllProducts: (callback) => {
        const sql = 'SELECT * FROM products';
        db.query(sql, (err, results) => {
            if (err) return callback(err, null);
            callback(null, results);
        });
    },

    searchProducts: (term, callback) => {
        const like = `%${term}%`;
        const sql = 'SELECT * FROM products WHERE productName LIKE ? OR category LIKE ?';
        db.query(sql, [like, like], (err, results) => {
            if (err) return callback(err, null);
            callback(null, results);
        });
    },

    getRatingSummary: (callback) => {
        const sql = `
            SELECT 
              r.product_id, 
              ROUND(AVG(r.rating), 1) AS avgRating,
              COUNT(*) AS reviewCount
            FROM reviews r
            GROUP BY r.product_id
        `;
        db.query(sql, (err, results) => {
            if (err) return callback(err, null);
            callback(null, results);
        });
    },

    getReviewsForProduct: (productId, callback) => {
        const sql = `
          SELECT r.id, r.rating, r.comment, r.created_at, u.username
          FROM reviews r
          JOIN users u ON u.id = r.user_id
          WHERE r.product_id = ?
          ORDER BY r.created_at DESC
        `;
        db.query(sql, [productId], callback);
    },

    getProductById: (id, callback) => {
        const sql = 'SELECT * FROM products WHERE id = ?';
        db.query(sql, [id], (err, results) => {
            if (err) return callback(err, null);
            callback(null, results[0]);
        });
    },

    getDistinctCategories: (callback) => {
        const sql = 'SELECT DISTINCT category FROM products ORDER BY category';
        db.query(sql, callback);
    },

    // Admin only methods - these should only be called after checkAdmin middleware
    addProduct: (productData, callback) => {
        const sql = 'INSERT INTO products (productName, quantity, price, category, image) VALUES (?, ?, ?, ?, ?)';
        const { name, quantity, price, category, image } = productData;
        
        db.query(sql, [name, quantity, price, category, image], (err, result) => {
            if (err) return callback(err, null);
            callback(null, result);
        });
    },

    updateProduct: (id, productData, callback) => {
        const sql = 'UPDATE products SET productName = ?, quantity = ?, price = ?, category = ?, image = ? WHERE id = ?';
        const { name, quantity, price, category, image } = productData;

        db.query(sql, [name, quantity, price, category, image, id], (err, result) => {
            if (err) return callback(err, null);
            callback(null, result);
        });
    },

    deleteProduct: (id, callback) => {
        const sql = 'DELETE FROM products WHERE id = ?';
        db.query(sql, [id], (err, result) => {
            if (err) return callback(err, null);
            callback(null, result);
        });
    },

    // Cart related methods
    updateStock: (id, quantity, callback) => {
        const sql = 'UPDATE products SET quantity = quantity - ? WHERE id = ? AND quantity >= ?';
        db.query(sql, [quantity, id, quantity], (err, result) => {
            if (err) return callback(err, null);
            callback(null, result);
        });
    }
};

module.exports = Product;
