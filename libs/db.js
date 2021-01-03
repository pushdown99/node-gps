'use strict';

const mysql = require('sync-mysql');

let connection  = null;
let database    = "";
let db_host     = "";
let db_user     = "";
let db_password = "";
let db_database = "";
let verbose     = false;

module.exports = {
  init: function(n, h, u, p, d, v) { 
    database    = n; 
    db_host     = h; 
    db_user     = u; 
    db_password = p; 
    db_database = d; 
    verbose     = v; 
    console.log('db.init', database, db_host, db_user, db_password, db_database, verbose);
  },
  handle: function () { return connection; },
  connect: function() { 
    switch(database) {
    case 'mysql':
      connection  = new mysql({ host:db_host, user:db_user, password:db_password, database:db_database });
      console.log ('connect', connection);
      this.query("set time_zone='+9:00'");
      break;

    case 'pg':
      let pg        = require('pg');
      var conn      = 'postgres://' + opts.user + ':' + opts.password + '@' + opts.host + ':' + opts.port + '/' + opts.database;
      connection = new pg.Client(conn);
      connection.connect(function(e) {
        if(callback) callback(e);
      });
      break;

    case 'mongodb':
      let mongodb   = require('mongodb');
      var conn      = 'mongodb://' + opts.host + ':' + opts.port + '/' + opts.database;
      connection = mongodb.MongoClient;
      connection.connect(conn, { useNewUrlParser: true }, function(e, db) {
        if(callback) callback(e);
      });
      break;
    }
  },
  query: function(s, v=null) {
    if(connection == null) this.connect ();
    //console.log('db: ', s, v);
    switch(database) {
    case 'mysql':
      if(v == null) {
        return connection.query(s);
      }
      else {
        return connection.query(s, v);
      }
      break;
    case 'pg':
      break;
    }
  },
  queuequery: function(s, v=null) {
    return connection.queueQuery (s, v);
  },
  update: function(s, v=null) {
    return connection.update (s, v);
  },
  queueupdate: function(s, v=null) {
    return connection.queueUpdate (s, v);
  },
  getrecord: function(t, id) {
    return connection.getRecord(t, id);
  },
  call: function(name, args) {
    return connection.call(n, args);
  },
  queuecall: function(name, args) {
    return connection.queueCall(n, args);
  },
  dispose: function() {
    return connection.dispose();
  },
  finishall: function() {
    return connection.finishAll();
  },
  close: function() {
  }
};
