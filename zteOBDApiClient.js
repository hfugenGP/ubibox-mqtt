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
var common = new Common();
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
            requestDeviceDataSingle(device).then(next);
        }).then(function () {
            console.log("++++++++All Files Uploaded++++++++");
            setTimeout(requestDeviceData, 60000);
        });
    });
}

function requestDeviceDataSingle(device){
    var deferred = Q.defer();

    var deviceImei = device.imei;

    var from = device.lastRequest;
    var to = Date.now().getTime();

    requestDeviceInfo(deviceImei).then(
        function(){
            return requestDeviceGPSData(device, from, to);
        }
    ).then(
        function(){
            return requestDeviceTripData(device, from, to);
        }
    ).then(
        function(){
            return requestDeviceOBDData(device, from, to);
        }
    ).then(
        function(){
            return requestDeviceAlarm(device, from, to);
        }
    ).then(
        function(){
            return requestDeviceDTCData(device, from, to);
        }
    ).then(
        function(){
            mongodb.collection('OBDDevice').findOneAndUpdate({
                imei: deviceImei
            }, {lastRequest: to}, function(err){
                deferred.resolve(true);
            });
        }
    );

    return deferred.promise;
}

function requestDeviceInfo(device){
    var deferred = Q.defer();

    var deviceInfo = "device?accessToken=test&version=wl_api_v1.0.0&data={'deviceId':'"+device.imei+"'}";

    request.get({url:serverURL + deviceInfo}, function optionalCallback(err, httpResponse, body) {
        if (err) {
            return console.error('Fail to connect to server:', err);
        }

        deferred.resolve(true);

        console.log('Request successful!  Server responded with:', body);
    });

    return deferred.promise;
}


function requestDeviceGPSData(device, from, to){
    var deferred = Q.defer();

    var lastGPSData = "gps/gpsList?accessToken=test&version=wl_api_v1.0.0&data={'deviceId':'"+device.imei+"','dataType':2,'startTime':"+from+",'endTime':"+to+",'isGps':0}";

    request.get({url:serverURL + lastGPSData}, function optionalCallback(err, httpResponse, body) {
        if (err) {
            return console.error('Fail to connect to server:', err);
        }

        var gps = new Array();
        _.each(body.data, function (gpsPoint) {
            var gpsData = {};
            gpsData["positionTime"] = common.dateToUTCText(new Date(gpsPoint.gpsTime));
            gpsData["positionSource"] = "GPS";
            gpsData["height"] = gpsPoint.height;
            gpsData["longitude"] = gpsPoint.longitude;
            gpsData["latitude"] = gpsPoint.latitude;
            gpsData["latlng"] = gpsPoint.latitude + "," + gpsPoint.longitude;
            gpsData["gpsSpeed"] = gpsPoint.gpsSpeed;
            gpsData["heading"] = gpsPoint.heading;
            gpsData["PDOP"] = gpsPoint.PDOP;
            gpsData["HDOP"] = gpsPoint.HDOP;
            gpsData["VDOP"] = gpsPoint.VDOP;
            gpsData["gpsType"] = "routing";
            gpsData["numberOfSatellites"] = gpsPoint.satellitesNumber;
            gpsData["tripId"] = null;
            gpsData["deviceId"] = device.extId;
            gpsData["status"] = "New";
            gpsData["address"] = "";

            gps.push(gpsData);
        });

        if (gps.length > 0) {
            insertBundle(mongodb, "GPSData", gps, function (insertedIds) {
                redisClient.publish("zteGPSData", JSON.stringify({
                    "deviceId": device.extId
                }));

                deferred.resolve(true);
            });
        }

        console.log('Request successful!  Server responded with:', body);
    });

    return deferred.promise;
}

