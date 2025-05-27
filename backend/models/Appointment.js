const mongoose = require('mongoose');

const appointmentSchema = mongoose.Schema(
    {
        whatsappNumber: {
            type: String,
            required: true,
        },
        patientName: {
            type: String,
            required: true,
        },
        service: {
            type: String,
            required: true,
            // You might want an enum here for predefined services, e.g.,
            // enum: ['General Consultation', 'Dental Check-up', 'Physiotherapy', 'Vaccination']
        },
        appointmentDate: {
            type: Date,
            required: true,
        },
        appointmentTime: {
            type: String, // Storing as string for simplicity (e.g., "10:00 AM")
            required: true,
        },
        status: {
            type: String,
            enum: ['pending', 'confirmed', 'cancelled', 'completed'],
            default: 'pending',
        },
        notes: {
            type: String,
            required: false,
        },
        // Optionally, link to a User if you implement user accounts fully
        // user: {
        //     type: mongoose.Schema.Types.ObjectId,
        //     ref: 'User',
        //     required: false,
        // }
    },
    {
        timestamps: true, // Automatically manage createdAt and updatedAt
    }
);

const Appointment = mongoose.model('Appointment', appointmentSchema);

module.exports = Appointment;