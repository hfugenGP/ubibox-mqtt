'use strict'

var _ = require('lodash');
const Broker = require('./lib/broker');
const Common = require('./lib/common');
const config = require('./config/conf');
const GioTService = require('./services/giotService');
const redis = require("redis");

var subcribe_devices = new Array();
var subcribe_topics = new Array();

var fabrick_gateway = {
    id: "Netvox Response Service " + config.fabrickBroker.idKey,
    host: config.fabrickBroker.host,
    port: config.fabrickBroker.port,
    topics: { 'client/fabrick.io/Netvox/Device/Response': 1 }
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
    console.log('Netvox Response Service Connected');
});
fabrick_Broker.onError((err) => {
    console.log('error happen with Netvox Response Service')
    console.log(err)
    fabrick_Broker.end()
});
fabrick_Broker.onClose(() => {
    console.log('Netvox Response Service Disconnected')
});
fabrick_Broker.onReconnect(() => {
    console.log('Netvox Response Service Reconnecting...')
});
fabrick_Broker.onOffline(() => {
    console.log('Netvox Response Service is offline')
});
fabrick_Broker.onMessage((gatewayName, topic, message, packet) => {
    console.log('Message received for topic: ' + topic);

    switch (topic) {
        case 'client/fabrick.io/Netvox/Device/Response':
            processMessage(gatewayName, topic, message, packet);
            break;

        default:
            console.log('No handler for topic : ' + topic);
            break;
    }
});

function processMessage(gatewayName, topic, message, packet) {
    if (message) {
        var json_object = JSON.parse(message);

        var requestId = json_object['request_id'];
        if (requestId) {
            var client = redis.createClient();
            client.set("NetvoxResponse-" + requestId, message);
        }
    }
}