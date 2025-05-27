const twilio = require('twilio');
const MessagingResponse = twilio.twiml.MessagingResponse;
const { GoogleGenerativeAI } = require('@google/generative-ai');

// NEW: date-fns imports for robust date parsing
const {
    parse,
    isValid,
    addDays,
    nextMonday,
    nextTuesday,
    nextWednesday,
    nextThursday,
    nextFriday,
    nextSaturday,
    nextSunday,
    format,
    isFuture, // To check if date is in the future
    startOfDay // To normalize dates to the start of the day for comparison
} = require('date-fns');
const { enGB } = require('date-fns/locale'); // Import locale for parsing natural language


// Import models
const ConversationSession = require('../models/ConversationSession');
const Appointment = require('../models/Appointment');

// Initialize Twilio client for sending outbound messages
const twilioClient = twilio(process.env.TWILIO_ACCOUNT_SID, process.env.TWILIO_AUTH_TOKEN);
const twilioWhatsAppNumber = process.env.TWILIO_WHATSAPP_NUMBER;

// Initialize Gemini
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
const model = genAI.getGenerativeModel({ model: 'models/gemini-1.5-flash-latest' });

// Define valid services for appointment booking
const VALID_SERVICES = ['General Consultation', 'Dental Check-up', 'Physiotherapy', 'Vaccination'];

// @desc    Handle incoming WhatsApp messages from Twilio
// @route   POST /api/messages/whatsapp
// @access  Public (accessed by Twilio webhook)
const handleIncomingWhatsApp = async (req, res) => {
    const twiml = new MessagingResponse();
    const incomingMessage = req.body.Body ? req.body.Body.trim() : '';
    const from = req.body.From; // The user's WhatsApp number

    console.log(`Incoming WhatsApp message from ${from}: "${incomingMessage}"`);

    // IMPORTANT: Immediately respond to Twilio's webhook to prevent timeout.
    res.writeHead(200, { 'Content-Type': 'text/xml' });
    res.end(twiml.toString());

    // Process the AI/booking request in the background
    processAIResponse(from, incomingMessage);
};

// Helper function to process AI response and send it back to the user
const processAIResponse = async (to, messageBody) => {
    let aiResponseText = "I'm sorry, I'm having trouble understanding right now. Please try again later.";

    if (!messageBody) {
        aiResponseText = "I didn't receive a message. Please send something!";
        await sendWhatsAppMessage(to, aiResponseText);
        return;
    }

    let session; // Declare session here to make it accessible in catch block

    try {
        await sendWhatsAppMessage(to, "Thinking...");
        console.log(`Sent 'Thinking...' message to ${to}`);

        session = await ConversationSession.findOne({ whatsappNumber: to });

        if (!session) {
            // Initialize bookingState to 'idle' for new sessions
            session = new ConversationSession({ whatsappNumber: to, messages: [], bookingState: 'idle' });
            console.log(`Created new conversation session for ${to}`);
        }

        // --- APPOINTMENT BOOKING LOGIC START ---

        // If the user is currently in a booking flow state (not 'idle')
        if (session.bookingState !== 'idle') {
            aiResponseText = await handleBookingFlow(session, messageBody);
            // Save the session state after handleBookingFlow potentially updates it
            await session.save();
            // Send the response from the booking flow
            await sendWhatsAppMessage(to, aiResponseText);
            return; // Exit as booking flow handled the message
        }

        // Check for intent to book an appointment (e.g., "book appointment")
        const bookingKeywords = ['book appointment', 'schedule appointment', 'make an appointment', 'set up appointment'];
        const isBookingIntent = bookingKeywords.some(keyword => messageBody.toLowerCase().includes(keyword));

        if (isBookingIntent) {
            session.bookingState = 'awaiting_service';
            session.currentAppointmentData = {}; // Initialize/clear appointment data for new booking
            aiResponseText = `Okay, let's book an appointment. What type of service are you looking for? (e.g., ${VALID_SERVICES.join(', ')})`;
            await session.save(); // Save the new booking state
            await sendWhatsAppMessage(to, aiResponseText);
            return; // Exit as booking intent was handled
        }

        // --- APPOINTMENT BOOKING LOGIC END ---

        // If not in a booking state and no booking intent, proceed with Gemini AI
        // Add the user's current message to the session history
        session.messages.push({ role: 'user', parts: [{ text: messageBody }] });

        const chatHistory = session.messages.map(msg => ({
            role: msg.role,
            parts: msg.parts
        }));

        const chat = model.startChat({
            history: chatHistory
        });

        console.log(`[Gemini Call] Sending message to AI with history for: "${messageBody}"`);
        const result = await chat.sendMessage([{ text: messageBody }]);
        const response = await result.response;
        aiResponseText = response.text();
        console.log(`[Gemini Call] Received response from AI. Length: ${aiResponseText.length} characters.`);

        // Add Gemini's response to the session history
        session.messages.push({ role: 'model', parts: [{ text: aiResponseText }] });
        await session.save();
        console.log(`Conversation session updated and saved for ${to}. Current messages in session: ${session.messages.length}`);

    } catch (error) {
        console.error('Error in processAIResponse:', error);
        aiResponseText = "I'm sorry, I encountered an error trying to process your request. Please try again later.";
        // Ensure session state is reset if a critical error occurs mid-booking
        if (session) {
            session.bookingState = 'idle';
            session.currentAppointmentData = {};
            await session.save().catch(e => console.error("Error saving session after critical error:", e));
        }
    }

    // --- MESSAGE SPLITTING LOGIC ---
    const MAX_MESSAGE_LENGTH = 1500;
    if (aiResponseText.length > MAX_MESSAGE_LENGTH) {
        const messages = [];
        for (let i = 0; i < aiResponseText.length; i += MAX_MESSAGE_LENGTH) {
            messages.push(aiResponseText.substring(i, i + MAX_MESSAGE_LENGTH));
        }
        console.log(`Splitting AI response into ${messages.length} parts.`);
        for (const part of messages) {
            await sendWhatsAppMessage(to, part);
        }
    } else {
        await sendWhatsAppMessage(to, aiResponseText);
    }
};

