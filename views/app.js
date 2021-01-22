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
const geolib = require('../node_modules/geolib');
const fetch = require('node-fetch');

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
    console.log('Fleet list CSV file successfully processed');
  });

let PAX_KM = {};
let ROUTES_BY_PROVIDER = fs.readFileSync("./public/data/VALID_ROUTES.json");
ROUTES_BY_PROVIDER = JSON.parse(ROUTES_BY_PROVIDER);
let VALID_ROUTES = [];
let VALID_VEHICLES = [];
    for (let provider of ROUTES_BY_PROVIDER) {
      for (let entry of provider["routes_short"]) {
          VALID_ROUTES = VALID_ROUTES.concat(entry);
      }
    }

let distances = {};
//Parse the pax_km spreadsheet
fs.createReadStream('./public/data/Vehicle__Pax_Travel_Metrics.csv')
  .pipe(csv())
  .on('data', (row) => {
    let displayRoute = row["Display Route Number"];
    let vehicleID = row["Rapid vehicle number"];
    if( VALID_ROUTES.includes(displayRoute) ) {
      let id = displayRoute + "_" + vehicleID;
      VALID_VEHICLES.push(parseInt(vehicleID));
      PAX_KM[id] = row;
    }
  })
  .on('end', () => {
    console.log('Pax km CSV file successfully processed');
  });

  console.log(PAX_KM);
//DB IMPORTS
const SQLManagement = require("../SQLManagment.js");
const SQLPool = new SQLManagement();

