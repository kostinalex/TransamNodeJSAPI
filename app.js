const express = require('express');
var cors = require('cors')
var auth = require('./Auth/auth.js');
var settings = require('./appsettings.json');

var help = require('./HelpfullService/help');

const collectionLettersController = require('./Controllers/collectionLettersController.js');
const loginController = require('./Controllers/loginController.js');


const app = express()
const port = process.env.port || 3000

app.use(cors())
app.use(express.json())


app.post('/api/login', loginController.login);

app.get('/api/getcollectionletters/:minDaysOfAging', (req, res, next) => {
    auth.autherize(req, res, next, "CanSeeDebtCollection");
}, collectionLettersController.getCollectionLetters)

app.post('/api/sendemail', help.sendEmail);

app.listen(port, "127.0.0.1", () => {
    console.log(`App listening on port ${port}`)
})