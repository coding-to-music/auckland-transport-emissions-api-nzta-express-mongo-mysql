//IMPORTS
const fetch = require('node-fetch');
let sqlManager = require('./SQLManagment.js');
let sqlInstance = new sqlManager();
let mysql = require("mysql");

let key = "b9f2e4f0b5e140b79a698c0bb9298a7f";
url = '', data = {};

let listOfURLS = ["https://api.at.govt.nz/v2/gtfs/trips", "https://api.at.govt.nz/v2/gtfs/routes", "https://api.at.govt.nz/v2/gtfs/calendar", "https://api.at.govt.nz/v2/gtfs/versions", ""];
let answers = {};

let tableOfGODS = [];

let promise = new Promise((res, rej) => {
  callTripUpdates().then(data=> {
    onDataReceieved(data);
  });
  res();
});

function onDataReceieved(data) {
  console.log(data);

  //Get data to post

  let insertStmt = "insert into realtime() VALUES ? ";
  let entries; //Some array that stores rows, eg [ [timedpt, timearv, vehicle], [timedpt, timearv, vehicle] ]

  
}

async function callTripUpdates() {
  const response = await fetch("https://api.at.govt.nz/v2/public/realtime/tripupdates?", {
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
  // .then(
  //   function (response) {
  //     response.json().then(function (data) {
  //       return data;
  //     }); // parses JSON response into native JavaScript objects)
  //   }
  // )
}

function createEmissions(app_emissions) {
    app_emissions.map(d => {
        // Identify vehicles not found in the {fleet list} or {pseudo fleet}
        // Remove non bus vehicles  such as trains and ferries
      
        d.trips = d.trips.filter(t => t["vehicle"] in this.vehicles)
      
        // Calculate emissions for each trip
        d.trips.forEach(t => {
          let v_id = t["vehicle"]
          let vehicle = this.vehicles[v_id]
      
          let distance = t["distance"] // Trip distance in meters
          let time = t["time"] // Scheduled trip time in seconds
          let speed = Math.round(distance / time * 3.6) // Kmph
      
          //Identify the tareweight
          // For trips with unknown (e.g. some PrePTOM) vehicles, use average tareweight (pre/post PTOM) 
          let col = d._id.Date < "2018/07/01" ? this.tareWeightPrePTOM : this.tareWeightPostPTOM;
      
          // Lookup tareweight from fleet list using unique vehicle id.
          let tareWeight = !(vehicle["TARE Weight (KG)"].startsWith("U")) ? parseInt(vehicle["TARE Weight (KG)"]) : col[vehicle["Engine Rating"]]["TARE Weight (KG)"];
      
          // Get the functions for calculating each pollutants kg/km value based on average trip speed
          let profiles = vehicle.profile;
      
          // Assign variables to the trip object
          t.type = vehicle["Engine Rating"];
          t.speed = speed;
      
          // Calculate the weight ratio based on 
          let weight_ratio = weight_factor(vehicle["Bus Size"], tareWeight, t['pax_km'], distance);        
      
          if (Object.keys(profiles).length || t.type === "ELECTRIC") {
            for (let p of pollutants) {
              // IF the pollutant is of type Fuel Consumption then assign a unit conversion from
              let volume_conversion = (p == "FC") ? 1/0.835 : 1 // kg to litres of diesel consumed
              let total;
              if (p === "CO2-equiv") { // Calculate CO2-equiv
                total = calc_CO2_equiv(t["FC"], distance / 1000, t.type); // kg CO2-equiv based on total FC
              } else if (t.type === "ELECTRIC") {
                total = 0;
              } else {
                let emissionPerKm = (volume_conversion * profiles[p](speed)) / 1000;
                let service = emissionPerKm * weight_ratio['loaded'] * (distance / 1000);
                let reposition = emissionPerKm * weight_ratio['empty'] * (0.15 * distance / 1000);
                total = service + reposition;
              }
              if (Number.isNaN(total)) {
                total = 0
              }
              // Set the trips pollutant variable to the calculated value
              t[p] = total
            }
            // Calculate Car Equivilent Emission CO2
            if (t['CO2-equiv'] != undefined) {
              t['pax_CO2_per_km'] = (t['CO2-equiv'] / t['pax_km']); // kg CO2-equiv per person per km
              if (!isFinite(t['pax_CO2_per_km'])) { 
                t['pax_CO2_per_km'] = t['CO2-equiv'] / (distance / 1000) 
              }
              t['trip_offset'] = (t['pax_km'] * AVERAGE_LV_EMISSIONS) / 1000; // kg CO2 car equivilent Emissions for each trip
            }
          }
        })
      })
}

this.weight_factor = function(size, weight, passengerKm, serviceKm) {
    let tareFactor;
    let loadedfactor;

    // Calculate average passenger loading for each trip
    let avePaxLoading = passengerKm ? passengerKm / serviceKm : 0;

    // Calculate average weight including average passenger loading mass 
    let loadedWeight = weight + (avePaxLoading * PASSENGER_WEIGHT);

    // Emissions Impossible weighted ratio based on small or large vehicle
    if (size == "SV"){
        tareFactor = 1;
        loadedfactor = 1 + (loadedWeight / weight);
    }else{
        // If a standard sized vehicle, use a linear increasing factor that increases dependant on vehicle mass. (Emissions Impossible)
        tareFactor = (0.00004711 * weight) + 0.446;
        loadedfactor = (0.00004711 * loadedWeight) + 0.446;
    }
    return { 'empty': tareFactor, 'loaded': loadedfactor}
}

function weight_factor(size, weight, passengerKm, serviceKm) {
    let tareFactor;
    let loadedfactor;
  
    // Calculate average passenger loading for each trip
    let avePaxLoading = passengerKm ? passengerKm / serviceKm : 0;
  
    // Calculate average weight including average passenger loading mass 
    let loadedWeight = weight + (avePaxLoading * PASSENGER_WEIGHT);
  
    // Emissions Impossible weighted ratio based on small or large vehicle
    if (size == "SV"){
      tareFactor = 1;
      loadedfactor = 1 + (loadedWeight / weight);
    }else{
      // If a standard sized vehicle, use a linear increasing factor that increases dependant on vehicle mass. (Emissions Impossible)
      tareFactor = (0.00004711 * weight) + 0.446;
      loadedfactor = (0.00004711 * loadedWeight) + 0.446;
    }
  
    return { 'empty': tareFactor, 'loaded': loadedfactor}
}