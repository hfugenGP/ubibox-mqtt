'use strict'

var _ = require('lodash');
const Broker = require('./lib/broker');
const Common = require('./lib/common');
const config = require('./config/conf');
const GioTService = require('./services/giotService');

const request = require('request');
var netvoxURL = "http://192.168.15.1/cgi-bin/rest/network/";
var hueURL = "http://192.168.15.101/api/sHWS9LXB4MVlM7MG1Zk4d1Aj7nhtvApI7yJp8HOm/";

var subcribe_devices = new Array();
var subcribe_topics = new Array();

var fabrick_gateway = {
    id: "Netvox Request Service " + config.fabrickBroker.idKey,
    host: config.fabrickBroker.host,
    port: config.fabrickBroker.port,
    topics: { 'client/fabrick.io/Netvox/Device/ActionCall': 1, 'client/fabrick.io/Hue/Device/ActionCall': 1 }
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
    console.log('Netvox Request Service Connected');
});
fabrick_Broker.onError((err) => {
    console.log('error happen with Netvox Request Service')
    console.log(err)
    fabrick_Broker.end()
});
fabrick_Broker.onClose(() => {
    console.log('Netvox Request Service Disconnected')
});
fabrick_Broker.onReconnect(() => {
    console.log('Netvox Request Service Reconnecting...')
});
fabrick_Broker.onOffline(() => {
    console.log('Netvox Request Service is offline')
});
fabrick_Broker.onMessage((gatewayName, topic, message, packet) => {
    console.log('Message received for topic: ' + topic);

    switch (topic) {
        case 'client/fabrick.io/Netvox/Device/ActionCall':
            processNetvoxMessage(gatewayName, topic, message, packet);
            break;

        case 'client/fabrick.io/Hue/Device/ActionCall':
            processHueMessage(gatewayName, topic, message, packet);
            break;

        default:
            console.log('No handler for topic : ' + topic);
            break;
    }
});

function processNetvoxMessage(gatewayName, topic, message, packet) {
    if (message) {
        var json_object = JSON.parse(message);

        var requestParam = json_object['request'];
        if (requestParam) {
            request({
                uri: netvoxURL + requestParam,
                method: "GET",
                headers: {
                    "MediaType": "HTTP/1.1",
                    "Content-Type": "application/json",
                }
            }, function(error, response, body) {
                if (error) {
                    fabrick_Broker.publish('client/fabrick.io/Netvox/Device/Response', JSON.stringify(error), { qos: 1, retain: false });
                    return console.error('request failed:', error);
                }
                console.log('Status Code: ', response && response.statusCode); // Print the response status code if a response was received
                console.log('Request successful! Server responded with: ', body);

                if (body) {
                    var jsonMessage = body.split("(")[1];
                    if (jsonMessage) {
                        var jsonMessage = jsonMessage.split(")")[0];
                        var jsonMessage = jsonMessage.trim();

                        var responseJson = JSON.parse(jsonMessage);
                        fabrick_Broker.publish('client/fabrick.io/Netvox/Device/Response', JSON.stringify(responseJson), { qos: 1, retain: true });
                    } else {
                        fabrick_Broker.publish('client/fabrick.io/Netvox/Device/Response', JSON.stringify(body), { qos: 1, retain: true });
                    }
                }
            });
        }
    }
}

function processHueMessage(gatewayName, topic, message, packet) {
    if (message) {
        var json_object = JSON.parse(message);

        var requestParam = json_object['request'];
        var method = json_object['method'];
        var params = json_object['params'];
        var id = json_object['id'];
        if (requestParam) {
            if (method == "GET") {
                request({
                    uri: hueURL + requestParam,
                    method: method,
                    headers: {
                        "MediaType": "HTTP/1.1",
                        "Content-Type": "application/json",
                    }
                }, function(error, response, body) {
                    if (error) {
                        fabrick_Broker.publish('client/fabrick.io/Hue/Device/Response', JSON.stringify(error), { qos: 1, retain: false });
                        return console.error('request failed:', error);
                    }
                    console.log('Status Code: ', response && response.statusCode); // Print the response status code if a response was received
                    console.log('Request successful! Server responded with: ', body);

                    var responseJson = { "request_id": id, "response_params": body };
                    fabrick_Broker.publish('client/fabrick.io/Hue/Device/Response', JSON.stringify(responseJson), { qos: 1, retain: true });
                });
            } else if (method == "PUT") {
                request({
                    uri: hueURL + requestParam,
                    method: method,
                    json: params,
                    headers: {
                        "MediaType": "HTTP/1.1",
                        "Content-Type": "application/json",
                    }
                }, function(error, response, body) {
                    if (error) {
                        fabrick_Broker.publish('client/fabrick.io/Hue/Device/Response', JSON.stringify(error), { qos: 1, retain: false });
                        return console.error('request failed:', error);
                    }
                    console.log('Status Code: ', response && response.statusCode); // Print the response status code if a response was received
                    console.log('Request successful! Server responded with: ', body);
                });
            }
        }
    }
}