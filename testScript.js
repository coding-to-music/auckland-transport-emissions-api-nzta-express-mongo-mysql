//IMPORTS
const config = require('./config.js')

const fetch = require('./node_modules/node-fetch');
const SQLManagement = require("./SQLManagment.js");
const SQLPool = new SQLManagement();

const MongoClient = require('./node_modules/mongodb').MongoClient;
const client = new MongoClient(config.mongodb.uri, { useUnifiedTopology: true });

let urls = ["https://api.at.govt.nz/v2/gtfs/trips", "https://api.at.govt.nz/v2/gtfs/agency", "https://api.at.govt.nz/v2/gtfs/calendar", "https://api.at.govt.nz/v2/gtfs/routes", "https://api.at.govt.nz/v2/gtfs/stops", "https://api.at.govt.nz/v2/gtfs/versions"]

exec();

async function exec() {
    client.connect(async (err, db) => {
      if (err) throw err;
      for (let url of urls) {
        let collectionName = url.split("/")[url.split("/").length - 1];
        let indexName = collectionName[collectionName.length - 1] === "s" ? `${collectionName.substring(0, collectionName.length - 1)}_id` : `${collectionName}_id`;
        // await db.db("ate_model").collection(collectionName).createIndex({indexName : 1}, {unique:true});
        // callTripUpdates(url).then(data=> {
        //   postToMongo(db, data.response, url);
        // })
      }
    });
}

async function postToMongo(db, data, url) {
  console.log(data);
      let collectionName = url.split("/")[url.split("/").length - 1];
      await db.db("ate_model").collection(collectionName).drop((err, results) => {
        if (err) throw err;
        console.log(results);
      });
      await db.db("ate_model")
        .collection(collectionName)
        .insertMany(data, function(err, results) {
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