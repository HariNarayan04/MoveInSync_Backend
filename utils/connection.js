// utils/connection.js
const mongoose = require("mongoose");

const connectMongoDB = async (url) =>{
    try{
        const connection = await mongoose.connect(url);
        console.log("MongoDB Connected");
        return connection;
    }
    catch(err){
        console.log("Error while connecting MongoDB : ", err);
        return null;
    }
}
module.exports = connectMongoDB;