'use strict'

const Broker = require('./lib/broker');
const Common = require('./lib/common')
const config = require('./config/conf');
const MongoClient = require('mongodb').MongoClient;
const f = require('util').format;
const exec = require('child_process').exec;

var user = encodeURIComponent(config.mongodb.username);
var password = encodeURIComponent(config.mongodb.password);

// Connection URL
var url = f(config.mongodb.url, user, password, config.mongodb.authMechanism);

var fabrick_gateway = {
    id: 'Fabrick Dashboard Subcriber',
    host: config.fabrickBroker.host,
    port: config.fabrickBroker.port,
    topics: { 'client/fabrick.io/device/data': 1 }
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
    var json_object = JSON.parse(message);

    switch (topic) {
        case 'client/fabrick.io/device/data':

            var receivedDate = new Date(json_object.receivedDate);
            var receivedDateText = receivedDate.getUTCFullYear() + "-" + (receivedDate.getUTCMonth() + 1) + "-" + receivedDate.getUTCDate() + " " + receivedDate.getUTCHours() + ":" + receivedDate.getUTCMinutes() + ":" + receivedDate.getUTCSeconds();
            var data = {
                "extId": json_object.extId,
                "rawData": json_object.rawData,
                "data": json_object,
                "receivedDate": receivedDateText,
                "status": "New"
            }

            // Use connect method to connect to the Server
            MongoClient.connect(url, function(err, db) {
                // console.log("Connected correctly to server");

                db.collection('GatewayData').insertOne(data, function(err, r) {
                    if (err) {
                        console.log("Error when write to mongodb: " + err);
                    }

                    console.log(r.insertedCount + " record has been saved to mongodb");

                    db.close();
                });
            });
            break;

        default:
            console.log('No handler for topic %s', topic);
    }
});