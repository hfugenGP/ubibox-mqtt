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
// var AsyncLock = require('async-lock');
var _ = require('lodash');
var locks = require('locks');

var user = encodeURIComponent(config.zte.mongoUsername);
var password = encodeURIComponent(config.zte.mongoPassword);

// Connection URL
var url = f(config.zte.mongoUrl, user, password, config.zte.mongoAuthMechanism);

// var lock = new AsyncLock();
var connectingDevices = {};
var deviceAddress = {};
var subcribedDevices = new Array();
var pendingDeviceMessages = {};
var deviceListLock = locks.createReadWriteLock();
var pendingMessageLock = locks.createReadWriteLock();

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

        deviceListLock.readLock(function() {
            console.log('Device List readLock');
            deviceAddress[sock.remoteAddress + ':' + sock.remotePort] = deviceId;
            connectingDevices[deviceId] = sock;
            console.log('Device List unlocked');
            deviceListLock.unlock();
        });

        if (!zteDataService.processData(hexData, subcribedDevices)) {
            console.log('Fail to process data, return now without callback...');
            return;
        }

        console.log('*****************************************************************');

        var messageCallback = zteDataService.generateReply(hexData);
        if (!messageCallback) {
            console.log('************************End data received************************');
            console.log('');
            console.log('');
            console.log('');
            return;
        }

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

        pendingMessageLock.readLock(function() {
            console.log('Pending Message readLock');
            if (pendingDeviceMessages.hasOwnProperty(deviceId) &&
                pendingDeviceMessages[deviceId] != undefined) {
                var pendingMessages = pendingDeviceMessages[deviceId];
                pendingDeviceMessages[deviceId] = undefined;
                _.each(pendingMessages, function(message) {
                    if (message !== false) {
                        var messageString = message.toString();
                        console.log('Process delay message : ' + messageString);
                        var buffer = Buffer.from(messageString, "hex");
                        // Write the data back to the socket, the client will receive it as data from the server
                        sock.write(buffer, function(err) {
                            if (err) {
                                console.log('Sock write error : ' + err);
                                console.log('*****************************************************************');
                            }
                        });
                    }
                });
            }
            console.log('Pending Message unlocked');
            deviceListLock.unlock();
        });
    });

    // Add a 'close' event handler to this instance of socket
    sock.on('close', function(data) {
        console.log('CLOSED: ' + sock.remoteAddress + ' ' + sock.remotePort);
        deviceListLock.writeLock(function() {
            console.log('Device List writeLock');
            connectingDevices[deviceAddress[sock.remoteAddress + ':' + sock.remotePort]] = undefined;
            console.log('Device List writeLock');
            deviceListLock.unlock();
        });
    });

    sock.on('error', function(data) {
        console.log('ERROR: ' + sock.remoteAddress + ' ' + data);
        deviceListLock.writeLock(function() {
            console.log('Device List writeLock');
            connectingDevices[deviceAddress[sock.remoteAddress + ':' + sock.remotePort]] = undefined;
            console.log('Device List writeLock');
            deviceListLock.unlock();
        });
    });
};

net.createServer(handleDeviceConnetion).listen(config.zte.PORT, () => {
    console.log('Server listening on ' + ':' + config.zte.PORT);
});

var zteDataSenderService = new ZTEDataService();

var fabrick_gateway = {
    id: "Fabrick ZTE Sockets Client " + config.fabrickBroker.idKey,
    host: config.fabrickBroker.host,
    port: config.fabrickBroker.port,
    topics: { 'config/fabrick.io/ZTE/Device/Message': 1, 'config/fabrick.io/ZTE/Devices': 1 }
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
            console.log(data);
            var deviceId = data["deviceId"];
            var messageCallback = zteDataSenderService.generateMessageToDevice(subcribedDevices, deviceId, data["frameId"], data["requestType"], data["parameters"]);

            if (messageCallback) {
                if (connectingDevices.hasOwnProperty(deviceId) &&
                    connectingDevices[deviceId] != undefined) {
                    deviceListLock.readLock(function() {
                        console.log('Device List readLock');

                        var buffer = Buffer.from(messageCallback, "hex");
                        var sock = connectingDevices[deviceId];
                        // Write the data back to the socket, the client will receive it as data from the server
                        sock.write(buffer, function(err) {
                            if (err) {
                                console.log('Sock write error : ' + err);
                                console.log('*****************************************************************');
                            }
                            console.log('Message already sent to Device');
                        });

                        console.log('Device List unlocked');
                        deviceListLock.unlock();
                    });
                } else {
                    pendingMessageLock.writeLock(function() {
                        console.log('Pending Message writeLock');
                        if (!pendingDeviceMessages.hasOwnProperty(deviceId) ||
                            pendingDeviceMessages[deviceId] == undefined) {
                            pendingDeviceMessages[deviceId] = new Array();
                        }

                        pendingDeviceMessages[deviceId].push(messageCallback);
                        console.log('Device is offline, message pushed to queue');
                        console.log('Queue: ' + pendingDeviceMessages[deviceId]);
                        console.log('Pending Message unlocked');
                        deviceListLock.unlock();
                    });
                }
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