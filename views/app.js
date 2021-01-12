//CONFIG FILE
const config = require('../config.js');

//EXPRESS IMPORTS
const express = require('../node_modules/express')
const app = express();
const bodyParser = require("../node_modules/body-parser");
const router = express.Router();
const http = require('http'); 

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
  async function getSchedule() {
    if (config.SCHEDULE === undefined) {
      console.log("LOADING SCHEDULE");
      config.SCHEDULE = await dbo.collection(config.FINAL_SCHEDULE_COL).find({}, {}).toArray()
    }
  }

  /**
   * Return the UUIDS and trip_ids for a day
   * @param {Date} date 
   */
  async function extractIDSFromSchedule(date) {
    await getSchedule();
    let scheduled_trips = config.SCHEDULE;
      let UUIDArray = new Set();
      let tripArray = new Set();
        for (let trip of scheduled_trips) {
          //Log the trip array for comparison later
          //TODO could be within lower forloop
          //Should still lineup
          tripArray.add(trip.trip_id);
          //Grab UUIDs corresponding to date + trip_id
          for (let journey of trip.UUID) {
            if (journey.startsWith(date)) {
              UUIDArray.add(journey);
            }
          }
        }
  
    return {
      UUIDs : Array.from(UUIDArray),
      trip_ids : Array.from(tripArray)
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

  // Get all the UUIDs for a day then send these to the schedule for comparison,
  // do the same for the schedule. This tells us roughly how many
  // trips are missing from the realtime and the schedule
  app.get("/compare_UUIDs", async (req, res) => {
    console.log("Starting raw to final comparison pipeline");

    let raw = await dbo.collection("raw_w_routes")
      .find({
        "date" : {"$gte": "20201223","$lte": "20201229"},
      }, {}).toArray();
    let UUIDsRaw = raw.map(d => {
      return d.UUID;
    })
    let scheduleByRaw = await dbo.collection(config.FINAL_SCHEDULE_COL)
      .aggregate([{
        "$match" : {
          "UUID" : {"$in" : UUIDsRaw},
        }
      }
    ], {}).toArray();
    let scheduleByRawUUIDs = new Set();
    for (let trip of scheduleByRaw) {
      for (let journey of trip.UUID) {
        if (journey.match(/2020122[3-9]/)) {
          scheduleByRawUUIDs.add(journey);
        }
      }
    }
    scheduleByRawUUIDs = Array.from(scheduleByRawUUIDs);
    console.log("UUIDs in raw:", raw.length);
    console.log("UUIDs in schedule:", scheduleByRawUUIDs.length);

    let schedule = await dbo.collection(config.FINAL_SCHEDULE_COL).find({}, {}).toArray();
    let UUIDsSchedule = [];
    for (let trip of schedule) {
      for (let journey of trip.UUID) {
        if (journey.match(/2020122[3-9]/)) {
          UUIDsSchedule.push(journey);
        }
      }
    }
    let rawBySchedule = await dbo.collection("raw_w_routes")
      .aggregate([
        {
          "$match" : {
            "UUID" : {"$in" : UUIDsSchedule},
            "date" : {"$gte": "20201223","$lte": "20201229"},
          }
        },
      ], {}).toArray();
    console.log("UUIDS in Schedule", UUIDsSchedule.length);
    console.log("UUIDs in Raw", rawBySchedule.length);
  })
  
  // Get a day by day comparison of the trips in the schedule as the base table, and
  // whether or not their UUIDs are present in the realtime.
  // Take all the UUIDs from the schedule and compare
  // these to the realtime collection, log any realtimes that are missing information
  // Uses: raw_w_routes, final_trip_UUID_set
  app.get("/compare_scheduled_to_observed", async (req, res) => {
    console.log("Starting raw to final comparison pipeline");

    await dbo.collection("raw_w_routes").createIndex({ "trip_id": 1 });
    await dbo.collection(config.FINAL_SCHEDULE_COL).createIndex({ "UUID": 1 });

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

      // let difference = UUIDArray.map(d => {return d.split("-")[1] + "-" + d.split("-")[2]})
      //            .filter(x => !tripArray.includes(x))
      //            .concat(tripArray.filter(x => !UUIDArray.map(d => {return d.split("-")[1] + "-" + d.split("-")[2]}).includes(x)));
      // console.log(difference);

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

      await dbo.collection("raw_w_routes").aggregate(pipeline2, {}).toArray().then(async function(docs) {
        console.log("Realtime trips by UUID for GBT: ", docs);
        //Get the calendarDate exceptions of those missing from UUID set
        //to see what exception type they are
        //get the service ids from the collection of real raw routes
        let service_ids = docs.map(d => {
          return d.trip_id;
        })

        console.log(service_ids);

        //Find the exceptions in calendar exceptions
        let pipe = [
          {
            "$match" : {
              "service_id" : {"$in" : service_ids}
            }
          },
          {
            "$group" : {
              "_id" : "$exception_type",
              "count" : {"$sum" : 1}
            }
          }
        ]

        let serviceExceptionTypes = await dbo.collection("calendarDate").aggregate(pipe, {}).toArray();
        console.log("Service exception types:", serviceExceptionTypes);
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
    }
    db.close();
  })

  // Want to compare the trip ids in the observed to the schedule, see if these resolve our issues
  // Get the raw info for each day, then compare to schedule to see if the UUID of each journey is present
  // in the schedule
  app.get("/compare_observed_to_schedule", async (req, res) => {
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
      ]

      await dbo.collection(config.FINAL_SCHEDULE_COL).aggregate(pipeline, {}).toArray(function (err, docs) {
        if (err) throw err;
        console.log("not in trip id array on same day " + date)
        console.log(docs);
      });
    }
  })

  // Auto generate valid trips from realtime_raw
  // Append route information, used to filter to provider
  // Auto generate schedule from trips, routes, calendar and calendarDates
  // Creates collection until todays date
  // USES: (realtime_raw, routes), (trips, routes), (trips, calendar, calendarDate), (filtered_trips)
  // Overwrites: (raw_w_routes), (filtered_trips), (filtered_trips), (final_trip_UUID_set)
  // Send the generated info back to the requester
  app.get("/generate_schedule", async (req, res) => {
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
          "raw_w_route_id.0.agency_id": { "$in": ["RTH", "GBT"] }
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

    console.log("Starting schedule dataset generation pipeline")
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
          "routes.0.agency_id": { "$in": ["GBT", "RTH"] }
        }
      },
      {
        "$out": "filtered_trips"
      }
    ]
    
    let c2 = dbo.collection("filtered_trips");

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
        "$out": "filtered_trips"
      }
    ]

    await dbo.collection("trips").aggregate(pipe, options).toArray(async (err, docs) => {
      if (err) throw err;
      console.log("Added filtered route information to schedule_trips, written to filtered_trips");
      await dbo.collection("filtered_trips").aggregate(pipe2, options).toArray(async (err, docs) => {
        if (err) throw err;
        console.log("Added filtered calendar information to filtered_trips, written to filtered_trips");
        
        let c3 = dbo.collection("filtered_trips");

        let excss = await dbo.collection("calendarDate").aggregate([
          {
            "$match" : {
              "date" : {"$gte": "2020-12-22T00:00:00.000Z","$lte": "2021-01-23T00:00:00.000Z" },
            }
          },
          {
          "$group" : {
            "_id" : "$service_id",
            "exceptionDates" : {
              "$push" : {
                "exception_type" : "$exception_type", 
                "date" : "$date"
              }
            }
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

            entry.UUID = new Set();
            //First add the normal calendar and exceptions from calendarDates
            entry = formUUIDsFromCalendar(entry, exceptions);
            // Next, check if we need to add the UUID due to exception in calendarDate
            entry = formUUIDsFromCalendarDates(entry, exceptions);
            //Final convert the set to an array
            entry.UUID = Array.from(entry.UUID);
            modDocs.push(entry);
          }

          console.log(modDocs);

          await dbo.collection(config.FINAL_SCHEDULE_COL).insertMany(modDocs, async (err, results) => {
            if (err) throw err;
            console.log(results);
            //Create indexes for  this collection
            await dbo.collection(config.FINAL_SCHEDULE_COL).createIndex({ "trip_id": 1 }, { unique: true });
            await dbo.collection(config.FINAL_SCHEDULE_COL).createIndex({ "service_days.start_date": 1 });
            console.log("Finished! :D");
            res.send("Pipeline has been successful, yay!! You may now use the comparison functions, or open this data elsewhere");
          });
        })
      })
    })
  })

  // Get the raw realtime data provided by the AT API
  // Creates a local copy of each day.
  // Query Params: 
  //    download=true: download local copy
  //    dates=: a date or range of dates for the data to fall between (inclusive)
  // in form [{1} DD/MM/YYY{1} [, DD/MM/YY]? ]{1} (<--regex)
  app.get("/get_raw_data", async (req, res) => {
    let returnData = [];
    let dates = req.query.dates != undefined ? formDateArrayFromQuery(req.query.dates) : formDateArray();
    for (let date of dates) {
      let data = await dbo.collection("realtime_raw").find({"date" : date}).toArray();
      returnData.push(data);
      if (req.query.download === 'true') {
        try {
          console.log("Attempting to overwrite existing file");
          fs.writeFileSync("./dataBackups/realtime_raw_" + date, JSON.stringify(data))
        } catch (err) {
          console.log("File does not exist ¯\\_(ツ)_/¯, creating...");
          fs.appendFileSync("./dataBackups/realtime_raw_" + date, JSON.stringify(data));
        }
        console.log(date + " has been downloaded and written to dataBackups!");  
      }
    }
    res.send(returnData);
    // let a = res.write("bitches", 'utf-8');
    // let b = res.write("bitches", 'utf-8');
    // console.log(a);
    // res.end("5");
  })

  app.post('/postThat', (req, res) => {
    //code to perform particular action.
    //To access POST variable use req.body() methods.
    console.log(req.body);
  })

})

