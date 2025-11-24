// utils/auth.js
const jwt = require("jsonwebtoken");

const JSON_SECRET = process.env.JSON_SECRET;

const TOKEN_EXPIRATION = "5d";  

function setUser(user) {
    if (!user || !user._id || !user.email || !user.role) {
        console.log("Invalid user object passed to setUser()");
    }

    const payload = {
        _id: user._id,
        email: user.email,
        role: user.role,
    };

    try{
        return jwt.sign(payload, JSON_SECRET, {
        expiresIn: TOKEN_EXPIRATION,
    });
    }
    catch(err){
        console.log("Error while creating token : ",err);
    }
}

function getUser(token) {
    if (!token) return null;

    try {
        return jwt.verify(token, JSON_SECRET);
    } catch (err) {
        
        return null;
    }
}

module.exports = {
    setUser,
    getUser,
};