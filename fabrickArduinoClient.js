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
    id: "Fabrick Arduino Client " + config.fabrickBroker.idKey,
    host: config.fabrickBroker.host,
    port: config.fabrickBroker.port,
    topics: { 'config/fabrick.io/Arduino/Devices': 1, 'config/fabrick.io/Arduino/Devices/LoraTopics': 1, 'config/fabrick.io/Arduino/Lora/Gateways': 1, 'config/fabrick.io/Arduino/Wifi/Gateways': 1 }
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
    console.log('Arduino Client Connected');
});
fabrick_Broker.onError((err) => {
    console.log('error happen with Arduino Client')
    console.log(err)
    fabrick_Broker.end()
});
fabrick_Broker.onClose(() => {
    console.log('Arduino Client Disconnected')
});
fabrick_Broker.onReconnect(() => {
    console.log('Arduino Client Reconnecting...')
});
fabrick_Broker.onOffline(() => {
    console.log('Arduino Client is offline')
});
fabrick_Broker.onMessage((gatewayName, topic, message, packet) => {
    console.log('Message received for topic: ' + topic);
    var gateways = new Array();

    switch (topic) {
        case 'config/fabrick.io/Arduino/Wifi/Gateways':
            var json_object = JSON.parse(message);
            var new_topics = new Array();
            _.each(json_object, function(element) {
                new_topics.push(element['topics']);
            });

            _.each(subcribe_topics, function(topic) {
                if (new_topics.indexOf(topic) == -1) {
                    fabrick_Broker.unsubscribeOne(topic);
                }
            });

            while (subcribe_topics.length) {
                subcribe_topics.pop();
            }

            _.each(new_topics, function(topic) {
                fabrick_Broker.subscribeOne(topic);
                subcribe_topics.push(topic);
            });

            console.log(subcribe_topics);

            break;

        case 'config/fabrick.io/Arduino/Lora/Gateways':
            var json_object = JSON.parse(message);
            json_object.forEach(function(element) {
                var gateway = {
                    id: element['id'] + " Arduino Listener",
                    protocol: element['protocol'],
                    host: element['host'],
                    port: element['port'],
                    username: element['username'],
                    password: element['password'],
                    topics: element['topics']
                };

                gateways[gateway.id] = gateway;
                console.log(gateway);
            });

            while (subcribe_gateways.length) {
                subcribe_gateways.pop();
            }

            for (var id in subcribe_brokers) {
                if (!gateways.hasOwnProperty(id) && subcribe_brokers[id] != undefined) {
                    subcribe_brokers[id].end(true);
                    subcribe_brokers[id] = undefined;
                }
            }

            for (var id in gateways) {
                var gateway = gateways[id];
                subcribe_gateways[id] = gateway;
                if (!subcribe_brokers.hasOwnProperty(id) || subcribe_brokers[id] == undefined) {
                    // console.log("New gateway: " + gateway);
                    var protocol = gateway.protocol ? gateway.protocol + "://" : "mqtt://";
                    var broker_host = protocol + gateway.host;

                    var options = {
                        keepalive: config.defaultBroker.keepalive,
                        port: gateway.port,
                        clean: config.defaultBroker.clean,
                        clientId: config.defaultBroker.idKey + gateway.id,
                        reconnectPeriod: config.defaultBroker.reconnectPeriod,
                        rejectUnauthorized: config.defaultBroker.rejectUnauthorized,
                        protocolId: config.defaultBroker.protocolId,
                        protocolVersion: config.defaultBroker.protocolVersion
                    }

                    if (gateway.username && gateway.password) {
                        options.username = gateway.username;
                        options.password = gateway.password;
                    }

                    var broker = new Broker(gateway, broker_host, options);
                    broker.connect();
                    broker.onConnect((name, username, topics) => {
                        console.log(name + ' Arduino Lora Client connected');

                        fabrick_Broker.publish('client/fabrick.io/Arduino/Lora/Status', '{"status":"Connected"}', { qos: 1, retain: true })
                    });
                    broker.onError((err, username) => {
                        console.log('error happen with Arduino Lora Client')
                        console.log(err)
                        fabrick_Broker.publish('client/fabrick.io/Arduino/Lora/Status', '{"status":"Error"}', { qos: 1, retain: true })
                        broker.end()
                    });
                    broker.onClose((name, username) => {
                        console.log(name + ' Arduino Lora Client disconnected')
                        fabrick_Broker.publish('client/fabrick.io/Arduino/Lora/Status', '{"status":"Disconnected"}', { qos: 1, retain: true })
                    });
                    broker.onReconnect((name) => {
                        console.log(name + ' reconnecting...')
                    });
                    broker.onOffline((name, username) => {
                        console.log(name + ' broker is offline')
                        fabrick_Broker.publish('client/fabrick.io/Arduino/Lora/Status', '{"status":"Offline"}', { qos: 1, retain: true })
                    });
                    broker.onMessage(processLoraMessage);

                    subcribe_brokers[id] = broker;
                } else if (subcribe_gateways[id].topics != gateway.topics) {

                }
            }
            break;

        case 'config/fabrick.io/Arduino/Devices':
            var json_object = JSON.parse(message);
            while (subcribe_devices.length) {
                subcribe_devices.pop();
            }
            json_object.forEach(function(element) {
                subcribe_devices['MAC-' + element['device'].toLowerCase()] = element['deviceType'];
            });
            console.log(subcribe_devices);
            break;

        case 'config/fabrick.io/Arduino/Devices/LoraTopics':
            var json_object = JSON.parse(message);
            while (lora_topics.length) {
                lora_topics.pop();
            }
            json_object.forEach(function(element) {
                lora_topics['MAC-' + element['device'].toLowerCase()] = [element['topic']];
            });
            console.log(subcribe_devices);
            break;

        default:
            // Handle all message returned for devices
            processWifiMessage(gatewayName, topic, message, packet);
    }
});

