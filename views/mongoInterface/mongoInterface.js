import {getFrom, fixDate} from "../js/helpers.js";
import {html} from "../js/console.js";

const URL = "http://localhost:3000";

//Range of dates for the get raw query
let DATES = null;

document.addEventListener("DOMContentLoaded", () => {
  init();
})

function init() {
  let rawToFinalButton = document.createElement("BUTTON");
  let finalToRawButton = document.createElement("BUTTON");
  let generateScheduleButton = document.createElement("BUTTON");
  let downloadRawDataButton = document.createElement("BUTTON");

  rawToFinalButton.innerHTML = "Raw to Final Pipeline";
  finalToRawButton.innerHTML = "Final to Raw Pipeline";
  generateScheduleButton.innerHTML = "Generate Schedule";
  downloadRawDataButton.innerHTML = "Download Raw Data";

  rawToFinalButton.onclick = compareFinalToRaw;
  finalToRawButton.onclick = compareRawToFinal;
  generateScheduleButton.onclick = generateSchedule;
  downloadRawDataButton.onclick = downloadRawData;

  let element2 = document.getElementsByClassName('button-container');
  element2[0].appendChild(rawToFinalButton);
  element2[0].appendChild(finalToRawButton);
  element2[0].appendChild(generateScheduleButton);
  element2[0].appendChild(downloadRawDataButton);

  createDatePickers();
}

/**
 * 
 */ 
async function generateSchedule() {
  html.log("Generating schedule from AT API");
}

async function downloadRawData() {
  let startMessage = "retrieving data from mongoDB";
  startMessage = DATES != null ? startMessage + " for dates " + DATES : startMessage;
  html.log(startMessage);
  let searchURL = URL + "/get_raw_data?download=true";
  if (DATES != null) {
    searchURL = searchURL + "&dates=[" + DATES[0];
    console.log(DATES[1]);
    searchURL = DATES[1] != "undefined/undefined/" ? searchURL + "," + DATES[1] : searchURL;
    searchURL = searchURL + "]"
  }
  console.log(searchURL);
  let f = await getFrom(searchURL);
  html.log(f);
}

/**
 * Uses: raw_w_routes
 * Compares: final_trip_UUID_set
 */
async function compareRawToFinal() {
  html.log("Starting raw to final comparison pipeline");
}

/**
 * Uses: final_trip_UUID_set
 * Compares: raw_w_routes
 */
async function compareFinalToRaw() {
  console.log("Starting final to raw comparison");
}

async function compareUUIDs() {
  console.log("Starting comparing UUIDs");

}

function createDatePickers() {
  let container = document.getElementById("console-container__console");
  //Start date and label
  let startPicker = document.createElement("INPUT");
  startPicker.type="date";
  startPicker.id="start";
  startPicker.name="trip-start";
  startPicker.min="2020-12-23";
  startPicker.max="2021-01-23";
  let startLabel = document.createElement("LABEL");
  startLabel.for = "start";
  startLabel.innerHTML = "Start date: ";
  container.appendChild(startLabel);
  container.appendChild(startPicker);
  //End date and label
  let endPicker = document.createElement("INPUT");
  endPicker.type="date";
  endPicker.id="end";
  endPicker.name="trip-end";
  endPicker.min="2020-12-23";
  endPicker.max="2021-01-23";
  let endLabel = document.createElement("LABEL");
  endLabel.for = "end";
  endLabel.innerHTML = "End date: ";
  container.appendChild(endLabel);
  container.appendChild(endPicker);

  //Reset buttons
  let setDatesButton = document.createElement("BUTTON");
  setDatesButton.innerHTML = "Set dates";
  setDatesButton.onclick = setDates;
  container.appendChild(setDatesButton);
  let clearDatesButton = document.createElement("BUTTON");
  clearDatesButton.innerHTML = "Clear dates";
  clearDatesButton.onclick = clearDates;
  container.appendChild(clearDatesButton);
}

function setDates() {
  let start = document.getElementById("start"), end = document.getElementById("end");
  let startDate = start.value === undefined ? "23/12/2020" : start.value.split("-")[2] + "/" + start.value.split("-")[1] + "/" + start.value.split("-")[0];
  let endDate = end.value === undefined ? "23/01/2021" : end.value.split("-")[2] + "/" + end.value.split("-")[1] + "/" + end.value.split("-")[0];;
  DATES = [startDate, endDate];
}

function clearDates() {
  document.getElementById("start").value = undefined;
  document.getElementById("end").value = undefined;
  DATES = null;
}