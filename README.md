# 🇰🇪 WhatsApp Clinic Chatbot

A smart WhatsApp chatbot for clinics in Kenya to automate appointment booking and answer common medical inquiries, powered by Node.js, Twilio, MongoDB, and Google Gemini.

## ✨ Features

* **AI-Powered General Inquiries:** Leverages Google Gemini to answer general medical questions (e.g., "What are the common symptoms of malaria?").
* **Multi-Turn Appointment Booking:** Guides users step-by-step through the appointment scheduling process, collecting service, patient name, date, and time.
* **Natural Language Date & Time Parsing:** Utilizes `date-fns` to understand natural language dates like "tomorrow," "next Wednesday," or "June 3rd" for flexible booking.
* **Persistent Conversation Sessions:** Maintains chat context using MongoDB to ensure smooth multi-turn interactions.
* **Appointment Management:** (Future feature: Allow users to view/cancel appointments.)

## 🚀 Technologies Used

* **Node.js & Express.js:** Backend API and server.
* **MongoDB & Mongoose:** Database for storing conversation sessions and appointments.
* **Twilio WhatsApp API:** Integration for sending and receiving WhatsApp messages.
* **Google Gemini API:** AI model for natural language understanding and generation.
* **`date-fns`:** JavaScript library for robust date parsing and formatting.

## ⚙️ Setup and Installation (Local Development)

Follow these steps to get the project running on your local machine.

### Prerequisites

* Node.js (v18 or higher recommended)
* MongoDB Atlas Account (for a cloud database)
* Twilio Account (with WhatsApp Sandbox configured)
* Google AI Studio Account (to get a Gemini API Key)
* Git

### 1. Project Initialization

If you are cloning this repository (for other contributors):
```bash
git clone [https://github.com/mainaduncan57/whatsapp-clinic-chatbot.git](https://github.com/mainaduncan57/whatsapp-clinic-chatbot.git)
cd whatsapp-clinic-chatbot