'use strict'

const Q = require('q');
const Broker = require('./lib/broker');
const net = require('net');
const Common = require('./lib/common');
const config = require('./config/conf');
const f = require('util').format;
const MongoClient = require('mongodb').MongoClient;
const redis = require("redis");
var _ = require('lodash');
var request = require('request');
var forEachAsync = require('forEachAsync').forEachAsync;

var user = encodeURIComponent(config.zte.mongoUsername);
var password = encodeURIComponent(config.zte.mongoPassword);

// Connection URL
var url = f(config.zte.mongoUrl, user, password, config.zte.mongoAuthMechanism);

var fabrick_gateway = {
    id: "Fabrick ZTE API Client " + config.zteBroker.idKey,
    host: config.zteBroker.host,
    port: config.zteBroker.port,
    topics: { 'config/ztewelink/portal/Device/Message': 1, 'config/ztewelink/portal/Devices': 1 }
};

var fabrick_Broker = new Broker(fabrick_gateway, fabrick_gateway.host, {
    keepalive: config.zteBroker.keepalive,
    port: fabrick_gateway.port,
    clientId: fabrick_gateway.id,
    username: config.zteBroker.username,
    password: config.zteBroker.password,
});

var mongodb;
// var redisClient = redis.createClient();

var serverURL = "http://47.74.150.171:8082/magicyo_api/";

MongoClient.connect('mongodb://localhost:27017/zte', {  
    poolSize: 50
    // other options can go here
    },mongoConnected);

function mongoConnected(err, db){
    if(err){
        console.log("Error when connect to mongodb: " + err);
        return false;
    }

    mongodb=db;

    // var fabrick_client = fabrick_Broker.connect();

    // fabrick_Broker.onConnect(() => {
    //     console.log('ZTE Client connected');
    // });
    // fabrick_Broker.onError((err) => {
    //     console.log('error happen with ZTE Client');
    //     console.log(err);
    //     fabrick_Broker.end();
    // });
    // fabrick_Broker.onClose(() => {
    //     console.log('ZTE Client disconnected');
    // });

    // fabrick_Broker.onMessage((gatewayName, topic, message, packet) => {
    //     console.log('Message received from Fabrick');

    //     var data = JSON.parse(message);
    //     switch (topic) {
    //         case 'config/ztewelink/portal/Device/Message':
    //             // console.log(data);
    //             // var deviceId = data["deviceId"];
    //             // var messageCallback = zteDataSenderService.generateMessageToDevice(subcribedDevices, deviceId, data["frameId"], data["requestType"], data["parameters"]);

    //             // if (messageCallback) {
    //             //     if (connectingDevices.hasOwnProperty(deviceId) &&
    //             //         connectingDevices[deviceId] != undefined) {
    //             //         // deviceListLock.readLock(function() {
    //             //         //     console.log('Device List readLock');

    //             //         var buffer = Buffer.from(messageCallback, "hex");
    //             //         var sock = connectingDevices[deviceId];
    //             //         // Write the data back to the socket, the client will receive it as data from the server
    //             //         sock.write(buffer, function(err) {
    //             //             if (err) {
    //             //                 console.log('Sock write error : ' + err);
    //             //                 console.log('*****************************************************************');
    //             //             }
    //             //             console.log('Message already sent to Device');
    //             //         });

    //             //         //     console.log('Device List unlocked');
    //             //         //     deviceListLock.unlock();
    //             //         // });
    //             //     } else {
    //             //         // pendingMessageLock.writeLock(function() {
    //             //         //     console.log('Pending Message writeLock');
    //             //         if (!pendingDeviceMessages.hasOwnProperty(deviceId) ||
    //             //             pendingDeviceMessages[deviceId] == undefined) {
    //             //             pendingDeviceMessages[deviceId] = new Array();
    //             //         }

    //             //         pendingDeviceMessages[deviceId].push(messageCallback);
    //             //         console.log('Device is offline, message pushed to queue');
    //             //         console.log('Queue: ' + pendingDeviceMessages[deviceId]);
    //             //         //     console.log('Pending Message unlocked');
    //             //         //     pendingMessageLock.unlock();
    //             //         // });
    //             //     }
    //             // }
    //             break;
    //         case 'config/ztewelink/portal/Devices':
    //             // console.log(json_object);
    //             // while (subcribedDevices.length) {
    //             //     subcribedDevices.pop();
    //             // }
    //             // data.forEach(function(element) {
    //             //     var deviceId = element['device_id'].toLowerCase();
    //             //     subcribedDevices['ID-' + deviceId] = element['encryption_key'];
    //             //     mongodb.collection('DeviceStage').findOneAndUpdate({ deviceId: deviceId }, { $set: { status: "Offline" } }, { upsert: true });
    //             // });
                
    //             // console.log(subcribedDevices);
    //             break;
    //         default:
    //             console.log('No handler for topic %s', topic);
    //     }
    // });

    requestDeviceData();
}

