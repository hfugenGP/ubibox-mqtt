const Common = require('../lib/common');
const config = require('../config/conf');
const ZTEDataService = require('../services/zteDataService');
const redis = require("redis");

const f = require('util').format;
const MongoClient = require('mongodb').MongoClient;
const fs = require('fs');
var CRC32 = require('crc-32');
var ADLER32 = require('adler-32');
const adler32 = require('adler32');
var HI = require('heat-index');

var heatIndex = parseFloat(HI.heatIndex({temperature: 24, humidity: 35})).toFixed(2);

var user = encodeURIComponent(config.zte.mongoUsername);
var password = encodeURIComponent(config.zte.mongoPassword);
var common = new Common();

var client = redis.createClient();
var roadRedisKey = 'phongTestKey';
client.exists(roadRedisKey, function (err, result) {
    if(result === 1){
        client.hgetall(roadRedisKey, function (err, roadOverSpeed) {
            if(err || roadOverSpeed == null){
                var roadOverSpeedCached = {};
                roadOverSpeedCached["maxSpeed"] = speed;
                roadOverSpeedCached["speedLimit"] = roadSpeedSetting["value"];
                roadOverSpeedCached["speedingMileage"] = totalMileage;
                roadOverSpeedCached["speedingStart"] = reportTime;
        
                client.hmset(roadRedisKey, roadOverSpeedCached);
            }else{
                if (roadOverSpeed["maxSpeed"] < speed) {
                    roadOverSpeed["maxSpeed"] = speed;
                }
        
                console.log('cached roadOverSpeed: ' + JSON.stringify(roadOverSpeed));
        
                client.hmset(roadRedisKey, roadOverSpeed);
            }
        });
    }
});


// Connection URL
var url = f(config.zte.mongoUrl, user, password, config.zte.mongoAuthMechanism);

var fwData = "00000000";
// this.UpdatePackage.fileName = fileNameData;
// this.UpdatePackage.fileNameLength = fileNameDataLength;
// this.UpdatePackage.fileStartingPosition = fileStartingPosition;
// this.UpdatePackage.requestLengthInBytes = requestLengthInBytes;
var buff = fs.readFileSync('./assets/' + config.zte.currentFWVersion);
var dataPortion = buff.toString('hex');
var len = dataPortion.length;
fwData += dataPortion.substring(0, 960 * 2);
// var checksum = CRC32.str(fwData);
// var hex = checksum.toString(16);
// if (checksum < 0) {
//     checksum *= -1;
// }
var checksumBuffer = Buffer.from(fwData, "hex");
var checksumHex = common.recorrectHexString(adler32.sum(checksumBuffer).toString(16), 8);

var checksumHex = ADLER32.str(fwData);
var hexString = checksumHex.toString(16);
if (checksumHex.length == 6) {
    checksumHex = '00' + checksumHex;
} else if (checksumHex.length == 7) {
    checksumHex = '0' + checksumHex;
}

fwData = checksum.toString().substring(0, 8) + fwData;
mainMessage += fwData;