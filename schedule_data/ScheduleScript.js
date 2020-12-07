/**
 * Script to pull schedule information from the AT API and insert it to the mysql database
 * 
 * Currently set up to filter out the trips carried out by:
 *    - Ritchies (agency_id = RTH)
 *    - Howick & Eastern (agency_id = HE)
 * 
 * Note: only pulls the APIs that can be pulled once to retrieve all information.
 * These are:
 *    - trips
 *    - routes
 *    - 
 */

//IMPORTS
const fetch = require('../node_modules/node-fetch');
let sqlManager = require('../SQLManagment.js');
let sqlInstance = new sqlManager();
let mysql = require("../node_modules/mysql");

let connectionObject = {
  host: "johnny.heliohost.org",
  user: "chriswil_1",
  password: "w5eiDgh@39GNmtA",
  database: "chriswil_ate_model"
}

let key = "b9f2e4f0b5e140b79a698c0bb9298a7f";
url = '', data = {};

let listOfURLS = ["https://api.at.govt.nz/v2/gtfs/trips", "https://api.at.govt.nz/v2/gtfs/routes", 
                    "https://api.at.govt.nz/v2/gtfs/calendar", "https://api.at.govt.nz/v2/gtfs/versions"];

/*let promise = new Promise((res, rej) => {
    getATAPI(listOfURLS[0]).then(data=> {
        processTripRecords(data);
    });
    res();
});*/

agencyCheck();

async function agencyCheck() {
  let trips = await getATAPI(listOfURLS[0]);
  let routeInfo = await getATAPI(listOfURLS[1]);
  let HEcount = 0;
  let RTHcount = 0;

  for (let trip of trips.response) {
    let route_number = trip["route_id"];
    let route = routeInfo.response.find( element => element["route_id"] == route_number);
    let agency = route["agency_id"];
    if (agency == "HE") { HEcount = HEcount + 1; }
    if (agency == "RTH") { RTHcount = RTHcount + 1; }
  }

  console.log(HEcount, RTHcount);

  processTripRecords(trips.response)
}

  
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
  return response.json();  
}

function processTripRecords(data) {
    console.log(data);
    console.log("done");
    

    /*
    console.log(flat);
    sqlInstance.createConnection(connectionObject);
    let insertStmt = "insert into schedule_trips (trip_ID, service_ID, route_ID, shape_ID) VALUES ? "
    sqlInstance.insertStatement(insertStmt, flat);
  
    sqlInstance.execute("SELECT * FROM realtime_raw;");*/
}