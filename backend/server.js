// Load environment variables from .env file.
require('dotenv').config();

const express = require('express');
const cors = require('cors');
const connectDB = require('./config/db');
const userRoutes = require('./routes/userRoutes');
const messageRoutes = require('./routes/messageRoutes'); // Import message routes

// Connect to MongoDB
connectDB();

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(express.json()); // For parsing application/json
// IMPORTANT: For Twilio incoming messages, they send data as 'application/x-www-form-urlencoded'
// You need middleware to parse this as well.
app.use(express.urlencoded({ extended: true })); // For parsing application/x-www-form-urlencoded
app.use(cors());

// Basic Route for testing (keep this for now)
app.get('/', (req, res) => {
    res.send('Clinic Chatbot Backend API is running!');
});

// Mount the API routes
app.use('/api/users', userRoutes);
app.use('/api/messages', messageRoutes); // Mount the message routes


// Start the server
app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
    console.log(`Access the backend at: http://localhost:${PORT}`);
});