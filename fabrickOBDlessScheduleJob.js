'use strict'
var _ = require('lodash');
const f = require('util').format;
const redis = require("redis");
const Common = require('./lib/common');
const config = require('./config/conf');
const Broker = require('./lib/broker');

const MongoClient = require('mongodb').MongoClient;
const MongoObjectId = require('mongodb').ObjectID;
const exec = require('child_process').exec;

var user = encodeURIComponent(config.zte.mongoUsername);
var password = encodeURIComponent(config.zte.mongoPassword);

// Connection URL
var url = f(config.zte.mongoUrl, user, password, config.zte.mongoAuthMechanism);

var common = new Common();

var fabrick_gateway = {
    id: "Fabrick OBDless SchedulerJob Client " + config.zteBroker.idKey,
    host: config.zteBroker.host,
    port: config.zteBroker.port,
    topics: {
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
var zte_client = zte_Broker.connect();

var client = redis.createClient();
// client.unref();
client.get("obdless/onGoing/trips", function (err, obj) {
    if (!err && obj) {
        var json_object = JSON.parse(obj);
        var remainingItems = [];
        _.each(json_object, function (item) {
            var deviceId = item.split("-")[1];
            client.exists(item, function (err, result) {
                if (result === 1) {
                    remainingItems.push(item);
                } else {
                    MongoClient.connect(url, function (err, db) {
                        db.collection('GPSData').findOne({
                                deviceId: deviceId,
                                tripId: null,
                                gpsType: "routing"
                            }, {
                                "sort": ["positionTime", "desc"]
                            },
                            function (err, lastGps) {
                                if (!err && lastGps) {
                                    var publishTripEnd = {
                                        deviceId: deviceId,
                                        reportTime: lastGps.positionTime,
                                        reportGPS: {
                                            reportTime: lastGps.positionTime,
                                            height: lastGps.height,
                                            longitude: lastGps.longitude,
                                            latitude: lastGps.latitude,
                                            gpsSpeed: lastGps.gpsSpeed,
                                            heading: lastGps.heading,
                                            PDOP: lastGps.PDOP,
                                            HDOP: lastGps.HDOP,
                                            VDOP: lastGps.VDOP
                                        },
                                        alertType: "trip_end",
                                        alertData: {}
                                    };

                                    zte_Broker.publish('api/ztewelink/OBDless/Data/Alert', JSON.stringify(publishTripEnd), {
                                        qos: 1,
                                        retain: true
                                    });

                                    db.collection('Alert').findOne({
                                        deviceId: deviceId,
                                        alertTypeId: new MongoObjectId("59fc24c4f2b0a5a368fa3af0")
                                    }, {
                                        "sort": ["reportTime", "desc"]
                                    }, function (err, tripStart) {
                                        if (!err && tripStart) {
                                            db.collection('GPSData').findOne({
                                                _id: tripStart.gpsPosition
                                            },
                                            function (err, firstGps) {
                                                if(!err && firstGps){
                                                    var publishTripSum = {
                                                        deviceId: deviceId,
                                                        reportTime: common.dateToUTCText(new Date()),
                                                        ignitionOnTime: tripStart.reportTime, //TODO
                                                        gpsWhenIgnitionOn: {
                                                            reportTime:firstGps.positionTime,
                                                            height: firstGps.height,
                                                            longitude: firstGps.longitude,
                                                            latitude: firstGps.latitude,
                                                            gpsSpeed: firstGps.gpsSpeed,
                                                            heading: firstGps.heading,
                                                            PDOP: firstGps.PDOP,
                                                            HDOP: firstGps.HDOP,
                                                            VDOP: firstGps.VDOP
                                                        },
                                                        ignitionOffTime: lastGps.positionTime,
                                                        gpsWhenIgnitionOff: {
                                                            reportTime:lastGps.positionTime,
                                                            height: lastGps.height,
                                                            longitude: lastGps.longitude,
                                                            latitude: lastGps.latitude,
                                                            gpsSpeed: lastGps.gpsSpeed,
                                                            heading: lastGps.heading,
                                                            PDOP: lastGps.PDOP,
                                                            HDOP: lastGps.HDOP,
                                                            VDOP: lastGps.VDOP
                                                        },
                                                        drivingDistance: lastGps.drivingDistance,
                                                        maxSpeed: lastGps.maxSpeed,
                                                        numberRapidAcce: 0,
                                                        numberRapidDece: 0,
                                                        numberRapidSharpTurn: 0
                                                    };
        
                                                    db.collection('Alert').find({
                                                        deviceId: deviceId,
                                                        alertTypeId: new MongoObjectId("5991469c95dfe43d4ca834bc"),
                                                        reportTime: {
                                                            $gt: tripStart.reportTime
                                                        }
                                                    }).count(function (err, count) {
                                                        publishTripSum.numberRapidAcce = (!err && count) ? count : 0;
        
                                                        db.collection('Alert').find({
                                                            deviceId: deviceId,
                                                            alertTypeId: new MongoObjectId("599146ab95dfe43d4ca834bd"),
                                                            reportTime: {
                                                                $gt: tripStart.reportTime
                                                            }
                                                        }).count(function (err, count) {
                                                            publishTripSum.numberRapidDece = (!err && count) ? count : 0;
        
                                                            db.collection('Alert').find({
                                                                deviceId: deviceId,
                                                                alertTypeId: new MongoObjectId("599146b695dfe43d4ca834be"),
                                                                reportTime: {
                                                                    $gt: tripStart.reportTime
                                                                }
                                                            }).count(function (err, count) {
                                                                publishTripSum.numberRapidSharpTurn = (!err && count) ? count : 0;
        
                                                                zte_Broker.publish('api/ztewelink/OBDless/Data/TripSummary', JSON.stringify(publishTripSum), {
                                                                    qos: 1,
                                                                    retain: true
                                                                });
                                                            });
                                                        });
                                                    });
                                                }
                                            });
                                        }
                                    });
                                }
                            });
                    });
                }
            });
        });

        client.set("obdless/onGoing/trips", JSON.stringify(remainingItems));
    }

    client.quit(); // No further commands will be processed
});