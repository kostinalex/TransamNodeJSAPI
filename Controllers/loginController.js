var settings = require("../appsettings.json");
const jsonwebtoken = require("jsonwebtoken");
const transamMySql = require("../Data/context.js");
const context = transamMySql.connection;

async function login(req, res, next) {
  try {
    if (req.body.userName == undefined || req.body.password == undefined) {
      return res.status(400).json("User is null");
    }
    context.query(
      "select * from users where username=?;",
      [req.body.userName],
      function (err1, users) {
        if (err1) throw err1;
        console.log("users", users);

        if (users.length == 0) {
          return res.status(400).json("No such user");
        }

        if (users.length > 1) {
          return res
            .status(400)
            .json(
              "More than one user with the same username. Please contact the administrator."
            );
        }

        const user = users[0];

        if (user.NumberOfAttempts > 10) {
          return res
            .status(400)
            .json("You have reached the max number of attempts to login.");
        }

        if (user.Password != req.body.password) {
          const sqlQueryParams = [];

          let numberOfAttempts = user.NumberOfAttempts + 1;

          context.query(
            "update users set NumberOfAttempts=? where id=?",
            [numberOfAttempts, user.Id],
            function (err2) {
              if (err2) throw err2;
            }
          );
          return res.json(
            "Failed attempt to login. Attempts left=" + numberOfAttempts
          );
        }

        if (user.NumberOfAttempts > 0) {
          context.query(
            "update users set NumberOfAttempts=? where id=?",
            [0, user.Id],
            function (err2) {
              if (err2) throw err2;
            }
          );
        }
        context.query(
          `SELECT role.role FROM transam.userroles as role
            left join transam.usermappings as mapping on role.Id=mapping.userroleid
            where userid=?;`,
          [user.Id],
          function (err2, roles) {
            if (err2) throw err2;
            //console.log("roles", roles)
            const rolesString = roles.map((c) => c.role).join(",");
            console.log("rolesString", rolesString);

            let timeStamp =
              Math.floor(Date.now() / 1000) +
              60 * 60 * settings.JWTdurationInHours;
            console.log("timeStamp", timeStamp);

            let token = jsonwebtoken.sign(
              {
                UserName: user.Username,
                UserRoles: rolesString,
                exp: timeStamp,
                //exp: 1662038130,
                iss: settings.JWTissuer,
                aud: settings.JWTaudience,
              },
              settings.JWT
            );
            return res.json({ token });
          }
        );
      }
    );
  } catch (err) {
    console.error("Error", err.message);
    next(err);
  }
}

module.exports = {
  login,
};