function requestDeviceOBDData(device, from, to){
    var deferred = Q.defer();

    var lastOBDData = "obd/fuelObd?accessToken=test&version=wl_api_v1.0.0&data={'deviceId':'"+device.imei+"','dataType':1,'startTime':"+from+",'endTime':"+to+",'isGps:1}";

    request.get({url:serverURL + lastOBDData}, function optionalCallback(err, httpResponse, body) {
        if (err) {
            return console.error('Fail to connect to server:', err);
        }

        var statuses = new Array();
        var lastStatus = null;
        _.each(body.data, function (status) {
            var data = {};
            data["deviceId"] = device.extId;
            data["reportTime"] = status.machineTime;
            data["rpm"] = status.RPM;
            data["speed"] = status.speed;
            data["engineCoolantTemperature"] = status.engineCoolantTemperature;
            data["engineCoolantTemperatureStatus"] = "Normal";
            data["throttlePosition"] = status.throttlePosition;
            data["engineDuty"] = status.engineDuty;
            data["intakeAirFlow"] = status.intakeFlow;
            data["intakeAirTemp"] = status.intakeTemperature;
            data["intakeAirPressure"] = status.intakePressure;
            data["batteryVolt"] = status.batteryVoltage;
            data["batteryVoltStatus"] = "Normal";
            data["totalMileage"] = status.historicalTotalmileage;
            data["totalFuelConsumption"] = status.historicalTotalFuel;
            data["totalDrivingTime"] = status.historicalTotalDrivingTime;

            if(!lastStatus || lastStatus.reportTime < status.machineTime){
                lastStatus = data;
            }

            statuses.push(data);
        });

        if (statuses.length > 0) {
            mongodb.collection('DeviceSetting').findOne({
                deviceId: device.extId,
                settingCode: "0x04000000"
            }, function (err, tempSetting) {
                console.log('******************Checking Overheat Alert******************');
                console.log('engineCoolantTemperature: ' + lastStatus.engineCoolantTemperature);
                if (lastStatus.engineCoolantTemperature != "N/A" && tempSetting != null && parseInt(tempSetting.value) < lastStatus.engineCoolantTemperature) {
                    console.log('tempSettingValue: ' + tempSetting.value);
                    console.log('******************Saving Overheat Alert******************');
                    lastStatus.engineCoolantTemperatureStatus = "Warning";
                    var alertData = {
                        "deviceId": lastStatus.deviceId,
                        "alertCategoryId": new MongoObjectId("5991411f0e8828a2ff3d1048"),
                        "alertTypeId": new MongoObjectId("599cfb516b8f82252a0c4d25"),
                        "alertType": "overheat", 
                        "reportTime": lastStatus.reportTime,
                        "gpsPosition": null,
                        "status": "Pending",
                        "readStatus": "Unread",
                        "value": {
                            "engineCoolantTemperature": lastStatus.engineCoolantTemperature,
                            "heatLimit": parseInt(tempSetting.value)
                        }
                    }
                    insert(mongodb, "Alert", alertData, function (insertedId) {
                        var cmd = 'php ' + config.zte.artisanURL + ' notify ' + insertedId.toHexString();
                        console.log("Trigger Alert notification: " + cmd);
                        exec(cmd, function (error, stdout, stderr) {
                            if (error) console.log(error);
                            if (stdout) console.log(stdout);
                            if (stderr) console.log(stderr);
                        });
                    });
                }

                mongodb.collection('DeviceSetting').findOne({
                    deviceId: device.extId,
                    settingCode: "0x00060000"
                }, function (err, lowVoltage) {
                    console.log('******************Checking lowVoltage Alert******************');
                    console.log('batteryVolt: ' + lastStatus.batteryVolt);
                    if (lastStatus.batteryVolt != "N/A" && lowVoltage != null && parseInt(lowVoltage.value) > lastStatus.batteryVolt) {
                        console.log('lowVoltage: ' + lowVoltage.value);
                        lastStatus.batteryVoltStatus = "Warning";
                    }

                    console.log('******************Saving Vehicle Status******************');
                    insert(mongodb, "VehicleHistoricalStatus", statuses, function (insertedIds) {
                        insertBundle(mongodb, "VehicleStatus", lastStatus, function (insertedId) {
                            deferred.resolve(true);
                        });
                    });
                });
            });
        }

        console.log('Request successful!  Server responded with:', body);
    });

    return deferred.promise;
}

