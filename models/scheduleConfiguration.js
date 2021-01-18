//IMPORTS
const config = require('../config.js')

const fetch = require('../node_modules/node-fetch');

const MongoClient = require('../node_modules/mongodb').MongoClient;
const client = new MongoClient(config.testing.uri, { useUnifiedTopology: true });

const fs = require('fs');

let dbString = "ate_model_2";

let urls = ["https://api.at.govt.nz/v2/gtfs/agency", 
            "https://api.at.govt.nz/v2/gtfs/calendar",
            "https://api.at.govt.nz/v2/gtfs/routes",
            "https://api.at.govt.nz/v2/gtfs/stops",
            "https://api.at.govt.nz/v2/gtfs/trips"];

exec();

async function exec() {
    client.connect(async (err, db) => {
      if (err) throw err;
      let startObj;
      // Get the versions to label the data we pull
      callTripUpdates("https://api.at.govt.nz/v2/gtfs/versions").then((data) => {
        startObj = data.response.reduce((res, obj) => {
          return (obj.startdate < res.startdate) ? obj : res;
        })
        startObj = startObj.startdate.split("T")[0];
        saveDataLocally(data, "versions", startObj);
        postToMongo(db, data.response, "versions");
      })

      //Build the other collections
      for (let url of urls) {
        let collectionName = url.split("/")[url.split("/").length - 1];
        let indexName = collectionName[collectionName.length - 1] === "s" ? `${collectionName.substring(0, collectionName.length - 1)}_id` : `${collectionName}_id`;
        await db.db(dbString).collection(collectionName).createIndex({ indexName: 1 }, { unique: true });
        callTripUpdates(url).then(data => {
          saveDataLocally(data.response, collectionName, startObj);
          postToMongo(db, data.response, collectionName);
        })
      }

      //Build the exceptions collection
      callTripUpdates("https://api.at.govt.nz/v2/gtfs/calendarDate").then((data) => {
        saveDataLocally(data, "calendarDate", startObj);
        postToMongo(db, data.response, "calendarDate");
      })
      await db.db(dbString).collection("calendarDate").createIndex({ "service_id": 1 }).then();
    });
}

async function saveDataLocally(data, collectionName, version) {
  data = JSON.stringify(data);
  if (!fs.existsSync("./dataBackups/" + version)) {
    fs.mkdirSync("./dataBackups/" + version + "/");
  }
  //Write to file in data folder for backups
  try {
    console.log("Attempting to overwrite existing file");
    fs.writeFileSync("./dataBackups/" + version + "/" + collectionName + ".json", data);
  } catch (err) {
    console.log("File does not exist ¯\\_(ツ)_/¯, creating...");
    fs.appendFileSync("./dataBackups/" + version + "/" + collectionName + ".json", data);
  }
  console.log(collectionName + " written to backups.");
}

async function postToMongo(db, data, collectionName) {
  console.log(collectionName + " received, posting to MongoDB collection " + collectionName + " at " + config.mongodb.uri);

  //Test for drop?
  await db.db(dbString).collection(collectionName).drop((err, results) => {
    console.log(err, results);
  });
  //Insert new data
  //Beware of overlapping unique fields
  await db.db(dbString)
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