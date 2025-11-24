const express = require("express");

const { authenticator, authorisedTo } = require("../middlewares/auth");
const { handlerSearchAvailability } = require("../controllers/availability_controller");

const availabilityRouter = express.Router();

availabilityRouter.post("/search", authenticator, authorisedTo(["Admin", "Client"]), handlerSearchAvailability);


module.exports = availabilityRouter;