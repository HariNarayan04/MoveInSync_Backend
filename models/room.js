// models/room.js
const mongoose = require("mongoose");

const roomSchema = mongoose.Schema({
    roomId: {
        type: Number,
        required: true,
        unique: true,
    },
    roomName: {
        type: String,   
        required: true,
    },
    capacity: {
        type: Number,
        required: true,
        min: [1, "Capacity must be at least 1"]
    },
    roomFeatures: {
        type: [String],
        enum: ["Projector", "Whiteboard", "Wifi"]
    },
    createdBy : {
        type : mongoose.Schema.Types.ObjectId,
        ref : 'User',
        required : true
    },
    updatedBy : {
        type : mongoose.Schema.Types.ObjectId,
        ref : 'User',
    },
    floorId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Floor',
        required: true
    },
    bookings: [{
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Booking'
    }]
}, { timestamps: true });

const Room = mongoose.model("Room", roomSchema);

module.exports = Room;
