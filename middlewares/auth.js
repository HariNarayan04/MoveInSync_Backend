// middlewares/auth.js
const {getUser} = require("../utils/auth");
const jwt = require("jsonwebtoken");

const authenticator = (req, res, next) =>{
    const token = req.cookies.uid;
    if(!token){
        return res.status(400).json({
            message : "Authenticate Yourself"
        });
    }
    
    const verifiedToken = getUser(token);
    if(!verifiedToken){
        return res.status(400).json({
            message : "Authentication Failed, Login again"
        });
    }
    req.userId = verifiedToken._id;
    req.userRole = verifiedToken.role;
    next();
}

const authorisedTo = (roles = []) => {
    return (req, res, next) => {
        const token = req.cookies.uid;
        

        if (!token) {
            return res.status(400).json({
                message: "Authenticate yourself",
            });
        }

        const payload = jwt.decode(token);
        if (!payload || !payload.role || !roles.includes(payload.role)) {
            return res.status(403).json({
                message: "Unauthorized",
            });
        }

        next();
    };
};

module.exports = {
    authenticator,
    authorisedTo
};
