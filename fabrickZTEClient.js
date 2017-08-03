'use strict'

const Broker = require('./lib/broker');

const net = require('net');
const Common = require('./lib/common');
const config = require('./config/conf');
const SimpleCrypto = require('./lib/simpleCrypto');
const CryptoJS = require("crypto-js");
const adler32 = require('adler32');
const ZTEDataService = require('./services/zteDataService');
const f = require('util').format;
const MongoClient = require('mongodb').MongoClient;
var AsyncLock = require('async-lock');

var user = encodeURIComponent(config.zte.mongoUsername);
var password = encodeURIComponent(config.zte.mongoPassword);

// Connection URL
var url = f(config.zte.mongoUrl, user, password, config.zte.mongoAuthMechanism);

var lock = new AsyncLock();
var connectingDevices = new Array();
var subcribedDevices = new Array();

// Create a server instance, and chain the listen function to it
// The function passed to net.createServer() becomes the event handler for the 'connection' event
// The sock object the callback function receives UNIQUE for each connection
function handleDeviceConnetion(sock) {
    // We have a connection - a socket object is assigned to the connection automatically
    console.log('CONNECTED: ' + sock.remoteAddress + ':' + sock.remotePort);

    // sock.setEncoding("utf8");
    sock.setNoDelay(true);

    // Add a 'data' event handler to this instance of socket
    sock.on('data', function(data) {
        var zteDataService = new ZTEDataService();

        var buff = new Buffer(data, 'utf8');
        var hexData = buff.toString('hex');
        var common = new Common();

        console.log('************************New data received************************');
        console.log('Address : ' + sock.remoteAddress + ':' + sock.remotePort);
        console.log('Received : ' + new Date());
        console.log('DATA : ' + hexData);

        var deviceId = hexData.substring(24, 54);

        lock.acquire("connectingDevicesLock", function(done) {
            if (!connectingDevices.hasOwnProperty(deviceId) ||
                connectingDevices[deviceId] == undefined) {
                connectingDevices[deviceId] = sock;
            }
        });

        if (!zteDataService.processData(hexData, subcribedDevices)) {
            console.log('Fail to process data, return now without callback...');
            return;
        }

        console.log('*****************************************************************');

        var messageCallback = zteDataService.generateReply(hexData);

        var buffer = Buffer.from(messageCallback, "hex");

        // Write the data back to the socket, the client will receive it as data from the server
        sock.write(buffer, function(err) {
            if (err) {
                console.log('Sock write error : ' + err);
                console.log('*****************************************************************');
            }
        });
        console.log('************************End data received************************');
        console.log('');
        console.log('');
        console.log('');
    });

    // Add a 'close' event handler to this instance of socket
    sock.on('close', function(data) {
        console.log('CLOSED: ' + sock.remoteAddress + ' ' + sock.remotePort);
        lock.acquire("connectingDevicesLock", function(done) {
            connectingDevices[deviceId] = undefined;
        });
    });

    sock.on('error', function(data) {
        console.log('ERROR: ' + sock.remoteAddress + ' ' + data);
        lock.acquire("connectingDevicesLock", function(done) {
            connectingDevices[deviceId] = undefined;
        });
    });
};

net.createServer(handleDeviceConnetion).listen(config.zte.PORT, () => {
    console.log('Server listening on ' + ':' + config.zte.PORT);
});

var fabrick_gateway = {
    id: "Fabrick ZTE Sockets Client " + config.fabrickBroker.idKey,
    host: config.fabrickBroker.host,
    port: config.fabrickBroker.port,
    topics: { 'config/fabrick.io/ZTE/Devices/Message': 1, 'config/fabrick.io/ZTE/Devices': 1 }
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
    console.log('ZTE Client connected');
});
fabrick_Broker.onError((err) => {
    console.log('error happen with ZTE Client');
    console.log(err);
    fabrick_Broker.end();
});
fabrick_Broker.onClose(() => {
    console.log('ZTE Client disconnected');
});

fabrick_Broker.onMessage((gatewayName, topic, message, packet) => {
    console.log('Message received from Fabrick');

    var data = JSON.parse(message);
    switch (topic) {
        case 'config/fabrick.io/ZTE/Device/Message':
            var deviceId = data["deviceId"];
            if (connectingDevices.hasOwnProperty(deviceId) &&
                connectingDevices[deviceId] != undefined) {
                var messageCallback = zteDataService.generateMessageToDevice(hexData);
                var buffer = Buffer.from(messageCallback, "hex");
                var sock = connectingDevices[deviceId];
                // Write the data back to the socket, the client will receive it as data from the server
                sock.write(buffer, function(err) {
                    if (err) {
                        console.log('Sock write error : ' + err);
                        console.log('*****************************************************************');
                    }
                });
            }
            break;
        case 'config/fabrick.io/ZTE/Devices':
            // console.log(json_object);
            while (subcribedDevices.length) {
                subcribedDevices.pop();
            }
            data.forEach(function(element) {
                subcribedDevices['ID-' + element['device_id'].toLowerCase()] = element['encryption_key'];
            });
            console.log(subcribedDevices);
            break;
        default:
            console.log('No handler for topic %s', topic);
    }
});

// Response Package for Connack (Unencrypted):
// 55 55 -> Frame Header
// 00 00 00 00 00 00 00 00 -> Initialization Vector (Random)
// 00 00 -> Message Length (not calculated yet)
// 38 36 31 34 37 33 30 33 30 31 34 39 36 38 33 -> Device ID
// 55  d2  a8  d2  32  a7  45  11  -> Random Noise
// 02 -> Message Connack
// 00  1c -> Frame ID (Use the same message ID that you are replying to)
// 00  01  -> Data Length (only 1 because it is just acknowledgement message)
// 01 -> Allow Session Message
// 03  6e  16  33 - Checksum (not calculated yet)
// aa  aa -> Frame End