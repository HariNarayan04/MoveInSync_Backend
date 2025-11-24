const Room = require("../models/room");
const HttpError = require("../models/http-error");
const Booking = require("../models/booking");

// Handle Search Availability
const handlerSearchAvailability = async (req, res, next) => {
    const { capacity, startTime, endTime, features } = req.body;
    // Validate required fields
    if (!capacity || !startTime || !endTime) {
        return next(new HttpError("capacity, startTime, and endTime are required", 400));
    }
    
    // Validate capacity
    if (capacity < 1 || !Number.isInteger(capacity)) {
        return next(new HttpError("capacity must be a positive integer", 400));
    }
    
    // Parse and validate dates
    const searchStart = new Date(startTime);
    const searchEnd = new Date(endTime);
    const now = new Date();
    
    if (isNaN(searchStart.getTime()) || isNaN(searchEnd.getTime())) {
        return next(new HttpError("Invalid date format for startTime or endTime", 400));
    }
    
    if (searchStart < now) {
        return next(new HttpError("Cannot search for availability in the past", 400));
    }
    
    if (searchEnd <= searchStart) {
        return next(new HttpError("endTime must be after startTime", 400));
    }
    
    try {
        // Step 1: Find candidate rooms based on capacity and features
        const roomQuery = {
            capacity: { $gte: capacity }
        };
        
        // If features are provided, room must have ALL requested features
        if (features && Array.isArray(features) && features.length > 0) {
            // Validate features are from allowed enum values
            const allowedFeatures = ["Projector", "Whiteboard", "Wifi"];
            const invalidFeatures = features.filter(f => !allowedFeatures.includes(f));
            if (invalidFeatures.length > 0) {
                return next(new HttpError(`Invalid features: ${invalidFeatures.join(", ")}. Allowed features are: ${allowedFeatures.join(", ")}`, 400));
            }
            roomQuery.roomFeatures = { $all: features };
        }
        
        const candidateRooms = await Room.find(roomQuery).lean();
        
        if (candidateRooms.length === 0) {
            return res.status(200).json({
                message: "No rooms found matching the criteria",
                rooms: [],
                count: 0
            });
        }
        
        // Step 2: Get room IDs from candidate rooms
        const roomIds = candidateRooms.map(room => room._id);
        
        // Step 3: Check for bookings in these rooms that intersect with the search time window
        // Two time ranges intersect if: booking.startTime < searchEnd AND booking.endTime > searchStart
        // This covers all intersection cases: partial overlap, complete overlap, and containment
        const intersectingBookings = await Booking.find({
            roomId: { $in: roomIds },
            status: "confirmed", // Only check confirmed bookings (ignore cancelled)
            startTime: { $lt: searchEnd },   // Booking starts before search window ends
            endTime: { $gt: searchStart }     // Booking ends after search window starts
        }).select('roomId').lean();
        
        // Step 4: Create a set of room IDs that have intersecting bookings (booked rooms)
        const bookedRoomIds = new Set(
            intersectingBookings.map(booking => booking.roomId.toString())
        );
        
        // Step 5: Filter candidate rooms to get only free rooms (rooms without intersecting bookings)
        const availableRooms = candidateRooms.filter(
            room => !bookedRoomIds.has(room._id.toString())
        );
        
        // Step 6: Return free rooms
        return res.status(200).json({
            message: "Available rooms retrieved successfully",
            rooms: availableRooms,
            count: availableRooms.length
        });
        
    } catch (err) {
        console.error("Error searching availability:", err);
        return next(new HttpError("Internal error searching availability", 500));
    }
};

module.exports = {
    handlerSearchAvailability
};