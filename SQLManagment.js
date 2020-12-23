// let pool = require("../DB");
let mysql = require("mysql");
const config = require("./config.js");

module.exports = function (conObj) {
    this.pool = conObj ? mysql.createPool(conObj) : mysql.createPool({
        host: config.heliohost.host,
        user: config.heliohost.user,
        password: config.heliohost.password,
        database: config.heliohost.database        
      });
    this.data;

    this.getConnection = function(callback) {
        this.pool.getConnection(function(err, connection) {
            if (err) {
                throw err;
            } else {
                console.log(connection);
                callback(null, connection);
            }
        });
    };

    this.query=function( sql, args ) {
        return new Promise( ( resolve, reject ) => {
            this.pool.query( sql, args, ( err, rows ) => {
                if ( err )
                    return reject( err );
                resolve( rows );
            } );
        } );
    }

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
                console.log("Query : ");
                console.log(results);
                console.log(callback);
                // callback(null, results);
            });
        }        
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

    this.filterData = function (filterFunction) {
        data.filter(filterFunction);
    }

    this.execute = function (sqlStatement) {
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