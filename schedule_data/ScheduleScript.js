/**
 * Script to pull scheduled information from the AT API, process it, and insert it to the mysql database
 * 
 * Currently set up to filter out the trips carried out by:
 *    - Ritchies (agency_id = RTH)
 *    - Howick & Eastern (agency_id = HE)
 * 
 * Note: only pulls the APIs that can be pulled once to retrieve all information.
 * These are:
 *    - trips
 *    - routes
 *    - calendar
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

let key = "99edd1e8c5504dfc955a55aa72c2dbac";
url = '', data = {};

let listOfURLS = ["https://api.at.govt.nz/v2/gtfs/trips", "https://api.at.govt.nz/v2/gtfs/routes", 
                    "https://api.at.govt.nz/v2/gtfs/calendar", "https://api.at.govt.nz/v2/gtfs/calendarDate"];

let operatorList = ["RTH", "HCE"];

if (require.main === module) {
  main();
}

module.exports = function setListOfURLS(parsed) {
  this.listOfURLS = parsed;
}

async function main() {
  // Response Variables
  let trips, routeInfo, calendar, calendarExceptions;
  console.log("starting")

  // retrieveData
  trips = await getATAPI(listOfURLS[0]);
  routeInfo = await getATAPI(listOfURLS[1]);
  calendar = await getATAPI(listOfURLS[2]);
  calendarExceptions = await getATAPI(listOfURLS[3]);

  // console.log(trips.response[0]);
  // console.log(routeInfo.response[0]);
  // console.log(calendar.response[0]);
  // console.log(calendarExceptions.response[0]);

  // Filtering

  routeInfo = routeInfo.response.filter( route => operatorList.includes(route.agency_id) );
  let filteredRouteIDs = routeInfo.map( route => route.route_id );
  trips = trips.response.filter( trip => filteredRouteIDs.includes(trip.route_id) );
  let filteredServiceIDs = trips.map( trip => trip.service_id );
  // calendar = calendar.response.filter( service => filteredServiceIDs.includes(service.service_id) );
  calendarExceptions = calendarExceptions.response.filter( service => filteredServiceIDs.includes(service.service_id) ); 

  // Process into valid form

  // let routeInsert = flattenRoute(routeInfo);
  // let tripInsert = flattenTrips(trips);
  // let calendarInsert = flattenCalendar(calendar);
  let exceptionsInsert = flattenExceptions(calendarExceptions);

  

  // Post to mySql

  // let sqlInsert = "insert into routes (route_id, agency_id, route_short_name, route_long_name) VALUES ? ";
  // postSQLData(sqlInsert, routeInsert);

  // sqlInsert = "insert into schedule_trips (trip_id, route_id, shape_id, service_id, schedule_start_stop_id, schedule_end_stop_id, schedule_number_stops, schedule_time, distance) VALUES ? ";
  // postSQLData(sqlInsert, tripInsert);

  // sqlInsert = "insert into services (service_id, mon, tue, wed, thu, fri, sat, sun, date_start, date_end, date_exceptions) VALUES ? ";
  // postSQLData(sqlInsert, calendarInsert);

  // let dataStr = "";

  // for (let i = 0; i < exceptionsInsert[0].length; i++) {
  //   dataStr += "('"+exceptionsInsert[0][i]+ "', '" +JSON.stringify(exceptionsInsert[1][i]) + "'), "
  // }

  // console.log(dataStr.slice(0,250));

  // let sqlString = "INSERT INTO services (service_id, date_exceptions) VALUES " +
  //                   dataStr.slice(0, dataStr.length-2) +
  //                   " ON DUPLICATE KEY UPDATE `date_exceptions` = VALUES(`date_exceptions`)";

  //console.log(sqlString);

  let doubleCheck = "SELECT * FROM `services` WHERE `service_id` = '1085195742-20201205123725_v95.82'";

  let con = mysql.createConnection(connectionObject);
  con.connect();

  // con.query(sqlString, function (err, results, fields) {
  //   if (err) {
  //       console.log(err.message);
  //   } else {
  //       console.log("execute results: ");
  //       console.log(results);
  // }});

  con.query(doubleCheck, function (err, results, fields) {
    if (err) {
        console.log(err.message);
    } else {
        console.log("execute results: ");
        console.log(results);
  }});

  con.end(function (err) {
    if (err) {
        return console.log(err.message);
    }
  });

}


/* Flatten methods for generating arrays for insertion into mySQL database from API data */

function flattenRoute(routes) {
  flatRoutes = routes.map( function(route) {
    let route_ID, agency_ID, short_name, long_name;

    route_ID = route.route_id;
    agency_ID = route.agency_id;
    short_name = route.route_short_name;
    long_name = route.route_long_name;

    return [ route_ID, agency_ID, short_name, long_name ]
  });
  return flatRoutes;
}


function flattenTrips(scheduledTrips) {
  flatTrips = scheduledTrips.map( function(trip) {
    let trip_id, route_id, shape_id, service_id, start_stop, end_stop, number_stops, schedule_time, distance;

    trip_id = trip.trip_id;
    route_id = trip.route_id;
    shape_id = null;
    service_id = trip.service_id;
    start_stop = null;
    end_stop = null;
    number_stops = null;
    schedule_time = null;
    distance = null;

    return [ trip_id, route_id, shape_id, service_id, start_stop, end_stop, number_stops, schedule_time, distance ];
  });
  return flatTrips
}

function flattenCalendar(serviceSchedule) {
  flatCalendar = serviceSchedule.map( function(service) {
    let service_id, mon, tue, wed, thu, fri, sat, sun, date_start, date_end, date_exceptions;

    service_id = service.service_id;
    mon = service.monday;
    tue = service.tuesday;
    wed = service.wednesday;
    thu = service.thursday;
    fri = service.friday;
    sat = service.saturday;
    sun = service.sunday;
    date_start = service.start_date.slice(0,10);
    date_end = service.end_date.slice(0,10);
    date_exceptions = null;

    return [ service_id, mon, tue, wed, thu, fri, sat, sun, date_start, date_end, date_exceptions ];
  });
  return flatCalendar
}

function flattenExceptions(serviceExceptions) {
  dateExceptions = {};
  serviceExceptions.map( function(data) {
    let service_id = data.service_id;

    if (!Object.keys(dateExceptions).includes(service_id)) {
      dateExceptions[service_id] = []
    }
    dateExceptions[service_id].push(data.date.slice(0,10));
  });
  
  // let exceptionArray = Object.values(dateExceptions).map(d => {"dates" : d});
  //return [ Object.keys(dateExceptions), exceptionArray ]
  return [ Object.keys(dateExceptions), Object.values(dateExceptions) ]
}


/* Method for posting formed arrays into mySQL tables */

function postSQLData(insertStmt, data) {
  let con = mysql.createConnection(connectionObject);
  con.connect();

  

  con.query(insertStmt, [data], function (err, results, fields) {
    if (err) {
        console.log(err.message);
    } else {
        console.log("Row inserted: " + results.affectedRows);
        console.log(results);
    }
  })

  con.end(function (err) {
    if (err) {
        return console.log(err.message);
    }
});
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