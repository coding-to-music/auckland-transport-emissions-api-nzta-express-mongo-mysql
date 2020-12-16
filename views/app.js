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
const client = new MongoClient(config.uri, { useUnifiedTopology: true });

app.use(express.static(path.join('public')));
app.use(express.static(path.join('views')));

//Here we are configuring express to use body-parser as middle-ware.
app.use(bodyParser.urlencoded({ extended: true }));
// app.use(bodyParser.json());

app.get('/', (req, res) => {
  //render page
  console.log("Yeow, we running bruh dew.");
  res.sendFile(path.join(__dirname + "/index/index.html"));
})

app.get('/distinct', (req, res) => {
  //render page
  client.connect(async (err, db) => {
    let dbo = db.db("ate_model");
    let collection = dbo.collection("realtime_raw");

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
})

app.get("/completed_trips", (req, res) => {
  client.connect(async (err, db) => {
    let dbo = db.db("ate_model");
    let collection = dbo.collection("realtime_raw");

    await collection.find({"date" : "20201215"}, {}).toArray((err, docs) => {
      if (err) throw err;
      console.log("Total: ", docs.length);
    })
    let query = {
      "UUID" : {"$nin" : [null]},
      "arrived?" : {"$nin" : [null]},
      "date" : {"$in" : ["20201215"]},
      "direction_id" : {"$nin" : [null]},
      "route_id" : {"$nin" : [null]},
      "start_time" : {"$nin" : [null]},
      "stop_id" : {"$nin" : [null]},
      "stop_sequence" : {"$nin" : [null]},
      "stop_time_arrival" : {"$nin" : [null]},
      "stop_time_arrival.time" : {"$nin" : [null]},
      "stop_time_arrival.delay" : {"$nin" : [null]},
      "stop_time_arrival.uncertainty" : {"$nin" : [null]},
      "trip_id" : {"$nin" : [null]},
      "vehicle_id" : {"$nin" : [null]},
    }
    await collection.find(query, {}).toArray((err, docs) => {
      if (err) throw err;
      console.log("Complete: ", docs.length);
    })
  })
})

//Uses URL format string 
//articles?year=2016&month=1&day=19
app.get("/realtime_raw", (req, res) => {
  let response = [];
  client.connect(async (err, db) => {
    let dbo = db.db("ate_model");
    let collection = dbo.collection("realtime_raw");

    let options = req.query === {} ? {"limit": 1} : {};

    collection.find(req.query, options).toArray((err, docs) => {
      response.push("retrieved docs: ");
      response.push(docs);
      res.send(response);
    });
  })
})

app.post('/postThat', (req, res) => {
  //code to perform particular action.
  //To access POST variable use req.body()methods.
  console.log(req.body);
  client.connect(async (err, db) => {
    let dbo = db.db("ate_model");
    let bulk = dbo.collection("realtime_raw").initializeOrderedBulkOp();

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
});

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