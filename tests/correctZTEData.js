const Common = require('../lib/common');
const config = require('../config/conf');
var _ = require('lodash');

const f = require('util').format;
const MongoClient = require('mongodb').MongoClient;
const fs = require('fs');

var user = encodeURIComponent(config.zte.mongoUsername);
var password = encodeURIComponent(config.zte.mongoPassword);

// Connection URL
var url = f(config.zte.mongoUrl, user, password, config.zte.mongoAuthMechanism);

var mongodb;

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

    var cursor = mongodb.collection('Trips').find({
        ignitionOnTime : {$ne: "Invalid date", $gt: "2018-01-23 00:00:00"},
        ignitionOffTime : {$ne: "Invalid date"},
        endDateTime : {$ne: "Invalid date"},
        startDateTime: {$ne: "Invalid date"}
    });

    cursor.each(function(err, trip) {
        if(trip != null) {
            // var cursorGPS = mongodb.collection('GPSData').find({
            //     deviceId: trip.deviceId,
            //     gpsType: "routing",
            //     tripId: null,
            //     positionTime : {$gt:trip.ignitionOnTime, $lt:trip.ignitionOffTime}
            // });

            // cursorGPS.each(function(err, gps) {
            //     if(gps == null){
            //         console.log("No More GPS for trip id : " + trip._id);
            //     }
            //     else{
            //         console.log("GPS At: " + gps.positionTime);
            //     }
            // });

            mongodb.collection('GPSData').updateMany({
                deviceId: trip.deviceId,
                gpsType: "routing",
                positionTime : {$gt:trip.ignitionOnTime, $lt:trip.ignitionOffTime}
            }, {
                $set: {
                    tripId: trip._id
                }
            }, {
                upsert: true,
                multi: true
            });

            var cmd = 'php ' + config.zte.artisanURL + ' tripData ' + trip._id.toHexString();
            console.log("Trigger Trip Summary: " + cmd);
            exec(cmd, function (error, stdout, stderr) {
                if (error) console.log(error);
                if (stdout) console.log(stdout);
                if (stderr) console.log(stderr);
            });
        }
    });
}