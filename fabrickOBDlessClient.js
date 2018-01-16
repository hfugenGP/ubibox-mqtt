'use strict'

const Broker = require('./lib/broker');
const Common = require('./lib/common');
const config = require('./config/conf');
const redis = require("redis");
var _ = require('lodash');
const f = require('util').format;
const MongoClient = require('mongodb').MongoClient;
const MongoObjectId = require('mongodb').ObjectID;
const exec = require('child_process').exec;

var user = encodeURIComponent(config.zte.mongoUsername);
var password = encodeURIComponent(config.zte.mongoPassword);

// Connection URL
var url = f(config.zte.mongoUrl, user, password, config.zte.mongoAuthMechanism);

var mongodb;

MongoClient.connect(url, {  
    poolSize: 50
    // other options can go here
    },function(err, db) {
        if(err){
            console.log("Error when connect to mongodb: " + err);
            return false;
        }

        mongodb=db;

        var zte_client = zte_Broker.connect();
    });

var fabrick_gateway = {
    id: "Fabrick OBDless Client " + config.zteBroker.idKey,
    host: config.zteBroker.host,
    port: config.zteBroker.port,
    topics: {
        'api/ztewelink/OBDless/Data/GPS': 1,
        'api/ztewelink/OBDless/Data/TripSummary': 1,
        'api/ztewelink/OBDless/Data/Alert': 1
    }
};

var zte_Broker = new Broker(fabrick_gateway, fabrick_gateway.host, {
    keepalive: config.zteBroker.keepalive,
    port: fabrick_gateway.port,
    clientId: fabrick_gateway.id,
    username: config.zteBroker.username,
    password: config.zteBroker.password,
});

zte_Broker.onConnect(() => {
    console.log('OBDless Client connected');
});
zte_Broker.onError((err) => {
    console.log('error happen with OBDless Client')
    console.log(err)
    zte_Broker.end()
});
zte_Broker.onClose(() => {
    console.log('OBDless Client disconnected')
});
zte_Broker.onReconnect(() => {
    console.log('OBDless Client reconnecting...')
});
zte_Broker.onOffline(() => {
    console.log('OBDless Client is offline')
});

