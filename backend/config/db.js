const mongoose = require('mongoose');

// The connectDB function will handle the connection to MongoDB
const connectDB = async () => {
    try {
        // Attempt to connect to the MongoDB database using the MONGO_URI
        // from your .env file (which is loaded in server.js).
        // The 'await' keyword ensures the connection is established before proceeding.
        const conn = await mongoose.connect(process.env.MONGO_URI);

        // If the connection is successful, log a success message with the host
        console.log(`MongoDB Connected: ${conn.connection.host}`);
    } catch (error) {
        // If there's an error during connection, log the error message
        console.error(`Error: ${error.message}`);
        
        // Exit the Node.js process with a non-zero status code (1)
        // indicating that the application failed to start due to a critical error.
        process.exit(1); 
    }
};

// Export the connectDB function so it can be imported and used in other files (like server.js)
module.exports = connectDB;