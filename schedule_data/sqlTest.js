let mysql = require("../node_modules/mysql");

let connectionObject = {
    host: "johnny.heliohost.org",
    user: "chriswil_1",
    password: "w5eiDgh@39GNmtA",
    database: "chriswil_ate_model"
  }

let con = mysql.createConnection(connectionObject);
con.connect();

con.query("SHOW TABLES;", function (err, results, fields) {
    if (err) {
        console.log(err.message);
    } else {
        console.log("execute results: ");
        console.log(results);
}});

// con.query("SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_NAME = 'routes' ORDER BY ORDINAL_POSITION", function (err, results, fields) {
//     if (err) {
//         console.log(err.message);
//     } else {
//         console.log("execute results: ");
//         console.log(results);
// }});

// con.query("SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_NAME = 'schedule_trips' ORDER BY ORDINAL_POSITION", function (err, results, fields) {
//     if (err) {
//         console.log(err.message);
//     } else {
//         console.log("execute results: ");
//         console.log(results);
// }});

// con.query("SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_NAME = 'services' ORDER BY ORDINAL_POSITION", function (err, results, fields) {
//     if (err) {
//         console.log(err.message);
//     } else {
//         console.log("execute results: ");
//         console.log(results);
// }});

// con.query("SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_NAME = 'shapes' ORDER BY ORDINAL_POSITION", function (err, results, fields) {
//     if (err) {
//         console.log(err.message);
//     } else {
//         console.log("execute results: ");
//         console.log(results);
// }});

con.query("SELECT * FROM info", function (err, results, fields) {
    if (err) {
        console.log(err.message);
    } else {
        console.log("execute results: ");
        console.log(results);
}});

con.end(function (err) {
    if (err) {
        return console.log(err.message);
    }
});