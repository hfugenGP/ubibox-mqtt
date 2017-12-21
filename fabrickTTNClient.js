'use strict'

var _ = require('lodash');
const Broker = require('./lib/broker');
const Common = require('./lib/common')
const config = require('./config/conf');

var subcribe_devices = new Array();
var subcribe_gateways = new Array();
var subcribe_brokers = new Array();
var subcribe_topics = new Array();
var lora_topics = new Array();

var fabrick_gateway = {
    id: "Fabrick TTN Client " + config.fabrickBroker.idKey,
    host: config.fabrickBroker.host,
    port: config.fabrickBroker.port,
    topics: {
        'config/fabrick.io/Arduino/Devices': 1
    }
};

var fabrick_Broker = new Broker(fabrick_gateway, fabrick_gateway.host, {
    keepalive: config.fabrickBroker.keepalive,
    port: fabrick_gateway.port,
    clientId: fabrick_gateway.id,
    username: config.fabrickBroker.username,
    password: config.fabrickBroker.password,
});
var fabrick_client = fabrick_Broker.connect();
fabrick_Broker.onConnect(() => {
    console.log(' Client Connected');
});
fabrick_Broker.onError((err) => {
    console.log('error happen with  Client')
    console.log(err)
    fabrick_Broker.end()
});
fabrick_Broker.onClose(() => {
    console.log(' Client Disconnected')
});
fabrick_Broker.onReconnect(() => {
    console.log(' Client Reconnecting...')
});
fabrick_Broker.onOffline(() => {
    console.log(' Client is offline')
});
fabrick_Broker.onMessage((gatewayName, topic, message, packet) => {
    console.log('Message received for topic: ' + topic);
    var gateways = new Array();

    switch (topic) {
        case 'config/fabrick.io/Arduino/Devices':
            var json_object = JSON.parse(message);
            while (subcribe_devices.length) {
                subcribe_devices.pop();
            }
            json_object.forEach(function (element) {
                subcribe_devices['MAC-' + element['device'].toLowerCase()] = element['deviceType'];
            });
            console.log(subcribe_devices);
            break;

        default:
            // Handle all message returned for devices
            processWifiMessage(gatewayName, topic, message, packet);
    }
});

var ttn_gateway = {
    id: "Fabrick TTN Client " + config.fabrickBroker.idKey,
    host: "tcp://us-west.thethings.network",
    port: 1883,
    topics: {
        '9303090/devices/libelium/up': 1
    }
};

var ttnBroker = new Broker(ttn_gateway, ttn_gateway.host, {
    keepalive: config.fabrickBroker.keepalive,
    port: ttn_gateway.port,
    clientId: ttn_gateway.id,
    username: "9303090",
    password: "ttn-account-v2.hB2TaLQVmknKayyWE51mnteyYSWqIVGqIrVitvnrA1Y",
});
ttnBroker.connect();
ttnBroker.onConnect(() => {
    console.log('Fabrick TTN Client connected');

    fabrick_Broker.publish('client/fabrick.io/TTN/Status', '{"status":"Connected"}', {
        qos: 1,
        retain: true
    })
});
ttnBroker.onError((err, username) => {
    console.log('error happen with  Lora Client')
    console.log(err)
    fabrick_Broker.publish('client/fabrick.io/TTN/Status', '{"status":"Error"}', {
        qos: 1,
        retain: true
    })
    broker.end()
});
ttnBroker.onClose((name, username) => {
    console.log(name + '  Lora Client disconnected')
    fabrick_Broker.publish('client/fabrick.io/TTN/Status', '{"status":"Disconnected"}', {
        qos: 1,
        retain: true
    })
});
ttnBroker.onReconnect((name) => {
    console.log(name + ' reconnecting...')
});
ttnBroker.onOffline((name, username) => {
    console.log(name + ' broker is offline')
    fabrick_Broker.publish('client/fabrick.io/TTN/Status', '{"status":"Offline"}', {
        qos: 1,
        retain: true
    })
});
ttnBroker.onMessage(processMessage);

function processMessage(gatewayName, topic, message, packet) {
    if(topic !== '9303090/devices/libelium/up'){
        console.log('Invalid topic return.');
        return;
    }

    var rawData;
    try {
        var json_object = JSON.parse(message);
        rawData = json_object['payload_raw'];
    } catch (e) {
        console.log('Invalid JSON format.');
        return;
    }

    var extId = rawData.substring(0, 8);

    if (!subcribe_devices["MAC-" + extId]) {
        console.log('No handler for device on extId %s', extId);
        return;
    }

    var publishMessage = generateMessage(extId, rawData);
    if (publishMessage) {
        console.log('Message received from gateway ' + gatewayName);
        console.log(publishMessage);
        console.log("-----------------------------------");

        // fabrick_Broker.publish('fabrick.io/'+username+'/'+macAddr, JSON.stringify(publishMessage), {qos: 1, retain: true});
        fabrick_Broker.publish('client/fabrick.io/device/data', JSON.stringify(publishMessage), {
            qos: 1,
            retain: true
        });
    }
}