function requestDeviceAlarm(device, from, to){
    var deferred = Q.defer();

    var getDeviceAlarms = "alarm/alarmList?accessToken=test&version=wl_api_v1.0.0&page=0&pageSize=100&data={'deviceId':'"+device.imei+"','dataType':7,'startTime':"+from+",'endTime':"+from+"}";

    request.get({url:serverURL + getDeviceAlarms}, function optionalCallback(err, httpResponse, body) {
        if (err) {
            return console.error('Fail to connect to server:', err);
        }

        _.each(body.data, function (alarm) {
            var gpsData = {};
            gpsData["positionTime"] = alarm.machineTime;
            gpsData["positionSource"] = "GPS";
            gpsData["longitude"] = alarm.startLongitude;
            gpsData["latitude"] = alarm.startLatitude;
            gpsData["latlng"] = alarm.startLatitude + "," + alarm.startLongitude;
            gpsData["gpsType"] = "reference";
            gpsData["deviceId"] = device.extId;
            gpsData["status"] = "New";

            insert(mongodb, "GPSData", gpsData, function (insertedId) {
                if(alarm.alarmId == "100012" ||
                    alarm.alarmId == "100049"||
                    alarm.alarmId == "100048"){
                    var historicalData = {};
                    historicalData["deviceId"] = device.extId;
                    historicalData["reportTime"] = alarm.machineTime;
                    historicalData["gpsPosition"] = insertedId;
                    
                    switch (alarm.alarmId) {
                        case "100048":
                            //Device Sleep
                            historicalData["deviceDataTypeId"] = new MongoObjectId("59966b93d63375278131e63d");
                            historicalData["value"] = {
                                "sleepVoltage": alarm.alarmPrivateValue.value1
                            };
                            break;
                        case "100049":
                            //Device Wakeup
                            historicalData["deviceDataTypeId"] = new MongoObjectId("59966ba0d63375278131e63e");
                            historicalData["value"] = {
                                "wakeUpVoltage": alarm.alarmPrivateValue.value1,
                                "wakeUpType": alarm.alarmPrivateValue.value2
                            };
                            break;
                        
                        case "100012":
                            //Power On after reboot
                            historicalData["deviceDataTypeId"] = new MongoObjectId("59966bacd63375278131e63f");
                            historicalData["value"] = {
                                "timeLastPoweredOff": alarm.alarmPrivateValue.value1,
                                "typeOfPowerOn": alarm.alarmPrivateValue.value2
                            };
                            break;
                    }

                    insert(mongodb, "DeviceHistoricalData", historicalData, function (insertedId) {
                        var deviceData = {};
                        deviceData["deviceId"] = device.extId;
                        deviceData["deviceDataTypeId"] = historicalData["deviceDataTypeId"];
                        deviceData["reportTime"] = historicalData["reportTime"];
                        deviceData["value"] = historicalData["value"];
                        mongodb.collection('DeviceData').findOneAndUpdate({
                            deviceId: device.extId,
                            deviceDataTypeId: deviceData["deviceDataTypeId"]
                        }, deviceData, {
                            upsert: true
                        });
                    });
                }
                else{
                    var alertData = {};
                    alertData["deviceId"] = device.extId;
                    alertData["alertCategoryId"] = new MongoObjectId("5991411f0e8828a2ff3d1049");
                    alertData["reportTime"] = alarm.machineTime;
                    alertData["gpsPosition"] = insertedId;
                    alertData["status"] = "Pending";
                    alertData["readStatus"] = "Unread";
                    switch (alarm.alarmId) {
                        case "300002":
                            alertData["alertTypeId"] = new MongoObjectId("5991468295dfe43d4ca834ba");
                            alertData["alertType"] = "suspected_collision";
                            alertData["value"] = {
                                "collisionValue": alarm.alarmPrivateValue.value1
                            }
                            break;
                        case "200008":
                            alertData["alertTypeId"] = new MongoObjectId("5991469c95dfe43d4ca834bc");
                            alertData["alertType"] = "sudden_acceleration";
                            alertData["value"] = {
                                "speedBeforeAcc": alarm.alarmPrivateValue.value1,
                                "speedAfterAcc": alarm.alarmPrivateValue.value2,
                                "accValue": alarm.alarmPrivateValue.value3
                            }
                            break;
                        case "200009":
                            alertData["alertTypeId"] = new MongoObjectId("599146ab95dfe43d4ca834bd");
                            alertData["alertType"] = "sudden_deceleration";
                            alertData["value"] = {
                                "speedBeforeDec": alarm.alarmPrivateValue.value1,
                                "speedAfterDec": alarm.alarmPrivateValue.value2,
                                "decValue": alarm.alarmPrivateValue.value3
                            }
                            break;
                        case "200010":
                            alertData["alertTypeId"] = new MongoObjectId("599146b695dfe43d4ca834be");
                            alertData["alertType"] = "sharp_turn";
                            alertData["value"] = {
                                "turn": alarm.alarmPrivateValue.value1
                            }
                            break;
                        case "200001":
                            alertData["alertTypeId"] = new MongoObjectId("59d6fbbcb4e2548c4ae92915");
                            alertData["alertType"] = "overspeed";
                            alertData["value"] = {
                                "maxSpeed": alarm.alarmPrivateValue.value1,
                                // "speedLimit": json_object["alertData"]["speedLimit"],
                                // "speedingMileage": json_object["alertData"]["speedingMileage"],
                                "speedingStart": alarm.alarmPrivateValue.value2,
                                "speedingEnd": alarm.alarmPrivateValue.value3
                            }
                            break;
                        case "100002":
                            //Cannot location for long time
                            alertData["alertTypeId"] = new MongoObjectId("5991780ae55de693e45b7176");
                            alertData["alertType"] = "can_not_locate_for_long_time";
                            alertData["value"] = {};
                            break;
                        case "100025":
                            // Low battery Voltage
                            alertData["alertTypeId"] = new MongoObjectId("5991465195dfe43d4ca834b8");
                            alertData["alertType"] = "low_voltage";
                            alertData["value"] = {
                                "batteryVolt": alarm.alarmPrivateValue.value1
                            }
                            break;
                        case "600011":
                            //Vibration after ignition off
                            alertData["alertTypeId"] = new MongoObjectId("5991466495dfe43d4ca834b9");
                            alertData["alertType"] = "vibration_after_ignition_off";
                            alertData["value"] = {
                                "peekValue": alarm.alarmPrivateValue.value1
                            }
                            break;
                        case "700004":
                            //Device pull out
                            alertData["alertTypeId"] = new MongoObjectId("5991469095dfe43d4ca834bb");
                            alertData["alertType"] = "device_pulled_out";
                            alertData["value"] = {
                                "status": alarm.alarmPrivateValue.value1
                            };
                            break;
    
                    }
    
                    insert(mongodb, "Alert", alertData, function (insertedId) {
                        var cmd = 'php ' + config.zte.artisanURL + ' notify ' + insertedId.toHexString();
                        console.log("Trigger Alert notification: " + cmd);
                        exec(cmd, function (error, stdout, stderr) {
                            if (error) console.log(error);
                            if (stdout) console.log(stdout);
                            if (stderr) console.log(stderr);
                        });
    
                        deferred.resolve(true);
                    });
                }
            });
        })

        console.log('Request successful!  Server responded with:', body);
    });

    return deferred.promise;
}

