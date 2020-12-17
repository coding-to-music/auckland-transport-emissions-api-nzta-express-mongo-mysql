//CONFIG FILE
const config = require('../config.js');

//EXPRESS IMPORTS
const express = require('../node_modules/express')
const app = express();
const bodyParser = require("../node_modules/body-parser");
const router = express.Router();

const path = require('path');

//DB IMPORTS
const MongoClient = require('../node_modules/mongodb').MongoClient;
const client = new MongoClient(config.mongodb.uri, { useUnifiedTopology: true });

app.use(express.static(path.join('public')));
app.use(express.static(path.join('views')));

//Here we are configuring express to use body-parser as middle-ware.
app.use(bodyParser.urlencoded({ extended: true }));
// app.use(bodyParser.json());

client.connect(async (err, db) => {
  let dbo = db.db("ate_model");
  let collection = dbo.collection("realtime_raw");

  app.get('/', (req, res) => {
    //render page
    console.log("Yeow, we running bruh dew.");
    res.sendFile(path.join(__dirname + "/index/index.html"));
  })
  
  app.get('/distinct', async (req, res) => {
    //render page  
      await collection.distinct("UUID", {}, {}, function(err, results) {
        if (err) throw err;
        console.log(results.length)
        res.send(results);
      })
  
      await collection.find({}, {}).toArray((err, docs) => {
        if (err) throw err;
        console.log(docs.length)
      })
  })

  app.get('/test', async (req, res) => {
    let UUID = "20201214-1126203252-20201205123725_v95.82";
    //render page  
      await collection.find({"UUID" : UUID}, {}).toArray(async function(err, results) {
        if (err) throw err;
        console.log(results);
        let stop_time_arrival = {
          "delay" : 1,
          "time" : 1,
          "uncertainty" : 1
        }
        let each = {
          "UUID": results[0].UUID,
          "arrived?": results[0].arrived,
          "stop_id": results[0].stop_id,
          "stop_sequence": results[0].stop_sequence,
          "direction_id": results[0].direction_id,
          "route_id": results[0].route_id,
          "date": results[0].date,
          "start_time": results[0].start_time,
          "trip_id": results[0].trip_id,
          "vehicle_id": results[0].vehicle_id
        };

        let bulk = dbo.collection("realtime_raw").initializeUnorderedBulkOp();
        bulk.find({
          "UUID": each.UUID
        }).updateOne({
          "$set": each
        });

        bulk.execute(async function (err, updateResult) {
          if (err) throw err;
          console.log(err, updateResult);
          await collection.find({"UUID" : each.UUID}, {}).toArray(async function(err, results) {
            if (err) throw err;
            res.send(results);
          })
        })
      })
  })
  
  app.get("/completed_trips", async (req, res) => {
    let dateToCheck = "20201217";

    await collection.find({ "date": dateToCheck }, {}).toArray((err, docs) => {
      if (err) throw err;
      console.log("Total: ", docs.length);
    })

    let query = {
      "UUID": { "$nin": [null] },
      "arrived?": { "$nin": [null] },
      "date": { "$in": [dateToCheck] },
      "direction_id": { "$nin": [null] },
      "route_id": { "$nin": [null] },
      "start_time": { "$nin": [null] },
      "stop_id": { "$nin": [null] },
      "stop_sequence": { "$nin": [null] },
      "stop_time_arrival": { "$nin": [null] },
      "stop_time_arrival.time": { "$nin": [null] },
      "stop_time_arrival.delay": { "$nin": [null] },
      "stop_time_arrival.uncertainty": { "$nin": [null] },
      "trip_id": { "$nin": [null] },
      "vehicle_id": { "$nin": [null] },
    }
    
    await collection.find(query, {}).toArray((err, docs) => {
      if (err) throw err;
      console.log("Complete: ", docs.length);
    })

    let pipeline = [
      {
        "$match": {
          "date": dateToCheck,
          "$or": [
            { "stop_id": { "$in": [null] } },
            { "stop_sequence": { "$in": [null] } },
            { "stop_time_arrival": { "$in": [null] } },
            { "stop_time_arrival.time": { "$in": [null] } },
            { "stop_time_arrival.delay": { "$in": [null] } },
            { "stop_time_arrival.uncertainty": { "$in": [null] } }
          ]
        }
      }
    ]

    let pipeline2 = [
      {
        "$match": {
          "date": dateToCheck,
          // "stop_sequence" : 14,
          "$or": [
            { "stop_id": { "$in": [null] } },
            { "stop_sequence": { "$in": [null] } },
            { "stop_time_arrival": { "$in": [null] } },
            { "stop_time_arrival.time": { "$in": [null] } },
            { "stop_time_arrival.delay": { "$in": [null] } },
            { "stop_time_arrival.uncertainty": { "$in": [null] } }
          ]
        }
      },
      // {
      //   "$project" : {
      //       "start_time" : 1,
      //       "date" : 1,
      //   }
      // },
      {
        "$group": {
          "_id": {
            // "start_time" : "$start_time",
            // "stop_sequence" : "$stop_sequence",
            "stop_id": "$stop_id"
          }
        }
      },
      // {
      //   "" : 
      // }
    ]

    await collection.aggregate(pipeline).toArray((err, docs) => {
      if (err) throw err;
      console.log("No stop time arrival: ", docs.length);
    })

    await collection.aggregate(pipeline2).toArray((err, docs) => {
      if (err) throw err;
      console.log("Stop Sequence 14: ", docs.length);
      res.send(docs);
    })
  })

  //Uses URL format string 
  //articles?year=2016&month=1&day=19
  app.get("/realtime_raw", (req, res) => {
    let response = [];
    let options = req.query === {} ? { "limit": 1 } : {};

    collection.find(req.query, options).toArray((err, docs) => {
      response.push("retrieved docs: ");
      response.push(docs);
      res.send(response);
    });
  })
  
  app.post('/postThat', (req, res) => {
    //code to perform particular action.
    //To access POST variable use req.body()methods.
    console.log(req.body);
      for (let each of req.body) {
        //find entry for trip
        bulk.find({
          "UUID": each.UUID
        }).updateOne({
          "$set": each
        });
        //Upsert entry for trip
        bulk.find({
          "UUID": each.UUID
        }).upsert().updateOne({
          "$setOnInsert": each
        });
      }
      //Call execute
      bulk.execute(function (err, updateResult) {
        console.log(err, updateResult);
        fs.appendFile('realtimeScript/RealtimeScriptLogs.txt',
          new Date() + "\n" + "\tError:" + err + "\n" + "\tResults:\n" + "\t\tInserted: " + updateResult.nInserted + "\n" + "\t\tUpserted: " + updateResult.nUpserted + "\n" + "\t\tMatched: " + updateResult.nMatched + "\n" + "\t\tModified: " + updateResult.nModified + "\n" + "\t\tLastOp: " + updateResult.lastOp + "\n", (err) => {
            if (err) throw err;
          })
        fs.appendFile('realtimeScript/RealtimeScriptLogs.txt',
          "\n", (err) => {
            if (err) throw err;
          })
      });
    })
})

// add router in the Express app.
// app.use("/postDat", router);

app.listen(config.port, () => {
  console.log(`Express App running at http://localhost:${config.port}`);
})

function formGetQuery(endpoint, args) {
  let string = config.host;
  string = string.concat(endpoint);
  if (args != undefined) {
    string = string + "?";
  }
  for (let arg in args) {
    if (args[Object.keys(args)[0]] === args[arg]) {
      string = string.concat(arg + "=" + args[arg]);
    } else {
      string = string.concat("&" + arg + "=" + args[arg]);
    }
  }
  return string;
}