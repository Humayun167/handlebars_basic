// Serverless function handler for Vercel
const app = require('../server');

// Export the Express app as a serverless function
module.exports = async (req, res) => {
    // Set proper headers for Vercel
    res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
    
    // Handle the request using the Express app
    return app(req, res);
};