const URL = "http://localhost:3000";

init();

function init() {
  let rawToFinalButton = document.createElement("BUTTON");
  let finalToRawButton = document.createElement("BUTTON");
  let generateSchedule = document.createElement("BUTTON");
  let downloadRawData = document.createElement("BUTTON");

  rawToFinalButton.innerHTML = "Raw to Final Pipeline";
  finalToRawButton.innerHTML = "Final to Raw Pipeline";
  generateSchedule.innerHTML = "Generate Schedule";
  downloadRawData.innerHTML = "Download Raw Data";

  rawToFinalButton.onclick = compareFinalToRaw();
  finalToRawButton.onclick = compareRawToFinal();
  generateSchedule.onclick = generateSchedule();
  downloadRawData.onclick = downloadRawData();
}


async function generateSchedule() {
  console.log("Generating schedule from AT API");
}

async function downloadRawData() {
  console.log("retrieving data from mongoDB");
  let f = await getFrom(URL + "/get_raw_data");
  console.log(f);
}

/**
 * Uses: raw_w_routes
 * Compares: final_trip_UUID_set
 */
async function compareRawToFinal() {
  console.log("Starting raw to final comparison pipeline");

}

/**
 * Uses: final_trip_UUID_set
 * Compares: raw_w_routes
 */
async function compareFinalToRaw() {
    
}