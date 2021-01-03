//let dotenv  = require('dotenv').config();
let https   = require('./libs/https.js');
let router  = require('./router.js');
let dbio    = require('./dbio.js');

let express = require('express');
let app = express();

app.set('views', __dirname + '/views');
app.set('view engine', 'ejs');
app.engine('html', require('ejs').renderFile);

app.use(express.json());
app.use(express.urlencoded({ extended: true}));
app.use(express.static(__dirname + '/public'));

// for ENV update
//dotenv.parsed.test='test';
//console.log(dotenv.parsed);
//fs.writeFileSync('./.t', envfile.stringify(dotenv.parsed));
router.init (app);

https.listen (app);

module.exports = app;