function generateMessage(extId, rawData) {
    var message = {
        "extId": extId
    };
    message["rawData"] = rawData;
    message["receivedDate"] = new Date();

    var common = new Common();

    var data = {};
    data["payload"] = [rawData];

    var frameCount = parseInt(rawData.substring(8, 10));
    console.log('frameCount : ' + frameCount);
    var i = 0;
    var start = 8;
    var end = 10;
    var dataChannel, dataType = "";
    while (i < frameCount) {
        start = end;
        end += 2;
        dataChannel = rawData.substring(start, end);
        start = end;
        end += 2;
        dataType = rawData.substring(start, end);

        switch (dataType) {
            case '64': // generic sensor
                switch (dataChannel) {
                    case '00':
                        start = end;
                        end += 4;
                        var sound = parseInt('0x' + rawData.substring(start, end));
                        data["sound"] = [(sound * 5) / 1024, 'V'];
                        break;
                    case '01':
                        start = end;
                        end += 4;
                        var ultrasonic = parseInt('0x' + rawData.substring(start, end));
                        data["ultrasonic"] = [ultrasonic, 'cm'];
                        break;
                    case '02':
                        start = end;
                        end += 4;
                        var pm25 = parseInt('0x' + rawData.substring(start, end));
                        data["pm25"] = [pm25, 'ug/m3'];
                        break;
                    case '03': //eCO2
                        start = end;
                        end += 4;
                        var eCO2 = parseInt('0x' + rawData.substring(start, end));
                        data["eCO2"] = [eCO2, 'ppm'];
                        break;
                    case '04': //TV0C
                        start = end;
                        end += 4;
                        var TV0C = parseInt('0x' + rawData.substring(start, end));
                        data["TV0C"] = [TV0C, 'ppb'];
                        break;
                }
                break;
            case '65': //Illuminator sensor
                start = end;
                end += 6;
                var illuminance = parseInt('0x' + rawData.substring(start, end));
                data["illuminance"] = [illuminance, 'lux'];
                break;
            case '67': //'temp sensor'
                start = end;
                end += 4;
                var temperature = parseInt('0x' + rawData.substring(start, end));
                data["temperature"] = [temperature / 10, '°C'];
                break;
            case '68': //'hum sensor'
                switch (dataChannel) {
                    case '00':
                        start = end;
                        end += 2;
                        var hum = parseInt('0x' + rawData.substring(start, end));
                        data["humidity"] = [hum / 2, '%RH'];
                        break;
                }
                break;
            case "69":
                start = end;
                end += 2;
                var stage = rawData.substring(start, end);
                if (stage == "00") {
                    data['stage'] = [false];
                } else if (stage == "01") {
                    data['stage'] = [true];
                }
                break;
            case '71': // Accelerometer
                start = end;
                end += 4;
                var acce = parseInt('0x' + rawData.substring(start, end));
                data["acce"] = [acce, 'g'];
                break;
            case '72': //Magnetometer
                start = end;
                end += 4;
                var mag = parseInt('0x' + rawData.substring(start, end));
                data["mag"] = [mag, 'gauss'];
                break;
            case '73': //Barometer //Pressure
                start = end;
                end += 4;
                var pressure = parseInt('0x' + rawData.substring(start, end));
                data["pressure"] = [pressure, 'hPa'];
                break;
            case '86': //Gyrometer
                start = end;
                end += 4;
                var gyro = parseInt('0x' + rawData.substring(start, end));
                data["gyro"] = [gyro, 'dps'];
                break;
            case "74":
                start = end;
                end += 4;
                var batteryLevel = parseInt('0x' + rawData.substring(start, end));
                data['batteryLevel'] = [batteryLevel / 100, 'V'];
                break;
            case "7e":
                start = end;
                end += 4;
                var ph = parseInt('0x' + rawData.substring(start, end));
                data["ph"] = [ph / 100, "pH"];
                break;
            case "c9":
                start = end;
                end += 4;
                var soilMoisture = parseInt('0x' + rawData.substring(start, end));
                data["soilMoisture"] = [soilMoisture / 100, "%"];
                break;
            default:
                console.log('DataType "' + dataType + '" is not support for current  device on MAC %s', extId);
        }
        i++;
    }

    message["data"] = data;

    return message;
}