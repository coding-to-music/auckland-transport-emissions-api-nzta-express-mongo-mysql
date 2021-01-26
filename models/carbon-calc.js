/** Conversion factors */
const CO2 = {
    "FUEL"  : 3.17231,              // * FC * DIST
    "LUBE"  : 0.265170857776354,    // * DIST
    "ELECTRIC" : 119                // * DIST
}
const CH4 = {
    "PRE-EURO"  : 0.175,            // * DIST
    "EURO1"     : 0.175,
    "EURO2"     : 0.11375,
    "EURO3"     : 0.10325,
    "EURO4"     : 0.00525,
    "EURO5"     : 0.00525,
    "EURO6"     : 0.00525,
    "CO2_FACTOR": 25
}
const N2O = {
    "PRE-EURO"  : 0.030,            // * DIST
    "EURO1"     : 0.012,
    "EURO2"     : 0.012,
    "EURO3"     : 0.006,
    "EURO4"     : 0.0128,
    "EURO5"     : 0.0332,
    "EURO6"     : 0.0415,
    "CO2_FACTOR": 298
}
const DIESEL_DENSITY = 835          // grams per litre

/** Calculate total CO2-equivalent for a given trip 
 *    fuel in litres
 *    distance in kilometres
*/
function calc_CO2_equiv(fuel, distance, euro_rating) {
    if(euro_rating === 'ELECTRIC') { return (distance*CO2['ELECTRIC']/1000); }
    let fuelEmissions = calc_CO2_fuel(fuel);
    let oilEmissions = calc_CO2_oil(distance);
    let N2OEmissions = calc_N2O(distance, euro_rating) * N2O['CO2_FACTOR'];
    let CH4Emissions = calc_CH4(distance, euro_rating) * CH4['CO2_FACTOR'];
    let totalKgCO2 = (fuelEmissions + oilEmissions + N2OEmissions + CH4Emissions)/1000;
    return totalKgCO2;
}

function calc_CO2_fuel(fuel_volume) {
    return (fuel_volume * DIESEL_DENSITY * CO2['FUEL']);
}

function calc_CO2_oil(distance) {
    return (distance * CO2['LUBE']);
}

function calc_N2O(distance, euro) {
    return (distance * N2O[euro]);
}

function calc_CH4(distance, euro) {
    return (distance * CH4[euro]);
}

exports.calc_CO2_equiv = calc_CO2_equiv;