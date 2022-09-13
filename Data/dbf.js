var settings = require("../appsettings.json");
var dbf = require("mssql");
const { Console } = require("console");

const config = {
  user: settings.ConnectionStrings.FleetManager.user,
  password: settings.ConnectionStrings.FleetManager.password,
  server: settings.ConnectionStrings.FleetManager.server,
  database: settings.ConnectionStrings.FleetManager.database,
  synchronize: true,
  trustServerCertificate: true,
  requestTimeout: 60000,
};

dbf.connect(config, function (err) {
  if (err) console.log(err);
  console.log("FleetManager connected");
});

module.exports = {
  connection: dbf.connect(config, function (err) {
    if (err) console.log(err);
  }),
};
