const express = require("express");
const { authenticator, authorisedTo } = require("../middlewares/auth");
const { handlerGetRoom, handlerUpdateRoom, handlerDeleteRoom } = require("../controllers/room_controller");
const roomRouter = express.Router();

// Get Room Data by Room ID
roomRouter.get("/:roomId", authenticator, authorisedTo(["Admin", "Client"]), handlerGetRoom);
// Update Room Data by Room ID
roomRouter.put("/:roomId", authenticator, authorisedTo(["Admin"]), handlerUpdateRoom);
// Delete Room Data by Room ID
roomRouter.delete("/:roomId", authenticator, authorisedTo(["Admin"]), handlerDeleteRoom);

module.exports = roomRouter;