// add router in the Express app.
app.listen(config.port, () => {
  console.log(`Express App running at http://localhost:${config.port}`);
})

/**
 * Form UUIDs for each trip_id based on calendarExceptions
 * currently, 1 = day to add trip
 * @param {JSON} entry 
 * @param {JSON} exceptions 
 */
function formUUIDsFromCalendarDates(entry, exceptions) {
  for (let exception of exceptions) {
    for (let e of exception.exceptionDates) {
      if (e.exception_type === 1) {
        let toCheck = e.date.split("T");
        toCheck = toCheck[0].split("-");
        entry.UUID.add(toCheck[0] + toCheck[1] + toCheck[2] + "-" + entry.trip_id);
      }
    }
  }
  return entry;
}

/**
 * Form UUIDs for each trip_id based on calendar
 * @param {JSON} entry 
 * @param {JSON} exceptions 
 */
function formUUIDsFromCalendar(entry, exceptions) {
  //Offsets of each day from week starting tuesday
  //as the calendar does
  //ie calendar = {friday : 1}, startDate = 22/12
  //fridays date = 22/12 + 3 + (7*n)
  //friday0 = 22/12 + 3 + 7*0 = 25/12
  //friday1 = 22/12 + 3 + 7*1 = 1/1
  let offsets = {
    "tuesday": 0,
    "wednesday": 1,
    "thursday": 2,
    "friday": 3,
    "saturday": 4,
    "sunday": 5,
    "monday": 6,
  }

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
              let toCheck = ed.date.split("T");
              toCheck = toCheck[0].split("-");
              //Check the date matches and the exception type is 0
              if (toCheck[0] + "" + toCheck[1] + toCheck[2] === fixDate(dt) && (ed.exception_type === 0 || ed.exception_type === 2)) {
                excepted = true;
              }
            }
          }
          //Yay we got here, add the UUID
          if (!excepted) {
            entry.UUID.add(fixDate(dt) + "-" + entry.trip_id);
          }
        }
      }
    }
  }
  return entry;
}

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

