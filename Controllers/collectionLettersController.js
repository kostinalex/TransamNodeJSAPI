
var mysql = require('mysql');
var settings = require('../appsettings.json');
var help = require('../HelpfullService/help.js');

const context = mysql.createConnection({
    host: settings.ConnectionStrings.MySql.host,
    user: settings.ConnectionStrings.MySql.user,
    password: settings.ConnectionStrings.MySql.password,
    database: settings.ConnectionStrings.MySql.database
});
context.connect(function (err) {
    if (err) throw err;
    console.log("Transam db connected");

});

var sql = require("mssql");

sql.connect({
    user: settings.ConnectionStrings.FleetManager.user,
    password: settings.ConnectionStrings.FleetManager.password,
    server: settings.ConnectionStrings.FleetManager.server,
    database: settings.ConnectionStrings.FleetManager.database,
    synchronize: true,
    trustServerCertificate: true,
}, function (err) {
    if (err) console.log(err);

});

async function getCollectionLetters(req, res, next) {
    try {

        let now = new Date()
        now.setDate(now.getDate()-1)

        context.query("SELECT EmailList1,Invoices,CustomerId,CustomerName,TotalSum,Currency,Excel FROM transam.collectionletter where DayCreated>'" + now.toISOString().split('T')[0] + "';", function (err1, lettersRaw) {
            if (err1) throw err1;

            if(lettersRaw.length==0){
                return res.json({letters:[]})
            }

            let report1 = lettersRaw.map(letter => ({
                EmailList1: letter.EmailList1,
                Invoices: letter.Invoices,
                CustomerId: letter.CustomerId,
                CustomerName: letter.CustomerName,
                TotalSum: letter.TotalSum,
                Currency: letter.Currency,
                Excel: letter.Excel
            }))

            const invoiceNos = report1.map(letter => letter.Invoices.split(",")).flat(1).join(",")

            context.query("SELECT * FROM transam.collectioninvoice where invoiceno in (" + invoiceNos + ");", function (err2, invoicesRaw) {
                if (err2) throw err2;
                const report2 = []

                for (let letter of report1) {
                    const invoicesForLetter = invoicesRaw.filter(c => letter.Invoices.split(",").indexOf("" + c.InvoiceNo) != -1);
                    const maxAging = new Date(Math.min(...invoicesForLetter.map(e => new Date(e.DueDate))));

                    const diffTime = Math.abs(now - maxAging);
                    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

                    report2.push({
                        EmailList1: letter.EmailList1,
                        CustomerId: letter.CustomerId,
                        CustomerName: letter.CustomerName,
                        TotalSum: letter.TotalSum,
                        Currency: letter.Currency,
                        Excel: letter.Excel,
                        MaxAging: diffDays,
                        Invoices: invoicesForLetter,
                    })
                }


                res.json({
                    letters: help.orderByDescending(report2.filter(c => c.MaxAging > 75), "MaxAging")
                });
            })
        });
    } catch (err) {
        console.error("Error", err.message);
        next(err);
    }
}

// function orderBy(array,property){
//     return array.sort((a,b) => (a[property] > b[property]) ? 1 : ((b[property] > a[property]) ? -1 : 0))
// }

// function orderByDescending(array,property){
//     return array.sort((a,b) => (a[property] > b[property]) ? 1 : ((b[property] > a[property]) ? 0 : -1))
// }

// async function getCollectionLetters(req, res, next) {
//     try {
//         context.query("select * from users", function (err1, users) {
//             if (err1) throw err1;

//             var request = new sql.Request();
//             request.query('SELECT TOP (10) * FROM [FleetManager].[dbo].[Trip]', function (err2, recordset) {
//                 if (err2) console.log(err2);

//                 // res.json({ hello: "Hello1", users: users, trips: trips });
//                 res.send(recordset);
//             });
//         });
//     } catch (err) {
//         console.error("Error", err.message);
//         next(err);
//     }
// }


module.exports = {
    getCollectionLetters
};