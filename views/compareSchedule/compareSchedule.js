//IMPORTS
//CONFIG FILE
const config = require('../config.js');
//DB IMPORTS
const MongoClient = require('../node_modules/mongodb').MongoClient;
const client = new MongoClient(config.mongodb.uri, { useUnifiedTopology: true });
let dbo;

client.connect(async (err, db) => {
  dbo = await db.db("ate_model");
  init();
})

function init() {
  let rawToFinalButton = document.createElement("BUTTON");
  let finalToRawButton = document.createElement("BUTTON");
  // let rawToFinalButton = document.createElement("BUTTON");

  rawToFinalButton.innerHTML = "Raw to Final Pipeline";
  finalToRawButton.innerHTML = "Final to Raw Pipeline";

  rawToFinalButton.onclick = compareFinalToRaw();
  finalToRawButton.onclick = compareRawToFinal();
}

/**
 * Uses: raw_w_routes
 * Compares: final_trip_UUID_set
 */
async function compareRawToFinal() {
  console.log("Starting raw to final comparison pipeline");

    let collection = dbo.collection("final_trip_UUID_set");
    await collection.createIndex({ "trip_id" : 1 }, { unique: true });
    await collection.createIndex({ "service_days.start_date" : 1 });
    await dbo.collection("raw_w_routes").createIndex({ "trip_id" : 1 })
    await dbo.collection("raw_w_routes").createIndex({ "date" : 1 }).then(() => {console.log("Indexes created")});
    
    let options = {
      allowDiskUse: 1
    };

    let dates = ["20201222"]; 
    // formDateArray();

    let realtime_trips = [];
    for (let date of dates) {
      // let scheduled_trips = await collection.find({}, {}).toArray();
      realtime_trips[date] = await dbo.collection("raw_w_routes").find({"date" : date}, {}).toArray();
      console.log(realtime_trips);
    }    

    let results = {
      noEntry: 0,
      Entry: 0
    };
    let inArray = new Set();
    for (let date in realtime_trips) {
      for (let trip of realtime_trips[date]) {
        inArray.add(trip.trip_id);
      }
    }

    inArray = Array.from(inArray);

    let query = {
      "trip_id" : {"$in" : inArray}
    }

    console.log(query);

    collection.find(query, {}).toArray(function(err, docs) {
      if (err) throw err;
      console.log(docs);
      for (let doc of docs) {
        if (doc.length === 0) results.noEntry = results.noEntry + 1;
        else results.Entry = results.Entry + 1;
      }
      console.log(results);
    });
}

/**
 * Uses: final_trip_UUID_set
 * Compares: raw_w_routes
 */
async function compareFinalToRaw() {
    let collection = dbo.collection("final_trip_UUID_set");
    await collection.createIndex({ "trip_id" : 1 }, { unique: true });
    await collection.createIndex({ "service_days.start_date" : 1 });
    await dbo.collection("raw_w_routes").createIndex({ "trip_id" : 1 })
    await dbo.collection("raw_w_routes").createIndex({ "date" : 1 }).then(() => {console.log("Indexes created")});
    
    let options = {
      allowDiskUse: 1
    };

    let dates = ["20201222"]; 
    // formDateArray();

    let realtime_trips = [];
    for (let date of dates) {
      // let scheduled_trips = await collection.find({}, {}).toArray();
      let regex = new RegExp("^" + date);

      let q = {
        "$or" : [
          {"UUID.0" : {"$regex" : regex}},
          {"UUID.1" : {"$regex" : "/^" + date + "/"}},
          {"UUID.2" : {"$regex" : "/^" + date + "/"}},
          // {"UUID.3" : {"$regex" : "/^" + date + "/"}},
        ]
      }

      realtime_trips[date] = await collection.find(q, {}).toArray();
      console.log(realtime_trips);
    }    

    let results = {
      noEntry: 0,
      Entry: 0
    };
    let inArray = new Set();
    for (let date in realtime_trips) {
      for (let trip of realtime_trips[date]) {
        for (let journey of trip.UUID) {
          if (journey.startsWith(date)) {
            inArray.add(journey);
          }
        }
      }
    }

    inArray = Array.from(inArray);

    let pipeline =
      {
          "UUID" : {"$in" : inArray}
      }

    console.log(pipeline);

    dbo.collection("raw_w_routes").find(pipeline, {}).toArray(function(err, docs) {
      if (err) throw err;
      console.log(docs);
      for (let doc of docs) {
        if (doc.length === 0) results.noEntry = results.noEntry + 1;
        else results.Entry = results.Entry + 1;
      }
      console.log(results);
    });
}