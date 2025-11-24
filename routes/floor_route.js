// routes/floor_route.js
const express = require("express");
const {authenticator, authorisedTo} = require("../middlewares/auth");
const {
    handlerCreateFloor,
    handlerDeleteFloor,
    handlerGetFloor,
    handlerUpdateFloor,
    handlerGetRoomsForFloor,
    handlerCreateRoom,
} = require("../controllers/floor_controller");

const floorRouter = express.Router();

// Create Floor
floorRouter.post("/", authenticator, authorisedTo(["Admin"]), handlerCreateFloor);
// Delete Floor
floorRouter.delete("/:floorId", authenticator, authorisedTo(["Admin"]), handlerDeleteFloor);
// Get Floor Data 
floorRouter.get("/", authenticator, authorisedTo(["Admin"]), handlerGetFloor);
// Update Floor Data
floorRouter.put("/:floorId", authenticator, authorisedTo(["Admin"]), handlerUpdateFloor);

// Get Rooms for a Floor Id
floorRouter.get("/:floorId/rooms", authenticator, authorisedTo(["Admin", "Client"]), handlerGetRoomsForFloor);

// Create Room
floorRouter.post("/:floorId/rooms", authenticator, authorisedTo(["Admin"]), handlerCreateRoom);

// Get Floor Data by Floor ID
// floorManagementRouter.get("/:floorId", authenticator, authorisedTo(["Admin"]), handlerGetFloorById);




module.exports = floorRouter;