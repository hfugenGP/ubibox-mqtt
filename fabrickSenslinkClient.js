'use strict'

const Broker = require('./lib/broker');
const Common = require('./lib/common')
const config = require('./config/conf');
const redis = require("redis");

var fabrick_gateway = {
    id: "Fabrick Senslink Client " + config.fabrickBroker.idKey,
    host: config.fabrickBroker.host,
    port: config.fabrickBroker.port,
    topics: { 'config/fabrick.io/Senslink/Devices': 1 }
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
    console.log('Senslink Client connected');
});
fabrick_Broker.onError((err) => {
    console.log('error happen with Senslink Client')
    console.log(err)
    fabrick_Broker.end()
});
fabrick_Broker.onClose(() => {
    console.log('Senslink Client disconnected')
});
fabrick_Broker.onReconnect(() => {
    console.log('Senslink Client reconnecting...')
});
fabrick_Broker.onOffline(() => {
    console.log('Senslink Client is offline')
});
fabrick_Broker.onMessage((gatewayName, topic, message, packet) => {
    console.log('Message received from Fabrick');
    console.log('topic: ' + topic);
    console.log('message : ')
    console.log(JSON.parse(message));

    switch (topic) {
        case 'config/fabrick.io/Senslink/Devices':
            var client = redis.createClient();
            client.set("config/Senslink/Devices", message);
            break;
        default:
            console.log('No handler for topic %s', topic);
    }
});