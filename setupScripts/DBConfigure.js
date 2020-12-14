//Config file for db
//Add any setup SQL instructions here, including db creation table creation, connection info

exports.onlineConnection = {
    host: "johnny.heliohost.org",
    user: "chriswil_1",
    password: "w5eiDgh@39GNmtA",
    database: "chriswil_ate_model"
}

exports.localConnectionChris = {
  host: "localhost",
  port: "3306",
  user: "root",
  password: "2020"
}

let dbQueries = [];
dbQueries.push("create database chriswil_ate_model;");

let tableQueries = [];
tableQueries.push("use chriswil_ate_model;");
tableQueries.push("SELECT DATABASE();");

let createrealtime_raw = `create table if not exists realtime_raw(
    UUID varchar(255) PRIMARY KEY not null,
    arrival BOOLEAN,
    start_id varchar(255),
    stop_time int,
    stop_id varchar(255),
    stop_sequence int,
    direction_id int,
    route_id varchar(255),
    date varchar(255),
    start_time varchar(255),
    trip_id varchar(255),
    vehicle_id varchar(255)
  );`;

tableQueries.push(createrealtime_raw);

exports.dbQueries = dbQueries;
exports.tableQueries = tableQueries;

