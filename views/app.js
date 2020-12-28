//CONFIG FILE
const config = require('../config.js');

//EXPRESS IMPORTS
const express = require('../node_modules/express')
const app = express();
const bodyParser = require("../node_modules/body-parser");
const router = express.Router();

const path = require('path');

//DB IMPORTS
const SQLManagement = require("../SQLManagment.js");
const SQLPool = new SQLManagement();

const MongoClient = require('../node_modules/mongodb').MongoClient;
const client = new MongoClient(config.mongodb.uri, { useUnifiedTopology: true });

app.use(express.static(path.join('public')));
app.use(express.static(path.join('views')));

//Here we are configuring express to use body-parser as middle-ware.
app.use(bodyParser.urlencoded({ extended: true }));
// app.use(bodyParser.json());

client.connect(async (err, db) => {
  let dbo = db.db("ate_model");
  let collection = dbo.collection("realtime_raw");

  app.get('/', async (req, res) => {
    //render page
    console.log("Yeow, we running bruh dew.");

    await SQLPool.getConnection(async (err, result) => {
      if (err) throw err;
      console.log(result);
      await SQLPool.executeQuery("SELECT * FROM schedule_trips;", (err, results) => {
        console.log(results);
      })
    });

    res.sendFile(path.join(__dirname + "/index/index.html"));
  })

  app.get('/distinct', async (req, res) => {
    //render page  
    await collection.distinct("UUID", {}, {}, function (err, results) {
      if (err) throw err;
      console.log(results.length)
      res.send(results);
    })

    await collection.find({}, {}).toArray((err, docs) => {
      if (err) throw err;
      console.log(docs.length)
    })
  })

  //Auto generate valid trips from realtime_raw
  //Overwrites: raw_w_routes
  app.get('/compare', async (req, res) => {
    let dateToCheck = formDateArray();
    let trips = dbo.collection("realtime_raw");

    let lookup = [
      {
        "$match": {
          'date': { "$in": dateToCheck }
        }
      },
      {
        "$lookup": {
          "from": "routes",
          "localField": "route_id",
          "foreignField": "route_id",
          "as": "raw_w_route_id"
        }
      },
      {
        "$match": {
          "raw_w_route_id.0.agency_id": { "$in": ["RTH", "HE", "GBT"] }
        }
      },
      {
        "$out": "raw_w_routes"
      }
    ]

    let options = {
      allowDiskUse: 1
    };

    await trips.aggregate(lookup, options).toArray((err, docs) => {
      if (err) throw err;
      console.log("Collection raw_w_routes has been created!");
    })
  })

  //Test the trips that are currently without stop information
  //Uses: raw_w_routes
  //Overwrites: invalid_trips_buffer
  app.get("/completed_trips", async (req, res) => {
    let dateToCheck = formDateArray();
    console.log(dateToCheck);

    collection = dbo.collection("raw_w_routes");

    //Check no. journeys in range
    await collection.find({ "date": { "$in": dateToCheck } }, {}).toArray((err, docs) => {
      if (err) throw err;
      console.log("Total: ", docs.length);
    })

    //Check no. journeys complete in range
    let query = {
      "UUID": { "$nin": [null] },
      "arrived?": { "$nin": [null] },
      "date": { "$in": dateToCheck },
      "direction_id": { "$nin": [null] },
      "route_id": { "$nin": [null] },
      "start_time": { "$nin": [null] },
      "stop_id": { "$nin": [null] },
      "stop_sequence": { "$nin": [null] },
      "stop_time_arrival": { "$nin": [null] },
      "stop_time_arrival.time": { "$nin": [null] },
      "stop_time_arrival.delay": { "$nin": [null] },
      "stop_time_arrival.uncertainty": { "$nin": [null] },
      "trip_id": { "$nin": [null] },
      "vehicle_id": { "$nin": [null] },
    }
    await collection.find(query, {}).toArray((err, docs) => {
      if (err) throw err;
      console.log("Complete: ", docs.length);
    })

    //Find all entries with no stop informatio
    let pipeline = [
      {
        "$match": {
          "date": { "$in": dateToCheck },
          "$or": [
            { "stop_id": { "$in": [null] } },
            { "stop_sequence": { "$in": [null] } },
            { "stop_time_arrival": { "$in": [null] } },
            { "stop_time_arrival.time": { "$in": [null] } },
            { "stop_time_arrival.delay": { "$in": [null] } },
            { "stop_time_arrival.uncertainty": { "$in": [null] } }
          ]
        }
      }
    ]

    //Find all entries with no stop information then group by the missing stop id,
    //join to routes collection to include provider information and pipe to collection
    //on db
    let pipeline2 = [
      {
        "$match": {
          "date": { "$in": dateToCheck },
          "$or": [
            { "stop_id": { "$in": [null] } },
            { "stop_sequence": { "$in": [null] } },
            { "stop_time_arrival": { "$in": [null] } },
            { "stop_time_arrival.time": { "$in": [null] } },
            { "stop_time_arrival.delay": { "$in": [null] } },
            { "stop_time_arrival.uncertainty": { "$in": [null] } }
          ]
        }
      },
      {
        "$group": {
          "_id": {
            "stop_id": "$stop_id"
          },
          "count": { "$sum": 1 },
          "stop_time_arrival": { "$push": "$stop_time_arrival" },
          "UUID": { "$push": "$UUID" },
          "route_id": { "$push": "$route_id" }
        }
      },
      {
        "$lookup": {
          "from": "routes",
          "localField": "route_id",
          "foreignField": "route_id",
          "as": "routes"
        }
      },
      {
        "$out": "invalid_trips_buffer"
      }
    ]

    let options = {
      allowDiskUse: 1
    };

    await collection.aggregate(pipeline, options).toArray((err, docs) => {
      if (err) throw err;
      console.log("No missing some info: ", docs.length);
    })

    await collection.aggregate(pipeline2, options).toArray((err, docs) => {
      if (err) throw err;
      console.log("No. unique combinations of missing stop info: ", docs.length);
      console.log("The trips with missing information have been stored in invalid_trips_buffer.")
    })
  })

  // Join the calendar to the schedule information to form our UUID
  // Uses: schedule_trips, filtered_trips
  // Overwrites: filtered_trips
  app.get("/generate_schedule_calendar", async (req, res) => {
    let c1 = dbo.collection("schedule_trips");

    //Ensure index is created
    // :( cannot do because route_id is not unique
    // await c1.createIndex({"route_id" : 1}, {unique:true});

    //Add routes
    let pipe = [
      {
        "$lookup": {
          "from": "routes",
          "localField": "route_id",
          "foreignField": "route_id",
          "as": "routes"
        }
      },
      {
        "$match": {
          "routes.0.agency_id": { "$in": ["GBT", "HE", "RTH"] }
        }
      },
      {
        "$out": "filtered_trips"
      }
    ]

    let c2 = dbo.collection("filtered_trips");

    // await c2.createIndex({ "service_id": 1 }, { unique: true });

    //Add calendar days
    let pipe2 = [
      {
        "$lookup": {
          "from": "calendar",
          "localField": "service_id",
          "foreignField": "service_id",
          "as": "service_days"
        }
      },
      {
        "$out": "filtered_trips"
      }
    ]

    let options = {
      allowDiskUse: 1
    };

    c1.aggregate(pipe, options).toArray((err, docs) => {
      if (err) throw err;
      console.log("Added filtered route information to schedule_trips, written to filtered_trips");
      c2.aggregate(pipe2, options).toArray((err, docs) => {
        if (err) throw err;
        console.log("Added filtered calendar information to filtered_trips, written to filtered_trips");
      })
    })
  })

  //Create the final collection of schedule information with a collection of trip ids
  //Uses: filtered_trips
  //Overwrites: final_trip_UUID_set
  app.get("/generate_schedule_UUID", async (req, res) => {
    let c1 = dbo.collection("filtered_trips");

    // await c1.createIndex({ "service_days.start_date": 1 }, { unique: true });

    let query = {"service_days.start_date": { "$gte": "2020-12-22T00:00:00.000Z" } }

    let offsets = {
      "tuesday": 0,
      "wednesday": 1,
      "thursday": 2,
      "friday": 3,
      "saturday": 4,
      "sunday": 5,
      "monday": 6,
    }

    await c1.find(query, {}).toArray(async (err, docs) => {
      if (err) throw err;
      console.log(docs);
      //Check every journey entry
      let modDocs = [];
      for (let entry of docs) {
        entry.UUID = [];
        let service_days = entry.service_days[0];
        //Get service days
        for (let d of Object.keys(service_days)) {
          if (service_days[d] === 1) {
            for (let dt = new Date(2020, 11, (22 + offsets[d])); dt < new Date(2021, 0, 21); dt.setDate(dt.getDate() + 7)) {
              entry.UUID.push(fixDate(dt) + "-" + entry.trip_id);
            }
          }
        }
        modDocs.push(entry);
      }

      console.log(modDocs);

      await dbo.collection("final_trip_UUID_set").insertMany(modDocs, (err, results) => {
        if (err) throw err;
        console.log(results);
        await dbo.collection("final_trip_UUID_set").createIndex({ "trip_id" : 1 }, { unique: true });
      });
    })
  })
  
  app.get("/compare_schduled_to_observed", async (req, res) => {
    let collection = dbo.collection("final_trip_UUID_set");
    await collection.createIndex({ "trip_id" : 1 }, { unique: true });

    let pipeline = [
      {

      }
    ]
    
    let options = {
      allowDiskUse: 1
    };

    collection.aggregate(pipeline, options).toArray((err, docs))
  })
  
  app.post('/postThat', (req, res) => {
    //code to perform particular action.
    //To access POST variable use req.body()methods.
    console.log(req.body);
  })

})

