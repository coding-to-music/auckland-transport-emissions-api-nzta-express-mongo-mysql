//IMPORTS
const config = require('../config.js')

const fetch = require('../node_modules/node-fetch');

const MongoClient = require('../node_modules/mongodb').MongoClient;
const client = new MongoClient(config.mongodb.uri, { useUnifiedTopology: true });

const fs = require('fs');

let urls = ["https://api.at.govt.nz/v2/gtfs/agency", 
            "https://api.at.govt.nz/v2/gtfs/calendar",
            "https://api.at.govt.nz/v2/gtfs/routes",
            "https://api.at.govt.nz/v2/gtfs/stops",
            "https://api.at.govt.nz/v2/gtfs/trips",
            "https://api.at.govt.nz/v2/gtfs/versions"];

exec();

async function exec() {
    client.connect(async (err, db) => {
      if (err) throw err;

      //Build the exceptions collection
      callTripUpdates("https://api.at.govt.nz/v2/gtfs/calendarDate").then((data) => {
        saveDataLocally(data, "calendarDate");
        postToMongo(db, data.response, "https://api.at.govt.nz/v2/gtfs/calendarDate");
      })
      await db.db("ate_model").collection("calendarDate").createIndex({"service_id" : 1});    

      //Build the other collections
      for (let url of urls) {
        let collectionName = url.split("/")[url.split("/").length - 1];
        let indexName = collectionName[collectionName.length - 1] === "s" ? `${collectionName.substring(0, collectionName.length - 1)}_id` : `${collectionName}_id`;
        await db.db("ate_model").collection(collectionName).createIndex({indexName : 1}, {unique:true});
        callTripUpdates(url).then(data=> {
          saveDataLocally(data.response, collectionName);
          postToMongo(db, data.response, collectionName);
        })
      }
      //Close connection to Mongo
      console.log("All data retrieved and posted to " + config.mongodb.uri + "! Goodbye :)");
      db.close();
    });
}

async function saveDataLocally(data, collectionName) {
  data = JSON.stringify(data);
  //Write to file in data folder for backups
  fs.writeFileSync("./dataBackups/" + collectionName + "-" + new Date() + ".json", data, {flag: "+a"});
  console.log(collectionName + " written to backups.")
}

async function postToMongo(db, data, collectionName) {
  console.log(collectionName + " received, posting to MongoDB collection " + collectionName + " at " + config.mongodb.uri);

  //Test for drop?
  await db.db("ate_model").collection(collectionName).drop((err, results) => {
    console.log(err, results);
  });
  //Insert new data
  //Beware of overlapping unique fields
  await db.db("ate_model")
    .collection(collectionName)
    .insertMany(data, function (err, results) {
      if (err) throw err;
      console.log(collectionName, results);
    });
}

async function callTripUpdates(url) {
  const response = await fetch(url, {
    method: 'GET', // *GET, POST, PUT, DELETE, etc.
    mode: 'cors', // no-cors, *cors, same-origin
    cache: 'no-cache', // *default, no-cache, reload, force-cache, only-if-cached
    credentials: 'same-origin', // include, *same-origin, omit
    headers: {
      'Content-Type': 'application/json',
      "Ocp-Apim-Subscription-Key": "b9f2e4f0b5e140b79a698c0bb9298a7f"
      // 'Content-Type': 'application/x-www-form-urlencoded',
    },
    redirect: 'follow', // manual, *follow, error
    referrerPolicy: 'no-referrer', // no-referrer, *no-referrer-when-downgrade, origin, origin-when-cross-origin, same-origin, strict-origin, strict-origin-when-cross-origin, unsafe-url
    //body: JSON.stringify(data) // body data type must match "Content-Type" header
  });
  return response.json();
}