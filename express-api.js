//EXPRESS IMPORTS
const express = require('./node_modules/express')
const app = express()
const port = 3000

//DB IMPORTS
const MongoClient = require('mongodb').MongoClient;
const uri = "mongodb+srv://chris:YFwh2XjNZ2XY8cv9@cluster0.l7ehu.mongodb.net/ate_model?retryWrites=true&w=majority";
const client = new MongoClient(uri, { useUnifiedTopology: true });

//SCRIPT


app.get('/', (req, res) => {
    //render page
})

app.listen(port, () => {
  console.log(`Express App running at http://localhost:${port}`);
})

//Uses URL format string 
//articles?year=2016&month=1&day=19
app.get("/trips", (req, res) => {
  res.send(req.query);
})