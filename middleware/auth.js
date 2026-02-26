const bcrypt = require('bcryptjs');

// Authentication middleware - simplified for serverless
const requireAuth = (req, res, next) => {
    // For serverless, use a simpler auth check or skip auth for now
    if (process.env.NODE_ENV === 'production') {
        // Skip auth in production/serverless for now, or implement JWT
        return next();
    }
    
    if (req.session && req.session.isAuthenticated) {
        return next();
    } else {
        // Check if this is an API request (JSON expected)
        if (req.path.startsWith('/api/') || req.headers.accept?.includes('application/json')) {
            return res.status(401).json({
                success: false,
                message: 'Authentication required',
                error: 'Please log in to access this resource'
            });
        } else {
            return res.redirect('/login');
        }
    }
};

// Function to check admin credentials
const checkAdminCredentials = async (email, password) => {
    const adminEmail = process.env.ADMIN_EMAIL ? process.env.ADMIN_EMAIL.replace(/"/g, '') : '';
    const adminPassword = process.env.ADMIN_PASSWORD;

    if (email === adminEmail && password === adminPassword) {
        return true;
    }
    return false;
};

// Add user info to all templates
const addUserToLocals = (req, res, next) => {
    // Handle cases where session might not exist (serverless)
    res.locals.isAuthenticated = req.session && req.session.isAuthenticated || false;
    res.locals.user = req.session && req.session.user || null;
    next();
};

module.exports = {
    requireAuth,
    checkAdminCredentials,
    addUserToLocals
};