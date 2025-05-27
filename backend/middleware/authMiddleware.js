const jwt = require('jsonwebtoken');
const User = require('../models/User'); // Import the User model

const protect = async (req, res, next) => {
    let token;

    // Check if token exists in headers and starts with 'Bearer'
    if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
        try {
            // Get token from header (removes 'Bearer ' prefix)
            token = req.headers.authorization.split(' ')[1];

            // Verify token
            const decoded = jwt.verify(token, process.env.JWT_SECRET);

            // Find user by ID from token payload and attach to request object
            // .select('-password') excludes the password field from the returned user object
            req.user = await User.findById(decoded.id).select('-password');

            next(); // Proceed to the next middleware or route handler

        } catch (error) {
            console.error('Not authorized, token failed', error);
            res.status(401).json({ message: 'Not authorized, token failed' });
        }
    }

    if (!token) {
        res.status(401).json({ message: 'Not authorized, no token' });
    }
};

module.exports = { protect };