var mysql = require("mysql");
var settings = require("../appsettings.json");
const config = {
  host: settings.ConnectionStrings.MySql.host,
  user: settings.ConnectionStrings.MySql.user,
  password: settings.ConnectionStrings.MySql.password,
  database: settings.ConnectionStrings.MySql.database,
};
const context = mysql.createConnection(config);
context.connect(function (err) {
  if (err) throw err;
  console.log("Transam db connected");
});

module.exports = {
  connection: mysql.createConnection(config),
};
