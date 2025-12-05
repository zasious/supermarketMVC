// Authentication controller: login, register, logout.
const db = require('../db');

const AuthController = {
    showLogin: (req, res) => {
        res.render('login', { 
            messages: req.flash('success'), 
            errors: req.flash('error') 
        });
    },

    login: (req, res) => {
        const { email, password } = req.body;
        
        if (!email || !password) {
            req.flash('error', 'All fields are required.');
            return res.redirect('/login');
        }

        const sql = 'SELECT * FROM users WHERE email = ? AND password = SHA1(?)';
        db.query(sql, [email, password], (err, results) => {
            if (err) throw err;

            if (results.length > 0) {
                const user = results[0];
                user.id = user.id || user.user_id;          // normalize key
                req.session.user = user;
                req.session.userId = user.id;

                req.session.save((err) => {
                    if (err) {
                        console.error('Session save error:', err);
                        return res.redirect('/login');
                    }
                    res.redirect(user.role === 'admin' ? '/admin/dashboard' : '/shopping');
                });
            } else {
                req.flash('error', 'Invalid credentials');
                res.redirect('/login');
            }
        });
    },

    showRegister: (req, res) => {
        res.render('register', { 
            messages: req.flash('error'), 
            formData: req.flash('formData')[0] 
        });
    },

    register: (req, res) => {
        const { username, email, password, address, contact } = req.body;
        const role = 'user';
        
        const sql = 'INSERT INTO users (username, email, password, address, contact, role) VALUES (?, ?, SHA1(?), ?, ?, ?)';
        db.query(sql, [username, email, password, address, contact, role], (err, result) => {
            if (err) {
                req.flash('error', 'Registration failed');
                return res.redirect('/register');
            }
            const userId = result.insertId;
            db.query('INSERT IGNORE INTO cart (user_id, created_at) VALUES (?, NOW())', [userId], () => {
                req.flash('success', 'Registration successful! Please log in.');
                res.redirect('/login');
            });
        });
    },

    logout: (req, res) => {
        req.session.destroy();
        res.redirect('/login');
    }
};

module.exports = AuthController;