/**
 * Generate an array of dates between the start date and either the end date or today
 */
function formDateArrayFromQuery(queryDates) {
  let dates = [];
  let startDate, endDate;
  try {
    let q = queryDates.split("[")[1].split("]")[0];
    console.log(q)
    if (q.split(",")[0] === q) {
      startDate = q;
      endDate = new Date();
    } else {
      startDate = q.split(",");
      endDate = startDate[1].trim();
      startDate = startDate[0].trim();
      endDate = endDate.split("/");
      endDate = new Date(parseInt(endDate[2]), parseInt(endDate[1]) - 1, parseInt(endDate[0]));
    }
    startDate = startDate.split("/");
    startDate = new Date(parseInt(startDate[2]), parseInt(startDate[1]) - 1, parseInt(startDate[0]));
    for (let d = startDate; d < endDate; d.setDate(d.getDate() + 1)) {
      dates.push(fixDate(d));
    }
  } catch (err) {
    console.log(err);
    console.log("An error occured ¯\\_(ツ)_/¯, likely a misformed date array. Please try again.");
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

function arr_diff (a1, a2) {

  var a = [], diff = [];

  for (var i = 0; i < a1.length; i++) {
      a[a1[i]] = true;
  }

  for (var i = 0; i < a2.length; i++) {
      if (a[a2[i]]) {
          delete a[a2[i]];
      } else {
          a[a2[i]] = true;
      }
  }

  for (var k in a) {
      diff.push(k);
  }

  return diff;
}