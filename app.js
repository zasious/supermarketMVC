require('dotenv').config();
const express = require('express');
const session = require('express-session');
const flash = require('connect-flash');
const multer = require('multer');
const path = require('path');
const app = express();

// Add these two lines after creating the app
app.set('view engine', 'ejs');
app.set('views', './views');

// Import controllers
const PageController = require('./controllers/PageController');
const AuthController = require('./controllers/AuthController');
const ProductController = require('./controllers/ProductController');
const CartController = require('./controllers/CartController');
const OrderController = require('./controllers/OrderController');
const AdminController = require('./controllers/AdminController');

// Set up multer for file uploads
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, 'public/images'); // Directory to save uploaded files
    },
    filename: (req, file, cb) => {
        cb(null, file.originalname); 
    }
});

const upload = multer({ storage: storage });

//TO DO: Insert code for Session Middleware below 
// 1. Session setup (must be early)
app.use(session({
  secret: process.env.SESSION_SECRET || 'your-secret-key-change-this',
  resave: false,
  saveUninitialized: false, // keep false for security
  cookie: { 
    maxAge: 3600000, // 1 hour
    httpOnly: true,
    secure: false // set true if using HTTPS
  }
}));

// 2. Flash messages
app.use(flash());

// 3. Body parsers
app.use(express.urlencoded({ extended: true }));
app.use(express.json());

// 4. Static files (images, css, js)
app.use(express.static(path.join(__dirname, 'public')));

// 5. Expose user to all views
app.use((req, res, next) => {
  res.locals.user = req.session.user || null;
  next();
});

// 6. Then define routes
// Home: public landing; redirect logged-in users to shopping
app.get('/', PageController.showHome);

// Auth routes
app.get('/login', AuthController.showLogin);
app.post('/login', AuthController.login);
app.get('/register', AuthController.showRegister);
app.post('/register', AuthController.register);
app.get('/logout', AuthController.logout);

// Product routes
app.get('/shopping', checkAuthenticated, ProductController.getShoppingProducts);
app.get('/inventory', checkAuthenticated, checkAdmin, ProductController.getInventory);
app.get('/products/add', checkAuthenticated, checkAdmin, ProductController.showAddProduct);
app.post('/products/add', checkAuthenticated, checkAdmin, upload.single('image'), ProductController.addProduct);
app.get('/products/update/:id', checkAuthenticated, checkAdmin, ProductController.showUpdateProduct);
app.post('/products/update/:id', checkAuthenticated, checkAdmin, upload.single('image'), ProductController.updateProduct);
app.post('/products/delete/:id', checkAuthenticated, checkAdmin, ProductController.deleteProduct);
app.get('/product/:id', checkAuthenticated, ProductController.getProductById);

// Cart routes
app.get('/cart', checkAuthenticated, CartController.viewCart);
app.post('/cart/add', checkAuthenticated, CartController.addToCart);
app.post('/cart/update', checkAuthenticated, CartController.updateQuantity);
app.post('/cart/remove', checkAuthenticated, CartController.removeItem);
app.post('/cart/clear', checkAuthenticated, CartController.clearCart);
app.post('/cart/checkout', checkAuthenticated, CartController.checkout);

// Orders
app.get('/orders', checkAuthenticated, OrderController.listUserOrders);
app.get('/orders/:id', checkAuthenticated, OrderController.showOrder);
app.post('/orders/:id/reviews', checkAuthenticated, OrderController.addReview);
app.get('/admin/orders', checkAuthenticated, checkAdmin, OrderController.listAllOrders);

// Admin dashboard
app.get('/admin/dashboard', checkAuthenticated, checkAdmin, AdminController.dashboard);
app.get('/admin/users', checkAuthenticated, checkAdmin, AdminController.listUsers);
app.post('/admin/users/:id/delete', checkAuthenticated, checkAdmin, AdminController.deleteUser);

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));

console.log('PageController.showHome:', typeof PageController.showHome);
console.log('AuthController.login:', typeof AuthController.login);
console.log('ProductController.getInventory:', typeof ProductController.getInventory);
console.log('CartController.viewCart:', typeof CartController.viewCart);

// Middleware functions
function checkAuthenticated(req, res, next) {
  const userId = req.session.userId || (req.session.user && req.session.user.id);
  console.log('checkAuthenticated - userId:', userId);
  if (userId) {
    req.session.userId = userId; // ensure cached
    return next();
  }
  req.flash('error', 'Please log in to continue');
  res.redirect('/login');
}

function checkAdmin(req, res, next) {
  if (req.session && req.session.user && req.session.user.role === 'admin') {
    return next();
  }
  req.flash('error', 'Access denied. Admin only.');
  res.redirect('/shopping');
}
