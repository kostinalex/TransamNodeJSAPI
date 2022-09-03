
var mysql = require('mysql');
var settings = require('../appsettings.json');
var help = require('../HelpfullService/help.js');
var request = require('request');

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

var dbf = require("mssql");

dbf.connect({
    user: settings.ConnectionStrings.FleetManager.user,
    password: settings.ConnectionStrings.FleetManager.password,
    server: settings.ConnectionStrings.FleetManager.server,
    database: settings.ConnectionStrings.FleetManager.database,
    synchronize: true,
    trustServerCertificate: true,
    requestTimeout: 60000
}, function (err) {
    if (err) console.log(err);

});

//        [HttpPost("/api/getfile")]

async function getCollectionLetters(req, res, next) {
    try {
        request({
            headers: {
                "Accept": "application/json",
                "Authorization": req.headers.authorization
            },
            url: "https://transamapp.transamcarriers.com/api/getnotpaidinvoicesfromqb/48000",
            method: "GET",
        }, function (error, response, body) {
            if (error) {
                console.log("error: ", error)
                res.send({ error })
            }
            else {

                let invoices = JSON.parse(body).invoices.filter(c => c.balanceRemaining > 0)

                let invoicesNos = invoices.filter(c => c.refNumber.indexOf("I") == 0).map(c => c.refNumber.replace("I", "")).join(",")

                let bigQuery = `

                select 
                    IL.InvoiceNo as InvoiceNo,
                    (
                    s.StoragePath+
                                                REPLACE(LEFT(CONVERT(VARCHAR, doc.CreatedDate, 120), 10),'-','')+ '_'
                                                +CAST(doc.FolderNo as varchar(10))
                                                + ''
                                                + CAST(doc.DocumentId as varchar(10))
                                                + '_'
                                                + doc.FileName
                    ) as FilePath
                into #TempRPT
                from [FleetManager].[dbo].[Image_Document] as doc
                    join [FleetManager].[dbo].[Image_DocumentDefinition] as def on def.DefinitionID=doc.DefinitionID
                    join [FleetManager].[dbo].[Image_Storage] as s on s.StorageID=def.StorageID
                    join [FleetManager].[dbo].[InvoiceLog] as IL on doc.LogID=IL.LogID
                    --join [FleetManager].[dbo].[Invoice] as inv on IL.InvoiceNo=inv.InvoiceNo
                where doc.LogID in 
                (
                    select LogId
                    from [FleetManager].[dbo].[InvoiceLog]
                    where InvoiceNo in (`+ invoicesNos + `)
                )
                and def.KeyField='inv.InvoiceNo'

                select InvoiceNo, CustomerId 
                into #TempInvoices
                from [FleetManager].[dbo].[Invoice] 
                where InvoiceNo in (select InvoiceNo from #TempRPT)

                select CustomerID,EMailAddress,EMailList
                into #TempCustomers
                from [FleetManager].[dbo].[Customer]
                where CustomerID in (select CustomerID from #TempInvoices)

                SELECT 
                    invl.InvoiceNo as InvoiceNo,
                    (s.StoragePath                
                    +REPLACE(LEFT(CONVERT(VARCHAR, I.CreatedDate, 120), 10),'-','')+ '_'
                    + CAST(I.FolderNo as varchar(10))
                    + '\'
                    + CAST(I.DocumentId as varchar(10))
                    + '_'
                    + I.FileName
                    ) as FilePath,
                    invl.RecipientList as RecipientList
                into #TempPOD
                FROM [FleetManager].[dbo].[Invoice_Attachments] as A
                    join [FleetManager].[dbo].[Image_Document] as I on A.DocumentID=I.DocumentID
                    join [FleetManager].[dbo].[Image_Storage] as s on I.StorageID=s.StorageID
                    join [FleetManager].[dbo].[Image_DocumentDefinition] as D on I.DefinitionID=D.DefinitionID
                    join [FleetManager].[dbo].[InvoiceLog] as invl on A.LogID=invl.LogID
                where invl.InvoiceNo in (`+ invoicesNos + `);

                select
                inv.InvoiceNo,
                inv.CustomerID,
                rpt.FilePath as RPT,
                pod.FilePath as POD,
                pod.RecipientList as InvoiceEmail,
                cus.EMailAddress as CustomerEmail1,
                cus.EMailList as CustomerEmail2
                from #TempInvoices as inv
                left join #TempRPT as rpt on inv.InvoiceNo=rpt.InvoiceNo
                left join #TempPOD as pod on pod.InvoiceNo=inv.InvoiceNo
                left join #TempCustomers as cus on cus.CustomerID=inv.CustomerID

                DROP TABLE #TempRPT
                DROP TABLE #TempInvoices
                DROP TABLE #TempPOD
                DROP TABLE #TempCustomers
                `

                dbf.query(bigQuery
                    , function (err1, report) {
                        if (err1) { console.log(err1) }

                        context.query("SELECT * FROM transam.collectionemail;"
                            , function (err2, rewriteEmails) {
                                if (err2) { console.log(err2) }

                                let invoicesGrouped = []

                                for (let invoice of invoices) {
                                    let dup = invoicesGrouped.find(c => c.customerRefListID == invoice.customerRefListID && c.arAccountRefFullName == invoice.arAccountRefFullName)
                                    if (dup != undefined) {
                                        //add to existing
                                        dup.invoices.push(invoice)
                                    }
                                    else {
                                        //create new
                                        invoicesGrouped.push({
                                            customerRefListID: invoice.customerRefListID,
                                            arAccountRefFullName: invoice.arAccountRefFullName,
                                            customerRefFullName: invoice.customerRefFullName,
                                            invoices: [invoice]
                                        })
                                    }
                                }

                                console.log("invoicesGroupedCount=", invoicesGrouped.length)

                                for (let customer of invoicesGrouped) {
                                    for (let invoice of customer.invoices) {
                                        invoice.aging = help.dateDiffInDays(new Date(invoice.dueDate), new Date())
                                        let attachments = report.recordset.filter(c => "I" + c.InvoiceNo == invoice.refNumber)
                                        invoice.pods = [...new Set(attachments.map(c => c.POD))]
                                        invoice.rpts = [...new Set(attachments.map(c => c.RPT))]
                                        let invoiceEmails = attachments.map(c => c.InvoiceEmail).join(";")
                                        let customerEmail1 = attachments.map(c => c.CustomerEmail1).join(";")
                                        let customerEmail2 = attachments.map(c => c.CustomerEmail2).join(";")
                                        invoice.emails = invoiceEmails + ";" + customerEmail1 + ";" + customerEmail2;
                                        invoice.emails =[...new Set(invoice.emails.split(";").filter(c => c != "").map(c => c.trim()))] 

                                        if (attachments != undefined && attachments.length > 0 && customer.fleetManagerCustomerId == undefined) {
                                            customer.fleetManagerCustomerId = attachments[0].CustomerID
                                        }
                                        if (attachments == undefined) {
                                            console.log("-->warning", invoice.InvoiceNo)
                                        }

                                    }
                                    customer.invoices = customer.invoices.filter(c => c.aging > 0 && c.balanceRemaining)
                                    customer.invoicesCount = customer.invoices.length
                                    customer.total = help.sum(customer.invoices, "balanceRemaining")
                                    customer.maxAgingDate = help.min(customer.invoices, "dueDate")
                                    customer.aging = help.dateDiffInDays(new Date(customer.maxAgingDate), new Date())
                                    customer.emails = [...new Set(customer.invoices.map(c => c.emails).flat(1))]
                                    let emailRewrite = rewriteEmails.find(c => c.CustomerIdF == customer.fleetManagerCustomerId)
                                    if (emailRewrite != undefined) {
                                        customer.emails = emailRewrite.Emails.split(";").map(c=>c.trim())
                                        console.log("Email rewritten for "+customer.customerRefFullName)
                                    }
                                }



                                res.send({
                                    //rewriteEmails,
                                    invoices: help.orderBy(invoicesGrouped.filter(c => c.aging > req.params.minDaysOfAging), "aging")

                                })
                            })
                    })
            }
        });


    } catch (err) {
        console.error("Error", err.message);
        next(err);
    }
}

function groupBy(array, key) {
    return array.reduce(function (rv, x) {
        (rv[x[key]] = rv[x[key]] || []).push(x);
        return rv;
    }, {});
};



module.exports = {
    getCollectionLetters
};