//Node imports
const fs = require('fs');

//CONFIG FILE
const config = require('../config.js');

// Set parameters for profiles

let speeds = [20, 22, 24, 26, 28, 30]; // kmh

let euroTypes = ["EURO3", "EURO4", "EURO5", "EURO6"];

let pollutants = ["NOx", "PM"];

let emissionProfiles = [];

let CSVHeaders = (["Engine_type", "Speed"]).concat(pollutants);

// Calculate emission profiles

const DIESEL_DENSITY = 0.835;

for (let speed of speeds) {
for (let engine_type of euroTypes) {
    // Set up profile (single row in CSV)
    let profile = {};
    profile["Speed"] = speed;
    profile["Engine_type"] = engine_type;

    for (let p of pollutants) {

        let vprof = config.EMISSION_PROFILES.filter(d => { return d._id.size === "Standard" && d._id.engine === engine_type && d._id.Pollutant === p })[0];
        let prof = config.pollutant_equations[vprof.equation];

        // The formula calculates g per km
        let emissions_per_km = prof(speed, vprof.a, vprof.b, vprof.c, vprof.d, vprof.e, vprof.f, vprof.g);

        if (p === "FC") { emissions_km = emissions_km / DIESEL_DENSITY }; // Convert from litres to kg of fuel consumed

        emissions_per_km = Math.round(emissions_per_km * 100) / 100;
        
        profile[p] = emissions_per_km; //  in g per km
    }

    emissionProfiles.push(profile);
}
}

// Write profiles to csv-formatted string then 
let csvString = "";

for (let head of CSVHeaders) {
    csvString += head;
    csvString += ',';
}

csvString = csvString.slice(0, -1);
csvString += "\n";

for (let profile of emissionProfiles) {
    for (let head of CSVHeaders) {
        csvString += profile[head];
        csvString += ',';
    }
    csvString = csvString.slice(0, -1);
    csvString += "\n";
}

fs.writeFileSync('Generated_Emission_Profiles.csv', csvString);
console.log("Completed");