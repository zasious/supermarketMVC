// Product controller: shopping, inventory, CRUD.
const Product = require('../models/product');
const multer = require('multer');

// Set up multer for file uploads
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, 'public/images');
    },
    filename: (req, file, cb) => {
        cb(null, file.originalname);
    }
});

const upload = multer({ storage: storage });

const ProductController = {
    // Get all products for inventory (admin only)
    getInventory: (req, res) => {
        const term = (req.query.q || '').trim();
        const handler = (err, products) => {
            if (err) throw err;
            Product.getRatingSummary((err2, ratings = []) => {
                if (err2) throw err2;
                const map = {};
                ratings.forEach(r => { map[r.product_id] = { avgRating: Number(r.avgRating), reviewCount: r.reviewCount }; });
                products.forEach(p => {
                    const r = map[p.id];
                    if (r) {
                        p.avgRating = r.avgRating;
                        p.reviewCount = r.reviewCount;
                    }
                });
                res.render('inventory', { 
                    products: products, 
                    user: req.session.user,
                    search: term
                });
            });
        };
        if (term) {
            Product.searchProducts(term, handler);
        } else {
            Product.getAllProducts(handler);
        }
    },

    // Get all products for shopping (user view)
    getShoppingProducts: (req, res) => {
        const term = (req.query.q || '').trim();
        const handler = (err, products) => {
            if (err) throw err;
            Product.getRatingSummary((err2, ratings = []) => {
                if (err2) throw err2;
                const map = {};
                ratings.forEach(r => { map[r.product_id] = { avgRating: Number(r.avgRating), reviewCount: r.reviewCount }; });
                products.forEach(p => {
                    const r = map[p.id];
                    if (r) {
                        p.avgRating = r.avgRating;
                        p.reviewCount = r.reviewCount;
                    }
                });
                res.render('shopping', { 
                    products: products, 
                    user: req.session.user,
                    search: term
                });
            });
        };
        if (term) {
            Product.searchProducts(term, handler);
        } else {
            Product.getAllProducts(handler);
        }
    },

    // Show add product form (admin only)
    showAddProduct: (req, res) => {
        Product.getDistinctCategories((err, rows = []) => {
            if (err) throw err;
            const categories = rows.map(r => r.category).filter(Boolean);
            res.render('addProduct', { user: req.session.user, categories });
        });
    },

    // Add new product (admin only)
    addProduct: (req, res) => {
        const productData = {
            name: req.body.name,
            quantity: req.body.quantity,
            price: req.body.price,
            category: req.body.category || 'General',
            image: req.file ? req.file.filename : null
        };

        Product.addProduct(productData, (err, result) => {
            if (err) {
                console.error("Error adding product:", err);
                return res.status(500).send('Error adding product');
            }
            res.redirect('/inventory');
        });
    },

    // Show update product form (admin only)
    showUpdateProduct: (req, res) => {
        Product.getProductById(req.params.id, (err, product) => {
            if (err) throw err;
            if (!product) {
                return res.status(404).send('Product not found');
            }
            Product.getDistinctCategories((err2, rows = []) => {
                if (err2) throw err2;
                const categories = rows.map(r => r.category).filter(Boolean);
                res.render('updateProduct', { 
                    product: product,
                    user: req.session.user,
                    categories
                });
            });
        });
    },

    // Update product (admin only)
    updateProduct: (req, res) => {
        const productData = {
            name: req.body.name,
            quantity: req.body.quantity,
            price: req.body.price,
            category: req.body.category || req.body.currentCategory || 'General',
            image: req.file ? req.file.filename : req.body.currentImage
        };

        Product.updateProduct(req.params.id, productData, (err, result) => {
            if (err) {
                console.error("Error updating product:", err);
                return res.status(500).send('Error updating product');
            }
            res.redirect('/inventory');
        });
    },

    // Delete product (admin only)
    deleteProduct: (req, res) => {
        Product.deleteProduct(req.params.id, (err, result) => {
            if (err) {
                console.error("Error deleting product:", err);
                return res.status(500).send('Error deleting product');
            }
            res.redirect('/inventory');
        });
    },

    // Get product by ID (user view)
    getProductById: (req, res) => {
        const id = req.params.id;
        Product.getProductById(id, (err, product) => {
            if (err) {
                console.error('ProductController.getProductById error:', err);
                return res.status(500).send('Server error');
            }
            if (!product) return res.status(404).send('Product not found');
            Product.getReviewsForProduct(id, (err2, reviews = []) => {
                if (err2) {
                    console.error('ProductController.getProductById reviews error:', err2);
                    return res.status(500).send('Server error');
                }
                res.render('product', { product, user: req.session.user, reviews });
            });
        });
    }
};

module.exports = ProductController;
