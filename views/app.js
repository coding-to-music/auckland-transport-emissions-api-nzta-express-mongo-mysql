//CONFIG FILE
const config = require('../config.js');

//EXPRESS IMPORTS
const express = require('../node_modules/express')
const app = express();
const bodyParser = require("../node_modules/body-parser");
const router = express.Router();

const path = require('../node_modules/path');
const csv = require('../node_modules/csv-parser');

const fs = require('fs');
let FLEET_LIST = {};
//Create the fleet list
fs.createReadStream('./public/data/Auckland Bus Operator Fleetlist 2020.xlsx - Urban Passenger Vehicle List.csv')
  .pipe(csv())
  .on('data', (row) => {
    if (row["Operator Code"] === "GB" || row["Operator Code"] === "RT") {
      FLEET_LIST[row["Rapid Vehicle Number"]] = row;
    }
  })
  .on('end', () => {
    console.log('CSV file successfully processed');
  });

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

app.get('/', async (req, res) => {
  //render page
  console.log("Yeow, we running bruh dew.");
  res.sendFile(path.join(__dirname + "/index/index.html"));
})

app.get('/mongoInterface', async (req, res) => {
  //render page
  console.log("Yeow, we running bruh dew.");
  res.sendFile(path.join(__dirname + "/mongoInterface/mongoInterface.html"));
})

