'use strict'

const Broker = require('./broker');
const Common = require('./common')
const config = require('./conf');
const MongoClient = require('mongodb').MongoClient;
const f = require('util').format;
const exec = require('child_process').exec;

var user = encodeURIComponent('fabrick');
var password = encodeURIComponent('brazn@1234');
var authMechanism = 'DEFAULT';

// Connection URL
var url = f('mongodb://%s:%s@localhost:27017/fabrick?authMechanism=%s',
    user, password, authMechanism);

var fabrick_gateway = {
    id: 'Fabrick Dashboard Subcriber',
    host: config.fabrickBroker.host,
    port: config.fabrickBroker.port,
    username: config.fabrickBroker.username,
    password: config.fabrickBroker.password,
    topics: { 'client/fabrick.io/device/data': 1 }
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
fabrick_Broker.onMessage((gatewayName, topic, message, packet) => {
    var json_object = JSON.parse(message);

    switch (topic) {
        case 'client/' + config.fabrickBroker.username + '/device/data':

            var receivedDate = new Date(json_object.receivedDate);
            var receivedDateText = receivedDate.getUTCFullYear() + "-" + receivedDate.getUTCMonth() + "-" + receivedDate.getUTCDate() + " " + receivedDate.getUTCHours() + ":" + receivedDate.getUTCMinutes() + ":" + receivedDate.getUTCSeconds();
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