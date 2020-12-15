let sqlManager = require('./SQLManagment.js');
let sqlInstance = new sqlManager();
let mysql = require("mysql");

let connectionObject = {
    connectionLimit: 10000,
    host: "johnny.heliohost.org",
    user: "chriswil_1",
    password: "w5eiDgh@39GNmtA",
    database: "chriswil_ate_model"
}

test();

async function test() {
  let pool = mysql.createPool(connectionObject);
  //   pool.connect();

  // pool.query("set profiling=1;", function (err, results) {
  //   if (err) throw err;
  //   console.log(results);
  // });

  // pool.query("SELECT * FROM realtime_raw;", function (err, results) {
  //   if (err) throw err;
  //   console.log(results);
  // });

  // pool.query("show profiles;", function (err, results) {
  //   if (err) throw err;
  //   console.log(results);
  // });


//   con.query("DESCRIBE info;", function(err, results, fields) {
    // if (err) throw err;
    // console.log(results);
//   })
  // pool.setMaxListeners(0);
  let p = pool.query("show status like 'Conn%';", function(err, results, fields) {
    if (err) throw err;
    console.log(results);
  })
  let p1 = pool.query("show global variables like '%connections%';", function(err, results, fields) {
    if (err) throw err;
    console.log(results);
  })
  let p2 = pool.query("show status like '%connected%';", function(err, results, fields) {
    if (err) throw err;
    console.log(results);
  })
  let p3 = pool.query("SELECT * FROM realtime_raw;", function(err, results, fields) {
    if (err) throw err;
    console.log(results);
  })
  console.log(p);
  console.log(p1);
  console.log(p2);
  // let SQLManagment = require("./SQLManagment");
  // let p = new SQLManagment();
  // let p =  pool.getConnection(function (err, con) {
  //     if (err) throw err;
  //     console.log(con);
  //   })
  // for (let i = 0; i < 10; i++) {
  //   pool.executeQuery("INSERT realtime_raw (stop_time) VALUES ?", [[[1]]], function (err, data) {
  //     // if (err) throw err;
  //     console.log(data);
  //     // res(data);
  //   })
  // }
//   con.end();
}