client.connect(async (err, db) => {
  //Set db object
  let dbo = db.db("ate_model");
  let collection = dbo.collection("realtime_raw");
  /*** Helpers ***/
  /**
  * Get the schedule once
  */
  async function getSchedule(date) {
    console.log(config.SCHEDULE);
    if (config.SCHEDULE === undefined) {
      console.log("LOADING SCHEDULE");
      let regex = new RegExp("^" + date);
      let q = {UUID: {"$regex" : regex}};
      config.SCHEDULE = await dbo.collection(config.FINAL_SCHEDULE_COL).find({}, {}).toArray()
    }
  }

  /**
   * Return the UUIDS and trip_ids for a day
   * @param {Date} date 
   */
  async function extractIDSFromSchedule(date) {
    await getSchedule(date);
    let scheduled_trips = config.SCHEDULE;
      let UUIDArray = [];
      let tripArray = [];
        for (let trip of scheduled_trips) {
          tripArray.push(trip.trip_id);
          for (let journey of trip.UUID) {
            if (journey.startsWith(date)) {
              UUIDArray.push(journey);
            }
          }
        }
  
    return {
      UUIDs : UUIDArray,
      trip_ids : tripArray
    }
  }

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

  // Auto generate valid trips from realtime_raw
  // Append route information, used to filter to provider
  // Creates collection until todays date
  // Overwrites: raw_w_routes
  app.get('/generate_raw_w_routes', async (req, res) => {
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

    await trips.aggregate(lookup, options).toArray(async (err, docs) => {
      if (err) throw err;
      await dbo.collection("raw_w_routes").createIndex({ "date" : 1 }).then(() => {console.log("Indexes created")});
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

      await dbo.collection("final_trip_UUID_set").insertMany(modDocs, async (err, results) => {
        if (err) throw err;
        console.log(results);
        //Create indexes for  this collection
        await dbo.collection("final_trip_UUID_set").createIndex({ "trip_id" : 1 }, { unique: true });  
        await dbo.collection("final_trip_UUID_set").createIndex({ "service_days.start_date" : 1 });
      });
    })
  })
  
  //Compare the schedule to the raw_w_routes
  //Uses: raw_w_routes, schedule_trips
  app.get("/compare_scheduled_to_observed", async (req, res) => {
    console.log("Starting raw to final comparison pipeline");

    let collection = dbo.collection("schedule_trips");
    await collection.createIndex({ "trip_id": 1 }, { unique: true });
    await collection.createIndex({ "service_days.start_date": 1 });
    await dbo.collection("raw_w_routes").createIndex({ "trip_id": 1 })
    await dbo.collection("raw_w_routes").createIndex({ "date": 1 }).then(() => { console.log("Indexes created") });

    let options = {
      allowDiskUse: 1
    };

    let dates = ["20201223", "20201224", "20201225", "20201226", "20201227", "20201228", "20201229"];
    // formDateArray();

    let realtime_trips = [];
    let daysMissingInformation = {};
    for (let date of dates) {
      // let scheduled_trips = await collection.find({}, {}).toArray();
      realtime_trips[date] = await dbo.collection("raw_w_routes").find({ "date": date }, {}).toArray();
      console.log("days trips in realtime")
      console.log(realtime_trips);

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

      let regex = new RegExp("^" + date);
      let pipeline = [
        {
          "$match": {
            "$and": [
              { "trip_id": { "$nin": inArray } },
              //TODO: see if i need to uncomment
              // {
              //   "$or": [
              //     { "UUID.0": { "$regex": regex } },
              //     { "UUID.1": { "$regex": regex } },
              //     { "UUID.2": { "$regex": regex } },
              //     // {"UUID.3" : {"$regex" : "/^" + date + "/"}},
              //   ]
              // }
            ]
          }
        },
        {
          "$project": {
            "_id": 0,
            "UUID" : 1,
            "trip_id": 1,
            "service_id": 1,
            "route_id": 1
          }
        }
      ]

      await collection.aggregate(pipeline, {}).toArray(function (err, docs) {
        if (err) throw err;
        console.log("not in trip id array on same day " + date)
        console.log(docs);
        daysMissingInformation[date] = {
          total: inArray.length,
          missingInfo: 0,
          proportion: 0
        };
        for (let d of docs) {
          for (let i of d.UUID) {
            if (i < "20201230") {
                daysMissingInformation[date].missingInfo = daysMissingInformation[date].missingInfo + 1;
              }
            }
          }
        console.log(daysMissingInformation);
      });
    }
  })

  app.get("/compare_scheduled_to_observed_2", async (req, res) => {
    console.log("Starting raw to final comparison pipeline");

    await dbo.collection("raw_w_routes").createIndex({ "trip_id": 1 });
    await dbo.collection("final_trip_UUID_set_2").createIndex({ "UUID": 1 });

    let dates = formDateArray();

    let index = 0;
    while (index < dates.length) {
      let date = dates[index];
      console.log("PROCESSING " + date + " DATA");
      let results = {
        noEntry: 0,
        Entry: 0
      };
      
      let IDS = await extractIDSFromSchedule(date);
      let UUIDArray = IDS.UUIDs, tripArray = IDS.trip_ids;
      console.log("Number of journeys in schedule for " + date + ":", UUIDArray.length)
      console.log("Number of trips in schedule for " + date + ":", tripArray.length)

    //Find all the trips from the schedule trip_id
      //in the realtimedata
      let pipeline = [
        {
          "$match": {
            "$and" :[
              {"date" : date},
              {"UUID": { "$in": UUIDArray }},
            ]
          }
        }
      ]

      await dbo.collection("raw_w_routes").aggregate(pipeline, {}).toArray().then(async function(docs) {
        // console.log("Number of realtime trips w/ matching trip_id's: " + docs.length);
        console.log("Realtime trips by UUID: ", docs);
        for (let doc of docs) {
          if (doc.length === 0) results.noEntry = results.noEntry + 1;
          else results.Entry = results.Entry + 1;
        }
        console.log("Number of entries by UUIDS " + date + ": ", results);
      });

      let pipeline2 = [
        {
          "$match": {
            "date": date,
            "UUID": { "$nin": UUIDArray },
          }
        },
        {
          "$match" : {
            "raw_w_route_id.0.agency_id" : "GBT"
          }
        }
      ]

      await dbo.collection("raw_w_routes").aggregate(pipeline2, {}).toArray().then(function(docs) {
        console.log("Realtime trips by UUID for GBT: ", docs);
        index = index + 1;
      })

      let pipeline3 = [
        {
          "$match": {
            "date": date,
            "UUID": { "$nin": UUIDArray },
          }
        },
        {
          "$match" : {
            "raw_w_route_id.0.agency_id" : "RTH"
          }
        }
      ]

      await dbo.collection("raw_w_routes").aggregate(pipeline3, {}).toArray().then(function(docs) {
        console.log("Realtime trips by UUID for RTH: ", docs);
      })

      let pipeline4 = [
        {
          "$match": {
            "date": date,
            "UUID": { "$nin": UUIDArray },
          }
        },
        {
          "$match" : {
            "raw_w_route_id.0.agency_id" : "HE"
          }
        }
      ]

      await dbo.collection("raw_w_routes").aggregate(pipeline4, {}).toArray().then(function(docs) {
        console.log("Realtime trips by UUID for HE: ", docs);
      })
    }
    db.close();
  })

  // Want to compare the trip ids in the observed to the schedule, see if these resolve our issues
  app.get("/compare_observed_to_schedule_2", async (req, res) => {
    console.log("Starting raw to final comparison pipeline");

    let dates = formDateArray();

    let realtime_trips = [];
    let daysMissingInformation = {};
    for (let date of dates) {
      realtime_trips[date] = await dbo.collection("raw_w_routes").find({ "date": date }, {}).toArray();
      console.log(date + " trips in realtime")
      console.log(realtime_trips);

      let results = {
        noEntry: 0,
        Entry: 0
      };
      let inArray = [];
      // for (let date in realtime_trips) {
        for (let trip of realtime_trips[date]) {
          inArray.push(trip.UUID);
        }
      // }
      console.log(inArray.length);

      let regex = new RegExp("^" + date);

      let pipeline = [
        {
          "$match": {
            "$and" : [
              {UUID: { "$nin": inArray }},
              {UUID: { "$regex": regex }}
            ]
              
          }
        },
        // {
        //   "$project": {
        //     "_id": 0,
        //     "UUID" : 1,
        //     "trip_id": 1,
        //     "service_id": 1,
        //     "route_id": 1
        //   }
        // }
      ]

      await dbo.collection("final_trip_UUID_set_2").aggregate(pipeline, {}).toArray(function (err, docs) {
        if (err) throw err;
        console.log("not in trip id array on same day " + date)
        console.log(docs);
      });
    }
  })

  //Join calendar to schedule
  //Send the generated info back to the requester
  app.get("/generate_schedule_2", async (req, res) => {
    let response = [];

    //Get info from calendar    
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
        "$out": "filtered_trips_2"
      }
    ]
    
    let c2 = dbo.collection("filtered_trips_2");

    await c2.createIndex({ "service_id": 1 });
    await dbo.collection("calendar").createIndex({"service_id" : 1});

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
        "$out": "filtered_trips_2"
      }
    ]

    let options = {
      allowDiskUse: 1
    };

    await dbo.collection("trips").aggregate(pipe, options).toArray(async (err, docs) => {
      if (err) throw err;
      console.log("Added filtered route information to schedule_trips, written to filtered_trips");
      await dbo.collection("filtered_trips_2").aggregate(pipe2, options).toArray(async (err, docs) => {
        if (err) throw err;
        console.log("Added filtered calendar information to filtered_trips, written to filtered_trips");
        
        let c3 = dbo.collection("filtered_trips_2");

        let offsets = {
          "tuesday": 0,
          "wednesday": 1,
          "thursday": 2,
          "friday": 3,
          "saturday": 4,
          "sunday": 5,
          "monday": 6,
        }

        let excss = await dbo.collection("calendarDate").aggregate([
          {
            "$match" : {
              "date" : {"$gte": "2020-12-22T00:00:00.000Z","$lte": "2021-01-23T00:00:00.000Z" },
            }
          },
          {
          "$group" : {
            "_id" : "$service_id",
            "exceptionDates" : {"$push" : "$date"}
          }
        }], {}).toArray();


        let service_ids = [];
        for (let e of excss) {
          service_ids.push(e._id);
        }
        console.log("Service ids derived" , service_ids);
        console.log("calendarExceptions" , excss);

        await c3.find({
          // "service_id": { "$in": service_ids },
          "service_days.start_date": { "$gte": "2020-12-22T00:00:00.000Z"} , 
          "service_days.end_date" : { "$lte": "2021-01-23T00:00:00.000Z" },
        }, {}).toArray(async (err, docs) => {
          if (err) throw err;
          //Check every journey entry
          let modDocs = [];
          for (let entry of docs) {
            //Filter exceptions to match current journey service id
            let exceptions = [];
            for (e of excss) {
              if (e._id === entry.service_id) {
                exceptions.push(e);
              }
            }

            entry.UUID = [];
            let service_days = entry.service_days[0];
            //Get service days
            if (service_days != undefined && service_days != null) {
              for (let d of Object.keys(service_days)) {
                //d is the day of the service from the calendar
                //if true, service is meant to run unless exception is entered
                if (service_days[d] === 1) {
                  //Increment the date by a week at a time to make the UUIDs for this range of trips
                  for (let dt = new Date(2020, 11, (22 + offsets[d])); dt < new Date(2021, 0, 21); dt.setDate(dt.getDate() + 7)) {            
                    //break on exception equal to this date, dt
                    let excepted = false;
                    for (let exception of exceptions) {
                      for (let ed of exception.exceptionDates) {
                        let toCheck = ed.split("T");
                        toCheck = toCheck[0].split("-");
                        if (toCheck[0] + "" + toCheck[1] + toCheck[2] === fixDate(dt)) {
                          excepted = true;
                        }
                      }
                    }
                    //Yay we got here, add the UUID
                    if (!excepted) {
                      entry.UUID.push(fixDate(dt) + "-" + entry.trip_id);
                    }
                  }
                }
              }
            }
            modDocs.push(entry);
          }

          console.log(modDocs);

          await dbo.collection("final_trip_UUID_set_2").insertMany(modDocs, async (err, results) => {
            if (err) throw err;
            console.log(results);
            //Create indexes for  this collection
            await dbo.collection("final_trip_UUID_set_2").createIndex({ "trip_id": 1 }, { unique: true });
            await dbo.collection("final_trip_UUID_set_2").createIndex({ "service_days.start_date": 1 });
            console.log("Finished! :D");
            res.send(modDocs);
          });
        })
      })
    })
  })

  app.get("/get_raw_data", async (req, res) => {
    let returnData = [];
    let dates = formDateArray();
    for (let date of dates) {
      let data = await dbo.collection("realtime_raw").find({"date" : date}).toArray();
      returnData.push(data);
      console.log(data);
      // path.join(__dirname, 'file.json')
      fs.appendFileSync("./dataBackups/realtime_raw_" + date, JSON.stringify(data));
    }
    res.send(returnData);
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
    dates.push(fixDate(d));
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
