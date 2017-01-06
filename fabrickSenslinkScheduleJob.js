'use strict'
const redis = require("redis");

const Senslink = require('./SenslinkModule');

var client = redis.createClient();
// client.unref();
client.get("config/Senslink/Devices", function(err, obj) {
    if (!err) {
        var json_object = JSON.parse(obj);
        json_object.forEach(function(item) {
            var senslinkGateway = new Senslink(item);
            senslinkGateway.flexData();
        })
    }
});
// client.end(true); // No further commands will be processed