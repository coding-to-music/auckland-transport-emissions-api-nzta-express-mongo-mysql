/**
 * Script to output MySQL database to a JSON for uploading to Mongo
 */

//IMPORTS
let sqlManager = require('../SQLManagment.js');
let mysql = require("mysql");

let connectionObject = {
  host: "localhost",
  user: "root",
  password: " ",
  database: "localate"
}

