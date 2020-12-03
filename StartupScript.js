let sqlManager = require('./SQLManagment.js');
let sqlInstance = new sqlManager();
let mysql = require("mysql");

let connectionObject = {
    host: "johnny.heliohost.org",
    user: "chriswil_c",
    password: "7qQhcZT!4L6Q.N$",
    database: "chriswil_ate_model"
}

let createDB = "create database ate";

let createSchema = "create schema processing";

let createRealtime = `create table if not exists realtime_raw(
    UUID varchar(255),
    stop_time_arrival JSON,
    stop_id varchar(255),
    stop_sequence int,
    direction_id int,
    route_id varchar(255),
    date varchar(255),
    start_time varchar(255),
    trip_id varchar(255),
    vehicle_id varchar(255),
    PRIMARY KEY (UUID)
  )`;

let createScehdules = `create table if not exists schedules_raw(
    UUID primary key varchar(255)not null,
    id int auto_increment,
    start_time int,

  )`;

sqlInstance.createConnection(connectionObject);
sqlInstance.execute("USE chriswil_ate_model");
sqlInstance.execute("GRANT ALL PRIVILEGES ON chriswil_ate_model.* TO chriswil_c@johnny.heliohost.org");
sqlInstance.execute(createDB);
sqlInstance.execute(createSchema);
sqlInstance.execute(createRealtime);