function requestDeviceDTCData(device, from, to){
    var deferred = Q.defer();

    var getDeviceDTCs = "alarm/faultList?accessToken=test&version=wl_api_v1.0.0&page=0&pageSize=20&data={'deviceId':'"+device.imei+"', 'startTime':"+from+",'endTime':"+to+"}";

    request.get({url:serverURL + getDeviceDTCs}, function optionalCallback(err, httpResponse, body) {
        if (err) {
            return console.error('Fail to connect to server:', err);
        }

        var alerts = [];
        _.each(body.data, function (dtc) {
            var alertData = {
                "deviceId": device.extId,
                "alertCategoryId": new MongoObjectId("5991411f0e8828a2ff3d1049"),
                "alertTypeId": new MongoObjectId("5991463795dfe43d4ca834b7"),
                "alertType": "dtc_code",
                "reportTime": dtc.machineTime,
                "gpsPosition": null,
                "status": "Pending",
                "readStatus": "Unread",
                "value": {
                    "codeType": "obd",
                    "stateCode": dtc.faultCode.substring(4, 6),
                    "faultCode": "P" + dtc.faultCode.substring(0, 4)
                }
            }

            alerts.push(alertData);
        });

        if (alerts.count > 0) {
            insertBundle(mongodb, "Alert", alerts, function (insertedIds) {
                insertedIds.forEach(function (insertedId) {
                    var cmd = 'php ' + config.zte.artisanURL + ' notify ' + insertedId.toHexString();
                    console.log("Trigger Alert notification: " + cmd);
                    exec(cmd, function (error, stdout, stderr) {
                        if (error) console.log(error);
                        if (stdout) console.log(stdout);
                        if (stderr) console.log(stderr);
                    });
                }, this);

                deferred.resolve(true);
            });
        }else{
            deferred.resolve(true);
        }

        console.log('Request successful!  Server responded with:', body);
    });

    return deferred.promise;
}