zte_Broker.onMessage((gatewayName, topic, message, packet) => {
    var common = new Common();
    console.log('Message received from Fabrick');
    console.log('topic: ' + topic);
    console.log('message : ')
    var json_object;
    try {
        json_object = JSON.parse(message);
    } catch (e) {
        console.log('###########Invalid JSON##############');
        return false;
    }
    console.log(json_object);

    // var client = redis.createClient();
    // var resKey = "timeout-" + json_object["deviceId"];
    // client.get("obdless/onGoing/trips", function (err, obj) {
    //     var deviceArray = [];

    //     if (!err) {
    //         if (obj) {
    //             deviceArray = JSON.parse(obj);
    //         }

    //         if (topic === "api/ztewelink/OBDless/Data/Alert" &&
    //             json_object.alertType === "trip_end") {
    //             console.log("############ Trip_End: clear cache and stop trip ############");
    //             deviceArray.pop(resKey);
    //             client.del(resKey);
    //         } else {
    //             console.log("############ New message: add to cache and set 120s expired ############");
    //             if(deviceArray.indexOf(resKey) === -1){
    //                 deviceArray.push(resKey);
    //             }
    //             client.set(resKey, true);
    //             client.expire(resKey, 120);
    //         }

    //         console.log("############ Cached devices: ############");
    //         console.log(JSON.stringify(deviceArray));
    //         client.set("obdless/onGoing/trips", JSON.stringify(deviceArray));
    //     }
    // });

    switch (topic) {
        case 'api/ztewelink/OBDless/Data/GPS':
            var gps = new Array();
            _.each(json_object["gpsData"], function (gpsPoint) {
                var gpsData = {};
                gpsData["positionTime"] = common.dateToUTCText(gpsPoint["reportTime"]);
                gpsData["positionSource"] = "GPS";
                gpsData["height"] = gpsPoint["height"];
                gpsData["longitude"] = gpsPoint["longitude"];
                gpsData["latitude"] = gpsPoint["latitude"];
                gpsData["latlng"] = gpsData["latitude"] + "," + gpsData["longitude"];
                gpsData["gpsSpeed"] = gpsPoint["gpsSpeed"];
                gpsData["heading"] = gpsPoint["heading"];
                gpsData["PDOP"] = gpsPoint["PDOP"];
                gpsData["HDOP"] = gpsPoint["HDOP"];
                gpsData["VDOP"] = gpsPoint["VDOP"];
                gpsData["gpsType"] = "routing";
                gpsData["tripId"] = null;
                gpsData["deviceId"] = json_object["deviceId"];
                gpsData["status"] = "New";
                gpsData["address"] = "";
                if(json_object.deviceStatus){
                    gpsData.drivingDistance = json_object.deviceStatus.drivingDistance;
                    gpsData.maxSpeed = json_object.deviceStatus.maxSpeed;
                }

                gps.push(gpsData);
            });

            if (gps.length > 0) {
                insertBundle(mongodb, "GPSData", gps, function (insertedIds) {
                    var client = redis.createClient();
                    client.publish("zteGPSData", JSON.stringify({
                        "deviceId": json_object["deviceId"]
                    }));
                });
            }

            break;
        case 'api/ztewelink/OBDless/Data/TripSummary':
            var gpsWhenIgnitionOn = {};
            gpsWhenIgnitionOn["positionTime"] = common.dateToUTCText(json_object["gpsWhenIgnitionOn"]["reportTime"]);
            gpsWhenIgnitionOn["positionSource"] = "GPS";
            gpsWhenIgnitionOn["height"] = json_object["gpsWhenIgnitionOn"]["height"];
            gpsWhenIgnitionOn["longitude"] = json_object["gpsWhenIgnitionOn"]["longitude"];
            gpsWhenIgnitionOn["latitude"] = json_object["gpsWhenIgnitionOn"]["latitude"];
            gpsWhenIgnitionOn["latlng"] = gpsWhenIgnitionOn["latitude"] + "," + gpsWhenIgnitionOn["longitude"];
            gpsWhenIgnitionOn["gpsSpeed"] = json_object["gpsWhenIgnitionOn"]["gpsSpeed"];
            gpsWhenIgnitionOn["heading"] = json_object["gpsWhenIgnitionOn"]["heading"];
            gpsWhenIgnitionOn["PDOP"] = json_object["gpsWhenIgnitionOn"]["PDOP"];
            gpsWhenIgnitionOn["HDOP"] = json_object["gpsWhenIgnitionOn"]["HDOP"];
            gpsWhenIgnitionOn["VDOP"] = json_object["gpsWhenIgnitionOn"]["VDOP"];
            gpsWhenIgnitionOn["gpsType"] = "reference";
            gpsWhenIgnitionOn["deviceId"] = json_object["deviceId"];
            gpsWhenIgnitionOn["status"] = "New";

            var gpsWhenIgnitionOff = {};
            gpsWhenIgnitionOff["positionTime"] = common.dateToUTCText(json_object["gpsWhenIgnitionOff"]["reportTime"]);
            gpsWhenIgnitionOff["positionSource"] = "GPS";
            gpsWhenIgnitionOff["height"] = json_object["gpsWhenIgnitionOff"]["height"];
            gpsWhenIgnitionOff["longitude"] = json_object["gpsWhenIgnitionOff"]["longitude"];
            gpsWhenIgnitionOff["latitude"] = json_object["gpsWhenIgnitionOff"]["latitude"];
            gpsWhenIgnitionOff["latlng"] = gpsWhenIgnitionOff["latitude"] + "," + gpsWhenIgnitionOff["longitude"];
            gpsWhenIgnitionOff["gpsSpeed"] = json_object["gpsWhenIgnitionOff"]["gpsSpeed"];
            gpsWhenIgnitionOff["heading"] = json_object["gpsWhenIgnitionOff"]["heading"];
            gpsWhenIgnitionOff["PDOP"] = json_object["gpsWhenIgnitionOff"]["PDOP"];
            gpsWhenIgnitionOff["HDOP"] = json_object["gpsWhenIgnitionOff"]["HDOP"];
            gpsWhenIgnitionOff["VDOP"] = json_object["gpsWhenIgnitionOff"]["VDOP"];
            gpsWhenIgnitionOff["gpsType"] = "reference";
            gpsWhenIgnitionOff["deviceId"] = json_object["deviceId"];
            gpsWhenIgnitionOff["status"] = "New";

            var tripData = {};
            tripData["deviceId"] = json_object["deviceId"];

            var drivingDistanceData = {};

            drivingDistanceData["statisticsSource"] = "GPS";
            drivingDistanceData["mileage"] = json_object["drivingDistance"];

            insert(mongodb, 'GPSData', gpsWhenIgnitionOn, function (insertedId) {
                tripData["ignitionOnTime"] = common.dateToUTCText(json_object["ignitionOnTime"]);
                tripData["gpsWhenIgnitionOn"] = insertedId;
                insert(mongodb, 'GPSData', gpsWhenIgnitionOff, function (insertedId) {
                    tripData["ignitionOffTime"] = common.dateToUTCText(json_object["ignitionOffTime"]);
                    tripData["gpsWhenIgnitionOff"] = insertedId;
                    tripData["drivingDistance"] = drivingDistanceData;
                    tripData["maxSpeed"] = json_object["maxSpeed"];
                    tripData["numberRapidAcce"] = json_object["numberRapidAcce"];
                    tripData["numberRapidDece"] = json_object["numberRapidDece"];
                    tripData["numberRapidSharpTurn"] = json_object["numberRapidSharpTurn"];
                    tripData["status"] = "New";
                    insert(mongodb, 'Trips', tripData, function (insertedId) {
                        mongodb.collection('GPSData').updateMany({
                            deviceId: json_object["deviceId"],
                            gpsType: "routing",
                            tripId: null
                        }, {
                            $set: {
                                tripId: insertedId
                            }
                        }, {
                            upsert: true,
                            multi: true
                        });

                        var cmd = 'php ' + config.zte.artisanURL + ' tripData ' + insertedId.toHexString();
                        exec(cmd, function (error, stdout, stderr) {
                            if (error) console.log(error);
                            if (stdout) console.log(stdout);
                            if (stderr) console.log(stderr);
                        });
                    });
                });
            });
            break;
        case 'api/ztewelink/OBDless/Data/Alert':
            var gpsData = {};
            gpsData["positionTime"] = common.dateToUTCText(json_object["reportGPS"]["reportTime"]);
            gpsData["positionSource"] = "GPS";
            gpsData["height"] = json_object["reportGPS"]["height"];
            gpsData["longitude"] = json_object["reportGPS"]["longitude"];
            gpsData["latitude"] = json_object["reportGPS"]["latitude"];
            gpsData["latlng"] = gpsData["latitude"] + "," + gpsData["longitude"];
            gpsData["gpsSpeed"] = json_object["reportGPS"]["gpsSpeed"];
            gpsData["heading"] = json_object["reportGPS"]["heading"];
            gpsData["PDOP"] = json_object["reportGPS"]["PDOP"];
            gpsData["HDOP"] = json_object["reportGPS"]["HDOP"];
            gpsData["VDOP"] = json_object["reportGPS"]["VDOP"];
            gpsData["gpsType"] = "reference";
            gpsData["deviceId"] = json_object["deviceId"];
            gpsData["status"] = "New";

            insert(mongodb, "GPSData", gpsData, function (insertedId) {
                var alertData = {};
                alertData["deviceId"] = json_object["deviceId"];
                alertData["alertCategoryId"] = new MongoObjectId("5991411f0e8828a2ff3d1049");
                alertData["reportTime"] = json_object["reportTime"];
                alertData["gpsPosition"] = insertedId;
                alertData["status"] = "Pending";
                alertData["readStatus"] = "Unread";
                switch (json_object["alertType"]) {
                    case "trip_start":
                        alertData["alertTypeId"] = new MongoObjectId("59fc24c4f2b0a5a368fa3af0");
                        alertData["value"] = {};
                        break;
                    case "trip_end":
                        alertData["alertTypeId"] = new MongoObjectId("59fc24cff2b0a5a368fa3af1");
                        alertData["value"] = {};
                        break;
                    case "suspected_collision":
                        alertData["alertTypeId"] = new MongoObjectId("5991468295dfe43d4ca834ba");
                        alertData["value"] = {
                            "collisionValue": json_object["alertData"]["collisionValue"]
                        }
                        break;
                    case "sudden_acceleration":
                        alertData["alertTypeId"] = new MongoObjectId("5991469c95dfe43d4ca834bc");
                        alertData["value"] = {
                            "speedBeforeAcc": json_object["alertData"]["speedBeforeAcc"],
                            "speedAfterAcc": json_object["alertData"]["speedAfterAcc"],
                            "accValue": parseInt(json_object["alertData"]["accValue"]) / 100
                        }
                        break;
                    case "sudden_deceleration":
                        alertData["alertTypeId"] = new MongoObjectId("599146ab95dfe43d4ca834bd");
                        alertData["value"] = {
                            "speedBeforeDec": json_object["alertData"]["speedBeforeDec"],
                            "speedAfterDec": json_object["alertData"]["speedAfterDec"],
                            "decValue": parseInt(json_object["alertData"]["decValue"]) / 100
                        }
                        break;
                    case "sharp_turn":
                        alertData["alertTypeId"] = new MongoObjectId("599146b695dfe43d4ca834be");
                        alertData["value"] = {
                            "turn": parseInt(json_object["alertData"]["turn"]) / 1000
                        }
                        break;
                    case "over_speed":
                        alertData["alertTypeId"] = new MongoObjectId("59d6fbbcb4e2548c4ae92915");
                        alertData["value"] = {
                            "maxSpeed": json_object["alertData"]["maxSpeed"],
                            "speedLimit": json_object["alertData"]["speedLimit"],
                            "speedingMileage": json_object["alertData"]["speedingMileage"],
                            "speedingStart": common.dateToUTCText(json_object["alertData"]["speedingStart"]),
                            "speedingEnd": common.dateToUTCText(json_object["alertData"]["speedingEnd"])
                        }
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
                });
            });
            break;
        default:
            console.log('No handler for topic %s', topic);
    }
});

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