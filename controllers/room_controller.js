const Room = require("../models/room");
const Booking = require("../models/booking");
const HttpError = require("../models/http-error");

// Handle Get Room by Room ID
const handlerGetRoom = async (req, res, next) => {
    const { roomId } = req.params;
    try {
        if (roomId === null || roomId === undefined) {
            return next(new HttpError("roomId is required", 400));
        }
        const room = await Room.findById(roomId);
        if (!room) {
            return next(new HttpError("Room not found", 404));
        }
        return res.status(200).json({
            message: "Room retrieved successfully",
            room: room
        });
    } catch (err) {
        console.error("Error getting room:", err);
        return next(new HttpError("Internal error getting room", 500));
    }
};

// Handle Update Room by Room ID
const handlerUpdateRoom = async (req, res, next) => {
    const { roomId } = req.params;
    const { roomName, capacity, roomFeatures } = req.body;
    
    // Validate roomId
    if (roomId === null || roomId === undefined) {
        return next(new HttpError("roomId is required", 400));
    }
    
    // Validate that at least one field is being updated
    if (!roomName && capacity === undefined && roomFeatures === undefined) {
        return next(new HttpError("At least one field (roomName, capacity, or roomFeatures) must be provided for update", 400));
    }
    
    // Validate user authentication
    if (!req.userId) {
        return next(new HttpError("User authentication required", 401));
    }
    
    try {
        // Find the room to update
        const room = await Room.findById(roomId);
        if (!room) {
            return next(new HttpError("Room not found", 404));
        }
        
        // Build update object with only provided fields
        const updateData = {
            updatedBy: req.userId
        };
        
        if (roomName !== undefined) {
            updateData.roomName = roomName;
        }
        
        if (capacity !== undefined) {
            updateData.capacity = capacity;
        }
        
        if (roomFeatures !== undefined) {
            updateData.roomFeatures = roomFeatures;
        }
        
        // Update the room
        const updatedRoom = await Room.findByIdAndUpdate(
            roomId,
            updateData,
            { new: true, runValidators: true }
        );
        
        return res.status(200).json({
            message: "Room updated successfully",
            room: updatedRoom
        });
        
    } catch (err) {
        console.error("Error updating room:", err);
        if (err.code === 11000) {
            // Duplicate key error
            const field = Object.keys(err.keyPattern)[0];
            return next(new HttpError(`${field} already exists`, 409));
        }
        return next(new HttpError("Internal error updating room", 500));
    }
};

// Handle Delete Room by Room ID
const handlerDeleteRoom = async (req, res, next) => {
    const { roomId } = req.params;
    try {
        if (roomId === null || roomId === undefined) {
            return next(new HttpError("roomId is required", 400));
        }
        
        // Find the room first to check for bookings
        const room = await Room.findById(roomId);
        if (!room) {
            return next(new HttpError("Room not found", 404));
        }
        
        // Check if room has any future confirmed bookings
        const currentTime = new Date();
        const futureBookings = await Booking.find({
            roomId: roomId,
            startTime: { $gte: currentTime },
            status: "confirmed"
        });
        
        if (futureBookings && futureBookings.length > 0) {
            return next(new HttpError(
                `Cannot delete room with ${futureBookings.length} future booking(s). Please cancel or wait for bookings to complete.`,
                400
            ));
        }
        
        // Delete the room
        const deletedRoom = await Room.findByIdAndDelete(roomId);
        
        return res.status(200).json({
            message: "Room deleted successfully",
            room: deletedRoom
        });
    } catch (err) {
        console.error("Error deleting room:", err);
        return next(new HttpError("Internal error deleting room", 500));
    }
};

module.exports = {
    handlerGetRoom,
    handlerUpdateRoom,
    handlerDeleteRoom
};