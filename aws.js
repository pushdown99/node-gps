'use strict';

var awsIot = require('aws-iot-device-sdk');

module.exports = {
  init: function () {
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
        console.log('message', topic, payload.toString());
      });
  },
};


