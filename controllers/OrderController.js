// Order controller: listing orders and per-item reviews.
const Order = require('../models/Order');

const OrderController = {
  listUserOrders: (req, res, next) => {
    const userId = req.session.userId;
    Order.getOrdersByUser(userId, (err, rows = []) => {
      if (err) return next(err);
      // group rows by order id for easy rendering
      const ordersMap = new Map();
      rows.forEach(row => {
        if (!ordersMap.has(row.order_id)) {
          ordersMap.set(row.order_id, {
            id: row.order_id,
            created_at: row.created_at,
            total_amount: row.total_amount,
            items: []
          });
        }
        ordersMap.get(row.order_id).items.push({
          product_id: row.product_id,
          productName: row.productName,
          quantity: row.quantity,
          price: row.price
        });
      });
      const orders = Array.from(ordersMap.values());
      res.render('orders', { orders });
    });
  },

  listAllOrders: (req, res, next) => {
    Order.getAllOrdersWithUsers((err, rows = []) => {
      if (err) return next(err);
      const ordersMap = new Map();
      rows.forEach(row => {
        if (!ordersMap.has(row.order_id)) {
          ordersMap.set(row.order_id, {
            id: row.order_id,
            created_at: row.created_at,
            total_amount: row.total_amount,
            user: { id: row.user_id, username: row.username, email: row.email },
            items: []
          });
        }
        ordersMap.get(row.order_id).items.push({
          product_id: row.product_id,
          productName: row.productName,
          quantity: row.quantity,
          price: row.price
        });
      });
      const orders = Array.from(ordersMap.values());
      const orderIds = orders.map(o => Number(o.id)).filter(v => !Number.isNaN(v));
      if (!orderIds.length) {
        return res.render('adminOrders', { orders });
      }
      Order.getReviewsForOrders(orderIds, (revErr, reviews = []) => {
        if (revErr) return next(revErr);
        const reviewMap = reviews.reduce((acc, r) => {
          const key = String(r.order_id);
          if (!acc[key]) acc[key] = [];
          acc[key].push(r);
          return acc;
        }, {});
        orders.forEach(o => { o.reviews = reviewMap[String(o.id)] || []; });
        res.render('adminOrders', { orders });
      });
    });
  },

  showOrder: (req, res, next) => {
    const userId = req.session.userId;
    const orderId = Number(req.params.id);
    if (!orderId) return res.status(400).send('Invalid order');
    const fromCheckout = req.query.from === 'checkout';
    Order.getOrderForUser(orderId, userId, (err, rows = []) => {
      if (err) return next(err);
      if (!rows.length) return res.status(404).send('Order not found');
      const order = {
        id: rows[0].order_id,
        created_at: rows[0].created_at,
        total_amount: rows[0].total_amount,
        user: { id: rows[0].user_id, username: rows[0].username, email: rows[0].email },
        items: rows.map(r => ({
          product_id: r.product_id,
          productName: r.productName,
          quantity: r.quantity,
          price: r.price
        }))
      };
      Order.getReviewsForOrder(orderId, (revErr, reviews = []) => {
        if (revErr) return next(revErr);
        const myReview = reviews.find(r => r.user_id === userId);
        res.render('orderDetail', { 
          order, 
          fromCheckout, 
          reviews,
          myReview,
          errorMessages: req.flash('error'),
          successMessages: req.flash('success')
        });
      });
    });
  },

  addReview: (req, res, next) => {
    const userId = req.session.userId;
    const orderId = Number(req.params.id);
    const productId = Number(req.body.productId);
    const rating = Number(req.body.rating);
    const comment = (req.body.comment || '').trim();
    if (!orderId || !productId || !rating || rating < 1 || rating > 5) {
      req.flash('error', 'Please provide a rating between 1 and 5 for a product.');
      return res.redirect(`/orders/${orderId}`);
    }
    // ensure ownership and that product is in the order
    Order.getOrderForUser(orderId, userId, (err, rows = []) => {
      if (err) return next(err);
      if (!rows.length) {
        req.flash('error', 'Order not found');
        return res.redirect('/orders');
      }
      const hasProduct = rows.some(r => r.product_id === productId);
      if (!hasProduct) {
        req.flash('error', 'Product not found in this order');
        return res.redirect(`/orders/${orderId}`);
      }
      Order.addOrUpdateReview(orderId, productId, userId, rating, comment, (err2) => {
        if (err2) return next(err2);
        req.flash('success', 'Review saved');
        res.redirect(`/orders/${orderId}`);
      });
    });
  }
};

module.exports = OrderController;