// add router in the Express app.

app.listen(config.port, () => {
  console.log(`Express App running at http://localhost:${config.port}`);
})

/**
 * Format date string as "YYYYMMDD"
 * @param {Date} date 
 */
function fixDate(date) {
  let monthString = date.getMonth() < 9 ? "0" + (date.getMonth() + 1) : (date.getMonth() + 1);
  let dayString = date.getDate() < 10 ? "0" + date.getDate() : date.getDate();
  return date.getFullYear() + "" + monthString + "" + dayString;
}

/**
 * Generate an array of dates between the start of our data and today
 */
function formDateArray() {
  let dates = [];
  for (let d = new Date(2020, 11, 22); d < new Date(); d.setDate(d.getDate() + 1)) {
    dates.push(d.getFullYear() + "" + (d.getMonth() + 1) + "" + d.getDate());
  }
  return dates;
}

function formGetQuery(endpoint, args) {
  let string = config.host;
  string = string.concat(endpoint);
  if (args != undefined) {
    string = string + "?";
  }
  for (let arg in args) {
    if (args[Object.keys(args)[0]] === args[arg]) {
      string = string.concat(arg + "=" + args[arg]);
    } else {
      string = string.concat("&" + arg + "=" + args[arg]);
    }
  }
  return string;
}
