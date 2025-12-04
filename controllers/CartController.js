const Cart = require('../models/Cart');
const Order = require('../models/Order');

const CartController = {
  viewCart: (req, res, next) => {
    const userId = req.session.userId;
    Cart.ensureCart(userId, (err) => {
      if (err) return next(err);
      Cart.getItems(userId, (err, items = []) => {
        if (err) return next(err);
        const grandTotal = items.reduce((sum, i) => sum + i.price * i.quantity, 0);
        res.render('cart', { 
          items, 
          grandTotal,
          errorMessages: req.flash('error'),
          successMessages: req.flash('success')
        });
      });
    });
  },

  addToCart: (req, res, next) => {
    const userId = req.session.userId;
    const { productId, quantity } = req.body;
    const qtyParsed = parseInt(quantity, 10);
    const qty = Number.isNaN(qtyParsed) ? 1 : qtyParsed;
    if (qty <= 0) {
      const wantsJSON = req.xhr || (req.headers.accept && req.headers.accept.includes('application/json'));
      const message = 'Quantity must be at least 1';
      if (wantsJSON) return res.status(400).json({ success: false, message });
      req.flash('error', message);
      return res.redirect('/cart');
    }
    Cart.ensureCart(userId, (err) => {
      if (err) return next(err);
      Cart.addOrIncrement(userId, Number(productId), qty, (err) => {
        const wantsJSON = req.xhr || (req.headers.accept && req.headers.accept.includes('application/json'));
        if (err) {
          if (wantsJSON) return res.status(400).json({ success: false, message: err.message || 'Unable to add to cart' });
          req.flash('error', err.message || 'Unable to add to cart');
          return res.redirect('/cart');
        }
        if (wantsJSON) return res.json({ success: true });
        res.redirect('/cart');
      });
    });
  },

  updateQuantity: (req, res, next) => {
    const userId = req.session.userId;
    const { productId, quantity } = req.body;
    Cart.updateQuantity(userId, Number(productId), parseInt(quantity, 10), (err) => {
      if (err) {
        req.flash('error', err.message || 'Unable to update quantity');
        return res.redirect('/cart');
      }
      res.redirect('/cart');
    });
  },

  removeItem: (req, res, next) => {
    const userId = req.session.userId;
    const { productId } = req.body;
    Cart.removeItem(userId, Number(productId), (err) => {
      if (err) return next(err);
      res.redirect('/cart');
    });
  },

  clearCart: (req, res, next) => {
    const userId = req.session.userId;
    Cart.clear(userId, (err) => {
      if (err) return next(err);
      res.redirect('/cart');
    });
  },

  checkout: (req, res, next) => {
    const userId = req.session.userId;
    let selected = req.body.selectedProducts || [];
    if (!Array.isArray(selected)) selected = [selected];
    const selectedIds = selected
      .map((v) => Number(v))
      .filter((v) => !Number.isNaN(v));

    if (!selectedIds.length) {
      const wantsJSON = req.xhr || (req.headers.accept && req.headers.accept.includes('application/json'));
      if (wantsJSON) return res.status(400).json({ success: false, message: 'Select at least one item to checkout.' });
      req.flash('error', 'Select at least one item to checkout.');
      return res.redirect('/cart');
    }

    Order.createFromCart(userId, selectedIds, (err, orderId) => {
      if (err) {
        const wantsJSON = req.xhr || (req.headers.accept && req.headers.accept.includes('application/json'));
        if (wantsJSON) return res.status(400).json({ success: false, message: err.message || 'Checkout failed' });
        req.flash('error', err.message || 'Checkout failed');
        return res.redirect('/cart');
      }
      const redirectUrl = `/orders/${orderId}?from=checkout`;
      const wantsJSON = req.xhr || (req.headers.accept && req.headers.accept.includes('application/json'));
      if (wantsJSON) return res.json({ success: true, orderId, redirect: redirectUrl });
      res.redirect(redirectUrl);
    });
  }
};

module.exports = CartController;
