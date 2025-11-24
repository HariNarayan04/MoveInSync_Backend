// controllers/booking_controller.js
const Booking = require("../models/booking");
const Room = require("../models/room");
const HttpError = require("../models/http-error");
const mongoose = require("mongoose");

/**
 * GET /bookings/:userId
 * Retrieve all future confirmed bookings
 * - Admin: Can fetch ALL bookings or specific user's bookings
 * - Regular User: Can only fetch their own bookings
 */
const handlerGetUserBookings = async (req, res, next) => {
    const { userId } = req.params;

    if(req.userRole === "Client") {
    // Validate userId format
    if (!mongoose.Types.ObjectId.isValid(userId)) {
        return next(new HttpError("Invalid user ID format", 400));
    }

    try {
        const currentTime = new Date();
        let bookings;

        // Admin can fetch any user's bookings or all bookings
        if (req.userRole === "Admin") {
            // If userId is provided, fetch that user's bookings
            // Admin can also use a special value to get all bookings
            bookings = await Booking.find({
                userId: userId,
                startTime: { $gte: currentTime },
                status: "confirmed"
            })
            .populate('roomId', 'roomId roomName capacity roomFeatures floorId')
            .populate('userId', 'name email')
            .sort({ startTime: 1 })
            .lean();
        } else {
            // Regular users can only view their own bookings
            if (req.userId !== userId) {
                return next(new HttpError("Not authorized to view these bookings", 403));
            }

            bookings = await Booking.find({
                userId: userId,
                startTime: { $gte: currentTime },
                status: "confirmed"
            })
            .populate('roomId', 'roomId roomName capacity roomFeatures floorId')
            .sort({ startTime: 1 })
            .lean();
        }

        return res.status(200).json({
            message: "Bookings retrieved successfully",
            bookings: bookings,
            count: bookings.length
        });

    } catch (err) {
        console.error("Error retrieving bookings:", err);
        return next(new HttpError("Internal error retrieving bookings", 500));
    }
    } else if(req.userRole === "Admin") {
        try {
            const currentTime = new Date();
    
            // Fetch all future bookings for all users
            const bookings = await Booking.find({
                startTime: { $gte: currentTime },
                status: "confirmed"
            })
            .populate('roomId', 'roomId roomName capacity roomFeatures floorId')
            .populate('userId', 'name email')
            .sort({ startTime: 1 })
            .lean();
    
            return res.status(200).json({
                message: "All bookings retrieved successfully",
                bookings: bookings,
                count: bookings.length
            });
    
        } catch (err) {
            console.error("Error retrieving all bookings:", err);
            return next(new HttpError("Internal error retrieving bookings", 500));
        }
    }
};

/**
 * GET /bookings (Admin only)
 * Retrieve ALL future confirmed bookings in the system
 * Only accessible by Admin role
 */
const handlerGetAllBookings = async (req, res, next) => {
    // Only admins can access all bookings
    if (req.userRole !== "Admin") {
        return next(new HttpError("Not authorized to view all bookings", 403));
    }

    try {
        const currentTime = new Date();

        // Fetch all future bookings for all users
        const bookings = await Booking.find({
            startTime: { $gte: currentTime },
            status: "confirmed"
        })
        .populate('roomId', 'roomId roomName capacity roomFeatures floorId')
        .populate('userId', 'name email')
        .sort({ startTime: 1 })
        .lean();

        return res.status(200).json({
            message: "All bookings retrieved successfully",
            bookings: bookings,
            count: bookings.length
        });

    } catch (err) {
        console.error("Error retrieving all bookings:", err);
        return next(new HttpError("Internal error retrieving bookings", 500));
    }
};

/**
 * POST /rooms/:roomId/bookings
 * Create a new booking with concurrency control
 * Available to both Admin and Regular Users
 */
