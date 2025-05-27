const mongoose = require('mongoose');

// Defines the schema for a single 'part' within a message.
// Gemini's API expects parts to be an array of objects,
// where each object can contain text, inlineData (for images), etc.
const partSchema = mongoose.Schema(
    {
        text: {
            type: String,
            required: false, // 'text' might be optional if you introduce other part types like images
        },
        // You could extend this schema later for other types of parts if needed, e.g.:
        // inlineData: {
        //     mimeType: String, // e.g., 'image/jpeg'
        //     data: String      // Base64 encoded image data
        // }
    },
    {
        _id: false, // Prevents Mongoose from creating a separate '_id' for each part subdocument
    }
);

// Defines the schema for a single 'message' in the conversation.
// A message has a 'role' (user or model) and 'parts' (which is an array of partSchema).
const messageSchema = mongoose.Schema(
    {
        role: {
            type: String, // Can be 'user' or 'model'
            required: true,
        },
        parts: { // This is now an array of 'partSchema' objects
            type: [partSchema],
            required: true,
        },
        timestamp: {
            type: Date,
            default: Date.now,
        },
    },
    {
        _id: false, // Prevents Mongoose from creating a separate '_id' for each message subdocument
    }
);

// Defines the main schema for a 'ConversationSession'.
// Each session is unique per WhatsApp number and contains an array of messages.
const conversationSessionSchema = mongoose.Schema(
    {
        whatsappNumber: {
            type: String, // The user's WhatsApp number (e.g., 'whatsapp:+254702281059')
            required: true,
            unique: true, // Ensures only one session per WhatsApp number
        },
        messages: [messageSchema], // Array of messages in the conversation history

        // --- NEW FIELDS FOR APPOINTMENT BOOKING WORKFLOW ---
        bookingState: {
            type: String,
            enum: [
                'idle', // Not in a booking process
                'awaiting_service',
                'awaiting_patient_name',
                'awaiting_date',
                'awaiting_time',
                'awaiting_confirmation'
            ],
            default: 'idle', // Default state when not actively booking
        },
        currentAppointmentData: { // Temporarily holds data as it's collected during the booking flow
            service: String,
            patientName: String,
            appointmentDate: Date,
            appointmentTime: String,
            // No 'required' here as these are filled progressively
        },
        // --- END NEW FIELDS ---

        createdAt: {
            type: Date,
            default: Date.now,
        },
        updatedAt: {
            type: Date,
            default: Date.now,
        },
    },
    {
        timestamps: true, // Mongoose automatically manages 'createdAt' and 'updatedAt' fields
    }
);

// Create the Mongoose model from the schema
const ConversationSession = mongoose.model('ConversationSession', conversationSessionSchema);

// Export the model for use in other files (e.g., messageController.js)
module.exports = ConversationSession;