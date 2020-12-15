//EXPRESS IMPORTS
const express = require('./node_modules/express')
const app = express()
const port = 3000
const bodyParser = require("body-parser");
const router = express.Router();

//DB IMPORTS
const MongoClient = require('mongodb').MongoClient;
const uri = "mongodb+srv://chris:YFwh2XjNZ2XY8cv9@cluster0.l7ehu.mongodb.net/ate_model?retryWrites=true&w=majority";
const client = new MongoClient(uri, { useUnifiedTopology: true });

//Here we are configuring express to use body-parser as middle-ware.
app.use(bodyParser.urlencoded({ extended: true }));
// app.use(bodyParser.json());

app.get('/', (req, res) => {
  //render page
  res.send("Yeow, we running bruh dew.")
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

app.post('/postThat',(req,res) => {
    //code to perform particular action.
    //To access POST variable use req.body()methods.
    console.log(req.body);
    // res.send(req);
    res.sendStatus(200);
});

// add router in the Express app.
// app.use("/postDat", router);

app.listen(port, () => {
  console.log(`Express App running at http://localhost:${port}`);
})
