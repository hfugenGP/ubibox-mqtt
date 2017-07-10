'use strict'

var _ = require('lodash');
const Broker = require('./lib/broker');
const Common = require('./lib/common');
const config = require('./config/conf');
const GioTService = require('./services/giotService');

const request = require('request');
var url = "http://192.168.15.1/cgi-bin/rest/network/";

var subcribe_devices = new Array();
var subcribe_topics = new Array();

var fabrick_gateway = {
    id: "Netvox Driven Service " + config.fabrickBroker.idKey,
    host: config.fabrickBroker.host,
    port: config.fabrickBroker.port,
    topics: { 'client/fabrick.io/Netvox/Device/ActionCall': 1 }
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
    console.log('Netvox Driven Service Connected');
});
fabrick_Broker.onError((err) => {
    console.log('error happen with Netvox Driven Service')
    console.log(err)
    fabrick_Broker.end()
});
fabrick_Broker.onClose(() => {
    console.log('Netvox Driven Service Disconnected')
});
fabrick_Broker.onReconnect(() => {
    console.log('Netvox Driven Service Reconnecting...')
});
fabrick_Broker.onOffline(() => {
    console.log('Netvox Driven Service is offline')
});
fabrick_Broker.onMessage((gatewayName, topic, message, packet) => {
    console.log('Message received for topic: ' + topic);

    switch (topic) {
        case 'client/fabrick.io/Netvox/Device/ActionCall':
            processMessage(gatewayName, topic, message, packet);
            break;

        default:
            console.log('No handler for topic : ' + topic);
            break;
    }
});

function processMessage(gatewayName, topic, message, packet) {
    var json_object = JSON.parse(message);

    var requestParam = json_object['request'];

    request({
        uri: url + requestParam,
        method: "GET",
        headers: {
            "MediaType": "HTTP/1.1",
            "Content-Type": "application/json",
        }
    }, function(error, response, body) {
        if (error) {
            return console.error('request failed:', error);
        }
        console.log('Status Code: ', response && response.statusCode); // Print the response status code if a response was received
        console.log('Request successful! Server responded with: ', body);
    });
}