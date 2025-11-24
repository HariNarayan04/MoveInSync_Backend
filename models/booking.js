// models/booking.js
const mongoose = require("mongoose");

const bookingSchema = mongoose.Schema({
    roomId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Room',
        required: true,
        index: true // Index for faster queries
    },
    userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true,
        index: true // Index for faster user-specific queries
    },
    startTime: {
        type: Date,
        required: true,
        index: true // Index for time-based queries
    },
    endTime: {
        type: Date,
        required: true
    },
    capacity: {
        type: Number,
        required: true,
        min: [1, "At least 1 participant is required"]
    },
    purpose: {
        type: String,
        required: true,
        trim: true
    },
    status: {
        type: String,
        enum: ["confirmed", "cancelled"],
        default: "confirmed"
    },
    createdBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    updatedBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
    }
}, { 
    timestamps: true 
});

// Compound index for conflict checking - critical for concurrency
bookingSchema.index({ roomId: 1, startTime: 1, endTime: 1, status: 1 });

// Index for future bookings query optimization
bookingSchema.index({ userId: 1, startTime: 1, status: 1 });

const Booking = mongoose.model("Booking", bookingSchema);

module.exports = Booking;