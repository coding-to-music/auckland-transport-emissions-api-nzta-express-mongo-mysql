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

let connectionObject = {
  host: "localhost",
  user: "root",
  password: "busemissions123",
  database: "localate"
}

let key = "99edd1e8c5504dfc955a55aa72c2dbac";

let listOfURLS = ["https://api.at.govt.nz/v2/gtfs/trips", "https://api.at.govt.nz/v2/gtfs/routes", "https://api.at.govt.nz/v2/gtfs/shapes/tripId/"];
let operatorList = ["RTH", "HCE"];

if (require.main === module) {
  main();
}

async function main() {
  // Response Variables
  let trips, routeInfo;

  // retrieveData
  trips = await getATAPI(listOfURLS[0]);
  routeInfo = await getATAPI(listOfURLS[1]);

  routeInfo = routeInfo.response.filter( route => operatorList.includes(route.agency_id) );
  let filteredRouteIDs = routeInfo.map( route => route.route_id );
  trips = trips.response.filter( trip => filteredRouteIDs.includes(trip.route_id) );
  let trip_ids = trips.map( trip => trip.trip_id );

  console.log(trip_ids.length);
  // Loop commented out for now, the posts to the SQL db are inconsistent
  for (let i = 0; i < 100; i++) {
    if (i%50 == 0) {console.log("Count: " + i);}
    let id = trip_ids[i];

    shape = await getATAPI(listOfURLS[2] + id);
    shape = shape.response;

    shapeFileSQL = formatShapeSQL(shape);

    await postSQLData(shapeFileSQL);

    let distance = calcShapeDist(shape);

    console.log(distance);

    let insertStatement = "INSERT INTO schedule_trips (trip_id, shape_id, distance) VALUES (?) " + 
                            "ON DUPLICATE KEY UPDATE `shape_id` = VALUES(`shape_id`), `distance` = VALUES(`distance`);";

    await postSQLData(insertStatement, [id, shape[0].shape_id, distance]);
  }

  // let doubleCheck = "SELECT * FROM `shapes` WHERE `shape_id` = '" + shape[0].shape_id + "'";

  // let con = mysql.createConnection(connectionObject);
  // con.connect();

  // con.query(doubleCheck, function (err, results, fields) {
  //   if (err) {
  //       console.log(err.message);
  //   } else {
  //       console.log("execute results: ");
  //       console.log(results);
  // }});

  // con.end(function (err) {
  //   if (err) {
  //       return console.log(err.message);
  //   }
  // });
}



function formatShapeSQL(shape) {
  let dataStr = "('" + shape[0].shape_id + "', '[";

  for (let i = 0; i < shape.length; i++) {
    dataStr += "{\"lat\":\"" + shape[i].shape_pt_lat + "\",\"lon\":\"" + shape[i].shape_pt_lon + "\"},"
  }

  let sqlString = "INSERT INTO shapes (shape_id, shape_path) VALUES " +
                    dataStr.slice(0, dataStr.length-1) +
                    "]') ON DUPLICATE KEY UPDATE `shape_path` = VALUES(`shape_path`)";
  
  return sqlString;
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
  let con = mysql.createConnection(connectionObject);
  return new Promise( function (resolve) {
    con.connect();

    con.query(insertStmt, [data], function (err, results, fields) {
      if (err) {
          console.log(err.message);
          con.end(errFunc);
          setTimeout(() => {
            console.log('resending query');
            postSQLData(insertStmt, data).then( resolve );
          }, 500);
      } else {
          console.log("Row inserted: " + results.affectedRows);
          console.log(results);
          con.end(errFunc);
          resolve();
      }
    });

  })
}

function errFunc (err) {
  if (err) {
    console.log(err.message);
  }
}


/* Function for retrieving data from AT developers API */
  
async function getATAPI(url) {

  console.log("Fetching data");
  const response = await fetch(url, {
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
  });
  console.log("complete");
  return response.json();  
}