// controllers/user_controller.js
const User = require("../models/user");
const {setUser} = require("../utils/auth");
const bcrypt = require("bcrypt");

const handlerUserSignup = async (req, res) =>{
    const {name, email, password} = req.body;
    console.log("signup request received");
    console.log(req.body);
    if (!name || !email || !password) {
        return res.status(400).json({
            message: "Name, email and password are required"
        });
    }
    try{
        const hashedPassword = await bcrypt.hash(password, 10);
        const newUser = await User.create({
            name : name,
            email : email,
            password : hashedPassword
        });
        console.log("User Created Successfully");
        console.log(newUser);
        res.status(201).json({
            success: true,
            message: "User Signed Up Successfully",
            data: {
                user: newUser
            }
        });
    }
    catch(err){
        console.log("Internal Error Creating User", err);
        res.status(500).json({
            message : "Internal Error Creating User",
            error : err
        });
    }
}
const handlerUserLogin = async (req, res) =>{
    const {email, password} = req.body;
    if (!email || !password) {
        return res.status(400).json({
            message: "Email and password are required"
        });
    }
    try{
        const logingUser = await User.findOne({email : email});
        const isMatch = logingUser ? await bcrypt.compare(password, logingUser.password) : false;

        if(!isMatch){
            res.status(400).json({
                message : "Email or password is wrong"
            });
        }
        else{
            try{
                const token = setUser(logingUser);
                res.cookie("uid", token, {
                    httpOnly: true,
                    secure: false,
                    sameSite: "lax",
                });
                res.status(200).json({
                    success: true,
                    message: "logged in successfully",
                    data: {
                        user: logingUser
                    }
                });
            }
            catch(err){
                res.status(500).json({
                    message : "internal error setting cookie",
                    error : err,
                });
            }
        }
    }
    catch(err){
        res.status(500).json({
            message : "Internal error while loggin",
            error : err,
        });
    }
}

module.exports = {
    handlerUserSignup,
    handlerUserLogin
}