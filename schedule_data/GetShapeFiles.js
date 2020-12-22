/**
 * Script to pull shapefiles from the AT API using trip_ids
 * 
 * The distances of each trips is calculated from the shapefile.
 * The distances and shapefiles are posted to the mySQL database.
 */

//IMPORTS
const fetch = require('node-fetch');
const geolib = require('geolib');
let mysql = require("mysql");

let connectionObject = {
  host: "localhost",
  user: "root",
  password: " ",
  database: "localate"
}

var pool = mysql.createPool(connectionObject);

let key = "99edd1e8c5504dfc955a55aa72c2dbac";

let url = "https://api.at.govt.nz/v2/gtfs/shapes/tripId/";

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
  // Find trip IDs without distance information
  let tripSelectStm = 'SELECT trip_id FROM schedule_trips WHERE distance IS NULL;';

  pool.query(tripSelectStm, async function(err, results) {
    if (err) {
      console.log(err.message);
      console.log("Exiting script");
      return;
    } 
    let allTripIDs = results.map( (d) => d.trip_id );
    // console.log(tripIDs);
    let i = 0;
    let interval = 25;

    while (i < allTripIDs.length) {
    // while (i < 100) { // For Debug purposes
      let endIndex = Math.min(i+interval, allTripIDs.length);
      let selectIDs = allTripIDs.slice(i, endIndex);
      console.log(new Date + "   " + selectIDs[0] + "  " + i + " out of " + allTripIDs.length);

      // Use trip_ids to retrieve shape files
      let apiResponseArr = await getMultipleATAPI(selectIDs);
      apiResponseArr = apiResponseArr.map( (data) => data.response );
      let noNullResponse = apiResponseArr.filter( (el) => el.length != 0 );
      console.log(apiResponseArr.length, noNullResponse.length);

      // Insert into shapes table
      for (let i = 0; i < noNullResponse.length; i++) {
        let shapeInsert = formatShapeSQL(noNullResponse[i]);
        await postSQLData(shapeInsert);
      }
      
      // Insert into schedule_trips table
      let dataArr = formatTripEntry(apiResponseArr, selectIDs);
      let insertStatement = "INSERT INTO schedule_trips (trip_id, shape_id, distance) VALUES ? " + 
                            "ON DUPLICATE KEY UPDATE `shape_id` = VALUES(`shape_id`), `distance` = VALUES(`distance`);";  
      await postSQLData(insertStatement, dataArr);

      i += interval;
    }

    pool.end( function (err) {
      if (err) {
        console.log(err.message);
      } 
    })
  });
}




async function getMultipleATAPI(retTripIDs) {
  let responseArr = [];
  await new Promise( function(resolve) {
    let j = 0;
    let cancelInt = setInterval(() => {
      let data = fetch(url + retTripIDs[j], fetchConfig).then( (data) => data.json() );
      responseArr.push(data);
      j++;
      if (j == retTripIDs.length) {
        clearInterval(cancelInt);
        resolve();
      }
    }, 150);
  })

  // console.log(responseArr);

  return Promise.all(responseArr)
}



function formatShapeSQL(shape) {
  let dataStr = "('" + shape[0].shape_id + "', '[";

  for (let i = 0; i < shape.length; i++) {
    dataStr += "{\"lat\":\"" + shape[i].shape_pt_lat + "\",\"lon\":\"" + shape[i].shape_pt_lon + "\"},"
  }

  let sqlString = "INSERT INTO shapes (shape_id, shape_path) VALUES " +
                    dataStr.slice(0, dataStr.length-1) + // Remove trailing comma
                    "]') ON DUPLICATE KEY UPDATE `shape_path` = VALUES(`shape_path`)";
  
  return sqlString;
}

function formatTripEntry(responseArr, tripIDs) {
  let tripData = [];
  if( responseArr.length != tripIDs.length) {
    console.log("You've made an error somewhere");
  }
  for (let i = 0; i < tripIDs.length; i++) {
    if(responseArr[i].length != 0) {
      let distance = calcShapeDist(responseArr[i]);
      let shapeID = responseArr[i][0].shape_id;
      tripData.push([tripIDs[i], shapeID, distance]);
    } else {
      tripData.push([tripIDs[i], null, 0]);
    }
  }
  return tripData
}


function calcShapeDist(shape) {
  let distance = 0;
  let lonA, latA, lonB, latB;
  for (let i = 0; i < shape.length - 1; i++) {
    lonA = shape[i].shape_pt_lon;
    latA = shape[i].shape_pt_lat;
    lonB = shape[i+1].shape_pt_lon;
    latB = shape[i+1].shape_pt_lat;
    distance += geolib.getDistance([lonA, latA], [lonB, latB]);
  }
  return distance;
}

/* Method for posting formed arrays into mySQL tables */

function postSQLData(insertStmt, data = null) {
  return new Promise( function (resolve, reject) {
    pool.query(insertStmt, [data], function (err, results, fields) {
      if (err) {
          console.log(err.message);
      } else {
          if (data != null) {console.log(results);}
          resolve();
      }
    });
  })
}