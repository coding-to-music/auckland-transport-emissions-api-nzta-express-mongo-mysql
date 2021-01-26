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
config.mongodb.db = 'ate_model';

//COLLECTION NAMES
config.REALTIME_RAW = "realtime_raw";
config.REALTIME_W_ROUTES = "raw_w_routes";
config.FINAL_SCHEDULE_COL = "final_trip_UUID_set";

config.testing = {};
config.testing.uri = 'mongodb://127.0.0.1:27017';
config.testing.db = "test";

config.EMISSION_PROFILES = [
    {"_id":{"size":"Small","engine":"EURO1","Pollutant":"CO"},"equation":"(a+(b/(1+rxp((((-1)*c)+(d*ln(x)))+(e*x)))))","a":0.901035136,"b":31.12677165,"c":-0.371551159,"d":0.666643266,"e":0.039402065},
    {"_id":{"size":"Small","engine":"EURO1","Pollutant":"FC"},"equation":"((a*(b^x))*(x^c))","a":2198.039975,"b":1.009170484,"c":-0.764173015,"d":0,"e":0},
    {"_id":{"size":"Small","engine":"EURO1","Pollutant":"HC"},"equation":"((a*(b^x))*(x^c))","a":11.84577934,"b":1.009200393,"c":-1.007053203,"d":0,"e":0},
    {"_id":{"size":"Small","engine":"EURO1","Pollutant":"NOx"},"equation":"((a*(x^b))+(c*(x^d)))","a":9.010180164,"b":-0.194434931,"c":90.97046046,"d":-1.082078221,"e":0},
    {"_id":{"size":"Small","engine":"EURO1","Pollutant":"PM"},"equation":"((a*(b^x))*(x^c))","a":4.382444401,"b":1.00995127,"c":-0.916570122,"d":0,"e":0},
    {"_id":{"size":"Small","engine":"EURO2","Pollutant":"CO"},"equation":"(a+(b/(1+rxp((((-1)*c)+(d*ln(x)))+(e*x)))))","a":0.578975243,"b":4.838002114,"c":4.477668429,"d":1.815364335,"e":-0.003179746},
    {"_id":{"size":"Small","engine":"EURO2","Pollutant":"FC"},"equation":"((a*(b^x))*(x^c))","a":1852.197654,"b":1.008568876,"c":-0.719003469,"d":0,"e":0},
    {"_id":{"size":"Small","engine":"EURO2","Pollutant":"HC"},"equation":"(1/(((c*(x^2))+(b*x))+a))","a":0.050399543,"b":0.112915378,"c":-0.000645553,"d":0,"e":0},
    {"_id":{"size":"Small","engine":"EURO2","Pollutant":"NOx"},"equation":"((a*(x^b))+(c*(x^d)))","a":10.85702123,"b":-0.217036014,"c":110.6387143,"d":-1.130907925,"e":0},
    {"_id":{"size":"Small","engine":"EURO2","Pollutant":"PM"},"equation":"((a*(b^x))*(x^c))","a":1.866049085,"b":1.013703854,"c":-0.905082625,"d":0,"e":0},
    {"_id":{"size":"Small","engine":"EURO3","Pollutant":"CO"},"equation":"(a+(b/(1+rxp((((-1)*c)+(d*ln(x)))+(e*x)))))","a":0.899458655,"b":7.183871699,"c":0.76383897,"d":0.266598154,"e":0.074515701},
    {"_id":{"size":"Small","engine":"EURO3","Pollutant":"FC"},"equation":"((a*(b^x))*(x^c))","a":1990.577853,"b":1.008475755,"c":-0.722333256,"d":0,"e":0},
    {"_id":{"size":"Small","engine":"EURO3","Pollutant":"HC"},"equation":"(a-(b*rxp(((-1)*c)*(x^d))))","a":0.193700021,"b":-1.117073374,"c":0.062562264,"d":1.045782131,"e":0},
    {"_id":{"size":"Small","engine":"EURO3","Pollutant":"NOx"},"equation":"((a*(x^b))+(c*(x^d)))","a":326.9622763,"b":-1.770979931,"c":40.11212653,"d":-0.577161444,"e":0},
    {"_id":{"size":"Small","engine":"EURO3","Pollutant":"PM"},"equation":"(1/(((c*(x^2))+(b*x))+a))","a":1.039815925,"b":0.283528708,"c":-0.002074065,"d":0,"e":0},
    {"_id":{"size":"Small","engine":"EURO4","Pollutant":"CO"},"equation":"((a*(x^b))+(c*(x^d)))","a":10.99554639,"b":-1.096341278,"c":4.363135527,"d":-0.616306237,"e":0},
    {"_id":{"size":"Small","engine":"EURO4","Pollutant":"FC"},"equation":"(((a*(x^3))+(b*(x^2))+(c*x))+d)","a":-0.000995803,"b":0.183632955,"c":-11.29692442,"d":404.6704375,"e":0},
    {"_id":{"size":"Small","engine":"EURO4","Pollutant":"HC"},"equation":"(1/(((c*(x^2))+(b*x))+a))","a":4.143524572,"b":0.828493334,"c":-0.006358725,"d":0,"e":0},
    {"_id":{"size":"Small","engine":"EURO4","Pollutant":"NOx"},"equation":"((a*(x^b))+(c*(x^d)))","a":24.65522661,"b":-0.530140829,"c":2193.234326,"d":-3.536654107,"e":0},
    {"_id":{"size":"Small","engine":"EURO4","Pollutant":"PM"},"equation":"((a*(x^b))+(c*(x^d)))","a":4.21E-06,"b":1.617418971,"c":0.242743864,"d":-0.607371328,"e":0},
    {"_id":{"size":"Small","engine":"EURO5","Pollutant":"CO"},"equation":"((a*(x^b))+(c*(x^d)))","a":13.70943569,"b":-0.918162207,"c":0.746518094,"d":-0.373758015,"e":0},
    {"_id":{"size":"Small","engine":"EURO5","Pollutant":"FC"},"equation":"(((a*(x^3))+(b*(x^2))+(c*x))+d)","a":-0.001017407,"b":0.188090804,"c":-11.5998003,"d":413.8025361,"e":0},
    {"_id":{"size":"Small","engine":"EURO5","Pollutant":"HC"},"equation":"(1/(((c*(x^2))+(b*x))+a))","a":3.936353767,"b":0.825974398,"c":-0.00637124,"d":0,"e":0},
    {"_id":{"size":"Small","engine":"EURO5","Pollutant":"NOx"},"equation":"rxp((a+(b/x))+(c*ln(x)))","a":2.540848372,"b":1.538414089,"c":-0.500814321,"d":0,"e":0},
    {"_id":{"size":"Small","engine":"EURO5","Pollutant":"PM"},"equation":"(1/(((c*(x^2))+(b*x))+a))","a":7.821546612,"b":0.962915154,"c":-0.006351254,"d":0,"e":0},
    {"_id":{"size":"Small","engine":"EURO5 SCR","Pollutant":"CO"},"equation":"((a*(x^b))+(c*(x^d)))","a":22.0616699,"b":-0.742715682,"c":653.3497071,"d":-3.062314899,"e":0},
    {"_id":{"size":"Small","engine":"EURO5 SCR","Pollutant":"FC"},"equation":"((a*(b^x))*(x^c))","a":1048.076774,"b":1.006685784,"c":-0.548189564,"d":0,"e":0},
    {"_id":{"size":"Small","engine":"EURO5 SCR","Pollutant":"HC"},"equation":"(1/(((c*(x^2))+(b*x))+a))","a":8.910441691,"b":1.750249613,"c":-0.013761102,"d":0,"e":0},
    {"_id":{"size":"Small","engine":"EURO5 SCR","Pollutant":"NOx"},"equation":"(a+(b/(1+rxp((((-1)*c)+(d*ln(x)))+(e*x)))))","a":1.531019032,"b":43.33871926,"c":-0.087468017,"d":0.278846044,"e":0.048563514},
    {"_id":{"size":"Small","engine":"EURO5 SCR","Pollutant":"PM"},"equation":"(((a*(x^3))+(b*(x^2))+(c*x))+d)","a":-3.05E-07,"b":5.67E-05,"c":-0.003507686,"d":0.091263477,"e":0},
    {"_id":{"size":"Small","engine":"EURO6","Pollutant":"CO"},"equation":"((a*(b^x))*(x^c))","a":14.24961309,"b":1.002347758,"c":-0.855073,"d":0,"e":0},
    {"_id":{"size":"Small","engine":"EURO6","Pollutant":"FC"},"equation":"(((a*(x^3))+(b*(x^2))+(c*x))+d)","a":-0.001020028,"b":0.189242832,"c":-11.70998579,"d":413.6533264,"e":0},
    {"_id":{"size":"Small","engine":"EURO6","Pollutant":"HC"},"equation":"(1/(((c*(x^2))+(b*x))+a))","a":8.345036425,"b":1.715552948,"c":-0.013430767,"d":0,"e":0},
    {"_id":{"size":"Small","engine":"EURO6","Pollutant":"NOx"},"equation":"((a*(b^x))*(x^c))","a":58.54051738,"b":1.004441381,"c":-1.508508911,"d":0,"e":0},
    {"_id":{"size":"Small","engine":"EURO6","Pollutant":"PM"},"equation":"(1/(((c*(x^2))+(b*x))+a))","a":76.06270134,"b":9.545242812,"c":-0.063902535,"d":0,"e":0},
    {"_id":{"size":"Small","engine":"PRE-EURO","Pollutant":"CO"},"equation":"(a+(b/(1+rxp((((-1)*c)+(d*ln(x)))+(e*x)))))","a":2.729373727,"b":42.48386291,"c":-0.233624707,"d":0.268547057,"e":0.0666976},
    {"_id":{"size":"Small","engine":"PRE-EURO","Pollutant":"FC"},"equation":"((a*(x^b))+(c*(x^d)))","a":0.357687679,"b":1.231582743,"c":2908.707633,"d":-0.730719767,"e":0},
    {"_id":{"size":"Small","engine":"PRE-EURO","Pollutant":"HC"},"equation":"(a+(b/(1+rxp((((-1)*c)+(d*ln(x)))+(e*x)))))","a":1.378205062,"b":62.45546131,"c":-0.65522687,"d":0.511693259,"e":0.049866591},
    {"_id":{"size":"Small","engine":"PRE-EURO","Pollutant":"NOx"},"equation":"((a*(b^x))*(x^c))","a":80.80385918,"b":1.008242551,"c":-0.706579239,"d":0,"e":0},
    {"_id":{"size":"Small","engine":"PRE-EURO","Pollutant":"PM"},"equation":"(a+(b/(1+rxp((((-1)*c)+(d*ln(x)))+(e*x)))))","a":0.361815044,"b":10.19174215,"c":0.572351755,"d":0.853592232,"e":0.031858616},
    {"_id":{"size":"Standard","engine":"EURO1","Pollutant":"CO"},"equation":"rxp((a+(b/x))+(c*ln(x)))","a":2.33199292,"b":4.438456058,"c":-0.496779861,"d":0,"e":0},
    {"_id":{"size":"Standard","engine":"EURO1","Pollutant":"FC"},"equation":"((a*(b^x))*(x^c))","a":2339.984391,"b":1.005202176,"c":-0.661182571,"d":0,"e":0},
    {"_id":{"size":"Standard","engine":"EURO1","Pollutant":"HC"},"equation":"(a+(b/(1+rxp((((-1)*c)+(d*ln(x)))+(e*x)))))","a":0.29680272,"b":13.45680712,"c":-0.506888167,"d":0.59287653,"e":0.035449871},
    {"_id":{"size":"Standard","engine":"EURO1","Pollutant":"NOx"},"equation":"rxp((a+(b/x))+(c*ln(x)))","a":3.333719663,"b":3.408690848,"c":-0.35825272,"d":0,"e":0},
    {"_id":{"size":"Standard","engine":"EURO1","Pollutant":"PM"},"equation":"(a-(b*rxp(((-1)*c)*(x^d))))","a":0.208818061,"b":-1.270585142,"c":0.129244417,"d":0.824252109,"e":0},
    {"_id":{"size":"Standard","engine":"EURO2","Pollutant":"CO"},"equation":"(a+(b/(1+rxp((((-1)*c)+(d*ln(x)))+(e*x)))))","a":0.891022962,"b":5.135664819,"c":5.531721974,"d":2.067281789,"e":-0.00269252},
    {"_id":{"size":"Standard","engine":"EURO2","Pollutant":"FC"},"equation":"((a*(b^x))*(x^c))","a":2094.583243,"b":1.005446103,"c":-0.639917426,"d":0,"e":0},
    {"_id":{"size":"Standard","engine":"EURO2","Pollutant":"HC"},"equation":"(a+(b/(1+rxp((((-1)*c)+(d*ln(x)))+(e*x)))))","a":0.221884565,"b":5.374086009,"c":0.205942757,"d":0.604380691,"e":0.042125512},
    {"_id":{"size":"Standard","engine":"EURO2","Pollutant":"NOx"},"equation":"(a+(b/(1+rxp((((-1)*c)+(d*ln(x)))+(e*x)))))","a":3.909355861,"b":177.7604446,"c":-0.40545741,"d":0.856693495,"e":0.000712375},
    {"_id":{"size":"Standard","engine":"EURO2","Pollutant":"PM"},"equation":"((a*(b^x))*(x^c))","a":2.154894868,"b":1.010949363,"c":-0.827310737,"d":0,"e":0},
    {"_id":{"size":"Standard","engine":"EURO3","Pollutant":"CO"},"equation":"(a+(b/(1+rxp((((-1)*c)+(d*ln(x)))+(e*x)))))","a":1.231026241,"b":5.92475862,"c":1.706755345,"d":0.283515949,"e":0.084809682},
    {"_id":{"size":"Standard","engine":"EURO3","Pollutant":"FC"},"equation":"((a*(b^x))*(x^c))","a":2238.265323,"b":1.005482598,"c":-0.645925671,"d":0,"e":0},
    {"_id":{"size":"Standard","engine":"EURO3","Pollutant":"HC"},"equation":"(a-(b*rxp(((-1)*c)*(x^d))))","a":0.220135169,"b":-1.408712815,"c":0.057719194,"d":1.038660151,"e":0},
    {"_id":{"size":"Standard","engine":"EURO3","Pollutant":"NOx"},"equation":"((a*(x^b))+(c*(x^d)))","a":574.6479679,"b":-1.959466503,"c":51.99888207,"d":-0.561801898,"e":0},
    {"_id":{"size":"Standard","engine":"EURO3","Pollutant":"PM"},"equation":"((a*(b^x))*(x^c))","a":2.158622854,"b":1.006473969,"c":-0.797264381,"d":0,"e":0},
    {"_id":{"size":"Standard","engine":"EURO4","Pollutant":"CO"},"equation":"(a+(b/(1+rxp((((-1)*c)+(d*ln(x)))+(e*x)))))","a":0.138239708,"b":14.7018173,"c":0.507623002,"d":0.948520448,"e":0.000136274},
    {"_id":{"size":"Standard","engine":"EURO4","Pollutant":"FC"},"equation":"(((a*(x^3))+(b*(x^2))+(c*x))+d)","a":-0.001258099,"b":0.230502406,"c":-14.58044197,"d":540.3340511,"e":0},
    {"_id":{"size":"Standard","engine":"EURO4","Pollutant":"HC"},"equation":"(1/(((c*(x^2))+(b*x))+a))","a":3.138753375,"b":0.54390611,"c":-0.003299784,"d":0,"e":0},
    {"_id":{"size":"Standard","engine":"EURO4","Pollutant":"NOx"},"equation":"rxp((a+(b/x))+(c*ln(x)))","a":3.338706151,"b":1.023464792,"c":-0.4930243,"d":0,"e":0},
    {"_id":{"size":"Standard","engine":"EURO4","Pollutant":"PM"},"equation":"(1/(((c*(x^2))+(b*x))+a))","a":6.649781579,"b":0.641010579,"c":-0.00332708,"d":0,"e":0},
    {"_id":{"size":"Standard","engine":"EURO5","Pollutant":"CO"},"equation":"(a+(b/(1+rxp((((-1)*c)+(d*ln(x)))+(e*x)))))","a":0.160306674,"b":11.43629388,"c":0.927996393,"d":0.997463333,"e":4.27E-06},
    {"_id":{"size":"Standard","engine":"EURO5","Pollutant":"FC"},"equation":"(((a*(x^3))+(b*(x^2))+(c*x))+d)","a":-0.001276747,"b":0.23461904,"c":-14.8845328,"d":550.2465718,"e":0},
    {"_id":{"size":"Standard","engine":"EURO5","Pollutant":"HC"},"equation":"(1/(((c*(x^2))+(b*x))+a))","a":3.017730759,"b":0.542600483,"c":-0.003302143,"d":0,"e":0},
    {"_id":{"size":"Standard","engine":"EURO5","Pollutant":"NOx"},"equation":"rxp((a+(b/x))+(c*ln(x)))","a":2.846960264,"b":0.954775303,"c":-0.499880928,"d":0,"e":0},
    {"_id":{"size":"Standard","engine":"EURO5","Pollutant":"PM"},"equation":"(1/(((c*(x^2))+(b*x))+a))","a":6.575145235,"b":0.637210757,"c":-0.003331687,"d":0,"e":0},
    {"_id":{"size":"Standard","engine":"EURO5 SCR","Pollutant":"CO"},"equation":"((a*(b^x))*(x^c))","a":32.14340832,"b":0.999160558,"c":-0.755999917,"d":0,"e":0},
    {"_id":{"size":"Standard","engine":"EURO5 SCR","Pollutant":"FC"},"equation":"(((a*(x^3))+(b*(x^2))+(c*x))+d)","a":-0.001219244,"b":0.225250967,"c":-14.34328523,"d":528.2235175,"e":0},
    {"_id":{"size":"Standard","engine":"EURO5 SCR","Pollutant":"HC"},"equation":"(1/(((c*(x^2))+(b*x))+a))","a":6.875489282,"b":1.206806378,"c":-0.007715581,"d":0,"e":0},
    {"_id":{"size":"Standard","engine":"EURO5 SCR","Pollutant":"NOx"},"equation":"(((a*(x^3))+(b*(x^2))+(c*x))+d)","a":-4.72E-05,"b":0.010397688,"c":-0.764770996,"d":20.94568037,"e":0},
    {"_id":{"size":"Standard","engine":"EURO5 SCR","Pollutant":"PM"},"equation":"(((a*(x^3))+(b*(x^2))+(c*x))+d)","a":-4.77E-07,"b":8.81E-05,"c":-0.005455304,"d":0.138985251,"e":0},
    {"_id":{"size":"Standard","engine":"EURO6","Pollutant":"CO"},"equation":"((a*(b^x))*(x^c))","a":16.74045181,"b":1.001449506,"c":-0.816985195,"d":0,"e":0},
    {"_id":{"size":"Standard","engine":"EURO6","Pollutant":"FC"},"equation":"(((a*(x^3))+(b*(x^2))+(c*x))+d)","a":-0.001272813,"b":0.235251641,"c":-15.00021163,"d":549.5453028,"e":0},
    {"_id":{"size":"Standard","engine":"EURO6","Pollutant":"HC"},"equation":"(1/(((c*(x^2))+(b*x))+a))","a":6.532984981,"b":1.174709002,"c":-0.007391941,"d":0,"e":0},
    {"_id":{"size":"Standard","engine":"EURO6","Pollutant":"NOx"},"equation":"((a*(b^x))*(x^c))","a":102.3055245,"b":1.012308362,"c":-1.700873474,"d":0,"e":0},
    {"_id":{"size":"Standard","engine":"EURO6","Pollutant":"PM"},"equation":"(1/(((c*(x^2))+(b*x))+a))","a":63.33579505,"b":6.350026423,"c":-0.034058592,"d":0,"e":0},
    {"_id":{"size":"Standard","engine":"PRE-EURO","Pollutant":"CO"},"equation":"((a*(b^x))*(x^c))","a":88.89090375,"b":1.004226595,"c":-0.900316773,"d":0,"e":0},
    {"_id":{"size":"Standard","engine":"PRE-EURO","Pollutant":"FC"},"equation":"((a*(b^x))*(x^c))","a":3368.161003,"b":1.005780201,"c":-0.726644026,"d":0,"e":0},
    {"_id":{"size":"Standard","engine":"PRE-EURO","Pollutant":"HC"},"equation":"(a+(b/(1+rxp((((-1)*c)+(d*ln(x)))+(e*x)))))","a":0.606168487,"b":55.46745423,"c":-0.622083356,"d":0.714739539,"e":0.03164112},
    {"_id":{"size":"Standard","engine":"PRE-EURO","Pollutant":"NOx"},"equation":"((a*(b^x))*(x^c))","a":98.22963374,"b":1.004036165,"c":-0.585954491,"d":0,"e":0},
    {"_id":{"size":"Standard","engine":"PRE-EURO","Pollutant":"PM"},"equation":"((a*(b^x))*(x^c))","a":17.18303313,"b":1.005766065,"c":-1.010609638,"d":0,"e":0}
    ];

    /**
     * Mappings of the string 
    */
