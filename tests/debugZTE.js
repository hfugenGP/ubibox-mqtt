const Common = require('../lib/common');
const config = require('../config/conf');
// const ZTEDataService = require('../services/zteDataService');
const redis = require("redis");

const f = require('util').format;
const MongoClient = require('mongodb').MongoClient;
const fs = require('fs');
var CRC32 = require('crc-32');
var ADLER32 = require('adler-32');
const adler32 = require('adler32');
var HI = require('heat-index');

// var user = encodeURIComponent(config.zte.mongoUsername);
// var password = encodeURIComponent(config.zte.mongoPassword);
var common = new Common();

var effectiveData = "02000859fa732a144e8a9b224b048d1606d15d02b00e028000000059fa732c144e8a9b223f048d2807814702600c024000000059fa732d144e869b2238048d3007f14002600c024000000059fa732f144e889b2228048d4208713b02600c024000000059fa7331144e869b2215048d5108913002600c024000000059fa7332144e889b220a048d5708712802600c024000000059fa7334144e849b21f2048d5d08911702600c024000000059fa7336144e869b21d9048d5f09310f02600c02400000005f4e3ef51eb4818d";
var data = {};
var numberOfPackage = parseInt(effectiveData.substring(4, 6), 16);
console.log('numberOfPackage : ' + numberOfPackage);
data["numberOfPackage"] = numberOfPackage;
var i = 1;
var start = 6;
var end = 54;
var gps = new Array();
while (i <= numberOfPackage) {
    var gpsData = formatGPS(effectiveData.substring(start, end), "123123", true);
    console.log('gpsData ' + i + ' : ' + JSON.stringify(gpsData));
    data["gpsData" + i] = gpsData;
    gps.push(gpsData);
    start = end;
    end += 48;
    i++;
}


function formatGPS(gpsValue, deviceId, isRouting) {
    var common = new Common();
    var gpsData = {};
    var positionTime = common.dateToUTCText(common.date_from_hex(gpsValue.substring(0, 8)));
    gpsData["positionTime"] = positionTime;
    var statusFlags = Array.from(common.hex2bits(gpsValue.substring(8, 10)));
    gpsData["positionSource"] = statusFlags[0] = '1' ? "GSM" : "GPS";
    gpsData["dataValidity"] = statusFlags[1] = '1' ? "Last time" : "Real time";
    gpsData["numberOfSatellites"] = parseInt("" + statusFlags[4] + statusFlags[5] + statusFlags[6] + statusFlags[7], 2);

    var latType = 1; // North
    if (statusFlags[3] == '0') {
        latType = -1; //South
    }

    var lngType = -1; //West
    if (statusFlags[2] == '0') {
        lngType = 1; //East
    }

    var byte5t9 = common.hex2bits(gpsValue.substring(10, 20));
    var height = parseInt(byte5t9.substring(0, 15), 2);
    gpsData["height"] = height <= 10000 ? height : height - 10000;
    var longitude = parseInt(byte5t9.substring(15, 40), 2) * 0.00001;
    gpsData["longitude"] = longitude * lngType;

    var latitude = parseInt(gpsValue.substring(20, 26), 16) * 0.00001;
    gpsData["latitude"] = latitude * latType;
    gpsData["latlng"] = gpsData["latitude"] + "," + gpsData["longitude"];

    var byte13t15 = common.hex2bits(gpsValue.substring(26, 32));
    gpsData["gpsSpeed"] = parseInt(byte13t15.substring(0, 12), 2) / 10;
    gpsData["heading"] = parseInt(byte13t15.substring(15, 24), 2);
    if (gpsValue.length > 32) {
        var byte16t20 = common.hex2bits(gpsValue.substring(32, 42));
        gpsData["PDOP"] = parseInt(byte13t15.substring(0, 12), 2) / 10;
        gpsData["HDOP"] = parseInt(byte13t15.substring(12, 24), 2) / 10;
        gpsData["VDOP"] = parseInt(byte13t15.substring(14, 36), 2) / 10;
    }

    if (isRouting) {
        gpsData["gpsType"] = "routing";
        gpsData["tripId"] = null;
    } else {
        gpsData["gpsType"] = "reference";
    }

    if (deviceId) {
        gpsData["deviceId"] = deviceId;
    }

    gpsData["status"] = "New";

    return gpsData;
}