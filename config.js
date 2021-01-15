//PORTS, USER NAMES, PASSWORD, URIs, CONSTANTS
const config = {};

config.port = 3000;
config.host = "localhost:" + config.port + "/";

config.heliohost = {};
config.heliohost.host = "johnny.heliohost.org";
config.heliohost.user = "chriswil_c";
config.heliohost.password = "w5eiDgh@39GNmtA";
config.heliohost.database = "chriswil_ate_model";

//MONGO
config.mongodb = {};
config.mongodb.user = "chris";
config.mongodb.password = "YFwh2XjNZ2XY8cv9";
config.mongodb.uri = `mongodb+srv://${config.mongodb.user}:${config.mongodb.password}@cluster0.l7ehu.mongodb.net/ate_model?retryWrites=true&w=majority`;

//COLLECTION NAMES
config.REALTIME_RAW = "realtime_raw";
config.REALTIME_W_ROUTES = "raw_w_routes";
config.FINAL_SCHEDULE_COL = "final_trip_UUID_set";

config.testing = {};
config.testing.uri = 'mongodb://127.0.0.1:27017';
config.testing.db = "test";

module.exports = config;