config.pollutant_equations = {
    "(((a*(x^3))+(b*(x^2))+(c*x))+d)": (x, a, b, c, d, e, f, g) => (((a * (Math.pow(x, 3))) + (b * (Math.pow(x, 2))) + (c * x)) + d),
    "((a*(x^b))+(c*(x^d)))": (x, a, b, c, d, e, f, g) => ((a * (Math.pow(x, b))) + (c * (Math.pow(x, d)))),
    "(1/(((c*(x^2))+(b*x))+a))": (x, a, b, c, d, e, f, g) => (1 / (((c * (Math.pow(x, 2))) + (b * x)) + a)),
    "((a*(b^x))*(x^c))": (x, a, b, c, d, e, f, g) => ((a * (Math.pow(b, x))) * (Math.pow(x, c))),
    "(a+(b/(1+rxp((((-1)*c)+(d*ln(x)))+(e*x)))))": (x, a, b, c, d, e, f, g) => (a + (b / (1 + Math.exp((((-1) * c) + (d * Math.log(x))) + (e * x))))),
    "rxp((a+(b/x))+(c*ln(x)))": (x, a, b, c, d, e, f, g) => Math.exp((a + (b / x)) + (c * Math.log(x))),
    "(a-(b*rxp(((-1)*c)*(x^d))))": (x, a, b, c, d, e, f, g) => (a - (b * Math.exp(((-1) * c) * (Math.pow(x, d)))))
}


module.exports = config;