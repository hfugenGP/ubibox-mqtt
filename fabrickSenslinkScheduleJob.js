'use strict'
var _ = require('lodash');
const redis = require("redis");

const Senslink = require('./services/SenslinkService');

var client = redis.createClient();
// client.unref();
client.get("config/Senslink/Devices", function(err, obj) {
    if (!err) {
        var json_object = JSON.parse(obj);
        _.each(json_object, function(item) {
            var senslinkGateway = new Senslink(item);
            senslinkGateway.flexData();
        });
    }

    client.quit(); // No further commands will be processed
});