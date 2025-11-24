// models/floor.js
const mongoose = require("mongoose");
const validator = require("validator");

const floorSchema = mongoose.Schema({
    floorName : {
        type : String,
        required : true,
        unique : true
    },
    floorNumber : {
        type : Number,
        required : true,
        unique : true,
        min : [0, "Floor number must be at least 0"]
    },
    floorDescription : {
        type : String,
    },
    createdBy : {
        type : mongoose.Schema.Types.ObjectId,
        ref : 'User',
        required : true
    },
    updatedBy : {
        type : mongoose.Schema.Types.ObjectId,
        ref : 'User',
    },
    rooms : [{
        type : mongoose.Schema.Types.ObjectId,
        ref : 'Room'
    }]
}, {timestamps : true});

const Floor = mongoose.model("Floor", floorSchema);

module.exports = Floor;