'use strict'

// const mqtt = require('mqtt');
const Broker = require('./lib/broker');
const Common = require('./lib/common')
const config = require('./config/conf');
const GioTService = require('./services/giotService');
const InnopiaService = require('./services/innopiaService');

var subcribe_devices = new Array();
var subcribe_gateways = new Array();
var subcribe_brokers = new Array();

var fabrick_gateway = {
    id: "Fabrick GIoT Client " + config.fabrickBroker.idKey,
    host: config.fabrickBroker.host,
    port: config.fabrickBroker.port,
    topics: { 'config/fabrick.io/GIoT/Devices': 1, 'config/fabrick.io/GIoT/Gateways': 1 }
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
    console.log('GioT Client connected');
});
fabrick_Broker.onError((err) => {
    console.log('error happen with GioT Client')
    console.log(err)
    fabrick_Broker.end()
});
fabrick_Broker.onClose(() => {
    console.log('GioT Client disconnected')
});
fabrick_Broker.onReconnect(() => {
    console.log('GioT Client reconnecting...')
});
fabrick_Broker.onOffline(() => {
    console.log('GioT Client is offline')
});
fabrick_Broker.onMessage((gatewayName, topic, message, packet) => {
    console.log('Message received for topic: ' + topic);
    var json_object = JSON.parse(message);

    var gateways = new Array();

    switch (topic) {
        case 'config/fabrick.io/GIoT/Gateways':
            json_object.forEach(function(element) {
                var gateway = {
                    id: element['id'],
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
                        console.log(name + ' Broker connected');

                        console.log('Update client status to Fabrick broker')
                        fabrick_Broker.publish('client/fabrick.io/GioT/Status', '{"status":"Connected"}', { qos: 1, retain: true })
                    });
                    broker.onError((err, username) => {
                        console.log('error happen with Gemtek broker')
                        console.log(err)
                        fabrick_Broker.publish('client/fabrick.io/GioT/Status', '{"status":"Error"}', { qos: 1, retain: true })
                        broker.end()
                    });
                    broker.onClose((name, username) => {
                        console.log(name + ' broker disconnected')
                        fabrick_Broker.publish('client/fabrick.io/GioT/Status', '{"status":"Disconnected"}', { qos: 1, retain: true })
                    });
                    broker.onReconnect((name) => {
                        console.log(name + ' reconnecting...')
                    });
                    broker.onOffline((name, username) => {
                        console.log(name + ' broker is offline')
                        fabrick_Broker.publish('client/fabrick.io/GioT/Status', '{"status":"Offline"}', { qos: 1, retain: true })
                    });
                    broker.onMessage(processGemtekMessage);

                    subcribe_brokers[id] = broker;
                } else if (subcribe_gateways[id].topics != gateway.topics) {
                    //Subcrible/Unsubcrible topics within gateway
                    // var broker = subcribe_brokers[id];

                    // subcribe_gateways[id].topics.forEach(function(topic){
                    //     broker.unsubscribe(topic);
                    // });

                    // gateway.topics.forEach(function(topic){
                    //     broker.subscribe(topic);
                    // });
                }
            }
            break;
        case 'config/fabrick.io/GIoT/Devices':
            // console.log(json_object);
            while (subcribe_devices.length) {
                subcribe_devices.pop();
            }
            json_object.forEach(function(element) {
                subcribe_devices['MAC-' + element['device'].toLowerCase()] = element['deviceType'];
            });
            console.log(subcribe_devices);
            break;
        default:
            console.log('No handler for topic %s', topic);
    }
});

function processGemtekMessage(gatewayName, topic, message, packet, username) {
    var json_object = JSON.parse(message);

    console.log('Raw message received from gateway ' + gatewayName);
    console.log(json_object);
    console.log("-----------------------------------");

    var publishMessage;
    var deviceExtId;
    if (gatewayName == "Innopia-000193") {
        var deviceId = json_object['DeviceId'];
        deviceExtId = deviceId;

        var innopia = new InnopiaService();
        publishMessage = innopia.generateMessage(subcribe_devices, deviceId, json_object);
    } else {
        var macAddr = json_object['macAddr'];
        deviceExtId = macAddr;
        if (macAddr.length > 8) {
            macAddr = macAddr.substring(8);
        }

        var giot = new GioTService();
        publishMessage = giot.generateMessage(subcribe_devices, macAddr, json_object['buff'], json_object['data'], json_object['extra']);
    }

    if (publishMessage) {
        if (config.debuggingDevices.length == 0 || config.debuggingDevices.indexOf(deviceExtId) != -1) {
            console.log('Message received from gateway ' + gatewayName);
            console.log(publishMessage);
            console.log("-----------------------------------");
        }

        // fabrick_Broker.publish('fabrick.io/'+username+'/'+macAddr, JSON.stringify(publishMessage), {qos: 1, retain: true});
        fabrick_Broker.publish('client/fabrick.io/device/data', JSON.stringify(publishMessage), { qos: 1, retain: true });
    }
}