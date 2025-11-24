// routes/user_route.js
const express = require("express");
const {
    handlerUserSignup,
    handlerUserLogin,
    
} = require("../controllers/user_controller");

const userRouter = express.Router();

userRouter.post("/signup", handlerUserSignup);
userRouter.post("/login", handlerUserLogin);

module.exports = userRouter;