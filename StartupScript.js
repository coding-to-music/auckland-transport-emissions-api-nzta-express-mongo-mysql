let sqlManager = require('./SQLManagment.js');
let sqlInstance = new sqlManager();
let mysql = require("mysql");

let connectionObject = {
    host: "johnny.heliohost.org",
    user: "chriswil_1",
    password: "w5eiDgh@39GNmtA",
    database: "chriswil_ate_model"
}

let createDB = "create database ate;";

let createSchema = "create schema processing;";

let createRealtime = `create table if not exists realtime_raw(
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

let createScehdules = `create table if not exists schedules_raw(
    UUID primary key varchar(255)not null,
    id int auto_increment,
    start_time int,

  )`;

setupDB();
// sqlInstance.execute("GRANT ALL PRIVILEGES ON chriswil_ate_model.* TO chriswil_1@johnny.heliohost.org");
// sqlInstance.execute(createDB);
// sqlInstance.execute(createSchema);
async function setupDB() {
  // sqlInstance.create(connectionObject);
  // var t = sqlInstance.execute("DESCRIBE realtime_raw;");
  // sqlInstance.closeConnection();
  // sqlInstance.create(connectionObject);
  // var x = sqlInstance.execute(createRealtime);
  // sqlInstance.closeConnection();
  con = mysql.createConnection(connectionObject);
  con.connect();
  con.query("DESCRIBE realtime_raw;", function(err, results, fields) {
    if (err) console.log(err);
    else console.log(results);
  })
  var y = sqlInstance.execute("SHOW TABLES;");
  // console.log(t, x, y);
  sqlInstance.closeConnection();
}
