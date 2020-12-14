//EXPRESS IMPORTS
const express = require('express')
const app = express()
const port = 3000

//DB IMPORTS
const SQLManagment = require("./SQLManagment");
const pool = new SQLManagment();

//SCRIPT
const realtime = require("./realtimeScript/RealtimeScript.js");

app.get('/', (req, res) => {
    realtime();
})

app.listen(port, () => {
  console.log(`Example app listening at http://localhost:${port}`)
})

app.get("/con1/:start-date/", (req, res) => {

})