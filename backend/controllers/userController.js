const User = require('../models/User'); // Import the User model
const generateToken = require('../utils/generateToken'); // Import the JWT generator utility

// @desc    Register a new user
// @route   POST /api/users
// @access  Public
const registerUser = async (req, res) => {
    const { name, email, password } = req.body;

    // Check if user with this email already exists
    const userExists = await User.findOne({ email });

    if (userExists) {
        // If user exists, send a 400 Bad Request response
        return res.status(400).json({ message: 'User with this email already exists' });
    }

    // Create a new user in the database
    // The pre-save hook in the User model will automatically hash the password before saving
    const user = await User.create({
        name,
        email,
        password,
    });

    if (user) {
        // If user is created successfully, send a 201 Created response
        res.status(201).json({
            _id: user._id,
            name: user.name,
            email: user.email,
            isAdmin: user.isAdmin,
            token: generateToken(user._id), // Generate a JWT for the newly registered user
        });
    } else {
        // If user creation fails (e.g., invalid data), send a 400 Bad Request
        res.status(400).json({ message: 'Invalid user data' });
    }
};

// @desc    Authenticate user & get token (Login)
// @route   POST /api/users/login
// @access  Public
const authUser = async (req, res) => {
    const { email, password } = req.body;

    // Find the user by email in the database
    const user = await User.findOne({ email });

    // Check if the user exists AND if the provided password matches the hashed password
    if (user && (await user.matchPassword(password))) {
        // If authentication is successful, send a 200 OK response with user details and a new JWT
        res.json({
            _id: user._id,
            name: user.name,
            email: user.email,
            isAdmin: user.isAdmin,
            token: generateToken(user._id), // Generate a JWT for the authenticated user
        });
    } else {
        // If authentication fails (user not found or password incorrect), send a 401 Unauthorized response
        res.status(401).json({ message: 'Invalid email or password' });
    }
};

// @desc    Get user profile
// @route   GET /api/users/profile
// @access  Private
const getUserProfile = async (req, res) => {
    // The 'protect' middleware attaches the authenticated user's data to req.user
    // We fetch the user again to ensure we have the most up-to-date info, excluding the password
    const user = await User.findById(req.user._id).select('-password');

    if (user) {
        res.json({
            _id: user._id,
            name: user.name,
            email: user.email,
            isAdmin: user.isAdmin,
        });
    } else {
        res.status(404).json({ message: 'User not found' });
    }
};

// @desc    Update user profile
// @route   PUT /api/users/profile
// @access  Private
const updateUserProfile = async (req, res) => {
    // Get the user from the database using the ID provided by the 'protect' middleware
    const user = await User.findById(req.user._id);

    if (user) {
        // Update name if provided in the request body, otherwise keep existing name
        user.name = req.body.name || user.name;
        // Update email if provided, otherwise keep existing email
        user.email = req.body.email || user.email;

        // Only update password if a new password is provided in the request body
        if (req.body.password) {
            // The pre-save hook in the User model will automatically hash this new password
            user.password = req.body.password;
        }

        // Save the updated user document to the database
        const updatedUser = await user.save();

        // Send a successful response with the updated user details and a new JWT
        res.json({
            _id: updatedUser._id,
            name: updatedUser.name,
            email: updatedUser.email,
            isAdmin: updatedUser.isAdmin,
            token: generateToken(updatedUser._id), // Generate a new token as profile data (or password) might have changed
        });
    } else {
        // If user is not found (shouldn't happen if 'protect' middleware works correctly)
        res.status(404).json({ message: 'User not found' });
    }
};

// Export all controller functions so they can be used by the routes
module.exports = {
    registerUser,
    authUser,
    getUserProfile,
    updateUserProfile,
};