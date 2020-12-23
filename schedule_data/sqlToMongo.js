/**
 * Script to output from MySQL database to Mongo
 */

//IMPORTS
const config = require('../config.js');

const mysql = require("mysql");
const fetch = require('../node_modules/node-fetch');
const MongoClient = require('../node_modules/mongodb').MongoClient;
const client = new MongoClient(config.mongodb.uri, { useUnifiedTopology: true });

let connectionObject = {
  host: "localhost",
  user: "root",
  password: " ",
  database: "localate"
}
var con = mysql.createConnection(connectionObject);


client.connect(async (err, db) => {
  // try {
    if (err) throw err;
    // var dbo = db.db("ate_model")
    // await dbo.createCollection('schedule_trips');

    con.connect();

    con.query("SELECT * FROM schedule_trips;", function (err, results, fields) {
      if (err) throw err;

      console.log("execute results: ");
      console.log(results[0]);
      postToMongo(results, db);
      
    });

    con.end(function (err) {
      if (err) {
          return console.log(err.message);
    }});

  }
)


async function postToMongo(jsonData, db) {

  let dbo = db.db("ate_model");
  let bulk = dbo.collection("schedule_trips").initializeUnorderedBulkOp();

  for (let each of jsonData) {
    //Update distances
    bulk.find({
      "trip_id": each.trip_id,
      "distance": null
    }).updateOne({
      "$set" : {"distance" : each.distance}
    });
    // Update scheduled times
    bulk.find({
      "trip_id": each.trip_id,
      "schedule_time": null
    }).updateOne({
      "$set" : {
        "schedule_end_stop_id" : each.schedule_end_stop_id,
        "schedule_number_stops" : each.schedule_number_stops,
        "schedule_start_stop_id" : each.schedule_start_stop_id,
        "schedule_time" : each.schedule_time
      }
    });
    // Insert missing trips
    bulk.find({
      "trip_id": each.trip_id,
    }).upsert().updateOne({
      "$setOnInsert" : each
    });
  }

  //Call execute
  bulk.execute(async function (err, updateResult) {
    if (err) throw err;
    console.log(err, updateResult);
    const checkQuery = await dbo.collection("schedule_trips").findOne();
    console.log(checkQuery);
    await client.close();
  });
}