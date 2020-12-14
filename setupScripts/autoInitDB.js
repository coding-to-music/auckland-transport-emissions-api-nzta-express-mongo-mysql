//LOAD DB CONFIG WITH ARGS
const DBconfig = require("./DBConfigure.js");
const DBDestroy = require("./DBDestroy.js");

let SQLManagment = require("../SQLManagment");
let pool = new SQLManagment(DBconfig.localConnectionChris);

setupDB();

async function setupDB() {
    //Check if clean install needed
    console.log("TESTING EXISTING DB");
    let flag = false;
    pool.executeQuery("SHOW DATABASES;", null, function (err, data) {
        // console.log("SHOW DATABASES", data);
        let p0 = new Promise((res, rej) => {
            for (let d of data) {
                if (d.Database === "chriswil_ate_model") {
                    flag = true;
                    console.log(flag);
                    destroyTables(flag);
                    return;
                }
            }
            res(flag);
        }).then(() => {
            createDB();
        })
    });
}

function destroyTables (flag) {
    console.log("DELETING EXISTING TABLE");
    if (flag === true) {
        new Promise((res, rej) => {
            execute(DBDestroy.destroyAll, res);
        }).then(() => {
            createDB();
        })
    } else {
        createDB();
    }
}

function createDB () {
    //Create in SQL
    console.log("CREATING DB");
    new Promise((res, rej) => {
        execute(DBconfig.dbQueries, res);
    }).then(() => {
        //Set connection object database
        pool.getConnection((err, connection) => {
            connection.changeUser({database : 'chriswil_ate_model'}, function(err) {
                if (err) throw err;
            });
        });

        //Create necessary tables
        createTables();
    })
}

function createTables () {
    console.log("CREATING TABLES");
    console.log("Creating : ", DBconfig.tableQueries);
    //Exec setup queries
    execute(DBconfig.tableQueries);
}


function execute(queries, resolve) {
    let i = 0;
    let returned = [];
    let dataPrev;

    this.callback = function (err, data) {
        if (err) throw err;
        console.log(i, queries[i], dataPrev===data);
        dataPrev = data;
        returned.push({"Query" : queries[i], "Response" : data});
        i = i + 1;
        if (i >= queries.length) {
            resolve(returned);
            return;
        }
        pool.executeQuery(queries[queries.indexOf(queries[i])], null, callback);
    }

    console.log(queries, queries[i], i);
    pool.executeQuery(queries[i], null, callback);
}