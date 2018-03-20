const Broker = require('./lib/broker');
const net = require('net');
const Common = require('./lib/common');
const config = require('./config/conf');
const SimpleCrypto = require('./lib/simpleCrypto');
const CryptoJS = require("crypto-js");
const adler32 = require('adler32');
const ZTEDataService = require('./services/zteDataService');
// const ZTEDataServiceV_2 = require('./services/zteDataServiceV2');
const f = require('util').format;
const MongoClient = require('mongodb').MongoClient;
const redis = require("redis");
// var AsyncLock = require('async-lock');
var _ = require('lodash');
// var locks = require('locks');

var user = encodeURIComponent(config.zte.mongoUsername);
var password = encodeURIComponent(config.zte.mongoPassword);

// Connection URL
var url = f(config.zte.mongoUrl, user, password, config.zte.mongoAuthMechanism);

// var lock = new AsyncLock();
var connectingDevices = {};
var deviceAddress = {};
var subcribedDevices = new Array();
var subcribedDevicesV2 = new Array();
var pendingDeviceMessages = {};
var cachedFrameId = new Array();
var cachedDeviceAlert = new Array();

var fabrick_gateway = {
    id: "Fabrick ZTE Sockets Client " + config.zteBroker.idKey,
    host: config.zteBroker.host,
    port: config.zteBroker.port,
    topics: { 'config/ztewelink/portal/Device/Message': 1, 'config/ztewelink/portal/Devices': 1, 'config/ztewelink/portal/Device/V2/Message': 1, 'config/ztewelink/portal/Devices/V2': 1 }
};

var fabrick_Broker = new Broker(fabrick_gateway, fabrick_gateway.host, {
    keepalive: config.zteBroker.keepalive,
    port: fabrick_gateway.port,
    clientId: fabrick_gateway.id,
    username: config.zteBroker.username,
    password: config.zteBroker.password,
});

var mongodb;
var redisClient = redis.createClient();

MongoClient.connect(url, {  
    poolSize: 50
    // other options can go here
    },mongoConnected);

function mongoConnected(err, db){
    if(err){
        console.log("Error when connect to mongodb: " + err);
        return false;
    }

    mongodb=db;

    net.createServer(handleDeviceConnetion).listen(config.zte.PORT, () => {
        console.log('#################Server listening on ' + ':' + config.zte.PORT + '#################');
    });

    var zteDataSenderService = new ZTEDataService(mongodb, redisClient, cachedDeviceAlert);
    // var zteDataSenderServiceV2 = new ZTEDataServiceV_2(mongodb, redisClient, cachedDeviceAlert);

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
            case 'config/ztewelink/portal/Device/Message':
                console.log(data);
                var deviceId = data["deviceId"];
                var messageCallback = zteDataSenderService.generateMessageToDevice(subcribedDevices, deviceId, data["frameId"], data["requestType"], data["parameters"]);

                if (messageCallback) {
                    if (connectingDevices.hasOwnProperty(deviceId) &&
                        connectingDevices[deviceId] != undefined) {

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
                    } else {
                        if (!pendingDeviceMessages.hasOwnProperty(deviceId) ||
                            pendingDeviceMessages[deviceId] == undefined) {
                            pendingDeviceMessages[deviceId] = new Array();
                        }

                        pendingDeviceMessages[deviceId].push(messageCallback);
                        console.log('Device is offline, message pushed to queue');
                        console.log('Queue: ' + pendingDeviceMessages[deviceId]);
                    }
                }
                break;
            case 'config/ztewelink/portal/Devices':
                // console.log(json_object);
                while (subcribedDevices.length) {
                    subcribedDevices.pop();
                }
                data.forEach(function(element) {
                    var deviceId = element['device_id'].toLowerCase();
                    subcribedDevices['ID-' + deviceId] = element['encryption_key'];
                    mongodb.collection('DeviceStage').findOneAndUpdate({ deviceId: deviceId }, { $set: { status: "Offline" } }, { upsert: true });
                });
                
                console.log(subcribedDevices);
                break;

            case 'config/ztewelink/portal/Device/V2/Message':
                console.log(data);
                var deviceId = data["deviceId"];
                var messageCallback = zteDataSenderServiceV2.generateMessageToDevice(subcribedDevicesV2, deviceId, data["frameId"], data["requestType"], data["parameters"]);

                if (messageCallback) {
                    if (connectingDevices.hasOwnProperty(deviceId) &&
                        connectingDevices[deviceId] != undefined) {

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
                    } else {
                        if (!pendingDeviceMessages.hasOwnProperty(deviceId) ||
                            pendingDeviceMessages[deviceId] == undefined) {
                            pendingDeviceMessages[deviceId] = new Array();
                        }

                        pendingDeviceMessages[deviceId].push(messageCallback);
                        console.log('Device is offline, message pushed to queue');
                        console.log('Queue: ' + pendingDeviceMessages[deviceId]);
                    }
                }
                break;
            case 'config/ztewelink/portal/Devices/V2':
                // console.log(json_object);
                while (subcribedDevicesV2.length) {
                    subcribedDevicesV2.pop();
                }
                data.forEach(function(element) {
                    var deviceId = element['device_id'].toLowerCase();
                    subcribedDevicesV2['ID-' + deviceId] = element['encryption_key'];
                    mongodb.collection('DeviceStage').findOneAndUpdate({ deviceId: deviceId }, { $set: { status: "Offline" } }, { upsert: true });
                });
                
                console.log(subcribedDevicesV2);
                break;
            default:
                console.log('No handler for topic %s', topic);
        }
    });
}

