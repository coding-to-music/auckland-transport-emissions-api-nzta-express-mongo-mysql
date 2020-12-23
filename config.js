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

module.exports = config;