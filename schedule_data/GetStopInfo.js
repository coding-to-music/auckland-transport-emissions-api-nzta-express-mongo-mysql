/**
 * Script to pull scheduled times and stop sequences from the AT API using trip_ids
 * 
 * Finds the number of stops, the start & end stop ids, and the scheduled time for the trip
 */

//IMPORTS
const fetch = require('node-fetch');
let mysql = require("mysql");

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

    // Use trip_ids to retrieve stop times 
    let dataArr = await retrieveStopData(tripIDs);

    let insertStatement = "INSERT INTO schedule_trips (trip_id, schedule_start_stop_id, schedule_end_stop_id, schedule_number_stops, schedule_time) VALUES ?" + 
    "ON DUPLICATE KEY UPDATE `schedule_start_stop_id` = VALUES(`schedule_start_stop_id`), `schedule_end_stop_id` = VALUES(`schedule_end_stop_id`)," +
    "`schedule_number_stops` = VALUES(`schedule_number_stops`), `schedule_time` = VALUES(`schedule_time`);";

    await postSQLData(insertStatement, dataArr);

    await postSQLData("show warnings;");

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
  while (i < allTripIDs.length) {
  // while (i < 100) { // For Debug purposes
    let endIndex = Math.min(i+interval, allTripIDs.length);
    let selectIDs = allTripIDs.slice(i, endIndex);
    console.log(new Date + "   " + selectIDs[0] + "  " + i + " out of " + allTripIDs.length);
    let apiResponseArr = await getMultipleATAPI(selectIDs);

    apiResponseArr = apiResponseArr.map( (data) => data.response );

    // console.log(apiResponseArr[0]);

    let formatData = formatStopResponse(apiResponseArr);

    // console.log(formatData.length);

    formatData.map( (data) => sqlData.push(data) );

    i += interval;
  }
  resolve(sqlData);
  });
}

async function getMultipleATAPI(retTripIDs) {
  let responseArr = [];
  let i = 0;
  await new Promise( function(resolve) {
    let cancelInt = setInterval(() => {
      let data = fetch(url + retTripIDs[i], fetchConfig).then( (data) => data.json() );
      responseArr.push(data);
      i++;
      if (i == retTripIDs.length) {
        clearInterval(cancelInt);
        resolve();
      }
    }, 150);
  })

  // console.log(responseArr);

  let p = Promise.all(responseArr)

  return p;
}

function formatStopResponse(responseArr) {
  responseArr = responseArr.map( function(stopTimes) {
    let id, noStops, startStop, endStop, scheduleTime;

    if(stopTimes.length == 0) {
      // console.log(stopTimes);
      return [ id, null, null, 0, 0];
    }

    id = stopTimes[0].trip_id;

    noStops = stopTimes.length;

    startStop = stopTimes[0].stop_id;

    endStop = stopTimes[noStops - 1].stop_id;

    scheduleTime = stopTimes[noStops - 1].arrival_time_seconds - stopTimes[0].departure_time_seconds;

    return [ id, startStop, endStop, noStops, scheduleTime];
  } );
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