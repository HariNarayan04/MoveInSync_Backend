// controllers/floor_controller.js
const Floor = require("../models/floor");
const Room = require("../models/room");
const Booking = require("../models/booking");
const HttpError = require("../models/http-error");

// Handle Create New Floor
const handlerCreateFloor = async (req, res, next) => {
    const { floorName, floorNumber, floorDescription, rooms } = req.body;
    
    // Validate required fields
    if (!floorName) {
        return next(new HttpError("floorName is required", 400));
    }
    if (floorNumber === null || floorNumber === undefined) {
        return next(new HttpError("floorNumber is required", 400));
    }
    if (!req.userId) {
        return next(new HttpError("User authentication required", 401));
    }
    
    try {
        // Create Floor
        const newFloor = await Floor.create({
            floorName,
            floorNumber,
            floorDescription: floorDescription || "",
            createdBy: req.userId,
            rooms: []
        });
        
        // Create rooms if provided
        if (Array.isArray(rooms) && rooms.length > 0) {
            const createdRooms = [];

            for (const room of rooms) {
                // Validate required room fields
                if (!room.roomId || !room.roomName || !room.capacity) {
                    return next(new HttpError("roomId, roomName, and capacity are required for each room", 400));
                }

                const newRoom = await Room.create({
                    roomId: room.roomId,
                    roomName: room.roomName,
                    capacity: room.capacity,
                    roomFeatures: room.roomFeatures || [],
                    floorId: newFloor._id,
                    createdBy: req.userId
                });

                createdRooms.push(newRoom._id);
            }
            
            newFloor.rooms = createdRooms;
            await newFloor.save();
        }
        
        return res.status(201).json({
            message: "Floor created successfully",
            floor: newFloor
        });
        
    } catch (err) {
        console.error("Error creating floor:", err);
        if (err.code === 11000) {
            // Duplicate key error
            const field = Object.keys(err.keyPattern)[0];
            return next(new HttpError(`${field} already exists`, 409));
        }
        return next(new HttpError("Internal error creating floor", 500));
    }
};

// Handle Delete Floor
const handlerDeleteFloor = async (req, res, next) =>{
    const {floorId} = req.params;
    try{
        if (floorId === null || floorId === undefined) {
            return next(new HttpError("floorId is required", 400));
        }
        // Find the floor first
        const floor = await Floor.findById(floorId);
        if(!floor){
            return next(new HttpError("Floor not found", 404));
        }
        
        // Find all rooms on this floor
        const rooms = await Room.find({ floorId: floorId });
        
        // Check if any room has future confirmed bookings
        const currentTime = new Date();
        for (const room of rooms) {
            const futureBookings = await Booking.find({
                roomId: room._id,
                startTime: { $gte: currentTime },
                status: "confirmed"
            });
            
            if (futureBookings && futureBookings.length > 0) {
                return next(new HttpError(
                    `Cannot delete floor. Room "${room.roomName}" (ID: ${room.roomId}) has ${futureBookings.length} future booking(s). Please cancel or wait for bookings to complete.`,
                    400
                ));
            }
        }
        
        // Delete Meeting Rooms using floorId (ObjectId reference)
        await Room.deleteMany({floorId : floor._id});
        
        // Delete the floor
        const deletedFloor = await Floor.findByIdAndDelete(floorId);

        return res.status(200).json({
            message : "Floor deleted successfully",
            floor : deletedFloor
        });
    } catch (err) {
        console.error("Error deleting floor:", err);
        return next(new HttpError("Internal error deleting floor", 500));
    }
};

// Handle Get Floor
const handlerGetFloor = async (req, res, next) =>{
    try{
        const floors = await Floor.find().select("-rooms");
        return res.status(200).json({
            message : "Floors retrieved successfully",
            floors : floors,
            count: floors.length
        });
    } catch (err)   {
        console.error("Error getting floors:", err);
        return next(new HttpError("Internal error getting floors", 500));
    }
};

// Handle Update Floor
const handlerUpdateFloor = async (req, res, next) => {
    const { floorId } = req.params;
    const { floorName, floorDescription } = req.body;
    
    // Validate floorId
    if (floorId === null || floorId === undefined) {
        return next(new HttpError("floorId is required", 400));
    }
    
    // Validate that at least one field is being updated
    if (!floorName && floorDescription === undefined) {
        return next(new HttpError("At least one field (floorName or floorDescription) must be provided for update", 400));
    }
    
    // Validate user authentication
    if (!req.userId) {
        return next(new HttpError("User authentication required", 401));
    }
    
    try {
        // Find the floor to update
        const floor = await Floor.findById(floorId);
        if (!floor) {
            return next(new HttpError("Floor not found", 404));
        }
        
        // Build update object with only provided fields
        const updateData = {
            updatedBy: req.userId
        };
        
        if (floorName !== undefined) {
            updateData.floorName = floorName;
        }
        
        if (floorDescription !== undefined) {
            updateData.floorDescription = floorDescription;
        }
        
        // Update the floor
        const updatedFloor = await Floor.findByIdAndUpdate(
            floorId,
            updateData,
            { new: true, runValidators: true }
        );
        
        return res.status(200).json({
            message: "Floor updated successfully",
            floor: updatedFloor
        });
        
    } catch (err) {
        console.error("Error updating floor:", err);
        if (err.code === 11000) {
            // Duplicate key error
            const field = Object.keys(err.keyPattern)[0];
            return next(new HttpError(`${field} already exists`, 409));
        }
        return next(new HttpError("Internal error updating floor", 500));
    }
};

// Handle Get Rooms for a Floor Id
const handlerGetRoomsForFloor = async (req, res, next) => {
    const { floorId } = req.params;
    try{
        const rooms = await Room.find({ floorId : floorId });
        return res.status(200).json({
            message : "Rooms retrieved successfully",
            rooms : rooms
        });
    } catch (err) {
        console.error("Error getting rooms for floor:", err);
        return next(new HttpError("Internal error getting rooms for floor", 500));
    }
};

// Handle Create Room
const handlerCreateRoom = async (req, res, next) => {
    const { floorId } = req.params;
    const { roomId, roomName, capacity, roomFeatures } = req.body;
    try{    
        if (floorId === null || floorId === undefined) {
            return next(new HttpError("floorId is required", 400));
        }
        if (roomId === null || roomId === undefined) {
            return next(new HttpError("roomId is required", 400));
        }
        if (roomName === null || roomName === undefined) {
            return next(new HttpError("roomName is required", 400));
        }
        if (capacity === null || capacity === undefined) {
            return next(new HttpError("capacity is required", 400));
        }
        if (roomFeatures === null || roomFeatures === undefined) {
            return next(new HttpError("roomFeatures is required", 400));
        }
        const newRoom = await Room.create({
            roomId,
            roomName,
            capacity,
            roomFeatures,
            floorId,
            createdBy: req.userId
        });
        return res.status(201).json({
            message : "Room created successfully",
            room : newRoom
        });
    } catch (err) {
        console.error("Error creating room:", err);
        return next(new HttpError("Internal error creating room", 500));
    }
};

module.exports = {
    handlerCreateFloor,
    handlerDeleteFloor,
    handlerGetFloor,
    handlerUpdateFloor,
    handlerGetRoomsForFloor,
    handlerCreateRoom
};

