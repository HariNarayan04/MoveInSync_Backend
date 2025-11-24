// routes/booking_route.js
const express = require("express");
const { authenticator, authorisedTo } = require("../middlewares/auth");
const {
    handlerGetUserBookings,
    handlerGetAllBookings,
    handlerCreateBooking,
    handlerUpdateBooking,
    handlerDeleteBooking
} = require("../controllers/booking_controller");

const bookingRouter = express.Router();

// Get ALL bookings in the system (Admin only)
// GET /bookings
bookingRouter.get("/all", authenticator, authorisedTo(["Admin"]), handlerGetAllBookings);

// Get all future bookings for a specific user
// GET /bookings/:userId

bookingRouter.get("/:userId", authenticator, authorisedTo(["Admin", "Client"]), handlerGetUserBookings);

// Create a new booking for a specific room
// POST /rooms/:roomId/bookings
bookingRouter.post("/rooms/:roomId", authenticator, authorisedTo(["Admin", "Client"]), handlerCreateBooking);

// Update a specific booking
// PUT /bookings/:id
bookingRouter.put("/:id", authenticator, authorisedTo(["Admin", "Client"]), handlerUpdateBooking);

// Delete (cancel) a specific booking
// DELETE /bookings/:id
bookingRouter.delete("/:id", authenticator, authorisedTo(["Admin", "Client"]), handlerDeleteBooking);


module.exports = bookingRouter;