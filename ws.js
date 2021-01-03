'use strict';

let clients = [];

module.exports = {
  init: function () {
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
};
