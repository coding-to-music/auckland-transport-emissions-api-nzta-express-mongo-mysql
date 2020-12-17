/**
 * Script to pull shapefiles from the AT API using trip_ids
 * 
 * The distances of each trips is calculated from the shapefile.
 * The distances and shapefiles are posted to the mySQL database.
 */

//IMPORTS
const fetch = require('node-fetch');
const geolib = require('geolib');
let sqlManager = require('../SQLManagment.js');
let sqlInstance = new sqlManager();
let mysql = require("mysql");
const { start } = require('repl');

let connectionObject = {
  host: "localhost",
  user: "root",
  password: " ",
  database: "localate"
}

var pool = mysql.createPool(connectionObject);

let key = "99edd1e8c5504dfc955a55aa72c2dbac";

let url = "https://api.at.govt.nz/v2/gtfs/stopTimes/tripId/";

var fetchConfig = {
  method: 'GET', // *GET, POST, PUT, DELETE, etc.
  mode: 'cors', // no-cors, *cors, same-origin
  cache: 'no-cache', // *default, no-cache, reload, force-cache, only-if-cached
  credentials: 'same-origin', // include, *same-origin, omit
  headers: {
    'Content-Type': 'application/json',
    "Ocp-Apim-Subscription-Key": key
    // 'Content-Type': 'application/x-www-form-urlencoded',
  },
  redirect: 'follow', // manual, *follow, error
  referrerPolicy: 'no-referrer', // no-referrer, *no-referrer-when-downgrade, origin, origin-when-cross-origin, same-origin, strict-origin, strict-origin-when-cross-origin, unsafe-url
  //body: JSON.stringify(data) // body data type must match "Content-Type" header
};

if (require.main === module) {
  main();
}

async function main() {
  // Find trip IDs without stop information
  let tripSelectStm = 'SELECT trip_id FROM schedule_trips WHERE schedule_time IS NULL;';

  pool.query(tripSelectStm, async function(err, results) {
    if (err) {
      console.log(err.message);
      console.log("Exiting script");
      return;
    } 
    let tripIDs = results;
    tripIDs = tripIDs.map( (d) => d.trip_id );
    // console.log(tripIDs);

    // Use trip_ids 
    let dataArr = await retrieveStopData(tripIDs);

    let insertStatement = "INSERT INTO schedule_trips (trip_id, schedule_start_stop_id, schedule_end_stop_id, schedule_number_stops, schedule_time) VALUES ?" + 
    "ON DUPLICATE KEY UPDATE `schedule_start_stop_id` = VALUES(`schedule_start_stop_id`), `schedule_end_stop_id` = VALUES(`schedule_end_stop_id`)," +
    "`schedule_number_stops` = VALUES(`schedule_number_stops`), `schedule_time` = VALUES(`schedule_time`);";

    await postSQLData(insertStatement, dataArr);

    // await postSQLData("show warnings;");

    pool.end( function (err) {
      if (err) {
        console.log(err.message);
      } 
    })
  });
}


async function retrieveStopData (allTripIDs) {
  return new Promise( async function (resolve, reject) {
  let i = 0;
  let interval = 20;
  let sqlData = [];
  // while (i < allTripIDs.length) {
  while (i < 100) {
    let endIndex = Math.min(i+interval, allTripIDs.length);
    let selectIDs = allTripIDs.slice(i, endIndex);
    console.log(selectIDs[0]);
    let apiResponseArr = await getMultipleATAPI(selectIDs);

    apiResponseArr = apiResponseArr.map( (data) => data.response );

    // console.log(apiResponseArr);

    let formatData = formatStopResponse(apiResponseArr);

    // console.log(formatData);

    formatData.map( (data) => sqlData.push(data) );

    i += interval;
  }
  resolve(sqlData);
  });
}

function getMultipleATAPI(retTripIDs) {
  let responseArr = [];
  for (let i = 0; i < retTripIDs.length; i++) {
    let data = setTimeout( () => fetch(url + retTripIDs[i], fetchConfig).then(response => response.json())
    , 100);
    responseArr.push(data);
  }
  // console.log(responseArr);
  return Promise.all(responseArr);
}

function formatStopResponse(responseArr) {
  responseArr = responseArr.map( function(stopTimes) {
    let id, noStops, startStop, endStop, scheduleTime;

    id = stopTimes[0].trip_id;

    noStops = stopTimes.length;

    startStop = stopTimes[0].stop_id;

    endStop = stopTimes[noStops - 1].stop_id;

    scheduleTime = stopTimes[noStops - 1].arrival_time_seconds - stopTimes[0].departure_time_seconds;

    return [ id, startStop, endStop, noStops, scheduleTime];
  } );
  // console.log(responseArr)
  return responseArr;
};


/* Method for posting formed arrays into mySQL tables */

function postSQLData(insertStmt, data) {
  return new Promise( function (resolve, reject) {
    pool.query(insertStmt, [data], function (err, results, fields) {
      if (err) {
          console.log(err.message);
      } else {
          console.log(results);
          resolve();
      }
    });

  })
}