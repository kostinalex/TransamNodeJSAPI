const jsonwebtoken = require("jsonwebtoken");
var settings = require('../appsettings.json');

async function autherize(req, res, next, role) {
    //console.log("Authentication")
    let authenticated = false;

    const token = req.headers.authorization;
    // console.log("req.headers", req.headers)
    // console.log("token", token)
    if (token) {
        try {
            const decodedToken = jsonwebtoken.verify(token, settings.JWT);
            // console.log("decodedToken", decodedToken)
            // console.log("roles", decodedToken.UserRoles)
            if (decodedToken.UserRoles.indexOf("CanEnter") == -1) {
                console.log("No CanEnter role")
                return res.status(401).send("Unautherized")
            }

            if (decodedToken.UserRoles.indexOf(role) == -1) {
                console.log("No role " + role)
                return res.status(401).send("Unautherized")
            }
            authenticated = true;
        } catch (err) {
            console.error("Error", err.message);
        }
    }
    
    if (authenticated) {
        return next();
    }
    else {
        return res.status(401).send("Unautherized")
    }
}

module.exports = {
    autherize
};