function processWifiMessage(gatewayName, topic, message, packet) {
    var rawData;
    try {
        var json_object = JSON.parse(message);
        rawData = json_object['data'];
        console.log('Message delegated from Lora ' + message);
    } catch (e) {
        rawData = message.toString();
        console.log('Message received from Wifi ' + message);
    }

    var extId = rawData.substring(0, 8);

    //'MAC-f3104211'
    //'MAC-f3104211'
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
        fabrick_Broker.publish('client/fabrick.io/device/data', JSON.stringify(publishMessage), { qos: 1, retain: true });
    }
}

function processLoraMessage(gatewayName, topic, message, packet) {
    var json_object = JSON.parse(message);
    console.log('Message received from Lora ' + message);
    var rawData = json_object['data'];
    var extId = rawData.substring(0, 8);
    if (lora_topics["MAC-" + extId]) {
        lora_topics["MAC-" + extId].forEach(function(topic) {
            console.log('Delegate message to topic "' + topic + '" on fabrick gateway.');
            fabrick_Broker.publish(topic, message, { qos: 1, retain: false });
        }, this);
    }

    // if (rawData) {
    //     var extId = rawData.substring(0, 8);

    //     if (!subcribe_devices["MAC-" + extId]) {
    //         console.log('No handler for device on extId %s', extId);
    //         return;
    //     }

    //     var publishMessage = generateMessage(extId, rawData);
    //     if (publishMessage) {
    //         console.log('Message received from gateway ' + gatewayName);
    //         console.log(publishMessage);
    //         console.log("-----------------------------------");

    //         // fabrick_Broker.publish('fabrick.io/'+username+'/'+macAddr, JSON.stringify(publishMessage), {qos: 1, retain: true});
    //         fabrick_Broker.publish('client/fabrick.io/device/data', JSON.stringify(publishMessage), { qos: 1, retain: true });
    //     }
    // }
}

function generateMessage(extId, rawData) {
    var message = { "extId": extId };
    message["rawData"] = rawData;
    message["receivedDate"] = new Date();

    var common = new Common();

    var data = {};

    var frameCount = rawData.substring(8, 10);
    var dataChannel = rawData.substring(10, 12);
    var dataType = rawData.substring(12, 14);

    console.log('frameCount : ' + frameCount);
    console.log('dataChannel : ' + dataChannel);
    console.log('dataType : ' + dataType);

    switch (dataType) {
        case '64': // generic sensor
            switch (dataChannel) {
                case '00':
                    var sound = parseInt('0x' + rawData.substring(14, 18));
                    data["sound"] = [(sound * 5) / 1024, 'V'];
                    break;
                case '01':
                    var ultrasonic = parseInt('0x' + rawData.substring(14, 18));
                    data["ultrasonic"] = [ultrasonic, 'cm'];
                    break;
                case '02':
                    var pm25 = parseInt('0x' + rawData.substring(14, 18));
                    data["pm25"] = [pm25, 'ug/m3'];
                    break;
            }
            break;
        case '67': //'temp sensor'
            var temperature = parseInt('0x' + rawData.substring(14, 18));
            data["temperature"] = [temperature / 10, '°C'];

            break;
        case '68': //'hum sensor'
            var hum = parseInt('0x' + rawData.substring(14, 16));
            data["humidity"] = [hum / 2, '%RH'];
            break;
        default:
            console.log('No handler for device on MAC %s', extId);
            return;
    }

    message["data"] = data;

    return message;
}