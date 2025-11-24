// models/user.js
const mongoose = require("mongoose");
const validator = require("validator");

const userSchema = mongoose.Schema({
    name : {
        type : String,
        required : true,
    },
    email : {
        type : String,
        required : true,
        lowercase : true,
        validate: {
            validator: validator.isEmail,
            message: "Invalid email address"
        },
        unique : true
    },
    password : {
        type : String,
        required : true,
    },
    role : {
        type : String,
        required : true,
        default : "Client",
    },
}, {timestamps : true});

const User = mongoose.model("User", userSchema);

module.exports = User;