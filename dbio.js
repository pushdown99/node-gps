'use strict';

const dotenv  = require('dotenv').config()
let   verbose = process.env.VERBOSE || false
verbose = (verbose == 'true');

var db = require('./libs/db.js');

//result.forEach(function(data) {
//  console.log('select: data.id => ', data.id);
//});

module.exports = {
  init: function() {
    console.log('dbio.init');
    db.init (process.env.DB_NAME, process.env.DB_HOSTNAME, process.env.DB_USERNAME, process.env.DB_PASSWORD, process.env.DB_DATABASE, verbose);
  },
  getAllSensors: function(record) {
    if(db.handle() == null) this.init ();
    return db.query("SELECT * FROM sensors ORDER BY ts DESC limit ?", record);
  },
  getSensors: function(record) {
    if(db.handle() == null) this.init ();
    return db.query("SELECT * FROM sensors WHERE dev = ? ORDER BY ts DESC limit ?", record);
  },
  getAccel: function(record) {
    if(db.handle() == null) this.init ();
    return db.query("SELECT ax,ay,az FROM sensors WHERE dev = ? ORDER BY ts DESC limit 200", record);
  },
  getLastSensors: function(record) {
    if(db.handle() == null) this.init ();
    return db.query("SELECT * FROM sensors WHERE dev = ? ORDER BY ts DESC limit 1", record);
  },
  putSensors: function(record) {
    if(db.handle() == null) this.init ();
    return db.query("INSERT INTO sensors (dev, ax, ay, az, ak, gx, gy, gz, heading, pitch, roll) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)", record);
  },
  putMobile: function(record) {
    if(db.handle() == null) this.init ();
    return db.query("INSERT INTO mobile (alpha, beta, gamma, x, y, z, lat, lng) VALUES (?, ?, ?, ?, ?, ?, ?, ?)", record);
  },
  putGps: function(record) {
    if(db.handle() == null) this.init ();
    return db.query("INSERT INTO gps (lat, lng, x, y, z, k) VALUES (?, ?, ?, ?, ?, ?)", record);
  },
  delGps: function(record) {
    if(db.handle() == null) this.init ();
    return db.query("DELETE FROM gps", record);
  },
  getGps: function(record) {
    if(db.handle() == null) this.init ();
    return db.query("SELECT * FROM gps", record);
  },
}