const MongoClient = require('../node_modules/mongodb').MongoClient;
const { Console } = require('console');
const { FINAL_SCHEDULE_COL } = require('../config.js');
const { start } = require('repl');
const { resolve } = require('../node_modules/path');
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
  let dbo = db.db(config.mongodb.db);
  let collection = dbo.collection("realtime_raw");
  // let routesThatAraValid = await dbo.collection("filtered_trips")
  //   .aggregate(
  //     [
  //       {
  //         "$group" : {
  //           "_id" : "$routes.agency_id",
  //           "routes" : {"$addToSet" : "$route_id"},
  //           "routes_short" : {"$addToSet" : "$routes.route_short_name"}
  //         }
  //       }
  //     ], {}).toArray();
  //     console.log(routesThatAraValid);
  // fs.writeFileSync('./dataBackups/VALID_ROUTES.json', JSON.stringify(routesThatAraValid));

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
      UUIDs: Array.from(UUIDArray),
      trip_ids: Array.from(tripArray)
    }
  }

  app.get('/distinct', async (req, res) => {
    //render page  
    await dbo.collection("raw_w_routes").distinct("UUID", {"date" : {"$gte" : "20201224", "$lte" : "20201231"}}, {}, function (err, results) {
      if (err) throw err;
      console.log(results.length)
      res.send(results);
    })

    await dbo.collection("raw_w_routes").find({}, {}).toArray((err, docs) => {
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
  // Query Params:
  //    dates=: a date or range of dates for the data to fall between (inclusive)
  // in form [{1} DD/MM/YYYY{1} [, DD/MM/YYYY]? ]{1} (<--regex)
  app.get("/compare_UUIDs", async (req, res) => {
    console.log("Starting raw to final comparison pipeline");
    let startDate = new Date(2020, 11, 23);
    let endDate = new Date(2020, 11, 28);
    if (req.query.dates != undefined) {
      let dates = getDatesFromQueryArray(req.query.dates);
      startDate = dates.start;
      endDate = dates.end;
    }
    let startDateString = fixDate(startDate);
    let endDateString = fixDate(endDate);

    console.log(startDateString, endDateString);

    let raw = await dbo.collection("raw_w_routes")
      .find({
        "$and" : [
          {"date" : { "$gte": startDateString, "$lte": endDateString }},
        ]
      }, {}).toArray();
    let UUIDsRaw = raw.map(d => {
      return d.UUID;
    })
    let scheduleByRaw = await dbo.collection(config.FINAL_SCHEDULE_COL)
      .aggregate([{
        "$match": {
          "UUID": { "$in": UUIDsRaw },
        }
      }
      ], {}).toArray();
    let regexes = [];
    console.log(formDateArray(startDate, endDate));
    for (let date of formDateArray(startDate, endDate)) {
      regexes.push(new RegExp(date));
    }
    console.log(regexes);
    let scheduleByRawUUIDs = new Set();
    for (let trip of scheduleByRaw) {
      for (let journey of trip.UUID) {
        for (let regex of regexes) {
          if (journey.match(regex)) {
            // if (journey.match(/2020122[3-9]/) || journey.match(/2021010[1-9]/) || journey.match(/2021011[0-2]/)) {
              scheduleByRawUUIDs.add(journey);
            }
        }
      }
    }
    scheduleByRawUUIDs = Array.from(scheduleByRawUUIDs);
    console.log("UUIDs in raw:", raw.length);
    console.log("UUIDs in schedule:", scheduleByRawUUIDs.length);

    let schedule = await dbo.collection(config.FINAL_SCHEDULE_COL).find({}, {}).toArray();
    let UUIDsSchedule = new Set();
    for (let trip of schedule) {
      for (let journey of trip.UUID) {
        for (let regex of regexes) {
          if (journey.match(regex)) {
            UUIDsSchedule.add(journey);
          }
        }
      }
    }
    let rawBySchedule = await dbo.collection("raw_w_routes")
      .aggregate([
        {
          "$match": {
            "UUID": { "$in": Array.from(UUIDsSchedule) },
            "date": { "$gte": startDateString, "$lte": endDateString },
          }
        },
      ], {}).toArray();
    console.log("UUIDS in Schedule", Array.from(UUIDsSchedule).length);
    console.log("Trips in Schedule", schedule.length);
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
            "$and": [
              { "date": date },
              { "UUID": { "$in": UUIDArray } },
            ]
          }
        }
      ]

      await dbo.collection("raw_w_routes").aggregate(pipeline, {}).toArray().then(async function (docs) {
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
          "$match": {
            "raw_w_route_id.0.agency_id": "GBT"
          }
        }
      ]

      await dbo.collection("raw_w_routes").aggregate(pipeline2, {}).toArray().then(async function (docs) {
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
            "$match": {
              "service_id": { "$in": service_ids }
            }
          },
          {
            "$group": {
              "_id": "$exception_type",
              "count": { "$sum": 1 }
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
          "$match": {
            "raw_w_route_id.0.agency_id": "RTH"
          }
        }
      ]

      await dbo.collection("raw_w_routes").aggregate(pipeline3, {}).toArray().then(function (docs) {
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
            "$and": [
              { UUID: { "$nin": inArray } },
              { UUID: { "$regex": regex } }
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
    // ************************ FORM RAW DATA ************************
    // Fix this date
    let dateToCheck = formDateArray(new Date(2020, 11, 24), new Date(2020, 11, 31));
    let trips = dbo.collection("realtime_raw");

    console.log(dateToCheck);
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

    console.log("Generating raw_w_routes for filtering...");
    await trips.aggregate(lookup, options).toArray();
    await dbo.collection("raw_w_routes").createIndex({ "date": 1 }).then(() => { console.log("Indexes created") });
    console.log("Collection raw_w_routes has been created!");

    // ************************ ADD DATA TO SCHEDULE ************************
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

    await dbo.collection("filtered_trips").createIndex({ "service_id": 1 });
    await dbo.collection("calendar").createIndex({ "service_id": 1 });

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

    await dbo.collection("trips").aggregate(pipe, options).toArray();
    console.log("Added filtered route information to schedule_trips, written to filtered_trips");

    await dbo.collection("filtered_trips").aggregate(pipe2, options).toArray();
    console.log("Added filtered calendar information to filtered_trips, written to filtered_trips");

    // ************************ GET EXCEPTIONS ************************
    let excss = await dbo.collection("calendarDate").aggregate([
      {
        "$match": {
          "date": { "$gte": "2020-12-24T00:00:00.000Z", "$lte": "2020-12-31T00:00:00.000Z" },
        }
      },
      {
        "$group": {
          "_id": "$service_id",
          "exceptionDates": {
            "$push": {
              "exception_type": "$exception_type",
              "date": "$date"
            }
          }
        }
      }], {}).toArray();

    let service_ids = [];
    for (let e of excss) {
      service_ids.push(e._id);
    }
    console.log(service_ids);
    // ************************ FORM NEW UUIDS WITH EXCPETIONS ************************
    //New docs with UUIDs to add
    // TODO: MAKE THIS QUERY MORE MODULAR
    let docsNeedingUUIDS = await dbo.collection("filtered_trips").find({
        "service_days.start_date": { "$gte": "2020-12-24T00:00:00.000Z" },
        "service_days.end_date": { "$lte": "2020-12-31T00:00:00.000Z" },
      }, {}).toArray();
      let modifiedDocs = [];
      console.log(docsNeedingUUIDS);
      //Check every journey entry
      for (let entry of docsNeedingUUIDS) {
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
        modifiedDocs.push(entry);
      }
    console.log(modifiedDocs);
    // ************************ POST DATA TO MONGO ************************
    await dbo.collection(config.FINAL_SCHEDULE_COL).insertMany(modifiedDocs);
    //Create indexes for  this collection
    await dbo.collection(config.FINAL_SCHEDULE_COL).createIndex({ "trip_id": 1 }, { unique: true });
    await dbo.collection(config.FINAL_SCHEDULE_COL).createIndex({ "service_days.start_date": 1 });
    console.log("Posting schedule set complete, cleaning data...");

    // ************************ CLEAN DATA IN MONGO ************************
    // NOTE: this could be done at lookup stage if memory 
    // allocation in DB begins to be a problem
    await dbo.collection("final_trip_UUID_set").aggregate([
      {
        "$addFields": {
          "agency_id": "$routes.agency_id",
          "route_short_name": "$routes.route_short_name",
          "route_long_name": "$routes.route_long_name",
          "route_type": "$routes.route_type",
          "calendar_services": {
            "start_date": "$service_days.start_date",
            "end_date": "$service_days.end_date",
            "monday": "$service_days.monday",
            "tuesday": "$service_days.tuesday",
            "wednesday": "$service_days.wednesday",
            "thursday": "$service_days.thursday",
            "friday": "$service_days.friday",
            "saturday": "$service_days.saturday",
            "sunday": "$service_days.sunday",
          }
        }
      },
      {
        "$unset": ["routes", "service_days"]
      },
      { "$out": config.FINAL_SCHEDULE_COL }
    ]).toArray();
    console.log("We have finished cleaning the dataset for use 🙌");

    // Tell the user we done
    res.send("Pipeline has been successful, yay!! You may now use the comparison functions, or open this data elsewhere");
  })

  // Called to fix calendarDates, calendar, versions, and existing schedule when there is 
  // an unexpected change to the AT API
  app.get("/repair_database", async (req, res) => {
    //Sudo versions changed
    //Perhaps keep versions local and query the db for them, compare and discover changes this way?
    let versionsChanged = true;
    //
    let originalVersionDate_start = "2020-12-22T00:00:00.000Z";
    let originalVersionDate_end = "2021-01-23T00:00:00.000Z";
    let newVersionDate_start = "2021-01-13T00:00:00.000Z";
    let newVersionDate_end = "2021-01-23T00:00:00.000Z";
    //We need to get the new version date when parsed a new version
    let versionDate_start = "2020-12-22T00:00:00.000Z";
    let versionDate_end = "2021-01-13T00:00:00.000Z"; //The start of the next version

    //If version has changed we want to update collections accordingly
    if (versionsChanged) {
      // Remove exceptions that are no longer valid
      await dbo.collection("calendarDates")
        .deleteMany({
          "date" : {"$gte" : newVersionDate_end}
        })
      console.log("Invalid exceptions removed from calendar dates.");

      // The calendar needs to have the version to update the end_date field for services
      await dbo.collection("calendar")
        .updateMany({
          "start_date" : originalVersionDate_start
        },
        {
          "$set" : {"end_date" : newVersionDate_end}
        }, {});
        console.log("Updated calendar to have correct end date.");
      // Update the versions we have to correct date
      let startDateObj = createDateFromStringTimestamp(newVersionDate_start);
      let startMonth = startDateObj.getMonth() + 1;
      console.log(startMonth)
      startMonth = parseInt(startMonth) < 10 ? "0" + startMonth : startMonth; 
      console.log(startMonth)
      await dbo.collection("versions")
        .updateMany({
          "$and" : [
            {"enddate" : {"$gt" : newVersionDate_start}},
            {"startdate" : {"$lt" : newVersionDate_start}}
            ]
          },
        {
          "$set" : {"enddate" : startDateObj.getFullYear() + "-" + startMonth + "-" + (startDateObj.getDate() - 1) + "T00:00:00.000Z" } // THIS IS NOT GOING TO WORK
        },
        {});
    }
    console.log("DB is now using updated versions!");
  })

  // Get the raw realtime data provided by the AT API
  // Creates a local copy of each day.
  // Query Params: 
  //    download=true: download local copy
  //    dates=: a date or range of dates for the data to fall between (inclusive)
  //    day=true      : download the day by day schedule
  // in form [{1} DD/MM/YYYY{1} [, DD/MM/YYYY]? ]{1} (<--regex)
  app.get("/get_raw_data", async (req, res) => {
    let returnData = [];
    let dates = req.query.dates != undefined ? formDateArrayFromQuery(req.query.dates) : formDateArray(new Date(23,11,2020), new Date(12,0,2021));
    console.log(dates);
    //If day arg, download by day
    if (req.query.day === 'true') {
      for (let date of dates) {
        let data = await dbo.collection("realtime_raw").find({ "date": date }).toArray();
        returnData.push(data);
        if (req.query.download === 'true') {
          try {
            console.log("Attempting to overwrite existing file");
            fs.writeFileSync("./dataBackups/realtime_raw_" + date + ".json", JSON.stringify(data));
          } catch (err) {
            console.log("File does not exist ¯\\_(ツ)_/¯, creating...");
            fs.appendFileSync("./dataBackups/realtime_raw_" + date + ".json", JSON.stringify(data));
          }
          console.log(date + " has been downloaded and written to dataBackups!");
        }
      }
      res.send(returnData);
    } else {
      let data = await dbo.collection("realtime_raw").find({ "date" : { "$in" : dates }}).toArray();
      returnData.push(data);
      if (req.query.download === 'true') {
        try {
          console.log("Attempting to overwrite existing file");
          fs.writeFileSync("./dataBackups/realtime_raw_" + dates[0] + "-" + dates[dates.length - 1] + ".json", JSON.stringify(data));
        } catch (err) {
          console.log("File does not exist ¯\\_(ツ)_/¯, creating...");
          fs.appendFileSync("./dataBackups/realtime_raw_" + dates[0] + "-" + dates[dates.length - 1] + ".json", JSON.stringify(data));
        }
        console.log(dates[0] + " has been downloaded and written to dataBackups!");
      }
      res.send(returnData);
    }
    // let a = res.write("bitches", 'utf-8');
    // let b = res.write("bitches", 'utf-8');
    // console.log(a);
    // res.end("5");
  });

  // Get the processed schedule data provided by the AT API
  // Creates a local copy of each day.
  // Query Params: 
  //    download=true : download local copy
  //    dates=        : a date or range of dates for the data to fall between (inclusive)
  //    day=true      : download the day by day schedule
  // in form [{1} DD/MM/YYYY{1} [, DD/MM/YYYY]? ]{1} (<--regex)
  app.get("/get_processed_schedule", async (req, res) => {
    let returnData = [];
    let dates = req.query.dates != undefined ? formDateArrayFromQuery(req.query.dates) : formDateArray();
    //If day arg, download by day
    if (req.query.day === 'true') {
      for (let date of dates) {
        console.log("Querying collection for data on " + date + "...");
        let data = await dbo.collection(config.FINAL_SCHEDULE_COL).find({ "UUID": {"$regex" : new RegExp("^" + date) } }).toArray();
        returnData.push(data);
        if (req.query.download === 'true') {
          try {
            console.log("Attempting to overwrite existing file");
            fs.writeFileSync("./dataBackups/processed_schedule_" + date, JSON.stringify(data))
          } catch (err) {
            console.log("File does not exist ¯\\_(ツ)_/¯, creating...");
            fs.appendFileSync("./dataBackups/processed_schedule_" + date, JSON.stringify(data));
          }
          console.log(date + " has been downloaded and written to dataBackups!");
        }
      }
    } else {
      //If no download by day arg, download entire set
      console.log("Querying collection for data...");
      let data = await dbo.collection(config.FINAL_SCHEDULE_COL).find({}).toArray();
      returnData.push(data);
      if (req.query.download === 'true') {
        try {
          console.log("Attempting to overwrite existing file");
          fs.writeFileSync("./dataBackups/processed_schedule_" + dates[0] + "-" + dates[dates.length - 1], JSON.stringify(data))
        } catch (err) {
          console.log("File does not exist ¯\\_(ツ)_/¯, creating...");
          fs.appendFileSync("./dataBackups/processed_schedule_" + dates[0] + "-" + dates[dates.length - 1], JSON.stringify(data));
        }
        console.log("The full collection has been downloaded and written to dataBackups!");
      }
    }
    res.send(returnData);
  })

  // Get all the stop sequences (number_stops) from the schedule and compare to the realtime observed data
  // Takes a long time to resolve
  // We need to take both of the entries from both of the datasets, take this value and 
  // enter into raw_w_routes
  app.get("/compare_stops", async (req, res) => {
    let stopsFromSchedule = await dbo.collection("final_trip_UUID_set").find({}).toArray();
    let stopsByTripID = {};
    // Collect the info for each raw info
    for (let trip of stopsFromSchedule) {
      stopsByTripID[trip.trip_id] = 
        { 
          "stops" : trip.number_stops,
          "distance" : trip.distance,
          "shape" : trip.shape_id
        }
    }
    let notMatching = [];
    let arrived = true;
    let stopsFromRaw = await dbo.collection("raw_w_routes").find({"date" : {"$ne" : "20201222"}}, {}).toArray();
    console.log(stopsFromRaw);
    for (let journey of stopsFromRaw) {
      // Check if the stop sequence matches ie we recorded all the stops of the bus
      if (journey.stop_sequence != stopsByTripID[journey.trip_id].stops) {
        notMatching.push(journey);
        if (journey.arrived) {
          arrived = false;
        }
      }
    }
    console.log(notMatching, arrived);
    // let inverse = stopsFromRaw.filter(d => !notMatching.includes(d)).map(d => {return d.UUID});
    // let rawCorrectStops = await dbo.collection("raw_w_routes").find({UUID : {"$in" : inverse}}).toArray();
    // for (let journey of rawCorrectStops) {
    //   journey.distance = calcShapeDist(stopsByTripID[journey.trip_id].shape_id);
    // }
    // for (let journey of notMatching) {
    //   //*********************TODO FIX THIS LINE!!!!*********************
    //   // LOAD SHAPE FILE FROM SHAPE ID
    //   journey.distance = stopsByTripID[journey.trip_id].distance;
    // }
    await dbo.collection("journey_needing_distances").insertMany(notMatching, {});
    res.send(notMatching);
  })

  // This sets up the pax_km collection as raw data in the mongo.
  // The data is easier for me to handle in the mongo than js
  app.get('/setupPAXKm_collection', async (req, res) => {
    // let pax_post = Object.keys(PAX_KM).map(d => {
    //   // LOL JS
    //   // Please tell me there is a better way to do this
    //   let r = {};
    //   r[d] = "";
    //   return r;
    // }); 
    // for (let entry of pax_post) {
    //   for (let key of Object.keys(entry)) {
    //     entry[key] = PAX_KM[key];
    //   }
    // }
    
    // console.log(pax_post);
    // await dbo.collection("pax_km").insertMany(PAX_KM);
  })

  app.get('/test_mongo_pax', async (req, res) => {
    console.log(ROUTES_BY_PROVIDER, VALID_VEHICLES);
    // Match all the trips done by the providers
    let buses = await dbo.collection("pax_km").aggregate([
      {
        "$match" : {
          "Rapid vehicle number" : {"$in" : VALID_VEHICLES}
        }
      },
      {
        "$group" : {
          "_id" : "Rapid vehicle number",
          "trips" : {"$sum" : "$Vehicle trips"},
          "Vehicle_kms" : {"$sum" : "$Vehicle kms"},
          "routes" : {"$addToSet" : "$Display Route Number"}
        }
      }
    ]).toArray();

    let routes = [];
    let routesThatShouldntBeThere = new Set();
    for (let entry of buses) {
      for (let r of entry.routes) {
        console.log(r.toString());
        if (!VALID_ROUTES.includes(r.toString())) {
          routesThatShouldntBeThere.add(r);
        }
      }
      routes = routes.concat(entry.routes);
    }
    console.log(routes, routesThatShouldntBeThere);

    console.log("Entries of buses in the pax_km collection", buses);
    let raw = await dbo.collection("raw_w_routes")
    .aggregate([
      {"$match" : {
          "$and" : [
            {"date" : { "$gte": "20201224", "$lte": "20201231" }},
            {"raw_w_route_id.0.agency_id" : {"$in" : ["GBT", "RTH"]}}
          ]
        }
      },
      {
        "$group" : {
          "_id" : "vehicle_id",
          "trips" : {"$sum" : 1},
          "routes" : {"$addToSet" : "$raw_w_route_id.route_short_name"} 
        }
      },
      // {"$group" : {
      //   "_id" : 1,
      //   "trips" : {"$sum" : "$trips"},
      //   "routes" : {"$push" : "$routes"} 
      // }}
    ], {}).toArray();

    console.log("Entries in raw data between 24/12 - 31/12", raw);
    let notCorrect = [];
    let missing = [];
    let count = 0;
    for (let j1 of raw) {
      let notPresent = true;
      for (let entry of buses) {
        if (parseInt(j1._id) === entry._id) {
          if (j1.trips != entry.trips) {
            let r = {};
            r[j1._id] = j1.trips - entry.trips;
            notCorrect.push(r);
            count++;
            notPresent = false;
          }
        }
      }
      if (notPresent) {
        missing.push(j1);
      }
    }
    console.log("Buses whose journeys do not match:", notCorrect);
    console.log("Buses present in raw but not in pax_km", missing); 
    console.log("Count of buses shared between collections", count);
    console.log("Count of buses in raw", raw.length);
    console.log("Count of buses in pax_km", buses.length);
  })

  app.get('/get_shapes', async (req, res) => {
    let missingDistances = await dbo.collection("journey_needing_distances").find({}, {}).toArray();
    let shape_ids = new Set();
    for (let journey of missingDistances) {
      shape_ids.add(journey.shape_ids);
    }
    let pre = [shape_ids[0], shape_ids[1], shape_ids[2], shape_ids[3]]
    let a = await getMultipleATAPI("https://api.at.govt.nz/v2/gtfs/shapes/shapeId/", pre);
    
  })

  app.post('/postThat', (req, res) => {
    //code to perform particular action.
    //To access POST variable use req.body() methods.
    console.log(req.body);
  })

  app.get('/generate_schedule_distances', async (req, res) => {

    let scheduleTrips = dbo.collection("final_trip_UUID_set");

    console.log("Starting aggregate")

    let lookup = [
      { "$limit": 150 }, // Limit on API requests for testing
      {
        "$match": { "distance": { "$exists": false } }
      }
    ]

    let options = {
      allowDiskUse: 1
    };

    let noDistanceTrips = await scheduleTrips.aggregate(lookup, options).toArray();

    let allTripIDs = noDistanceTrips.map(data => data.trip_id);

    let i = 0;
    let interval = 50;

    while (i < allTripIDs.length) {
      let endIndex = Math.min(i + interval, allTripIDs.length);
      let selectIDs = allTripIDs.slice(i, endIndex);
      console.log(new Date + "   " + selectIDs[0] + "  " + i + " out of " + allTripIDs.length);

      // Use trip_ids to retrieve shape files
      let apiResponseArr = await getMultipleATAPI("https://api.at.govt.nz/v2/gtfs/shapes/tripId/", selectIDs);
      apiResponseArr = apiResponseArr.map((data) => data.response);

      let distanceJSON = formatTripDistance(apiResponseArr, selectIDs);

      if (distanceJSON.length == 0) { i += interval; continue; }; // Something went wrong in formatting it

      let bulk = scheduleTrips.initializeUnorderedBulkOp();
      for (let each of distanceJSON) {
        bulk.find({
          "trip_id": each.tripID
        }).updateOne({
          "$set": {
            "distance": each.distance,
            "shape_id": each.shapeID
          }
        });
      }
      //Call execute
      await bulk.execute(function (err, updateResult) {
        if (err) throw err;
        console.log(err, updateResult);
      });

      i += interval;
    }

    console.log("Distance update complete  ", allTripIDs[0]);

  })

  app.get('/generate_schedule_stops', async (req, res) => {

    let scheduleTrips = dbo.collection("final_trip_UUID_set");

    console.log("Starting aggregate")

    let lookup = [
      { "$limit": 150 }, // Limit on API requests for testing
      {
        "$match": { "number_stops": { "$exists": false } }
      }
    ]

    let options = {
      allowDiskUse: 1
    };

    let noTimeTrips = await scheduleTrips.aggregate(lookup, options).toArray();

    let allTripIDs = noTimeTrips.map(data => data.trip_id);

    let i = 0;
    let interval = 50;

    while (i < allTripIDs.length) {
      let endIndex = Math.min(i + interval, allTripIDs.length);
      let selectIDs = allTripIDs.slice(i, endIndex);
      console.log(new Date + "   " + selectIDs[0] + "  " + i + " out of " + allTripIDs.length);

      // Use trip_ids to retrieve stop sequences 
      let apiResponseArr = await getMultipleATAPI("https://api.at.govt.nz/v2/gtfs/stopTimes/tripId/", selectIDs);
      apiResponseArr = apiResponseArr.map((data) => data.response);

      // Retrieve total number of stops for a given route
      let stopDataJSON = apiResponseArr.map(function (stopSequence, index) {

        if (stopSequence.length == 0) { // Check for valid response
          return { "tripID": selectIDs[index], "numberStops": null };
        }

        let id = stopSequence[0].trip_id;
        let noStops = stopSequence.length;

        return { "tripID": id, "numberStops": noStops };
      });

      let bulk = scheduleTrips.initializeUnorderedBulkOp();
      for (let each of stopDataJSON) {
        bulk.find({
          "trip_id": each.tripID
        }).updateOne({
          "$set": { "number_stops": each.numberStops }
        });
      }
      //Call execute
      await bulk.execute(function (err, updateResult) {
        if (err) throw err;
        console.log(err, updateResult);
      });

      i += interval;
    }

    console.log("Stop sequence update complete  ", allTripIDs[0]);
  })

  app.get('/pax_km_sanity_check', async (req, res) => {
    let totalDist, unknownDist;
    totalDist = Object.values(PAX_KM).reduce( (sum, row) => sum + parseFloat(row["Vehicle kms"]), 0);
    unknownDist = Object.values(PAX_KM).reduce( (sum, row) => {
      let vehicleID = row["Rapid vehicle number"];
      if( vehicleID == "Unknown" || vehicleID == "") {
        return sum + parseFloat(row["Vehicle kms"]);
      } else {
        return sum;
      } 
    }, 0);
    console.log(unknownDist, totalDist, unknownDist/totalDist);
    
      let routeData = {};
      let paxData = {};
      // Check that the distances are the same for each
      for (let entry of Object.values(PAX_KM)) {
        if (routeData[entry["Display Route Number"]] != undefined && paxData[entry["Rapid Vehicle Number"]] != undefined) {
          //PAX on route
          routeData[entry["Display Route Number"]]["Pax"] = parseFloat(entry["Pax kms"]) + routeData[entry["Display Route Number"]]["Pax"];
          paxData[entry["Rapid vehicle number"]]["Pax"] = parseFloat(entry["Pax kms"]) + paxData[entry["Rapid vehicle number"]]["Pax"];
          // Distance of route and vehicle
          routeData[entry["Display Route Number"]]["Dist"] = parseFloat(entry["Vehicle kms"]) + routeData[entry["Display Route Number"]]["Dist"];
          paxData[entry["Rapid vehicle number"]]["Dist"] = parseFloat(entry["Vehicle kms"]) + paxData[entry["Rapid vehicle number"]]["Dist"];
          // Trips of route and vehicle
          routeData[entry["Display Route Number"]]["Journeys"] = parseFloat(entry["Vehicle trips"]) + routeData[entry["Display Route Number"]]["Journeys"];
          paxData[entry["Rapid vehicle number"]]["Journeys"] = parseFloat(entry["Vehicle trips"]) + paxData[entry["Rapid vehicle number"]]["Journeys"];
        } else {
          routeData[entry["Display Route Number"]] = {};
          paxData[entry["Rapid vehicle number"]] = {};
          //PAX on route
          routeData[entry["Display Route Number"]]["Pax"] = parseFloat(entry["Pax kms"]);
          paxData[entry["Rapid vehicle number"]]["Pax"] = parseFloat(entry["Pax kms"]);
          // Distance of route and vehicle
          routeData[entry["Display Route Number"]]["Dist"] = parseFloat(entry["Vehicle kms"]);
          paxData[entry["Rapid vehicle number"]]["Dist"] = parseFloat(entry["Vehicle kms"]);
          // Trips of route and vehicle
          routeData[entry["Display Route Number"]]["Journeys"] = parseFloat(entry["Vehicle trips"]);
          paxData[entry["Rapid vehicle number"]]["Journeys"] = parseFloat(entry["Vehicle trips"]);
        }
      }
      console.log(routeData,paxData);

      let routeData2 = JSON.parse(JSON.stringify(routeData));
      let paxData2 = JSON.parse(JSON.stringify(paxData));
      for (let entry of Object.values(paxData2)) {
        entry.Journeys = 0;
      }

      let raw = await dbo.collection("raw_w_routes")
      .find({
        "$and" : [
          {"date" : { "$gte": "20201224", "$lte": "20201231" }},
        ]
      }, {}).toArray();
      for (let journey of raw) {
        if (paxData2[journey["vehicle_id"]] != undefined) {
          paxData2[journey["vehicle_id"]]["Journeys"] = 1 + paxData2[journey["vehicle_id"]]["Journeys"];
        } else {
          paxData2[journey["vehicle_id"]] = {};
          paxData2[journey["vehicle_id"]]["Journeys"] = 1;
        }
      }

      let notCorrect = [];
      let count = 0;
      for (let j1 of Object.keys(paxData)) {
        if (paxData[j1].Journeys != paxData2[j1].Journeys) {
          notCorrect.push({j1 :  paxData[j1].Journeys - paxData2[j1].Journeys});
          count++;
        }
      }
      console.log(notCorrect, count, Object.keys(paxData).length);
  })

  app.get('/generate_observed_distance', async (req, res) => {
    let observedTrips = await dbo.collection("raw_w_routes");
    let dates = formDateArray(new Date(2020, 11, 24), new Date(2021, 00, 01));

    console.log(dates)

    let pipe = [
      { 
        "$match" : {
          "date" : { "$in" : dates }
        } 
      },
      {
        "$lookup": {
          "from": "final_trip_UUID_set",
          "localField": "trip_id",
          "foreignField": "trip_id",
          "as": "trip_info"
        }
      },
      {
        "$addFields" : {
          "distance" : "$trip_info.distance"
        }
      }
    ];

    let joinedTrips = await observedTrips.aggregate(pipe, { allowDiskUse: 1 }).toArray();
    let observedDistance = joinedTrips.reduce( (totalDist, trip) => {
      let tripDist = trip.distance[0];
      if (tripDist === undefined || tripDist < 500) { console.log(trip); }
      return totalDist + trip.distance[0];
    }, 0)

    console.log(joinedTrips);
    console.log(observedDistance / 1000);
  });

  app.get('/join_raw_routes_to_final', async (req, res) => {
    // let needSpeed = await dbo.collection("raw_w_routes").aggregate([
    //   {
    //     "$match" : {
    //       "date" : {"$gte" : "20201224", "$lte" : "20201231"}
    //     }
    //   },
    //   {
    //     "$addFields" : {
    //       "route_info" : {"$arrayElemAt" : ["$raw_w_route_id", 0]}
    //     }
    //   },
    //   {
    //     "$project" : {
    //       "raw_w_route_id" : 0
    //     }
    //   },
    //   {
    //     "$limit" : 150
    //   },
    //   {
    //     "$lookup" : {
    //       "from" : "final_trip_UUID_set",
    //       "let" : {"date" : "$date", "trip_id" : "$trip_id"},
    //       "pipeline" : [
    //         {
    //           "$match" : {
    //               "$expr" : {
    //                 "$and" : [
    //                   {"$regexMatch" : {"input" : {"$each" : "$UUID"}, "regex": "/^$$date/"}}
    //                 ],
    //               }
    //             }
    //         },
    //         {
    //           "$project" : {
    //             "_id" : 0
    //           }
    //         }
    //       ],
    //       "as" : "trip_info"
    //     }
    //   }
    // ]).toArray();
  // console.log(needSpeed);
  let match = [];
  for (let date of formDateArray(new Date(2020, 11, 24), new Date(2021, 0, 1))) {
    match.push({"UUID" : new RegExp("^" + date)});
  }
  await dbo.collection("final_trip_UUID_set").createIndex({"UUID" : 1});
  await dbo.collection("raw_w_routes").createIndex({"UUID" : 1});
  console.log("Yee we running")
  let needSpeed = await dbo.collection("final_trip_UUID_set").aggregate([
    {
      "$match" : {
        "$or" : match
      }
    },
    // {
    //   "$limit" : 10
    // },
    {
      "$project" : {
        "UUID" : {
          "$filter" : {
            "input" : "$UUID",
            "as": "journey",
            "cond" : {
              "$and" : [
                {"$gte" : [{"$arrayElemAt" : [{"$split": ["$$journey", "-"]},0]}, "20201224"]},
                {"$lte" : [{"$arrayElemAt" : [{"$split": ["$$journey", "-"]},0]}, "20201231"]},
              ]
            }
          }
        },
        "route_id" : 1,
        "service_id" :  1,
        "trip_id" : 1,
        "trip_headsign" : 1,
        "direction_id" : 1,
        "block_id" : 1,
        "shape_id" : 1,
        "trip_short_name" : 1,
        "trip_type" : 1,
        "distance" : 1,
        "number_stops" : 1,
        "agency_id" : 1,
        "route_short_name" : 1,
        "route_long_name" : 1,
        "route_type" : 1,
        "calendar_services" : 1
      }
    },
    {
      "$unwind" : "$UUID"
    },
    {
      "$project" : {
        "_id" : 0
      }
    },
    {
      "$lookup" : {
        "from" : "raw_w_routes",
        "localField" : "UUID",
        "foreignField" : "UUID",
        "as" : "realtime_observation"
      }
    },
    {
      "$set" : {
        "agency_id" : {"$arrayElemAt" : ["$agency_id",0]},
        "realtime_observation" : {"$arrayElemAt" : ["$realtime_observation",0]},
        "route_short_name" : {"$arrayElemAt" : ["$route_short_name",0]},
        "route_long_name" : {"$arrayElemAt" : ["$route_long_name",0]},
        "route_type" : {"$arrayElemAt" : ["$route_type",0]},
      }
    },
    {
      "$addFields" : {
        "departure" : "$realtime_observation.start_time",
      }
    },
  ]).toArray();

  let missing = {
    "noObservation" : 0,
    "noStopTime" : 0,
    "noVehicle" : 0,
  };
  for (let journey of needSpeed) {
    if (journey.realtime_observation != undefined) {
      let timeSplit = journey.realtime_observation.start_time.split(":");
      let startTime = new Date(journey.realtime_observation.date.slice(0, 4), (parseInt(journey.realtime_observation.date.slice(4, 6)) - 1), journey.realtime_observation.date.slice(6, 8), timeSplit[0], timeSplit[1])
      if (journey.realtime_observation.stop_time_arrival != undefined) {
        let endTime = new Date( parseInt(journey.realtime_observation.stop_time_arrival.time * 1000));
        console.log(Math.abs(endTime - startTime), startTime, endTime);
        journey.speed = (journey.distance) / (Math.abs(endTime - startTime) / 1000);
        journey.time = (Math.abs(endTime - startTime) / 1000);
        console.log(journey.realtime_observation.vehicle_id);
        if (FLEET_LIST[journey.realtime_observation.vehicle_id] != undefined) {
          journey.engine_type = FLEET_LIST[journey.realtime_observation.vehicle_id]["Engine Rating"];
        } else {
          missing.noVehicle++;
        }
      } else {
        missing.noStopTime++;
      }
    } else {
      missing.noObservation++;
    }
  }
  console.log(needSpeed, missing);

  await dbo.collection("main_collection").insertMany(needSpeed);
  console.log("Finished adding speeds to collection");
  })

  app.get('/calculate_emissions', async (req, res) => {
    let carbonCalc = require("../models/carbon-calc.js");
    let weightFactors = require("../models/weight-factor.js");
    let trips = await dbo.collection("main_collection").aggregate([
      {
        "$limit" : 10
      }
    ]).toArray();
    trips.forEach((element) => {
      let vehicle = FLEET_LIST[element.realtime_observation.vehicle_id];
      let weight_ratio = (0.00004711 * parseInt(vehicle["TARE Weight (Kg)"])) + 0.446;
      // weightFactors.weight_factor(vehicle["Bus Size"], parseInt(vehicle["TARE Weight (KG)"]), parseInt(element["pax_km"]), element.distance); 

      // Change to all pollutants
      for (let p of ["FC", "CO", "CO2-equiv"]) {
        let total = 0;
        if (p === "CO2-equiv") {
          total = carbonCalc.calc_CO2_equiv(element["FC"], element.distance, element.engine_type);
        } else if (element.engine_type === 'ELECTRIC') {
          total = 0;
        } else {
          //Use the emissions profiles from the requires, look at how its done in the index.js
          //Look at getting the information for the emissions profiles id from the trip
          //lookup the function from pollutant_equations
          //yay?
          // let vprof = vehicle.profile[p];
          // let size = vehicle["Bus Size"] === "SV" ? "Small" : "Standard";
          let vprof = config.EMISSION_PROFILES.filter(d => { return d._id.size === "Standard" && d._id.engine === element.engine_type && d._id.Pollutant === p })[0];
          let prof = config.pollutant_equations[vprof.equation];
          let emissions_km = ((1 / 0.835) * prof(element.speed, vprof.a, vprof.b, vprof.c, vprof.d, vprof.e, vprof.f, vprof.g)) / 1000;
          let service = emissions_km * weight_ratio * (element.distance);
          let repos = emissions_km * weight_ratio * (0.15 * element.distance);
          total = service + repos;
        }
        let property = p === "CO2-equiv" ? "CO2" : p;
        element[property] = total;
      }
    });
    console.log(trips);
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
        if (e.date >= "2021-01-13T00:00:00.000Z" && e.date <= "2021-01-23T00:00:00.000Z") {
          let toCheck = e.date.split("T");
          toCheck = toCheck[0].split("-");
          entry.UUID.add(toCheck[0] + toCheck[1] + toCheck[2] + "-" + entry.trip_id);
        }
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
    "tuesday": 6,
    "wednesday": 0,
    "thursday": 1,
    "friday": 2,
    "saturday": 3,
    "sunday": 4,
    "monday": 5,
  }

  let service_days = entry.service_days[0];
  //Get service days
  if (service_days != undefined && service_days != null) {
    for (let d of Object.keys(service_days)) {
      //d is the day of the service from the calendar
      //if true, service is meant to run unless exception is entered
      if (service_days[d] === 1) {
        //Increment the date by a week at a time to make the UUIDs for this range of trips
        for (let dt = new Date(2021, 0, (13 + offsets[d])); dt < new Date(2021, 0, 23); dt.setDate(dt.getDate() + 7)) {
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
 * Generate an array of dates between the start date and end
 * 
 * @param {Date} startDate
 * @param {Date} endDate
 */
function formDateArray(startDate, endDate) {
  let dates = [];
  for (let d = new Date(startDate); d < endDate; d.setDate(d.getDate() + 1)) {
    dates.push(fixDate(d));
  }
  return dates;
}

/**
 * Generate an array of dates between the start date and either the end date or today
 */
function formDateArrayFromQuery(queryDates) {
  let dates = [];
  let dateObj = getDatesFromQueryArray(queryDates);
  try {
    let startDate = dateObj.start, endDate = dateObj.end;
    for (let d = startDate; d < endDate; d.setDate(d.getDate() + 1)) {
      dates.push(fixDate(d));
    }
  } catch (err) {
    console.log(err);
    console.log("An error occured ¯\\_(ツ)_/¯, likely a misformed date array. Please try again.");
  }

  return dates;
}

/**
 * From a string of an array of dates, create js date objects
 * @param {String} queryDates 
 */
function getDatesFromQueryArray(queryDates) {
  let startDate, endDate;
  let q = queryDates.split("[")[1].split("]")[0];
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
  return {start: startDate, end: endDate};
}

function createDateFromStringTimestamp(stringStamp) {
  let dateSelection = stringStamp.split("T")[0].split("-");
  let month = parseInt(dateSelection[1]) - 1;
  return new Date(dateSelection[0], month, dateSelection[2]);
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

function arr_diff(a1, a2) {

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

/**
 * Helper method and variable for managing parallel requests to the AT API
 */

const fetchConfig = {
  method: 'GET', // *GET, POST, PUT, DELETE, etc.
  mode: 'cors', // no-cors, *cors, same-origin
  cache: 'no-cache', // *default, no-cache, reload, force-cache, only-if-cached
  credentials: 'same-origin', // include, *same-origin, omit
  headers: {
    'Content-Type': 'application/json',
    "Ocp-Apim-Subscription-Key": "99edd1e8c5504dfc955a55aa72c2dbac"
    // 'Content-Type': 'application/x-www-form-urlencoded',
  },
  redirect: 'follow', // manual, *follow, error
  referrerPolicy: 'no-referrer', // no-referrer, *no-referrer-when-downgrade, origin, origin-when-cross-origin, same-origin, strict-origin, strict-origin-when-cross-origin, unsafe-url
  //body: JSON.stringify(data) // body data type must match "Content-Type" header
};

async function getMultipleATAPI(url, rtrvTripIDs) {
  let responseArr = [];

  await new Promise(function (resolve) {
    let j = 0;
    let cancelInt = setInterval(() => {
      let data = fetch(url + rtrvTripIDs[j], fetchConfig).then((data) => data.json());
      responseArr.push(data);
      j++;
      if (j == rtrvTripIDs.length) {
        clearInterval(cancelInt);
        resolve();
      }
    }, 150);
  })

  return Promise.all(responseArr)
}

/**
 * Helper method to find the distance of polygon paths and format them 
 * into an array with the corresponding trip_id and shape_id
 * 
 * @param {*} responseArr - The array of responses from the AT API
 * @param {*} tripIDs - The relevant trip ids
 */

function formatTripDistance(responseArr, tripIDs) {
  let tripData = [];
  if (responseArr.length != tripIDs.length) {
    console.log("You've made an error somewhere, Shape and ID arrays not equal lengths");
    return [];
  }
  for (let i = 0; i < tripIDs.length; i++) {
    if (responseArr[i].length != 0) {
      let distance = calcShapeDist(responseArr[i]);
      let shapeID = responseArr[i][0].shape_id;
      tripData.push({ "tripID": tripIDs[i], "shapeID": shapeID, "distance": distance });
    } else {
      tripData.push({ "tripID": tripIDs[i], "shapeID": null, "distance": -1 });
    }
  }
  return tripData
}

/**
 * Helper function to calculate the total distance of a shape file in the following format
 * 
 * [{shape_pt_lon : <coord>, shape_pt_lat: <coord>}, ...]
 */
function calcShapeDist(shape) {
  let distance = 0;
  let lonA, latA, lonB, latB;
  for (let i = 0; i < shape.length - 1; i++) {
    lonA = shape[i].shape_pt_lon;
    latA = shape[i].shape_pt_lat;
    lonB = shape[i + 1].shape_pt_lon;
    latB = shape[i + 1].shape_pt_lat;
    distance += geolib.getDistance([lonA, latA], [lonB, latB]);
  }
  return distance;
}