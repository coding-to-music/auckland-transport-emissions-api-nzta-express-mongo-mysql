let mysql = require("mysql");
module.exports = function () {
    let con;
    this.data;

    this.createConnection = function (connectObj) {
        con = mysql.createConnection(connectObj);
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

    this.insertStatement = function() {

    }

    this.updateStatement = function() {

    }

    this.selectStatement = function() {

    }

    this.formQuery = function (command, table, whereConds) {
        
    }

    this.filterData = function (filterFunction) {
        data.filter(filterFunction);
    }

    this.execute = async function (sqlStatement) {
        // new Promise((resolve, rej) => {
            let r = await con.query(sqlStatement, function (err, results, fields) {
                if (err) {
                    console.log(err.message);
                } else {
                    console.log("execute results: " + results);
                    // resolve(results);
                    return results;
                }
            })
            return r;
        // })
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