// var deviceListLock = locks.createReadWriteLock();
// var pendingMessageLock = locks.createReadWriteLock();

// Create a server instance, and chain the listen function to it
// The function passed to net.createServer() becomes the event handler for the 'connection' event
// The sock object the callback function receives UNIQUE for each connection
function handleDeviceConnetion(sock) {
    // We have a connection - a socket object is assigned to the connection automatically
    console.log('#################CONNECTED: ' + sock.remoteAddress + ':' + sock.remotePort + '#################');
    // sock.setEncoding("utf8");
    // sock.setNoDelay(true);

    sock.on('connect', function(data) {
        console.log('#################SOCK CONNECTED EVENT: ' + sock.remoteAddress + ':' + sock.remotePort + '#################');
    });

    sock.on('drain', function(data) {
        console.log('#################SOCK DRAIN EVENT: ' + sock.remoteAddress + ':' + sock.remotePort + '#################');
    });

    sock.on('lookup', function(data) {
        console.log('#################SOCK LOOKUP EVENT: ' + sock.remoteAddress + ':' + sock.remotePort + '#################');
    });

    sock.on('end', function(data) {
        console.log('#################SOCK END EVENT: ' + sock.remoteAddress + ':' + sock.remotePort + '#################');
    });

    sock.on('timeout', function(data) {
        console.log('#################SOCK TIMEOUT EVENT: ' + sock.remoteAddress + ':' + sock.remotePort + '#################');
    });

    // Add a 'data' event handler to this instance of socket
    sock.on('data', function(data) {
        var zteDataService = new ZTEDataService(mongodb, redisClient, cachedDeviceAlert);
        // var zteDataServiceV2 = new ZTEDataServiceV_2(mongodb, redisClient, cachedDeviceAlert);
        var buff = new Buffer(data, 'utf8');
        var hexData = buff.toString('hex');
        var common = new Common();

        console.log('***********************Start data received***********************');
        console.log('Address : ' + sock.remoteAddress + ':' + sock.remotePort);
        console.log('Received : ' + new Date());
        console.log('DATA : ' + hexData);

        var deviceId = hexData.substring(24, 54);
        var deviceIdV2 = hexData.substring(8, 38);

        var isV1 = false;
        if (subcribedDevices["ID-" + deviceId]) {
            isV1 = true;
        }else if (subcribedDevicesV2["ID-" + deviceIdV2]){
            deviceId = deviceIdV2;
            console.log('Error: ^^^^^^^ Currently now support V2 devices : ' + deviceId + ' ^^^^^^^');
            return false;
        }else{
            console.log('Error: ^^^^^^^ No support device with deviceId : ' + deviceId + ' ^^^^^^^');
            return false;
        }

        deviceAddress[sock.remoteAddress + ':' + sock.remotePort] = deviceId;
        connectingDevices[deviceId] = sock;

        var deviceData = isV1 ? zteDataService.preProcessData(hexData, subcribedDevices) : zteDataServiceV2.preProcessData(hexData, subcribedDevicesV2);

        if(!deviceData){
            console.log('Fail to process data, return now without callback...');
            return;
        }

        var frameIdCachedKey = "ZTE-" + deviceData["DeviceId"] + "-" + deviceData["MessageType"] + "-" + deviceData["MessageId"];
        if(cachedFrameId[frameIdCachedKey]){
            console.log('#################Duplicated frame returned, ignore this frame...#################');
            console.log('deviceId : ' + deviceData["DeviceId"]);
            console.log('frameType : ' + deviceData["MessageType"]);
            console.log('frameId : ' + deviceData["MessageId"]);
            console.log('#################Duplicated frame returned, ignore this frame...#################');
            return;
        }

        cachedFrameId[frameIdCachedKey] = true;
        var receivedDateText = common.dateToUTCText(new Date());
        if(deviceData.MessageType == '0e'){
            //Set to offline if this is disconnected frame
            mongodb.collection('DeviceStage').findOneAndUpdate({ deviceId: deviceId }, { $set: { status: "Offline", lastUpdated: receivedDateText } }, { upsert: true });
        }else{
            //Set to online if this is any other frame
            mongodb.collection('DeviceStage').findOneAndUpdate({ deviceId: deviceId }, { $set: { status: "Online", lastUpdated: receivedDateText } }, { upsert: true });
        }

        if(isV1){
            if (!zteDataService.processData(hexData, subcribedDevices, deviceData)) {
                console.log('Fail to process data, return now without callback...');
                return;
            }
        }else{
            if (!zteDataServiceV2.processData(hexData, subcribedDevicesV2, deviceData)) {
                console.log('Fail to process data, return now without callback...');
                return;
            }
        }

        console.log('************************End data received************************');
        console.log('************************Start data reply*************************');
        var messageCallback = isV1 ? zteDataService.generateReply(hexData) : zteDataServiceV2.generateReply(hexData);
        if (!messageCallback) {
            console.log('************************End data reply************************');
            console.log('');
            console.log('');
            console.log('');
            return;
        }

        var buffer = Buffer.from(messageCallback, "hex");

        // Write the data back to the socket, the client will receive it as data from the server
        sock.write(buffer, function(err) {
            if (err) {
                console.log('#################Sock write error : ' + err + '#################');
                console.log('*****************************************************************');
            }
        });
        console.log('************************End data reply************************');
        console.log('');
        console.log('');
        console.log('');

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
                            console.log('#################Sock write error : ' + err + '#################');
                            console.log('*****************************************************************');
                        }
                    });
                }
            });
        }

        if(cachedFrameId.length >= 1000){
            cachedFrameId.splice(0, 10);
        }
    });

    // Add a 'close' event handler to this instance of socket
    sock.on('close', function(data) {
        var common = new Common();
        console.log('#################CLOSED: ' + sock.remoteAddress + ' ' + sock.remotePort + '#################');
        var deviceId = deviceAddress[sock.remoteAddress + ':' + sock.remotePort];
        if(deviceId)
        {
            var receivedDateText = common.dateToUTCText(new Date());
            connectingDevices[deviceAddress[sock.remoteAddress + ':' + sock.remotePort]] = undefined;
            mongodb.collection('DeviceStage').findOneAndUpdate({ deviceId: deviceId }, { $set: { status: "Offline" } }, { upsert: true });
        }
    });

    sock.on('error', function(data) {
        var common = new Common();
        console.log('#################ERROR: ' + sock.remoteAddress + ' ' + data + '#################');
        var deviceId = deviceAddress[sock.remoteAddress + ':' + sock.remotePort];
        if(deviceId)
        {
            var receivedDateText = common.dateToUTCText(new Date());
            connectingDevices[deviceAddress[sock.remoteAddress + ':' + sock.remotePort]] = undefined;
            mongodb.collection('DeviceStage').findOneAndUpdate({ deviceId: deviceId }, { $set: { status: "Offline" } }, { upsert: true });
        }
    });
}