const handlerCreateBooking = async (req, res, next) => {
    const { roomId } = req.params;
    const { startTime, endTime, capacity, purpose } = req.body;

    // Validate roomId format
    if (!mongoose.Types.ObjectId.isValid(roomId)) {
        return next(new HttpError("Invalid room ID format", 400));
    }

    // Validate required fields
    if (!startTime || !endTime || !capacity || !purpose) {
        return next(new HttpError("startTime, endTime, capacity, and purpose are required", 400));
    }

    // Validate authentication
    if (!req.userId) {
        return next(new HttpError("User authentication required", 401));
    }

    // Parse and validate dates
    const start = new Date(startTime);
    const end = new Date(endTime);
    const now = new Date();

    if (isNaN(start.getTime()) || isNaN(end.getTime())) {
        return next(new HttpError("Invalid date format", 400));
    }

    if (start < now) {
        return next(new HttpError("Cannot book in the past", 400));
    }

    if (end <= start) {
        return next(new HttpError("End time must be after start time", 400));
    }

    // Validate capacity
    if (capacity < 1 || !Number.isInteger(capacity)) {
        return next(new HttpError("capacity must be a positive integer", 400));
    }

    // Use MongoDB session for transaction to handle concurrency
    const session = await mongoose.startSession();
    session.startTransaction();

    try {
        // Check if room exists and get its capacity
        const room = await Room.findById(roomId).session(session);
        
        if (!room) {
            await session.abortTransaction();
            session.endSession();
            return next(new HttpError("Room not found", 404));
        }

        // Check if capacity exceed room capacity
        if (capacity > room.capacity) {
            await session.abortTransaction();
            session.endSession();
            return next(new HttpError(`Room capacity is ${room.capacity}, cannot accommodate ${capacity} capacity`, 400));
        }

        // Check for conflicts with existing bookings
        // Using pessimistic locking approach with transaction
        const conflictingBooking = await Booking.findOne({
            roomId: roomId,
            status: "confirmed",
            $or: [
                // New booking starts during an existing booking
                {
                    startTime: { $lte: start },
                    endTime: { $gt: start }
                },
                // New booking ends during an existing booking
                {
                    startTime: { $lt: end },
                    endTime: { $gte: end }
                },
                // New booking completely encompasses an existing booking
                {
                    startTime: { $gte: start },
                    endTime: { $lte: end }
                }
            ]
        }).session(session);

        if (conflictingBooking) {
            await session.abortTransaction();
            session.endSession();
            return next(new HttpError("Room is already booked for this time slot", 409));
        }

        // Create the booking
        const newBooking = await Booking.create([{
            roomId: roomId,
            userId: req.userId,
            startTime: start,
            endTime: end,
            capacity: capacity,
            purpose: purpose.trim(),
            status: "confirmed",
            createdBy: req.userId
        }], { session });

        // Add booking ID to room's bookings array
        room.bookings.push(newBooking[0]._id);
        await room.save({ session });

        // Commit the transaction
        await session.commitTransaction();
        session.endSession();

        // Populate room details for response
        const populatedBooking = await Booking.findById(newBooking[0]._id)
            .populate('roomId', 'roomId roomName capacity roomFeatures floorId');

        return res.status(201).json({
            message: "Booking created successfully",
            booking: populatedBooking
        });

    } catch (err) {
        // Rollback transaction on error
        await session.abortTransaction();
        session.endSession();
        
        console.error("Error creating booking:", err);
        
        if (err.name === "ValidationError") {
            return next(new HttpError(err.message, 400));
        }
        
        return next(new HttpError("Internal error creating booking", 500));
    }
};

/**
 * PUT /bookings/:id
 * Update an existing booking with concurrency control
 * - Admin: Can update ANY booking
 * - Regular User: Can only update their own bookings
 */
