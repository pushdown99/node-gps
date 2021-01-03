'use strict';

//const tf  = '@tensorflow/tfjs';
//const model = tf.loadLayersModel('/tf/model.json');

const dotenv  = require('dotenv').config()
let   verbose = process.env.VERBOSE || false
verbose = (verbose == 'true');

const moment   = require('moment-timezone');
const upload   = require('express-fileupload');
const wt       = require("worker-thread");
const AHRS     = require('ahrs');
const madgwick = new AHRS({
  sampleInterval: 1,
  algorithm: 'Madgwick',
  beta: 0.4,
  kp: 0.5, // Default: 0.5
  ki: 0, // Default: 0.0
  doInitialisation: false,
});

let dbio   = require('./dbio.js');
let app = null;

let g_ax = 0, g_ay = 0, g_az = 0, g_ak = 0;
let gx = 0, gy = 0, gz = 0;
let clients = [];
let g_lat = 0, g_lng = 0, g_hd = 0;
let p_lat = 0, p_lng = 0, p_hd = 0, p_df = 0, a_hd = 0;

const LAT_METER=110569;
const LNG_METER=111322;

module.exports = {
  aws: function () {
    const awsIot = require('aws-iot-device-sdk');

    var device = awsIot.device({
       keyPath: "/etc/amazon/things-private.pem.key",
      certPath: "/etc/amazon/things.pem.crt",
        caPath: "/etc/amazon/root.pem",
      clientId: "arn:aws:iot:ap-northeast-2:081710662021:thing/my-iot-node",
          host: "a1v57gl7w78wlt-ats.iot.ap-northeast-2.amazonaws.com"
    });

    device
      .on('connect', function() {
        console.log('connect');
        device.subscribe('dt/stm32l475e/sensor-data/topic');
        //device.publish('dt/stm32l475e/sensor-data/topic', JSON.stringify({ test_data: 1}));
      });

    device
      .on('message', function(topic, payload) {
        //console.log('message', topic, payload.toString());
        var obj = JSON.parse(payload);
        console.log('message', topic, obj);
        var ga  = (9.80665*100);
        var dev = obj.Board_id;
        var ax  = obj.Accel_X/ga;
        var ay  = obj.Accel_Y/ga;
        var az  = obj.Accel_Z/ga;
        var ak  = Math.sqrt(ax*ax + ay*ay + az*az);
        var gx  = obj.Gyro_X*(Math.PI/180);
        var gy  = obj.Gyro_Y*(Math.PI/180);
        var gz  = obj.Gyro_Z*(Math.PI/180);
        madgwick.update(gx, gy, gz, ax, ay, az);
        var { heading, pitch, roll } = madgwick.getEulerAngles();
        dbio.putSensors ([dev, ax.toFixed(6), ay.toFixed(6), az.toFixed(6), ak.toFixed(6), gx, gy, gz, heading, pitch, roll]);
      });
//{"Board_id":"st-discovery-board-01","Temp": 29, "Hum": 17, "Press": 1032, "Accel_X": -3, "Accel_Y": -8, "Accel_Z": 994, "Gyro_X": -350, "Gyro_Y": 70, "Gyro_Z": 1400, "Magn_X": 21, "Magn_Y": 3, "Magn_Z": -1116, "Proxi": 4}
  },

  ws: function () {
    const websocket = require('ws')
    const wss = new websocket.Server({ port: 8081 });

    wss.on('connection', function connection(ws) {
      clients.push(ws);

      ws.on('open', function open() {
        console.log('open');
        ws.send('something');
      });

      ws.on('message', function incoming(data) {
        console.log(data.toString());
        ws.send('something');
      });
    });
  },

  send: function (message) {
    for (var n=0; n < clients.length; n++) {
        clients[n].send(message);
    }
  },

  init: function(ap) {
    app = ap;

    app.use(upload());
    //this.middleware();

    this.ws();
    this.aws();

    app.get('/', function(req, res){
      res.render('index');
    })
    app.get('/pdr', function(req, res){
      res.render('pdr');
    })
    app.get('/tf', function(req, res){
      res.render('tf');
    })
    app.get('/compass', function(req, res){
      res.render('compass');
    })
    app.get('/vital', function(req, res){
      res.render('vital');
    })
    app.get('/sensors', function(req, res){
      res.render('sensors');
    })
    app.get('/gps', function(req, res){
      res.render('gps');
    })
    app.get('/camera', function(req, res){
      res.render('camera');
    })
    app.get('/facing', function(req, res){
      res.render('facing');
    })
    app.get('/geo', function(req, res){
      res.render('geo');
    })
    app.get('/upload', function(req, res) {
      res.render('upload');
    });
    app.get('/model', function(req, res) {
      const file = `${__dirname}/public/tf/model.json`;
      res.download(file); // Set disposition and send it.
    });
    app.post('/upload', function(req, res) {
      let sampleFile;
      let uploadPath;

      if (!req.files || Object.keys(req.files).length === 0) {
        res.status(400).send('No files were uploaded.');
        return;
      }

      console.log('req.files >>>', req.files); // eslint-disable-line

      sampleFile = req.files.sampleFile;

      uploadPath = __dirname + '/uploads/' + sampleFile.name;

      sampleFile.mv(uploadPath, function(err) {
        if (err) {
          return res.status(500).send(err);
        }

        res.send('File uploaded to ' + uploadPath);
      });
    });

    app.post('/data', function(req, res){
      var cnt   = req.body.cnt || null;
      var alpha = req.body.alpha || null;
      var beta  = req.body.beta || null;
      var gamma = req.body.gamma || null;
      var x     = req.body.x || null;
      var y     = req.body.y || null;
      var z     = req.body.z || null;
      var lat   = req.body.lat || null;
      var lng   = req.body.lng || null;

      if(cnt == 0 && lat != null && lng != null) {
        console.log("adjust: ", alpha, p_hd, lat, lng);
        g_hd  = alpha;
        g_lat = p_lat = lat;
        g_lng = p_lng = lng;

        if(g_hd >= p_hd) p_df = g_hd - p_hd;
        else             p_df = 360 - (p_hd - g_hd);

        console.log('adjust: ', g_hd, p_hd, p_df);
        dbio.delGps ([]);
      }
      console.log(p_lat, p_lng);

      dbio.putMobile ([alpha, beta, gamma, x, y, z, lat, lng]);
      dbio.putGps ([g_lat, g_lng, g_ax, g_ay, g_az, g_ak]);


      res.send("{}");
    })
    app.post('/sensors', function(req, res){
      var dev     = req.body.dev;
      var ax      = g_ax = req.body.ax;
      var ay      = g_ay = req.body.ay;
      var az      = g_az = req.body.az;
      var ak      = g_ak = req.body.ak;
      var gx      = req.body.gx;
      var gy      = req.body.gy;
      var gz      = req.body.gz;
      var heading = req.body.heading;
      var pitch   = req.body.pitch;
      var roll    = req.body.roll;

      p_hd = heading; 
      heading = (360 + p_df + heading) % 360;
      a_hd = heading;
      //console.log("* ", g_hd, heading, p_df);

      dbio.putSensors ([dev, ax, ay, az, ak, gx, gy, gz, heading, pitch, roll]);

      var x = 0;
      var y = 0;
      var v = 0;
      if(ak > 1.5) v = 2;
      else if(ak > 1.2) v = 1;
      else v = 0;

      if(a_hd >= 0 && a_hd < 30) {
         x = 0.1/LAT_METER; y = 0.5/LNG_METER;
      }
      if(a_hd >= 30 && a_hd < 60) {
         x = 0.3/LAT_METER; y = 0.3/LNG_METER;
      }
      if(a_hd >= 60 && a_hd < 90) {
         x = 0.5/LAT_METER; y = 0.1/LNG_METER;
      }
      if(a_hd >= 90 && a_hd < 120) {
         x = 0.5/LAT_METER; y = -0.1/LNG_METER;
      }
      if(a_hd >= 120 && a_hd < 150) {
         x = 0.3/LAT_METER; y = -0.3/LNG_METER;
      }
      if(a_hd >= 150 && a_hd < 180) {
         x = 0.1/LAT_METER; y = -0.5/LNG_METER;
      }
      if(a_hd >= 180 && a_hd < 210) {
         x = -0.1/LAT_METER; y = -0.5/LNG_METER;
      }
      if(a_hd >= 210 && a_hd < 240) {
         x = -0.3/LAT_METER; y = -0.3/LNG_METER;
      }
      if(a_hd >= 240 && a_hd < 270) {
         x = -0.5/LAT_METER; y = -0.1/LNG_METER;
      }
      if(a_hd >= 270 && a_hd < 300) {
         x = -0.5/LAT_METER; y = 0.1/LNG_METER;
      }
      if(a_hd >= 300 && a_hd < 330) {
         x = -0.3/LAT_METER; y = 0.3/LNG_METER;
      }
      if(a_hd >= 330 && a_hd < 360) {
         x = -0.1/LAT_METER; y = 0.5/LNG_METER;
      }
      p_lat = parseFloat(p_lat) + x * v; p_lng = parseFloat(p_lng) + y * v;

      res.send('OK');
    })
    app.get('/get-location', function(req, res){
      var data = {};
      data["lat"] = p_lat;
      data["lng"] = p_lng;

      console.log(JSON.stringify(data));
      res.send(data);
    });
    app.get('/get-accel', function(req, res) {
      console.log('get-accel');
      var r = dbio.getAccel(['nano-33']);
      var data = [];
      r.forEach ((e,i) => {
         var d = []; 
         d.push(e.ax);
         d.push(e.ay);
         d.push(e.az);
         data.push(d);
      });
      console.log(data);
      res.send (data);
    })
    app.get('/get-all-sensors', function(req, res) {
      var r = dbio.getAllSensors([60]);
      res.send (r);
    })
    app.get('/get-sensors', function(req, res){
      var r = dbio.getSensors(['nano-33', 60]);
      var data = {};
      data['ax'] = [];
      data['ay'] = [];
      data['az'] = [];
      data['gx'] = [];
      data['gy'] = [];
      data['gz'] = [];
      data['heading'] = [];
      data['pitch']   = [];
      data['roll']    = [];
      r.forEach((e, i) => {
          var d = [i, e.ax];      data['ax'].push(d);
          var d = [i, e.ay];      data['ay'].push(d);
          var d = [i, e.az];      data['az'].push(d);
          var d = [i, e.gx];      data['gx'].push(d);
          var d = [i, e.gy];      data['gy'].push(d);
          var d = [i, e.gz];      data['gz'].push(d);
          var d = [i, e.heading]; data['heading'].push(d);
          var d = [i, e.pitch];   data['pitch'].push(d);
          var d = [i, e.roll];    data['roll'].push(d);
      });
      res.send (data);
    })
    app.get('/get-last-sensors', function(req, res){
      var r = dbio.getLastSensors(['nano-33']);
      res.send (r);
    });
    app.get('/get-sensors/:f', function(req, res){
      var f = req.params.f;
      var r = dbio.getSensors([20]);
      var data = [];
      r.forEach((e, i) => {
        switch (f) {
        case 'ax':
          var d = [i, e.ax];
          data.push(d);
          break;
        case 'ay':
          var d = [i, e.ay];
          data.push(d);
          break;
        case 'az':
          var d = [i, e.az];
          data.push(d);
          break;
        case 'gx':
          var d = [i, e.gx];
          data.push(d);
          break;
        case 'gy':
          var d = [i, e.gy];
          data.push(d);
          break;
        case 'gz':
          var d = [i, e.gz];
          data.push(d);
          break;
        case 'heading':
          var d = [i, e.heading];
          data.push(d);
          break;
        case 'pitch':
          var d = [i, e.pitch];
          data.push(d);
          break;
        case 'roll':
          var d = [i, e.roll];
          data.push(d);
          break;
        }
      });
      res.send (data);
    });
  },

  ////////////////////////////////////////////////////////////////////////////////////////
  //
  // middleware
  //
  middleware: function() {
    app.use(function (req, res, next) {
      req.timestamp  = moment().unix();
      req.receivedAt = moment().tz('Asia/Seoul').format('YYYY-MM-DD hh:mm:ss');
      let status = res.statusCode;

      switch(req.method) {
      case "GET":
        console.log(req.receivedAt, req.protocol.toUpperCase(), req.method, req.url, req.params);
        break;
      case "POST":
        console.log(req.receivedAt, req.protocol.toUpperCase(), req.method, req.url, req.body);
        break;
      }

/*
      var oldWrite = res.write, oldEnd = res.end;
      var chunks = [];
      res.write = function (chunk) {
        chunks.push(chunk);
        return oldWrite.apply(res, arguments);
      };
      res.end = function (chunk) {
        if(typeof chunk == 'string') {
          chunk = Buffer.from(chunk, 'utf-8');
        }
        if (chunk) chunks.push(chunk);
        let body = Buffer.concat(chunks).toString('utf8');
        //if(this.get('Content-Type') == 'application/json; charset=utf-8' || this.get('Content-Type') == 'text/html; charset=utf-8') {
        if(this.get('Content-Type') == 'application/json; charset=utf-8') {
          console.log(req.receivedAt, req.protocol.toUpperCase(), status, body);
        }
        oldEnd.apply(res, arguments);
      };
*/
      next();
    });
  }
};