// Helper function to manage the multi-turn booking conversation flow
const handleBookingFlow = async (session, messageBody) => {
    let response = '';

    switch (session.bookingState) {
        case 'awaiting_service':
            const serviceInput = messageBody.toLowerCase();
            const matchedService = VALID_SERVICES.find(s => serviceInput.includes(s.toLowerCase()));
            if (matchedService) {
                session.currentAppointmentData.service = matchedService;
                session.bookingState = 'awaiting_patient_name';
                response = `Got it. You want ${matchedService}. What is the patient's full name?`;
            } else {
                response = `I'm sorry, "${messageBody}" is not a recognized service. Please choose from: ${VALID_SERVICES.join(', ')}.`;
                // Keep the state for retry
            }
            break;

        case 'awaiting_patient_name':
            session.currentAppointmentData.patientName = messageBody;
            session.bookingState = 'awaiting_date';
            response = `Thanks, ${messageBody}. When would you like to book the appointment? Please provide a date (e.g., 2025-06-15, today, tomorrow, next Monday).`;
            break;

        case 'awaiting_date':
            let parsedDate;
            const today = startOfDay(new Date()); // Normalize today to start of day for accurate comparison

            const lowerCaseMessage = messageBody.toLowerCase();

            // Attempt to parse natural language dates first
            if (lowerCaseMessage === 'today') {
                parsedDate = today;
            } else if (lowerCaseMessage === 'tomorrow') {
                parsedDate = addDays(today, 1);
            } else if (lowerCaseMessage.includes('next monday')) {
                parsedDate = nextMonday(today);
            } else if (lowerCaseMessage.includes('next tuesday')) {
                parsedDate = nextTuesday(today);
            } else if (lowerCaseMessage.includes('next wednesday')) {
                parsedDate = nextWednesday(today);
            } else if (lowerCaseMessage.includes('next thursday')) {
                parsedDate = nextThursday(today);
            } else if (lowerCaseMessage.includes('next friday')) {
                parsedDate = nextFriday(today);
            } else if (lowerCaseMessage.includes('next saturday')) {
                parsedDate = nextSaturday(today);
            } else if (lowerCaseMessage.includes('next sunday')) {
                parsedDate = nextSunday(today);
            } else {
                // Attempt to parse common date formats if not a natural language keyword
                // Use a standard parse format like 'yyyy-MM-dd' initially
                // 'parse' is flexible, but providing formats helps guide it
                let formatStrings = ['yyyy-MM-dd', 'MM/dd/yyyy', 'dd/MM/yyyy', 'dd-MM-yyyy', 'M/d/yyyy', 'd/M/yyyy'];
                for (let i = 0; i < formatStrings.length; i++) {
                    let potentialDate = parse(messageBody, formatStrings[i], new Date(), { locale: enGB });
                    if (isValid(potentialDate)) {
                        parsedDate = potentialDate;
                        break; // Found a valid parse, stop trying other formats
                    }
                }
                // If still not valid, try a more general parse assuming the year is current
                if (!isValid(parsedDate)) {
                    try {
                        // This attempts to parse "June 3" or "Dec 25" assuming current year
                        parsedDate = parse(messageBody, 'MMM d', new Date(), { locale: enGB });
                        if (!isValid(parsedDate)) {
                            parsedDate = parse(messageBody, 'MMMM d', new Date(), { locale: enGB });
                        }
                        if (isValid(parsedDate) && parsedDate < today) {
                            // If it parsed to a date in the past, assume it means this year's date in the future
                            parsedDate.setFullYear(parsedDate.getFullYear() + 1);
                        }
                    } catch (e) {
                        // Silently fail if parsing fails for these attempts
                    }
                }
            }


            // Final validation: check if the parsed date is valid and in the future (or today)
            if (!isValid(parsedDate) || startOfDay(parsedDate) < today) {
                response = "I couldn't understand that date or it's in the past. Please try again with formats like 2025-06-15, 06/15/2025, 15-06-2025, or words like 'today', 'tomorrow', 'next Monday'.";
            } else {
                session.currentAppointmentData.appointmentDate = parsedDate;
                session.bookingState = 'awaiting_time';
                response = `Okay, ${format(parsedDate, 'PPP', { locale: enGB })}. What time would you prefer? (e.g., 10:00 AM, 2:30 PM)`;
            }
            break;

        case 'awaiting_time':
            const timeRegex = /^(0?[1-9]|1[0-2]):[0-5]\d\s?(AM|PM)$/i; // Basic 12-hour format
            if (timeRegex.test(messageBody)) {
                session.currentAppointmentData.appointmentTime = messageBody.toUpperCase();
                session.bookingState = 'awaiting_confirmation';

                const { service, patientName, appointmentDate, appointmentTime } = session.currentAppointmentData;
                response = `Please confirm your appointment details:\n\n` +
                           `*Service:* ${service}\n` +
                           `*Patient Name:* ${patientName}\n` +
                           `*Date:* ${format(appointmentDate, 'PPP', { locale: enGB })}\n` + // Format date for display
                           `*Time:* ${appointmentTime}\n\n` +
                           `Is this correct? (Yes/No)`;
            } else {
                response = "I couldn't understand that time. Please use a format like 10:00 AM or 2:30 PM.";
            }
            break;

        case 'awaiting_confirmation':
            if (messageBody.toLowerCase() === 'yes') {
                try {
                    const newAppointment = new Appointment({
                        whatsappNumber: session.whatsappNumber,
                        ...session.currentAppointmentData,
                        status: 'pending' // Set to pending, can be confirmed by staff later
                    });
                    await newAppointment.save();
                    response = `Appointment for ${session.currentAppointmentData.patientName} for ${session.currentAppointmentData.service} on ${format(session.currentAppointmentData.appointmentDate, 'PPP', { locale: enGB })} at ${session.currentAppointmentData.appointmentTime} has been successfully booked! Your appointment ID is: ${newAppointment._id}.`;
                    session.bookingState = 'idle'; // Reset state
                    session.currentAppointmentData = {}; // Clear data
                } catch (error) {
                    console.error("Error saving appointment:", error);
                    response = "I'm sorry, there was an error saving your appointment. Please try again or contact the clinic directly.";
                    session.bookingState = 'idle'; // Reset state on error
                    session.currentAppointmentData = {};
                }
            } else if (messageBody.toLowerCase() === 'no') {
                response = "No problem. Your appointment booking has been cancelled. How else can I assist you?";
                session.bookingState = 'idle'; // Reset state
                session.currentAppointmentData = {}; // Clear data
            } else {
                response = "Please reply 'Yes' to confirm or 'No' to cancel.";
            }
            break;

        default:
            response = "An unexpected error occurred in the booking process. Please try starting over by saying 'book appointment'.";
            session.bookingState = 'idle'; // Reset state
            session.currentAppointmentData = {};
            break;
    }
    return response;
};

// Helper function to send an outbound WhatsApp message using Twilio client
const sendWhatsAppMessage = async (to, body) => {
    try {
        await twilioClient.messages.create({
            body: body,
            from: twilioWhatsAppNumber,
            to: to
        });
        console.log(`Successfully sent message to ${to}`);
    } catch (error) {
        console.error(`Error sending WhatsApp message to ${to}:`, error);
        // Common Twilio errors are logged here
    }
};

module.exports = { handleIncomingWhatsApp };