const context = require("../Data/context.js").connection;

async function getAccidents(req, res, next) {
  context.query(
    "SELECT * FROM transam.collectionemail;",
    function (err2, rewriteEmails) {
      if (err2) {
        console.log(err2);
      }
      res.send({ hello: "lol", rewriteEmails });
    }
  );
}

module.exports = {
  getAccidents,
};
