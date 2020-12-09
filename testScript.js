let sqlManager = require('./SQLManagment.js');
let sqlInstance = new sqlManager();
let mysql = require("mysql");

let connectionObject = {
    connectionLimit: 40,
    host: "johnny.heliohost.org",
    user: "chriswil_1",
    password: "w5eiDgh@39GNmtA",
    database: "chriswil_ate_model"
}

test();

async function test() {
  let pool = mysql.createConnection(connectionObject);
//   pool.connect();

//   con.query("DESCRIBE info;", function(err, results, fields) {
    // if (err) throw err;
    // console.log(results);
//   })
 
  pool.query("SELECT * FROM info ORDER BY iid DESC LIMIT 1;", function(err, results, fields) {
    if (err) throw err;
    console.log(results);
  })

//   con.end();
}