function requestDeviceTripData(device, from, to){
    var deferred = Q.defer();

    var getDeviceTripSummary = "alarm/vehicleTravel?accessToken=test&version=wl_api_v1.0.0&page=0&pageSize=20&data={'deviceId':'"+device.imei+"', 'startTime':"+from+",'endTime':"+to+",'fuelType':1,'mileageType':1,'speedType':1}";

    request.get({url:serverURL + getDeviceTripSummary}, function optionalCallback(err, httpResponse, body) {
        if (err) {
            return console.error('Fail to connect to server:', err);
        }

        _.each(body.data.travelList, function (trip) {
            var gpsDataStart = {};
            gpsDataStart["positionTime"] = trip.travelStartTime;
            gpsDataStart["positionSource"] = "GPS";
            gpsDataStart["longitude"] = trip.startLongitude;
            gpsDataStart["latitude"] = trip.startLatitude;
            gpsDataStart["latlng"] = trip.startLatitude + "," + trip.startLongitude;
            gpsDataStart["gpsType"] = "reference";
            gpsDataStart["deviceId"] = device.extId;
            gpsDataStart["status"] = "New";
            gpsDataStart["address"] = "";

            var gpsDataEnd = {};
            gpsDataEnd["positionTime"] = trip.travelEndTime;
            gpsDataEnd["positionSource"] = "GPS";
            gpsDataEnd["longitude"] = trip.endLongitude;
            gpsDataEnd["latitude"] = trip.endLatitude;
            gpsDataEnd["latlng"] = trip.endLatitude + "," + trip.endLongitude;
            gpsDataEnd["gpsType"] = "reference";
            gpsDataEnd["deviceId"] = device.extId;
            gpsDataEnd["status"] = "New";
            gpsDataEnd["address"] = "";

            var tripData = {};
            tripData["deviceId"] = device.extId;
            insert(mongodb, 'GPSData', gpsDataStart, function (insertedId) {
                tripData["ignitionOnTime"] = trip.travelStartTime;
                tripData["gpsWhenIgnitionOn"] = insertedId;
                insert(mongodb, 'GPSData', gpsDataEnd, function (insertedId) {
                    tripData["ignitionOffTime"] = trip.travelEndTime;
                    tripData["gpsWhenIgnitionOff"] = insertedId;
                    tripData["drivingDistance"] = trip.mileage;
                    tripData["drivingFuelConsumption"] = trip.fuel;
                    tripData["maxSpeed"] = trip.maximumSpeed;
                    tripData["idleTime"] = trip.idleTimes;
                    tripData["idleFuelConsumption"] = trip.idleFuel;
                    tripData.numberOverSpeed = trip.overspeedTimes;
                    tripData.numberRapidAcce = trip.accelerateTimes;
                    tripData.numberRapidDece = trip.decelerateTimes;
                    tripData.numberRapidSharpTurn = trip.sharpTurnTimes;
                    tripData["totalMileage"] = trip.historicalTotalMileage;
                    tripData["totalFuelConsumption"] = trip.historicalTotalFuelConsumption;
                    tripData["totalDrivingTime"] = trip.historicalTotalDrivingTime;
                    tripData["status"] = "New";
                    insert(mongodb, 'Trips', tripData, function (insertedId) {
                        mongodb.collection('GPSData').updateMany({
                            deviceId: device.extId,
                            gpsType: "routing",
                            tripId: null,
                            positionTime : {$gt:trip.travelStartTime, $lt:trip.travelEndTime}
                        }, {
                            $set: {
                                tripId: insertedId
                            }
                        }, {
                            upsert: true,
                            multi: true
                        });

                        var cmd = 'php ' + config.zte.artisanURL + ' tripData ' + insertedId.toHexString();
                        console.log("Trigger Trip Summary: " + cmd);
                        exec(cmd, function (error, stdout, stderr) {
                            if (error) console.log(error);
                            if (stdout) console.log(stdout);
                            if (stderr) console.log(stderr);
                        });

                        deferred.resolve(true);
                    });
                });
            });
        });

        console.log('Request successful!  Server responded with:', body);
    });

    return deferred.promise;
}

function insert(db, collection, data, callback) {
    db.collection(collection).insertOne(data, function (err, result) {
        if (err) {
            console.log("Error when write to mongodb: " + err);
        }
        callback(result.insertedId);
    });
}

function insertBundle(db, collection, data, callback) {
    db.collection(collection).insertMany(data, function (err, result) {
        if (err) {
            console.log("Error when write to mongodb: " + err);
        }
        callback(result.insertedIds);
    });
}