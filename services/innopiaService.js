"use strict";

const Common = require('../lib/common');

var innopiaService = function() {};

innopiaService.prototype.generateMessage = function(subcribeDevices, deviceId, rawData) {
    var message = { "extId": deviceId };
    message["rawData"] = rawData;
    message["receivedDate"] = new Date();

    var common = new Common();

    var data = {};
    switch (subcribeDevices['MAC-' + deviceId]) {
        case 16: //'colorBulb'
            switch (rawData["Member"]) {
                case "TurnedOn":
                    data['state'] = [true];
                    break;
                case "TurnedOff":
                    data['state'] = [false];
                    break;
            }

            break;
        default:
            console.log('No handler for device with DeviceId = %s', deviceId);
            return;
    }

    message["data"] = data;

    return message;
}

module.exports = innopiaService;