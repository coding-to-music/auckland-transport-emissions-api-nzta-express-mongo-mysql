module.exports = function () {
    let con = mysql.createConnection({
        host: "johnny.heliohost.org",
        user: "chriswil_c",
        password: "w5eiDgh@39GNmtA"
    });
    this.data;

    this.passToSQL = async function () {
        const client = await pool.connect();

        //Write some query fekkin things

        //save

        //write queries

        //getsomeofthethings

        //createEmissions

        //repost?

    }

    this.createStatement(statement, selectors, table, headers, rows) = function() {

    }

    this.insertStatement() = function() {

    }

    this.updateStatement() = function() {

    }

    this.selectStatement() = function() {

    }

    this.formQuery = function (command, table, whereConds) {
        
    }

    this.filterData = function (filterFunction) {
        data.filter(filterFunction);
    }

    this.connectAndExecute = function (sqlStatement) {
        con.connect(function (err) {
            if (err) throw err;
            console.log("Connected!");

            connection.query(sqlStatement, function (err, results, fields) {
                if (err) {
                    console.log(err.message);
                }
            });

            connection.end(function (err) {
                if (err) {
                    return console.log(err.message);
                }
            });
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