function requestDeviceData(){
    mongodb.collection('OBDDevice').find({
        trackingType: "API",
        status: "Active"
    }).toArray(function (err, devices) {
        forEachAsync(devices, function (next, device, index, array) {
            requestDeviceDataSingle(device.imei).then(next);
        }).then(function () {
            console.log("++++++++All Files Uploaded++++++++");
            setTimeout(requestDeviceData, 60000);
        });
    });
}

function requestDeviceDataSingle(deviceImei){
    var deferred = Q.defer();

    mongodb.collection('WelinkAPIRequestLogs').find({
        deviceImei: deviceImei
    }).toArray(function (err, session) {
        var from = session.lastRequest;
        var to = Date.now().getTime();
        
        requestDeviceInfo(deviceImei).then(
            function(){
                return requestDeviceGPSData(deviceImei, from, to);
            }
        ).then(
            function(){
                return requestDeviceTripData(deviceImei, from, to);
            }
        ).then(
            function(){
                return requestDeviceOBDData(deviceImei, from, to);
            }
        ).then(
            function(){
                return requestDeviceAlarm(deviceImei, from, to);
            }
        ).then(
            function(){
                return requestDeviceDTCData(deviceImei, from, to);
            }
        ).then(
            function(){
                mongodb.collection('WelinkAPIRequestLogs').findOneAndUpdate({
                    deviceImei: deviceImei
                }, {deviceImei: deviceImei, lastRequest: to}, function(err){
                    deferred.resolve(true);
                });
            }
        );
    });

    return deferred.promise;
}

function requestDeviceInfo(deviceImei){
    var deferred = Q.defer();

    var deviceInfo = "device?accessToken=test&version=wl_api_v1.0.0&data={'deviceId':'"+deviceImei+"'}";

    request.get({url:serverURL + deviceInfo}, function optionalCallback(err, httpResponse, body) {
        if (err) {
            return console.error('Fail to connect to server:', err);
        }

        deferred.resolve(true);

        console.log('Request successful!  Server responded with:', body);
    });

    return deferred.promise;
}


function requestDeviceGPSData(deviceImei, from, to){
    var deferred = Q.defer();

    var lastGPSData = "gps/gpsList?accessToken=test&version=wl_api_v1.0.0&data={'deviceId':'"+deviceImei+"','dataType':2,'startTime':"+from+",'endTime':"+to+",'isGps':0}";

    request.get({url:serverURL + lastGPSData}, function optionalCallback(err, httpResponse, body) {
        if (err) {
            return console.error('Fail to connect to server:', err);
        }

        deferred.resolve(true);

        console.log('Request successful!  Server responded with:', body);
    });

    return deferred.promise;
}

function requestDeviceOBDData(deviceImei, from, to){
    var deferred = Q.defer();

    var lastOBDData = "obd/fuelObd?accessToken=test&version=wl_api_v1.0.0&data={'deviceId':'"+deviceImei+"','dataType':1,'startTime':"+from+",'endTime':"+to+",'isGps:1}";

    request.get({url:serverURL + lastOBDData}, function optionalCallback(err, httpResponse, body) {
        if (err) {
            return console.error('Fail to connect to server:', err);
        }

        deferred.resolve(true);

        console.log('Request successful!  Server responded with:', body);
    });

    return deferred.promise;
}

function requestDeviceAlarm(deviceImei, from, to){
    var deferred = Q.defer();

    var getDeviceAlarms = "alarm/alarmList?accessToken=test&version=wl_api_v1.0.0&page=0&pageSize=100&data={'deviceId':'"+deviceImei+"','dataType':7,'startTime':"+from+",'endTime':"+from+"}";

    request.get({url:serverURL + getDeviceAlarms}, function optionalCallback(err, httpResponse, body) {
        if (err) {
            return console.error('Fail to connect to server:', err);
        }

        deferred.resolve(true);

        console.log('Request successful!  Server responded with:', body);
    });

    return deferred.promise;
}

function requestDeviceDTCData(deviceImei, from, to){
    var deferred = Q.defer();

    var getDeviceDTCs = "alarm/faultList?accessToken=test&version=wl_api_v1.0.0&page=0&pageSize=20&data={'deviceId':'"+deviceImei+"', 'startTime':"+from+",'endTime':"+to+"}";

    request.get({url:serverURL + getDeviceDTCs}, function optionalCallback(err, httpResponse, body) {
        if (err) {
            return console.error('Fail to connect to server:', err);
        }

        deferred.resolve(true);

        console.log('Request successful!  Server responded with:', body);
    });

    return deferred.promise;
}

function requestDeviceTripData(deviceImei, from, to){
    var deferred = Q.defer();

    var getDeviceTripSummary = "alarm/vehicleTravel?accessToken=test&version=wl_api_v1.0.0&page=0&pageSize=20&data={'deviceId':'"+deviceImei+"', 'startTime':"+from+",'endTime':"+to+",'fuelType':1,'mileageType':1,'speedType':1}";

    request.get({url:serverURL + getDeviceTripSummary}, function optionalCallback(err, httpResponse, body) {
        if (err) {
            return console.error('Fail to connect to server:', err);
        }

        deferred.resolve(true);

        console.log('Request successful!  Server responded with:', body);
    });

    return deferred.promise;
}