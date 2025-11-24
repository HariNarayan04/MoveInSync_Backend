// index.js
const express = require("express");
const cors = require("cors");
const dotenv = require("dotenv");
dotenv.config();
const HttpError = require("./models/http-error");
const cookieParser = require("cookie-parser");
const connectMongoDB = require("./utils/connection.js");
const logreqres = require("./middlewares/logger");

// Import routes
const userRoutes = require("./routes/user_route.js");
const floorRouter = require("./routes/floor_route.js");
const roomRouter = require("./routes/room_route.js");
const bookingRouter = require("./routes/booking_route.js");
const availabilityRouter = require("./routes/availability_route.js");
connectMongoDB(process.env.MongoDB_URL);

const app = express();

// Middleware
app.use(cors({
    origin :[process.env.CLIENT_URL, "http://127.0.0.1:5500", "http://localhost:5173"],
    credentials: true
}));

app.use(express.urlencoded());
app.use(express.json());
app.use(cookieParser());
app.use(logreqres());

// Routes
app.use("/api/v1/user", userRoutes);
// floor routes
app.use("/api/v1/floors", floorRouter);
// booking routes
app.use("/api/v1/bookings", bookingRouter);
// room routes
app.use("/api/v1/rooms", roomRouter);
// rooms availability route
app.use("/api/v1/availability", availabilityRouter);

// 404 Handler - must come after all valid routes
app.use((req, res, next) => {
    const error = new HttpError("Could not find this route", 404);
    throw error;
});

// Global Error Handler
app.use((error, req, res, next) => {
    if (res.headerSent) {
      return next(error);
    }
    const status = typeof error.code === 'number' ? error.code : 500;
    res.status(status || 500);
    res.json({ message: error.message || "An unknown error occurred!" });
});

app.listen(process.env.PORT, () =>{
    console.log("Server Started Successfully");
});