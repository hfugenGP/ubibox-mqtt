'use strict'

const Broker = require('./broker');
const Common = require('./common')
const config = require('./config');
const redis = require("redis");

var fabrick_gateway = {
    id: "Fabrick Senslink Client " + config.fabrickBroker.idKey,
    host: config.fabrickBroker.host,
    port: config.fabrickBroker.port,
    topics: { 'config/Senslink/Devices': 1 }
};

var fabrick_Broker = new Broker(fabrick_gateway, fabrick_gateway.host, {
    keepalive: config.fabrickBroker.keepalive,
    port: fabrick_gateway.port,
    clientId: fabrick_gateway.id
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
fabrick_Broker.onMessage((topic, message, packet) => {
    console.log('Message received from Fabrick');
    console.log('topic: ' + topic);
    console.log('message : ')
    console.log(JSON.parse(message));

    switch (topic) {
        case 'config/Senslink/Devices':
            var client = redis.createClient();
            client.set("config/Senslink/Devices", message);
            break;
        default:
            console.log('No handler for topic %s', topic);
    }
});