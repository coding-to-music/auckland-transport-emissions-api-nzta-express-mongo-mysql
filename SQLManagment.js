// let pool = require("../DB");
let mysql = require("mysql");

module.exports = function () {
    this.pool = mysql.createPool({
        connectionLimit: 40,
        host: "johnny.heliohost.org",
        user: "chriswil_1",
        password: "w5eiDgh@39GNmtA",
        database: "chriswil_ate_model"
      });
    this.data;

    this.executeQuery=function(query,args,callback){
        this.pool.getConnection(function(err,connection){
            if (err) {
              connection.release();
              throw err;
            }   
            connection.query(query,[args],function(err,rows){
                connection.release();
                if(!err) {
                    callback(null, {rows: rows});
                }           
            });
            connection.on('error', function(err) {      
                  throw err; 
            });
        });
    }
    // this.create = function (connectObj) {
    //     con = mysql.createConnection(connectObj);
    //     con.connect();
    //     // return con;
    //     // console.log(con);
    //     // while (con.state === "disconnected") {
    //     //     con = mysql.createConnection(connectObj);
    //     //     console.log(con);
    //     // }
    // }

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

Object.defineProperty(this, "data", {
    get : function() {
        return this.data;
    },
    set : function(value){
        this.data = value;
    }
})