const handlerUpdateBooking = async (req, res, next) => {
    const { id } = req.params;
    const { startTime, endTime, capacity, purpose } = req.body;
    // Validate booking ID format
    if (!mongoose.Types.ObjectId.isValid(id)) {
        return next(new HttpError("Invalid booking ID format", 400));
    }

    // Validate that at least one field is being updated
    if (!startTime && !endTime && !capacity && !purpose) {
        return next(new HttpError("At least one field must be provided for update", 400));
    }

    // Validate authentication
    if (!req.userId) {
        return next(new HttpError("User authentication required", 401));
    }

    // Use MongoDB session for transaction
    const session = await mongoose.startSession();
    session.startTransaction();

    try {
        // Find the booking with session lock
        const booking = await Booking.findById(id).session(session);

        if (!booking) {
            await session.abortTransaction();
            session.endSession();
            return next(new HttpError("Booking not found", 404));
        }

        // Authorization check - Admin can update any booking, regular users only their own
        if (req.userRole !== "Admin" && booking.userId.toString() !== req.userId) {
            await session.abortTransaction();
            session.endSession();
            return next(new HttpError("Not authorized to update this booking", 403));
        }

        // Cannot update cancelled bookings
        if (booking.status === "cancelled") {
            await session.abortTransaction();
            session.endSession();
            return next(new HttpError("Cannot update a cancelled booking", 400));
        }

        // Prepare update data
        const updateData = {
            updatedBy: req.userId
        };

        // Parse and validate new dates if provided
        let newStartTime = booking.startTime;
        let newEndTime = booking.endTime;
        const now = new Date();

        if (startTime) {
            newStartTime = new Date(startTime);
            if (isNaN(newStartTime.getTime())) {
                await session.abortTransaction();
                session.endSession();
                return next(new HttpError("Invalid start time format", 400));
            }
            if (newStartTime < now) {
                await session.abortTransaction();
                session.endSession();
                return next(new HttpError("Cannot update to a past time", 400));
            }
            updateData.startTime = newStartTime;
        }

        if (endTime) {
            newEndTime = new Date(endTime);
            if (isNaN(newEndTime.getTime())) {
                await session.abortTransaction();
                session.endSession();
                return next(new HttpError("Invalid end time format", 400));
            }
            updateData.endTime = newEndTime;
        }

        // Validate end time is after start time
        if (newEndTime <= newStartTime) {
            await session.abortTransaction();
            session.endSession();
            return next(new HttpError("End time must be after start time", 400));
        }

        // Validate capacity if provided
        if (capacity !== undefined) {
            if (capacity < 1 || !Number.isInteger(capacity)) {
                await session.abortTransaction();
                session.endSession();
                return next(new HttpError("capacity must be a positive integer", 400));
            }

            // Check room capacity
            const room = await Room.findById(booking.roomId).session(session);
            if (capacity > room.capacity) {
                await session.abortTransaction();
                session.endSession();
                return next(new HttpError(`Room capacity is ${room.capacity}, cannot accommodate ${capacity} capacity`, 400));
            }
            updateData.capacity = capacity;
        }

        if (purpose !== undefined) {
            updateData.purpose = purpose.trim();
        }

        // Check for conflicts if time is being changed
        if (startTime || endTime) {
            const conflictingBooking = await Booking.findOne({
                _id: { $ne: id }, // Exclude current booking
                roomId: booking.roomId,
                status: "confirmed",
                $or: [
                    {
                        startTime: { $lte: newStartTime },
                        endTime: { $gt: newStartTime }
                    },
                    {
                        startTime: { $lt: newEndTime },
                        endTime: { $gte: newEndTime }
                    },
                    {
                        startTime: { $gte: newStartTime },
                        endTime: { $lte: newEndTime }
                    }
                ]
            }).session(session);

            if (conflictingBooking) {
                await session.abortTransaction();
                session.endSession();
                return next(new HttpError("Room is already booked for the updated time slot", 409));
            }
        }

        // Update the booking
        const updatedBooking = await Booking.findByIdAndUpdate(
            id,
            updateData,
            { new: true, runValidators: true, session }
        ).populate('roomId', 'roomId roomName capacity roomFeatures floorId')
         .populate('userId', 'name email');

        // Commit transaction
        await session.commitTransaction();
        session.endSession();

        return res.status(200).json({
            message: "Booking updated successfully",
            booking: updatedBooking
        });

    } catch (err) {
        // Rollback transaction on error
        await session.abortTransaction();
        session.endSession();
        
        console.error("Error updating booking:", err);
        
        if (err.name === "ValidationError") {
            return next(new HttpError(err.message, 400));
        }
        
        return next(new HttpError("Internal error updating booking", 500));
    }
};

/**
 * DELETE /bookings/:id
 * Cancel a booking (soft delete by setting status to cancelled)
 * - Admin: Can cancel ANY booking
 * - Regular User: Can only cancel their own bookings
 */
const handlerDeleteBooking = async (req, res, next) => {
    const { id } = req.params;

    // Validate booking ID format
    if (!mongoose.Types.ObjectId.isValid(id)) {
        return next(new HttpError("Invalid booking ID format", 400));
    }

    // Validate authentication
    if (!req.userId) {
        return next(new HttpError("User authentication required", 401));
    }

    try {
        // Find the booking
        const booking = await Booking.findById(id)
            .populate('roomId', 'roomId roomName capacity')
            .populate('userId', 'name email');

        if (!booking) {
            return next(new HttpError("Booking not found", 404));
        }

        // Authorization check - Admin can delete any booking, regular users only their own
        if (req.userRole !== "Admin" && booking.userId._id.toString() !== req.userId) {
            return next(new HttpError("Not authorized to cancel this booking", 403));
        }

        // Check if already cancelled
        if (booking.status === "cancelled") {
            return next(new HttpError("Booking is already cancelled", 400));
        }

        // Soft delete by updating status to cancelled
        booking.status = "cancelled";
        booking.updatedBy = req.userId;
        await booking.save();

        // Remove booking ID from room's bookings array
        const room = await Room.findById(booking.roomId);
        if (room) {
            room.bookings = room.bookings.filter(
                bookingId => bookingId.toString() !== id
            );
            await room.save();
        }

        return res.status(200).json({
            message: "Booking cancelled successfully",
            booking: booking
        });

    } catch (err) {
        console.error("Error cancelling booking:", err);
        return next(new HttpError("Internal error cancelling booking", 500));
    }
};

module.exports = {
    handlerGetUserBookings,
    handlerGetAllBookings,
    handlerCreateBooking,
    handlerUpdateBooking,
    handlerDeleteBooking
};