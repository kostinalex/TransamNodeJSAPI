var settings = require('../appsettings.json');
var request = require('request');
const fs = require('fs');
var path = require("path");

function sortToggle(array, propertyName, toggle) {
    if (propertyName != null) {
        let toggler = toggle ? 1 : -1
        if (array != null) {
            array = array.sort((x, y) =>
                x[propertyName] > y[propertyName] ? toggler : -toggler,
            )
        }
    }

    return array
}


function orderBy(array, property) {
    return sortToggle(array, property, true)
}

function orderByDescending(array, property) {
    return sortToggle(array, property, false)
}

async function sendEmail(req, res, next) {
    return autherizeWithMicrosoft(req, res, next, sendRequestToOutlookToSendEmail);
}

async function autherizeWithMicrosoft(req, res, next, callback) {
    try {
        request.post({
            url: "https://login.microsoftonline.com/" + settings.MicrosoftGraph.tenant + "/oauth2/v2.0/token", form: {
                grant_type: "client_credentials",
                client_id: settings.MicrosoftGraph.clientId,
                client_secret: settings.MicrosoftGraph.secret,
                scope: "https://graph.microsoft.com/.default"
            }
        }, function (err, response, body) {
            if (err) {
                res.send({ err })
            }
            else {
                const tokenObj = JSON.parse(body)
                const token = tokenObj.access_token;
                callback(token);
                res.send({ token })
            }
        });

    } catch (err) {
        console.error("Error", err.message);
        next(err);
    }
}

async function sendRequestToOutlookToSendEmail(token) {

    let sender = "alex.k@transamcarriers.com";
    let subject = "emmm"
    let html = "Hello<br>He<b>ll</b>o"
    let recipients = ["kostin2607@gmail.com"]
    let saveToSentFolder = false;
    let attachmentsPaths = ["C:\\Users\\kosti\\Desktop\\TransamAPI\\lol111.txt", "C:\\Users\\kosti\\Desktop\\TransamAPI\\lol222.txt"]






    let toRecipients = []
    let attachments = []

    for (let recipient of recipients) {
        toRecipients.push({
            EmailAddress: {
                Address: recipient
            }
        })
    }

    let count = 0;

    for (let attachment of attachmentsPaths) {
        const base64 = fs.readFileSync(attachment, { encoding: 'base64' });
        attachments.push({
            "@odata.type": "microsoft.graph.fileAttachment",
            Name: path.basename(attachment),
            ContentBytes: base64
        })
        count++
    }

    let email = {
        Message: {
            Subject: subject,
            Body: {
                ContentType: "HTML",
                Content: html
            },
            ToRecipients: toRecipients,
            Attachments: attachments
        },
        SaveToSentItems: saveToSentFolder
    }


    request({
        headers: {
            "Accept": "application/json",
            "Authorization": token
        },
        url: "https://graph.microsoft.com/v1.0/users/" + sender + "/sendmail",
        method: "POST",
        json: true,
        body: email
    }, function (error, response, body) {
        if (error) {
            console.log("error: ", error)
        }
        else {
            console.log("Bingo!")
        }
    });


}

function sum(array, property) {
    let sum = 0
    for (let item of array) {
        sum += item[property]
    }

    return sum;
}

function min(array, property) {
    let min;
    for (let item of array) {
        if (min == undefined) {
            min = item[property]
        }
        else {
            if (min > item[property]) {
                min = item[property]
            }
        }
    }

    return min;
}

function max(array, property) {
    let max;
    for (let item of array) {
        if (max == undefined) {
            max = item[property]
        }
        else {
            if (max > item[property]) {
                max = item[property]
            }
        }
    }

    return max;
}

function dateDiffInDays(a, b) {

    const utc1 = Date.UTC(a.getFullYear(), a.getMonth(), a.getDate());
    const utc2 = Date.UTC(b.getFullYear(), b.getMonth(), b.getDate());

    return Math.floor((utc2 - utc1) / (1000 * 60 * 60 * 24));
}


module.exports = {
    orderBy,
    orderByDescending,
    sendEmail,
    sum,
    min,
    max,
    dateDiffInDays,
};