// let pool = require("../DB");
// const MongoClient = require("mongodb").MongoClient;
// const assert = require("assert");

// //Connection URL
// const url = "mongodb://localhost27017";

// //"mongodb+srv://chris:<password>@cluster0.l7ehu.mongodb.net/<dbname>?retryWrites=true&w=majority"

// //DB Name
// const dbName = "ate_model";

module.exports = function (conObj) {
    this.pool = conObj ? mysql.createPool(conObj) : mysql.createPool({
        host: "localhost:3306",
        user: "c",
        password: ""
        //"w5eiDgh@39GNmtA",
        //database: "chriswil_ate_model"
      });
    this.data;

    this.getConnection = function(callback) {
        this.pool.getConnection(function(err, connection) {
            if (err) {
                // console.log(chalk.bgYellow.bold('Warning:') + ' Cannot connect to the MySQL server. Error Code: ' + error.code);
                throw err;
            } else {
                console.log(connection);
                // console.log(chalk.bgYellow.bold('Warning:') + ' Cannot connect to the MySQL server. Error Code: ' + error.code);
                callback(null, connection);
            }
        });
    };

    this.executeQuery=function(query,args,callback){
        if (args == null) {
            this.pool.query(query, args, function (err, results) {
              if (err) {
                  console.log("Error executing query " + query);
                  throw err
                };
                console.log("Query : " + results);
                callback(null, results);
            });
        }
        else {
            this.pool.query(query, function (err, results) {
                if (err) {
                    console.log("Error executing query " + query);
                    throw err
                };
                console.log("Query : " + results);
                callback(null, results);
            });
        }        
    }

    this.passToSQL = async function () {

        //Write some query fekkin things

        //save

        //write queries

        //getsomeofthethings

        //createEmissions

        //repost?

    }

    this.createStatement = function() {

    }

    this.insertStatement = async function(sqlStatement, args) {
        con.query(sqlStatement, [args], function (err, results, fields) {
            if (err) {
                console.log(err.message);
            } else {
                console.log("Row inserted: " + results.affectedRows);
                return results;
            }
        })
    }

    this.updateStatement = function() {

    }

    this.selectStatement = async function() {
        
    }

    this.formQuery = function (command, table, whereConds) {
        
    }

    this.filterData = function (filterFunction) {
        data.filter(filterFunction);
    }

    this.execute = function (sqlStatement) {
        // new Promise((resolve, rej) => {
            pool.query(sqlStatement, function (err, results, fields) {
                if (err) {
                    console.log(err.message);
                } else {
                    console.log("execute results: ");
                    console.log(results);
                    // resolve(results);
                    // return results;
                }
            })
        // })
        // return r;
    }

    this.closeConnection = function() {
        con.end(function (err) {
            if (err) {
                return console.log(err.message);
            }
        });
    }
}

Object.defineProperty(this, "pool", {
    get : function() {
        return this.pool;
    },
    set : function(value){
        this.pool = value;
    }
})