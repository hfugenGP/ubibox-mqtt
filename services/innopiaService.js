"use strict";

const Common = require('../lib/common');
const Broker = require('../lib/broker');

var innopiaService = function() {};

var gateway = {
    id: "Innopia Action Caller",
    host: "106.240.245.222",
    port: "1883",
    topics: {}
};

var broker = new Broker(gateway, gateway.host, {
    keepalive: true,
    port: gateway.port,
    clientId: gateway.id
});

innopiaService.prototype.generateMessage = function(subcribeDevices, deviceId, rawData) {
    var message = { "extId": deviceId };
    message["rawData"] = rawData;
    message["receivedDate"] = new Date();

    var common = new Common();

    var data = {};
    switch (subcribeDevices['MAC-' + deviceId.toLowerCase()]) {
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
        case 17: //DoorSensor
            var client = broker.connect();
            switch (rawData["Member"]) {
                case "Opened":
                    data['state'] = [true];
                    var actionData = {
                        "DeviceId": "zigbee-ColorBulb-39009-000193",
                        "Member": "TurnOn",
                        "Param": ""
                    };
                    broker.publish(common.innopiaTopic, JSON.stringify(actionData), { qos: 1, retain: false });
                    break;
                case "Closed":
                    data['state'] = [false];
                    var actionData = {
                        "DeviceId": "zigbee-ColorBulb-39009-000193",
                        "Member": "TurnOff",
                        "Param": ""
                    };
                    broker.publish(common.innopiaTopic, JSON.stringify(actionData), { qos: 1, retain: false });
                    break;
            }
            broker.end(true);
            break;
        case 18: //'motionSensor'
            //     if (rawData["Member"] == 'MotionDetected') {
            //         data['motionDetectedTime'] = new Date();
            //     } else {
            //         return;
            //     }
            break;
        case 19: //Temp and Hum sensor

            break;
        case 20: //Coffeemaker
            break;
        default:
            console.log('No handler for device with DeviceId = %s', deviceId);
            return;
    }

    message["data"] = data;

    return message;
}

module.exports = innopiaService;