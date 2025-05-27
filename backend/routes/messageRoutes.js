const express = require('express');
const router = express.Router(); // Create a new router instance
const { handleIncomingWhatsApp } = require('../controllers/messageController'); // Import the controller function

// Define the route for handling incoming WhatsApp messages
// This will handle POST requests to /api/messages/whatsapp
// This is the endpoint Twilio will send messages to (your webhook URL)
router.post('/whatsapp', handleIncomingWhatsApp);

module.exports = router;