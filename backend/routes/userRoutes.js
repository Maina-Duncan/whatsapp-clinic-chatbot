const express = require('express');
const router = express.Router(); // Create a new Express router instance

// Import the controller functions that will handle the logic for these routes
const {
    registerUser,
    authUser,
    getUserProfile,
    updateUserProfile
} = require('../controllers/userController');

// Import the authentication middleware to protect routes
const { protect } = require('../middleware/authMiddleware');

// Public routes (accessible without a token)
// POST /api/users - for registering a new user
router.post('/', registerUser);

// POST /api/users/login - for authenticating a user and getting a token
router.post('/login', authUser);

// Private routes (require a valid JWT for access)
// Use router.route() for chaining multiple HTTP methods on the same path
router.route('/profile')
    .get(protect, getUserProfile)      // GET /api/users/profile - Get authenticated user's profile
    .put(protect, updateUserProfile);  // PUT /api/users/profile - Update authenticated user's profile

module.exports = router; // Export the router so it can be used in server.js