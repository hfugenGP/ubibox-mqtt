'use strict'

var _ = require('lodash');
const Broker = require('./lib/broker');
const Common = require('./lib/common')
const config = require('./config/conf');
// const GioTService = require('./services/giotService');

var subcribe_devices = new Array();
// var subcribe_gateways = new Array();
// var subcribe_brokers = new Array();
var subcribe_topics = new Array();

var fabrick_gateway = {
    id: "Fabrick Arduino Client",
    host: config.fabrickBroker.host,
    port: config.fabrickBroker.port,
    topics: { 'config/fabrick.io/Arduino/Devices': 1, 'config/fabrick.io/Arduino/Gateways': 1 }
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
    console.log('Fabrick Broker connected');
});
fabrick_Broker.onError((err) => {
    console.log('error happen with Fabrick broker')
    console.log(err)
    fabrick_Broker.end()
});
fabrick_Broker.onClose(() => {
    console.log('Fabrick broker disconnected')
});
fabrick_Broker.onReconnect(() => {
    console.log('Fabrick reconnecting...')
});
fabrick_Broker.onOffline(() => {
    console.log('Fabrick broker is offline')
});
fabrick_Broker.onMessage((gatewayName, topic, message, packet) => {
    console.log('Message received for topic: ' + topic);
    var json_object = JSON.parse(message);

    var gateways = new Array();

    switch (topic) {
        case 'config/fabrick.io/Arduino/Gateways':
            _.each(subcribe_topics, function(topic) {
                fabrick_Broker.unsubscribeOne(topic);
            });

            while (subcribe_topics.length) {
                subcribe_topics.pop();
            }

            _.each(json_object, function(element) {
                fabrick_Broker.subscribeOne(element['topic']);
                subcribe_topics[] = element['topic'];
            });

            // json_object.forEach(function(element) {
            //     // var gateway = {
            //     //     id: element['id'],
            //     //     protocol: element['protocol'],
            //     //     host: element['host'],
            //     //     port: element['port'],
            //     //     username: element['username'],
            //     //     password: element['password'],
            //     //     topics: element['topics']
            //     // };

            //     fabrick_Broker.subscribeOne(element['topic']);
            //     subcribe_topics[] = element['topic'];

            //     // gateways[gateway.id] = gateway;

            // });
            console.log(subcribe_topics);

            break;

        case 'config/fabrick.io/Arduino/Devices':
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
            // Handle all message returned for devices
            processMessage(gatewayName, topic, message, packet);
    }
});

function processMessage(gatewayName, topic, message, packet) {
    var json_object = JSON.parse(message);

    var macAddr = json_object['macAddr'];
    if (macAddr.length > 8) {
        macAddr = macAddr.substring(8);
    }

    // console.log(json_object)
    var publishMessage = generateMessage(macAddr, json_object['buff'], json_object['data']);
    if (publishMessage) {
        // console.log('Message received from gateway ' + gatewayName);
        // console.log(publishMessage);
        // console.log("-----------------------------------");
        if (config.debuggingDevices.indexOf(macAddr) != -1) {
            console.log('Message received from gateway ' + gatewayName);
            console.log(publishMessage);
            console.log("-----------------------------------");
        }

        // fabrick_Broker.publish('fabrick.io/'+username+'/'+macAddr, JSON.stringify(publishMessage), {qos: 1, retain: true});
        fabrick_Broker.publish('client/fabrick.io/device/data', JSON.stringify(publishMessage), { qos: 1, retain: true });
    }
}

function generateMessage(macAddr, receivedDate, rawData) {}