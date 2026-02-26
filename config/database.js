const mongoose = require('mongoose');

// MongoDB connection configuration optimized for serverless
const connectDB = async () => {
    try {
        // Check if already connected
        if (mongoose.connections[0].readyState) {
            return;
        }
        
        const conn = await mongoose.connect(process.env.MONGODB_URI, {
            bufferCommands: false,
            bufferMaxEntries: 0,
            useNewUrlParser: true,
            useUnifiedTopology: true,
        });
        
        console.log(`MongoDB Connected: ${conn.connection.host}`);
    } catch (error) {
        console.error('Error connecting to MongoDB:', error.message);
        throw error; // Don't exit process in serverless environment
    }
};

module.exports = connectDB;