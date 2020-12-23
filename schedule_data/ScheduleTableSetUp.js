// Imports
let mysql = require("../node_modules/mysql");

let connectionObject = {
    host: "localhost",
    user: "root",
    password: " ",
    database: "localate"
  }

// Queries

let createScheduleTrip = `create table if not exists schedule_trips(
    trip_id varchar(255) PRIMARY KEY not null,
    route_id varchar(255),
    shape_id varchar(255),
    service_id varchar(255),
    schedule_start_stop_id varchar(255),
    schedule_end_stop_id varchar(255),
    schedule_number_stops int,
    schedule_time int,
    distance int,
    constraint FK_route FOREIGN KEY (route_id) REFERENCES routes(route_id),
    constraint FK_shape FOREIGN KEY (shape_id) REFERENCES shapes(shape_id),
    constraint FK_service FOREIGN KEY (service_id) REFERENCES services(service_id)
  );`;

let createRoutes = `create table if not exists routes(
    route_id varchar(255) PRIMARY KEY not null,
    agency_id varchar(255),
    route_short_name varchar(255),
    route_long_name varchar(255)
);`;

let createShapes = `create table if not exists shapes(
    shape_id varchar(255) PRIMARY KEY not null,
    shape_path JSON
);`;

let createServices = `create table if not exists services(
    service_id varchar(255) PRIMARY KEY not null,
    mon BOOLEAN,
    tue BOOLEAN,
    wed BOOLEAN,
    thu BOOLEAN,
    fri BOOLEAN,
    sat BOOLEAN,
    sun BOOLEAN,
    date_start DATE,
    date_end DATE,
    date_exceptions JSON
);`;

// Initiate connection and create tables (if they don't already exist)

let con = mysql.createConnection(connectionObject);
con.connect();

con.query(createServices, function (err, results, fields) {
    if (err) {
        console.log(err.message);
    } else {
        console.log("execute results: ");
        console.log(results);
}});

con.query(createRoutes, function (err, results, fields) {
    if (err) {
        console.log(err.message);
    } else {
        console.log("execute results: ");
        console.log(results);
}});

con.query(createShapes, function (err, results, fields) {
    if (err) {
        console.log(err.message);
    } else {
        console.log("execute results: ");
        console.log(results);
}});

con.query(createScheduleTrip, function (err, results, fields) {
    if (err) {
        console.log(err.message);
    } else {
        console.log("execute results: ");
        console.log(results);
}});

con.query("SHOW TABLES;", function (err, results, fields) {
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



/**
 * Helper function to check any warnings generated during execution of a query
 * 
 * Must be used immediately after warnings are raised
 *  */ 
function checkWarnings() {
    con.query("SHOW WARNINGS;", function (err, results, fields) {
        if (err) {
            console.log(err.message);
        } else {
            console.log("warnings: ");
            console.log(results);
    }});
}