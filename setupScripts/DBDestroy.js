let destroyTables = [];
destroyTables.push("USE chriswil_ate_model;")
destroyTables.push("DROP TABLE IF EXISTS realtime_raw;");
destroyTables.push("DROP TABLE IF EXISTS Routes;");
destroyTables.push("DROP TABLE IF EXISTS Trips;");
destroyTables.push("DROP TABLE IF EXISTS Services;");
module.exports.destroyTables = destroyTables;

let destroyAll = [];
destroyAll.push("DROP DATABASE chriswil_ate_model;");
module.exports.destroyAll = destroyAll;