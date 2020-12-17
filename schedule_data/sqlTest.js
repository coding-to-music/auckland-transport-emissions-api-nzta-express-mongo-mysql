let mysql = require("../node_modules/mysql");

let connectionObject = {
    host: "localhost",
    user: "root",
    password: " ",
    database: "localate"
  }

var temp;

let con = mysql.createConnection(connectionObject);
con.connect();

con.query("SELECT count(*) FROM schedule_trips;", function (err, results, fields) {
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

// con.query("SELECT * FROM scheduled_trips, services WHERE trip_id = '1102170548-20201126121446_v95.73'", function (err, results, fields) {
//     if (err) {
//         console.log(err.message);
//     } else {
//         console.log("execute results: ");
//         console.log(results);
// }});

// con.query("SELECT scheduled_trip.service_id FROM scheduled_trips WHERE trip_id = '1102170548-20201126121446_v95.73' AS id; SELECT * FROM services WHERE service_is = id;", function (err, results, fields) {
//     if (err) {
//         console.log(err.message);
//     } else {
//         console.log("execute results: ");
//         console.log(results);
// }});

con.query("SELECT * FROM schedule_trips LIMIT 10;", function (err, results, fields) {
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