"use strict";

var _ = require('lodash');
const Common = require('../lib/common');
const config = require('../config/conf');
const SimpleCrypto = require('../lib/simpleCrypto');
const CryptoJS = require("crypto-js");
const adler32 = require('adler32');
const f = require('util').format;
const MongoClient = require('mongodb').MongoClient;
const MongoObjectId = require('mongodb').ObjectID;
const redis = require("redis");
const exec = require('child_process').exec;
const q = require('q');
const fs = require('fs');

var user = encodeURIComponent(config.zte.mongoUsername);
var password = encodeURIComponent(config.zte.mongoPassword);

// Connection URL
var url = f(config.zte.mongoUrl, user, password, config.zte.mongoAuthMechanism);

var ZTEDataService = function () {};

ZTEDataService.prototype.generateMessageToDevice = function (subcribedDevices, deviceId, frameId, requestType, params) {
    var common = new Common();

    if (!subcribedDevices["ID-" + deviceId]) {
        console.log('Error: ^^^^^^^ No support device with deviceId : ' + deviceId + ' ^^^^^^^');
        return false;
    }

    var encryptionKey = subcribedDevices["ID-" + deviceId];

    //This is publish message
    var frameType = "03";
    var mainMessage = "f1";
    var request = requestType.substring(2, requestType.length);
    mainMessage += request;

    switch (request) {
        case "00":
            //Notify new fw available to upgrade
            mainMessage += getNotifyDeviceForNewFWMessage();
            break;
        case "01":
            //Vehicle detection //Just requestType is ok
            break;
        case "02":
            //Set parameters
            Object.keys(params).forEach(function (key, value) {
                if (key == "0x02080000" ||
                    key == "0x02090000" ||
                    key == "0x020a0000" ||
                    key == "0x03000000") {
                    return false;
                }

                mainMessage += key.substring(2, key.length);
                switch (key) {
                    case "upgradeFW":
                        //Notify new fw available to upgrade
                        mainMessage = "f100";
                        mainMessage += getNotifyDeviceForNewFWMessage();
                        break;
                    case "0xf0000000":
                        mainMessage += "ffff";
                        break;
                    case "0x00010000":
                        mainMessage += common.recorrectHexString((parseFloat(params[key]) / 10).toString(16), 4);
                        break;
                    case "0x00020000":
                        mainMessage += common.recorrectHexString((parseFloat(params[key]) / 10).toString(16), 2);
                        break;
                    case "0x00030000":
                        mainMessage += common.recorrectHexString((parseFloat(params[key]) / 1000).toString(16), 2);
                        break;
                    case "0x00040000":
                        mainMessage += common.recorrectHexString(params[key].toString(16), 4);
                        break;
                    case "0x00050000":
                        mainMessage += common.recorrectHexString(params[key].toString(16), 2);
                        break;
                    case "0x00060000":
                        mainMessage += common.recorrectHexString((parseFloat(params[key]) * 10).toString(16), 2);
                        break;
                    case "0x00070000":
                        mainMessage += common.recorrectHexString(parseInt(params[key]).toString(16), 2);
                        break;
                    case "0x00080000":
                        mainMessage += common.recorrectHexString((parseFloat(params[key]) * 10).toString(16), 2);
                        break;
                    case "0x00090000":
                        mainMessage += common.recorrectHexString(parseInt(params[key]).toString(16), 4);
                        break;
                    case "0x000a0000":
                        if (params[key]) {
                            mainMessage += "01";
                        } else {
                            mainMessage += "00";
                        }
                        break;
                    case "0x000b0000":
                        mainMessage += common.recorrectHexString(parseInt(params[key]).toString(16), 4);
                        break;
                    case "0x000c0000":
                        mainMessage += common.recorrectHexString(parseInt(params[key]).toString(16), 4);
                        break;
                    case "0x02000000":
                        var hexBytes = common.hex_from_chars(params[key]);
                        var count = hexBytes.length / 2;
                        if (count <= 15) {
                            // value should be less than 15 characters
                            mainMessage += common.recorrectHexString(count.toString(16), 2);
                            mainMessage += hexBytes;
                        }
                        break;
                    case "0x02010000":
                        var hexBytes = common.hex_from_chars(params[key]);
                        var count = hexBytes.length / 2;
                        if (count <= 15) {
                            // value should be less than 15 characters
                            mainMessage += common.recorrectHexString(count.toString(16), 2);
                            mainMessage += hexBytes;
                        }
                        break;
                    case "0x02020000":
                        var hexBytes = common.hex_from_chars(params[key]);
                        var count = hexBytes.length / 2;
                        if (count <= 15) {
                            // value should be less than 15 characters
                            mainMessage += common.recorrectHexString(count.toString(16), 2);
                            mainMessage += hexBytes;
                        }
                        break;
                    case "0x02030000":
                        var hexBytes = common.hex_from_chars(params[key]);
                        var count = hexBytes.length / 2;
                        if (count <= 15) {
                            // value should be less than 15 characters
                            mainMessage += common.recorrectHexString(count.toString(16), 2);
                            mainMessage += hexBytes;
                        }
                        break;
                    case "0x02040000":
                        var hexBytes = common.hex_from_chars(params[key]);
                        var count = hexBytes.length / 2;
                        if (count <= 15) {
                            // value should be less than 15 characters
                            mainMessage += common.recorrectHexString(count.toString(16), 2);
                            mainMessage += hexBytes;
                        }
                        break;
                    case "0x02050000":
                        var hexBytes = common.hex_from_chars(params[key]);
                        var count = hexBytes.length / 2;
                        if (count <= 15) {
                            // value should be less than 15 characters
                            mainMessage += common.recorrectHexString(count.toString(16), 2);
                            mainMessage += hexBytes;
                        }
                        break;
                    case "0x02060000":
                        var hexBytes = common.hex_from_chars(params[key]);
                        var count = hexBytes.length / 2;
                        if (count <= 15) {
                            // value should be less than 15 characters
                            mainMessage += common.recorrectHexString(count.toString(16), 2);
                            mainMessage += hexBytes;
                        }
                        break;
                    case "0x02070000":
                        mainMessage += common.recorrectHexString(params[key].toString(16), 2);
                        break;
                    case "0x02080000":
                        //Only for inquiry
                        break;
                    case "0x02090000":
                        //Only for inquiry
                        break;
                    case "0x020a0000":
                        //Only for inquiry
                        break;
                    case "0x03000000":
                        //Only for inquiry
                        break;
                }
            });
            break;
        case "03":
            //Inquire parameters
            Object.keys(params).forEach(function (key, value) {
                mainMessage += key.substring(2, key.length);
            });
            break;
        case "04":
            //Inquiry log
            Object.keys(params).forEach(function (key, value) {
                mainMessage += key.substring(2, key.length);
            });
            break;
        case "05":
            //Reserved
            break;
        case "06":
            //Set vehicle information
            Object.keys(params).forEach(function (key, value) {
                switch (key) {
                    case "vin":
                        mainMessage += common.chars_from_hex(params[key]);
                        break;
                    case "fuel":
                        mainMessage += params[key].toString(16);
                        break;
                    case "edisp":
                        mainMessage += (parseFloat(params[key]) * 10).toString(16);
                        break;
                    case "eeffi":
                        mainMessage += params[key].toString(16);
                        break;
                    case "mixedrfc":
                        mainMessage += (parseFloat(params[key]) * 10).toString(16);
                        break;
                    case "highsfc":
                        mainMessage += (parseFloat(params[key]) * 10).toString(16);
                        break;
                    case "lowsfc":
                        mainMessage += (parseFloat(params[key]) * 10).toString(16);
                        break;
                }
            });
            break;
        case "07":
            //Re-study the accelerator calibration  //Just requestType is ok
            break;
    }

    var dataLengthDec = mainMessage.length / 2;
    var dataLength = dataLengthDec.toString(16);
    if (dataLength.length == 1) {
        dataLength = "000" + dataLength;
    } else if (dataLength.length == 2) {
        dataLength = "00" + dataLength;
    } else if (dataLength.length == 3) {
        dataLength = "0" + dataLength;
    }

    console.log('Main message: ' + mainMessage);
    return dataPacking(deviceId, frameType, frameId, dataLength, mainMessage, encryptionKey);
}

ZTEDataService.prototype.preProcessData = function (hexData, subcribedDevices) {
    var common = new Common();
    var simpleCrypto = new SimpleCrypto();

    // Remove frame header (4), message length (4), device id (16) and frame end (4).
    var messageLength = hexData.substring(4, 8);
    var messageLengthDec = parseInt(messageLength, 16);
    var iv = hexData.substring(8, 24);
    var deviceId = hexData.substring(24, 54);
    var imei = common.chars_from_hex(deviceId);
    var cryptedHex = hexData.substring(54, hexData.length - 4);

    if (!subcribedDevices["ID-" + deviceId]) {
        console.log('Error: ^^^^^^^ No support device with deviceId : ' + deviceId + ' ^^^^^^^');
        return false;
    }

    this.encryptionKey = subcribedDevices["ID-" + deviceId];

    var decryptedData = simpleCrypto.des(common.chars_from_hex(this.encryptionKey), common.chars_from_hex(cryptedHex), 0, 1, common.chars_from_hex(iv));
    this.decryptedHex = common.hex_from_chars(decryptedData).replace(/(\r\n|\n|\r)/gm, "");
    var fullDecryptedMessage = hexData.substring(0, 54) + this.decryptedHex + config.zte.frameEnd;

    console.log('***************************Device Data***************************');
    console.log('imei : ' + imei);
    console.log('deviceId : ' + deviceId);
    console.log('Decrypted Message : ' + fullDecryptedMessage);

    var randomNoiseHex = this.decryptedHex.substring(0, 16);
    var frameType = this.decryptedHex.substring(16, 18);
    var frameId = this.decryptedHex.substring(18, 22);

    var dataLengthHex = this.decryptedHex.substring(22, 26);
    var dataLength = parseInt(dataLengthHex, 16);
    var endOfEffectiveData = 26 + (dataLength * 2);
    var effectiveData = this.decryptedHex.substring(26, endOfEffectiveData);
    var checksumHex = this.decryptedHex.substring(endOfEffectiveData, endOfEffectiveData + 8);

    var checksum = messageLength + iv + deviceId + randomNoiseHex + frameType + frameId + dataLengthHex + effectiveData;

    console.log('frameType : ' + frameType);
    console.log('frameId : ' + frameId);
    // console.log('dataLength : ' + dataLength);
    // console.log('Crypted Hex : ' + cryptedHex);
    // console.log('Decrypted Hex : ' + this.decryptedHex);
    // console.log('checksumHex : ' + checksumHex);

    var receivedDate = new Date();
    var receivedDateText = common.dateToUTCText(receivedDate);
    var deviceData = {
        "DeviceId": deviceId,
        "MessageType": frameType,
        "MessageId": frameId,
        "RawData": hexData,
        "DecryptedData": fullDecryptedMessage,
        "EffectiveData": effectiveData,
        "CreatedDateTime": receivedDateText
    };

    // Use connect method to connect to the Server
    MongoClient.connect(url, function (err, db) {
        db.collection('DeviceMessageLogsDebug').insertOne(deviceData, function (err, r) {
            if (err) {
                console.log("Error when write to mongodb: " + err);
            }
            // console.log(r.insertedCount + " record has been saved to DeviceHistoricalDataDebug");
            db.close();
        });
    });

    if (dataLength > 952) {
        console.log('Error: ^^^^^^^ dataLength > 952, there should be critical issues in data ^^^^^^^ ');
        return false;
    }

    var calculatedCheckSumHex = adler32.sum(Buffer.from(checksum, "hex")).toString(16);
    if (calculatedCheckSumHex.length == 6) {
        calculatedCheckSumHex = '00' + calculatedCheckSumHex;
    } else if (calculatedCheckSumHex.length == 7) {
        calculatedCheckSumHex = '0' + calculatedCheckSumHex;
    }

    if (checksumHex != calculatedCheckSumHex) {
        console.log('Error: ^^^^^^^ Checksum is not corect calculated ^^^^^^^ ');
        console.log('checksumHex : ' + checksumHex);
        console.log('calculatedCheckSumHex : ' + calculatedCheckSumHex);
        return false;
    }

    console.log('effectiveData : ' + effectiveData);

    return deviceData;
}

ZTEDataService.prototype.processData = function (hexData, subcribedDevices, deviceData) {
    var effectiveData = deviceData["EffectiveData"];
    var frameId = deviceData["MessageId"];
    var frameType = deviceData["MessageType"];
    var deviceId = deviceData["DeviceId"];
    var client = redis.createClient();
    var common = new Common();
    
    switch (frameType) {
        case "11":
            deviceData["MajorDataTypeId"] = "99";
            deviceData["MinorDataTypeId"] = "99";
            var data = {};
            var protocolVersionData = common.hex2bits(effectiveData.substring(0, 4));
            //0040 = 0000 0000 0100 0000 = 0.1.0
            data["protocolVersion"] = parseInt(protocolVersionData.substring(0, 4), 2) + "." + parseInt(protocolVersionData.substring(4, 10), 2) + "." + parseInt(protocolVersionData.substring(10, 16), 2);

            var hardwareVersionData = common.hex2bits(effectiveData.substring(4, 8));
            //1040 = 0001 0000 0100 0000 = V1.1.0
            data["hardwareVersion"] = "V" + parseInt(protocolVersionData.substring(0, 4), 2) + "." + parseInt(protocolVersionData.substring(4, 10), 2) + "." + parseInt(protocolVersionData.substring(10, 16), 2);

            var lengthOfSoftwareVersionMCU = parseInt(common.hex2bits(effectiveData.substring(8, 10)).substring(2, 8), 2);
            var start = 10;
            var end = start + lengthOfSoftwareVersionMCU * 2;
            data["mcuVersion"] = common.chars_from_hex(effectiveData.substring(start, end));

            start = end;
            end += 2;
            var lengthOfSoftwareVersionModem = parseInt(common.hex2bits(effectiveData.substring(start, end)).substring(2, 8), 2);
            start = end;
            end += lengthOfSoftwareVersionModem * 2;
            data["modemVersion"] = common.chars_from_hex(effectiveData.substring(start, end));

            deviceData["Data"] = data;

            console.log("protocolVersion: " + data["protocolVersion"]);
            console.log("hardwareVersion: " + data["hardwareVersion"]);
            console.log("mcuVersion: " + data["mcuVersion"]);
            console.log("modemVersion: " + data["modemVersion"]);

            // Use connect method to connect to the Server
            MongoClient.connect(url, function (err, db) {
                db.collection('DeviceMessageLogs').insertOne(deviceData, function (err, r) {
                    if (err) {
                        console.log("Error when write to mongodb: " + err);
                    }
                    db.collection('DeviceStage').findOneAndUpdate({
                        deviceId: deviceId
                    }, {
                        $set: {
                            protocolVersion: data["protocolVersion"],
                            hardwareVersion: data["hardwareVersion"],
                            mcuVersion: data["mcuVersion"],
                            modemVersion: data["modemVersion"]
                        }
                    }, {
                        upsert: true
                    });
                    // console.log(r.insertedCount + " record has been saved to DeviceHistoricalData");
                    client.publish("zteDeviceLogs", JSON.stringify({
                        "deviceId": deviceId
                    }));
                });
            });
            break;
        case "03":
            // Handle publish message from devices
            this.dataTypeMajor = effectiveData.substring(0, 2); //41
            this.dataTypeMinor = effectiveData.substring(2, 4); //42

            deviceData["MajorDataTypeId"] = this.dataTypeMajor;
            deviceData["MinorDataTypeId"] = this.dataTypeMinor;
            deviceData["Data"] = publishMessageHandle(this, deviceId, effectiveData, this.dataTypeMajor, this.dataTypeMinor);

            // Use connect method to connect to the Server
            MongoClient.connect(url, function (err, db) {
                db.collection('DeviceMessageLogs').insertOne(deviceData, function (err, r) {
                    if (err) {
                        console.log("Error when write to mongodb: " + err);
                    }
                    // console.log(r.insertedCount + " record has been saved to DeviceHistoricalData");
                    client.publish("zteDeviceLogs", JSON.stringify({
                        "deviceId": deviceId
                    }));
                });
            });

            break;
        case "04":
            // Handle response message from devices
            console.log("*************Response for frameId '" + frameId + "'*************");
            this.dataTypeMajor = effectiveData.substring(0, 2); //41
            this.dataTypeMinor = effectiveData.substring(2, 4); //42

            deviceData["MajorDataTypeId"] = this.dataTypeMajor;
            deviceData["MinorDataTypeId"] = this.dataTypeMinor;
            deviceData["Data"] = responseMessageHandle(deviceId, frameId, effectiveData, this.dataTypeMajor, this.dataTypeMinor);

            // Use connect method to connect to the Server
            MongoClient.connect(url, function (err, db) {
                db.collection('DeviceMessageLogs').insertOne(deviceData, function (err, r) {
                    if (err) {
                        console.log("Error when write to mongodb: " + err);
                    }
                    // console.log(r.insertedCount + " record has been saved to DeviceHistoricalData");

                    client.publish("zteDeviceResponse", JSON.stringify({
                        "deviceId": deviceId,
                        "frameId": frameId
                    }));
                    client.publish("zteDeviceLogs", JSON.stringify({
                        "deviceId": deviceId
                    }));
                });
            });
            break;
    }

    return true;
}

function publishMessageHandle(that, deviceId, effectiveData, dataTypeMajor, dataTypeMinor) {
    var common = new Common();

    var data = {};
    data["deviceId"] = deviceId;

    switch (dataTypeMajor) {
        case "00":
            //Report the trip data, include: ignition on/off, summary data.
            switch (dataTypeMinor) {
                case "00":
                    //Summary data
                    console.log('*********************Start Summary data*********************');
                    var ignitionOnTime = common.dateToUTCText(common.date_from_hex(effectiveData.substring(4, 12)));
                    var gpsWhenIgnitionOn = formatGPS(effectiveData.substring(12, 60), deviceId, false); //TODO
                    var ignitionOffTime = common.dateToUTCText(common.date_from_hex(effectiveData.substring(60, 68)));
                    var gpsWhenIgnitionOff = formatGPS(effectiveData.substring(68, 116), deviceId, false); //TODO
                    var drivingDistance = formatDrivingDistance(effectiveData.substring(116, 122)); //TODO
                    var drivingFuelConsumption = parseInt(effectiveData.substring(122, 128), 16);
                    var maxSpeed = parseInt(effectiveData.substring(128, 130), 16);
                    var idleTime = parseInt(effectiveData.substring(130, 134), 16);
                    var idleFuelConsumption = parseInt(effectiveData.substring(134, 138), 16);
                    var numberRapidAcce = parseInt(effectiveData.substring(138, 140), 16);
                    var numberRapidDece = parseInt(effectiveData.substring(140, 142), 16);
                    var numberRapidSharpTurn = parseInt(effectiveData.substring(142, 144), 16);
                    var totalMileage = parseInt(effectiveData.substring(144, 152), 16);
                    var totalFuelConsumption = parseInt(effectiveData.substring(152, 160), 16);
                    var totalDrivingTime = parseInt(effectiveData.substring(160, 168), 16);

                    data["ignitionOnTime"] = ignitionOnTime;
                    data["gpsWhenIgnitionOn"] = gpsWhenIgnitionOn;
                    data["ignitionOffTime"] = ignitionOffTime;
                    data["gpsWhenIgnitionOff"] = gpsWhenIgnitionOff;
                    data["drivingDistance"] = drivingDistance;
                    data["drivingFuelConsumption"] = drivingFuelConsumption;
                    data["maxSpeed"] = maxSpeed;
                    data["idleTime"] = idleTime;
                    data["idleFuelConsumption"] = idleFuelConsumption;
                    data["numberRapidAcce"] = numberRapidAcce;
                    data["numberRapidDece"] = numberRapidDece;
                    data["numberRapidSharpTurn"] = numberRapidSharpTurn;
                    data["totalMileage"] = totalMileage;
                    data["totalFuelConsumption"] = totalFuelConsumption;
                    data["totalDrivingTime"] = totalDrivingTime;

                    var tripData = {};
                    tripData["deviceId"] = deviceId;

                    MongoClient.connect(url, function (err, db) {
                        insert(db, 'GPSData', gpsWhenIgnitionOn, function (insertedId) {
                            tripData["ignitionOnTime"] = ignitionOnTime;
                            tripData["gpsWhenIgnitionOn"] = insertedId;
                            insert(db, 'GPSData', gpsWhenIgnitionOff, function (insertedId) {
                                tripData["ignitionOffTime"] = ignitionOffTime;
                                tripData["gpsWhenIgnitionOff"] = insertedId;
                                tripData["drivingDistance"] = drivingDistance;
                                tripData["drivingFuelConsumption"] = drivingFuelConsumption;
                                tripData["maxSpeed"] = maxSpeed;
                                tripData["idleTime"] = idleTime;
                                tripData["idleFuelConsumption"] = idleFuelConsumption;
                                tripData["numberRapidAcce"] = numberRapidAcce;
                                tripData["numberRapidDece"] = numberRapidDece;
                                tripData["numberRapidSharpTurn"] = numberRapidSharpTurn;
                                tripData["totalMileage"] = totalMileage;
                                tripData["totalFuelConsumption"] = totalFuelConsumption;
                                tripData["totalDrivingTime"] = totalDrivingTime;
                                tripData["status"] = "New";
                                insert(db, 'Trips', tripData, function (insertedId) {
                                    db.collection('GPSData').updateMany({
                                        deviceId: deviceId,
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
                                    db.close();
                                });
                            });
                        });
                    });

                    console.log('ignitionOnTime : ' + ignitionOnTime);
                    console.log('gpsWhenIgnitionOn : ' + gpsWhenIgnitionOn);
                    console.log('ignitionOffTime : ' + ignitionOffTime);
                    console.log('gpsWhenIgnitionOff : ' + gpsWhenIgnitionOff);
                    console.log('drivingDistance : ' + drivingDistance);
                    console.log('drivingFuelConsumption : ' + drivingFuelConsumption);
                    console.log('maxSpeed : ' + maxSpeed);
                    console.log('idleTime : ' + idleTime);
                    console.log('idleFuelConsumption : ' + idleFuelConsumption);
                    console.log('numberRapidAcce : ' + numberRapidAcce);
                    console.log('numberRapidDece : ' + numberRapidDece);
                    console.log('numberRapidSharpTurn : ' + numberRapidSharpTurn);
                    console.log('totalMileage : ' + totalMileage);
                    console.log('totalFuelConsumption : ' + totalFuelConsumption);
                    console.log('totalDrivingTime : ' + totalDrivingTime);
                    console.log('*********************End Summary data*********************');
                    break;
                case "01":
                    //Ignition on
                    console.log('*********************Start Ignition on*********************');
                    var typeOfIgnitionOn = effectiveData.substring(4, 6);
                    var timeOfIgnitionOn = common.dateToUTCText(common.date_from_hex(effectiveData.substring(6, 14)));
                    var informationOfDTC = effectiveData.substring(14, effectiveData.length);

                    data["typeOfIgnitionOn"] = typeOfIgnitionOn;
                    data["timeOfIgnitionOn"] = timeOfIgnitionOn;
                    data["informationOfDTC"] = informationOfDTC;

                    var historicalData = {};
                    historicalData["deviceId"] = deviceId;
                    historicalData["deviceDataTypeId"] = new MongoObjectId("59966b6721f9bc39c4eb900b");
                    historicalData["reportTime"] = timeOfIgnitionOn;
                    historicalData["value"] = {
                        "typeOfIgnitionOn": typeOfIgnitionOn,
                        "informationOfDTC": informationOfDTC
                    };

                    //DTC code
                    var alerts = new Array();
                    var start = 0;
                    var end = 2;
                    var obdFaultCodeCount = parseInt(informationOfDTC.substring(start, end), 16);
                    var i = 1;

                    if (obdFaultCodeCount != 0) {
                        start = end;
                        end += 6;
                        while (i <= obdFaultCodeCount) {
                            var obdFaultCode = effectiveData.substring(start, end);
                            var alertData = {
                                "deviceId": deviceId,
                                "alertCategoryId": new MongoObjectId("5991411f0e8828a2ff3d1049"),
                                "alertTypeId": new MongoObjectId("5991463795dfe43d4ca834b7"),
                                "reportTime": timeOfIgnitionOn,
                                "gpsPosition": null,
                                "status": "Pending",
                                "readStatus": "Unread",
                                "value": {
                                    "codeType": "obd",
                                    "stateCode": obdFaultCode.substring(4, 6),
                                    "faultCode": "P" + obdFaultCode.substring(0, 4)
                                }
                            }

                            console.log('obdStateCode : ' + obdFaultCode.substring(4, 6));
                            console.log('obdFaultCode : ' + "P" + obdFaultCode.substring(0, 4));
                            alerts.push(alertData);
                            i++;
                            start = end;
                            end += 6;
                        }
                    }

                    start = end;
                    end += 2;
                    var privateFaultCodeCount = parseInt(effectiveData.substring(start, end), 16);
                    if (privateFaultCodeCount != 0) {
                        i = 1;
                        start = end;
                        end += 8;
                        while (i <= privateFaultCodeCount) {
                            var privateFaultCode = effectiveData.substring(start, end);
                            var alertData = {
                                "deviceId": deviceId,
                                "alertCategoryId": new MongoObjectId("5991411f0e8828a2ff3d1049"),
                                "alertTypeId": new MongoObjectId("5991463795dfe43d4ca834b7"),
                                "reportTime": occurTime,
                                "gpsPosition": null,
                                "status": "Pending",
                                "readStatus": "Unread",
                                "value": {
                                    "codeType": "private",
                                    "stateCode": null,
                                    "faultCode": privateFaultCode
                                }
                            }

                            console.log('privateFaultCode : ' + privateFaultCode);
                            alerts.push(alertData);
                            i++;
                            start = end;
                            end += 8;
                        }
                    }

                    MongoClient.connect(url, function (err, db) {
                        insert(db, "DeviceHistoricalData", historicalData, function (insertedId) {
                            var deviceData = {};
                            deviceData["deviceId"] = deviceId;
                            deviceData["deviceDataTypeId"] = historicalData["deviceDataTypeId"];
                            deviceData["reportTime"] = historicalData["reportTime"];
                            deviceData["value"] = historicalData["value"];
                            db.collection('DeviceData').findOneAndUpdate({
                                deviceId: deviceId,
                                deviceDataTypeId: deviceData["deviceDataTypeId"]
                            }, deviceData, {
                                upsert: true
                            });

                            if (alerts.count > 0) {
                                insertBundle(db, "Alert", alerts, function (insertedIds) {
                                    insertedIds.forEach(function (insertedId) {
                                        var cmd = 'php ' + config.zte.artisanURL + ' notify ' + insertedId.toHexString();
                                        console.log("Trigger Alert notification: " + cmd);
                                        exec(cmd, function (error, stdout, stderr) {
                                            if (error) console.log(error);
                                            if (stdout) console.log(stdout);
                                            if (stderr) console.log(stderr);
                                        });
                                    }, this);
                                });
                            }
                        });
                    });

                    console.log('typeOfIgnitionOn : ' + typeOfIgnitionOn);
                    console.log('timeOfIgnitionOn : ' + timeOfIgnitionOn);
                    console.log('informationOfDTC : ' + informationOfDTC);
                    console.log('*********************End Ignition on*********************');
                    break;
                case "02":
                    //Ignition off
                    console.log('*********************Start Ignition off*********************');
                    var typeOfIgnitionOff = effectiveData.substring(4, 6);
                    var timeOfIgnitionOff = common.dateToUTCText(common.date_from_hex(effectiveData.substring(6, 14)));
                    var informationOfDTC = effectiveData.substring(14, effectiveData.length);

                    data["typeOfIgnitionOff"] = typeOfIgnitionOff;
                    data["timeOfIgnitionOff"] = timeOfIgnitionOff;
                    data["informationOfDTC"] = informationOfDTC;

                    var historicalData = {};
                    historicalData["deviceId"] = deviceId;
                    historicalData["deviceDataTypeId"] = new MongoObjectId("59966b7ad63375278131e63b");
                    historicalData["reportTime"] = timeOfIgnitionOff;
                    historicalData["value"] = {
                        "typeOfIgnitionOff": typeOfIgnitionOff,
                        "informationOfDTC": informationOfDTC
                    };

                    //DTC code
                    var alerts = new Array();
                    var start = 0;
                    var end = 2;
                    var obdFaultCodeCount = parseInt(informationOfDTC.substring(start, end), 16);
                    var i = 1;

                    if (obdFaultCodeCount != 0) {
                        start = end;
                        end += 6;
                        while (i <= obdFaultCodeCount) {
                            var obdFaultCode = effectiveData.substring(start, end);
                            var alertData = {
                                "deviceId": deviceId,
                                "alertCategoryId": new MongoObjectId("5991411f0e8828a2ff3d1049"),
                                "alertTypeId": new MongoObjectId("5991463795dfe43d4ca834b7"),
                                "reportTime": timeOfIgnitionOff,
                                "gpsPosition": null,
                                "status": "Pending",
                                "readStatus": "Unread",
                                "value": {
                                    "codeType": "obd",
                                    "stateCode": obdFaultCode.substring(4, 6),
                                    "faultCode": "P" + obdFaultCode.substring(0, 4)
                                }
                            }

                            console.log('obdStateCode : ' + obdFaultCode.substring(4, 6));
                            console.log('obdFaultCode : ' + "P" + obdFaultCode.substring(0, 4));
                            alerts.push(alertData);
                            i++;
                            start = end;
                            end += 6;
                        }
                    }

                    start = end;
                    end += 2;
                    var privateFaultCodeCount = parseInt(effectiveData.substring(start, end), 16);
                    if (privateFaultCodeCount != 0) {
                        i = 1;
                        start = end;
                        end += 8;
                        while (i <= privateFaultCodeCount) {
                            var privateFaultCode = effectiveData.substring(start, end);
                            var alertData = {
                                "deviceId": deviceId,
                                "alertCategoryId": new MongoObjectId("5991411f0e8828a2ff3d1049"),
                                "alertTypeId": new MongoObjectId("5991463795dfe43d4ca834b7"),
                                "reportTime": timeOfIgnitionOff,
                                "gpsPosition": null,
                                "status": "Pending",
                                "readStatus": "Unread",
                                "value": {
                                    "codeType": "private",
                                    "stateCode": null,
                                    "faultCode": privateFaultCode
                                }
                            }

                            console.log('privateFaultCode : ' + privateFaultCode);
                            alerts.push(alertData);
                            i++;
                            start = end;
                            end += 8;
                        }
                    }

                    MongoClient.connect(url, function (err, db) {
                        insert(db, "DeviceHistoricalData", historicalData, function (insertedId) {
                            var deviceData = {};
                            deviceData["deviceId"] = deviceId;
                            deviceData["deviceDataTypeId"] = historicalData["deviceDataTypeId"];
                            deviceData["reportTime"] = historicalData["reportTime"];
                            deviceData["value"] = historicalData["value"];
                            db.collection('DeviceData').findOneAndUpdate({
                                deviceId: deviceId,
                                deviceDataTypeId: deviceData["deviceDataTypeId"]
                            }, deviceData, {
                                upsert: true
                            });

                            if (alerts.count > 0) {
                                insertBundle(db, "Alert", alerts, function (insertedIds) {
                                    insertedIds.forEach(function (insertedId) {
                                        var cmd = 'php ' + config.zte.artisanURL + ' notify ' + insertedId.toHexString();
                                        console.log("Trigger Alert notification: " + cmd);
                                        exec(cmd, function (error, stdout, stderr) {
                                            if (error) console.log(error);
                                            if (stdout) console.log(stdout);
                                            if (stderr) console.log(stderr);
                                        });
                                    }, this);
                                });
                            }
                        });
                    });

                    console.log('typeOfIgnitionOff : ' + typeOfIgnitionOff);
                    console.log('timeOfIgnitionOff : ' + timeOfIgnitionOff);
                    console.log('informationOfDTC : ' + informationOfDTC);
                    console.log('*********************End Ignition off*********************');
                    break;
            }
            break;
        case "01":
            //Report driving behavior data, include: Sudden acceleration, sudden deceleration, sharp turn, exceed idle, fatigue driving, over speed
            switch (dataTypeMinor) {
                case "00":
                    //Sudden acceleration
                    console.log('*********************Start Sudden acceleration*********************');
                    var occurTime = common.dateToUTCText(common.date_from_hex(effectiveData.substring(4, 12)));
                    var gpsPosition = formatGPS(effectiveData.substring(12, 60), deviceId, false); //TODO
                    var speedBeforeAcc = parseInt(effectiveData.substring(60, 62), 16);
                    var speedAfterAcc = parseInt(effectiveData.substring(62, 64), 16);
                    var accValue = parseInt(effectiveData.substring(64, 66), 16) / 10;

                    data["occurTime"] = occurTime;
                    data["gpsPosition"] = gpsPosition;
                    data["speedBeforeAcc"] = speedBeforeAcc;
                    data["speedAfterAcc"] = speedAfterAcc;
                    data["accValue"] = accValue;

                    MongoClient.connect(url, function (err, db) {
                        insert(db, 'GPSData', gpsPosition, function (insertedId) {
                            var alertData = {};
                            alertData["deviceId"] = deviceId;
                            alertData["alertCategoryId"] = new MongoObjectId("5991411f0e8828a2ff3d1048");
                            alertData["alertTypeId"] = new MongoObjectId("5991469c95dfe43d4ca834bc");
                            alertData["reportTime"] = occurTime;
                            alertData["gpsPosition"] = insertedId;
                            alertData["status"] = "Pending";
                            alertData["readStatus"] = "Unread";
                            alertData["value"] = {
                                "speedBeforeAcc": speedBeforeAcc,
                                "speedAfterAcc": speedAfterAcc,
                                "accValue": accValue
                            }
                            insert(db, "Alert", alertData, function (insertedId) {
                                var cmd = 'php ' + config.zte.artisanURL + ' notify ' + insertedId.toHexString();
                                console.log("Trigger Alert notification: " + cmd);
                                exec(cmd, function (error, stdout, stderr) {
                                    if (error) console.log(error);
                                    if (stdout) console.log(stdout);
                                    if (stderr) console.log(stderr);
                                });
                                db.close();
                            });
                        });
                    });

                    console.log('occurTime : ' + occurTime);
                    console.log('gpsPosition : ' + gpsPosition);
                    console.log('speedBeforeAcc : ' + speedBeforeAcc);
                    console.log('speedAfterAcc : ' + speedAfterAcc);
                    console.log('accValue : ' + accValue);
                    console.log('*********************End Sudden acceleration*********************');
                    break;
                case "01":
                    //Sudden deceleration
                    console.log('*********************Start Sudden deceleration*********************');
                    var occurTime = common.dateToUTCText(common.date_from_hex(effectiveData.substring(4, 12)));
                    var gpsPosition = formatGPS(effectiveData.substring(12, 60), deviceId, false); //TODO
                    var speedBeforeDec = parseInt(effectiveData.substring(60, 62), 16);
                    var speedAfterDec = parseInt(effectiveData.substring(62, 64), 16);
                    var decValue = parseInt(effectiveData.substring(64, 66), 16) / 10;

                    data["occurTime"] = occurTime;
                    data["gpsPosition"] = gpsPosition;
                    data["speedBeforeDec"] = speedBeforeDec;
                    data["speedAfterDec"] = speedAfterDec;
                    data["decValue"] = decValue;

                    MongoClient.connect(url, function (err, db) {
                        insert(db, 'GPSData', gpsPosition, function (insertedId) {
                            var alertData = {};
                            alertData["deviceId"] = deviceId;
                            alertData["alertCategoryId"] = new MongoObjectId("5991411f0e8828a2ff3d1048");
                            alertData["alertTypeId"] = new MongoObjectId("599146ab95dfe43d4ca834bd");
                            alertData["reportTime"] = occurTime;
                            alertData["gpsPosition"] = insertedId;
                            alertData["status"] = "Pending";
                            alertData["readStatus"] = "Unread";
                            alertData["value"] = {
                                "speedBeforeDec": speedBeforeDec,
                                "speedAfterDec": speedAfterDec,
                                "decValue": decValue
                            }
                            insert(db, "Alert", alertData, function (insertedId) {
                                var cmd = 'php ' + config.zte.artisanURL + ' notify ' + insertedId.toHexString();
                                console.log("Trigger Alert notification: " + cmd);
                                exec(cmd, function (error, stdout, stderr) {
                                    if (error) console.log(error);
                                    if (stdout) console.log(stdout);
                                    if (stderr) console.log(stderr);
                                });
                                db.close();
                            });
                        });
                    });

                    console.log('occurTime : ' + occurTime);
                    console.log('gpsPosition : ' + gpsPosition);
                    console.log('speedBeforeDec : ' + speedBeforeDec);
                    console.log('speedAfterDec : ' + speedAfterDec);
                    console.log('decValue : ' + decValue);
                    console.log('*********************End Sudden deceleration*********************');
                    break;
                case "02":
                    //Sharp turn
                    console.log('*********************Start Sharp turn*********************');
                    var occurTime = common.dateToUTCText(common.date_from_hex(effectiveData.substring(4, 12)));
                    var gpsPosition = formatGPS(effectiveData.substring(12, 60), deviceId, false); //TODO
                    var turn = parseInt(effectiveData.substring(60, 62), 16) / 10;

                    data["occurTime"] = occurTime;
                    data["gpsPosition"] = gpsPosition;
                    data["turn"] = turn;

                    MongoClient.connect(url, function (err, db) {
                        insert(db, 'GPSData', gpsPosition, function (insertedId) {
                            var alertData = {};
                            alertData["deviceId"] = deviceId;
                            alertData["alertCategoryId"] = new MongoObjectId("5991411f0e8828a2ff3d1048");
                            alertData["alertTypeId"] = new MongoObjectId("599146b695dfe43d4ca834be");
                            alertData["reportTime"] = occurTime;
                            alertData["gpsPosition"] = insertedId;
                            alertData["status"] = "Pending";
                            alertData["readStatus"] = "Unread";
                            alertData["value"] = {
                                "turn": turn
                            }
                            insert(db, "Alert", alertData, function (insertedId) {
                                var cmd = 'php ' + config.zte.artisanURL + ' notify ' + insertedId.toHexString();
                                console.log("Trigger Alert notification: " + cmd);
                                exec(cmd, function (error, stdout, stderr) {
                                    if (error) console.log(error);
                                    if (stdout) console.log(stdout);
                                    if (stderr) console.log(stderr);
                                });
                                db.close();
                            });
                        });
                    });

                    console.log('occurTime : ' + occurTime);
                    console.log('gpsPosition : ' + gpsPosition);
                    console.log('turn : ' + turn);
                    console.log('*********************End Sharp turn*********************');
                    break;
                case "03":
                    //Exceed idle
                    console.log('*********************Start Exceed idle*********************');
                    var occurTime = common.dateToUTCText(common.date_from_hex(effectiveData.substring(4, 12)));

                    data["occurTime"] = occurTime;

                    var alertData = {};
                    alertData["deviceId"] = deviceId;
                    alertData["alertCategoryId"] = new MongoObjectId("5991411f0e8828a2ff3d1048");
                    alertData["alertTypeId"] = new MongoObjectId("599146c295dfe43d4ca834bf");
                    alertData["reportTime"] = occurTime;
                    alertData["gpsPosition"] = null;
                    alertData["value"] = {}

                    insertOne("Alert", alertData, function (insertedId) {
                        var cmd = 'php ' + config.zte.artisanURL + ' notify ' + insertedId.toHexString();
                        console.log("Trigger Alert notification: " + cmd);
                        exec(cmd, function (error, stdout, stderr) {
                            if (error) console.log(error);
                            if (stdout) console.log(stdout);
                            if (stderr) console.log(stderr);
                        });
                    });

                    console.log('occurTime : ' + occurTime);
                    console.log('*********************End Exceed idle*********************');
                    break;
                case "04":
                    //Driving tired
                    console.log('*********************Start Driving tired*********************');
                    var occurTime = common.dateToUTCText(common.date_from_hex(effectiveData.substring(4, 12)));

                    data["occurTime"] = occurTime;

                    var alertData = {};
                    alertData["deviceId"] = deviceId;
                    alertData["alertCategoryId"] = new MongoObjectId("5991411f0e8828a2ff3d1048");
                    alertData["alertTypeId"] = new MongoObjectId("599146cd95dfe43d4ca834c0");
                    alertData["reportTime"] = occurTime;
                    alertData["gpsPosition"] = null;
                    alertData["value"] = {}

                    insertOne("Alert", alertData, function (insertedId) {
                        var cmd = 'php ' + config.zte.artisanURL + ' notify ' + insertedId.toHexString();
                        console.log("Trigger Alert notification: " + cmd);
                        exec(cmd, function (error, stdout, stderr) {
                            if (error) console.log(error);
                            if (stdout) console.log(stdout);
                            if (stderr) console.log(stderr);
                        });
                    });

                    console.log('occurTime : ' + occurTime);
                    console.log('*********************End Driving tired*********************');
                    break;
            }
            break;
        case "02":
            //Report GPS data
            console.log('*********************Start GPS data*********************');
            var numberOfPackage = parseInt(effectiveData.substring(4, 6), 16);
            console.log('numberOfPackage : ' + numberOfPackage);
            data["numberOfPackage"] = numberOfPackage;
            var i = 1;
            var start = 6;
            var end = 54;
            var gps = new Array();
            while (i <= numberOfPackage) {
                var gpsData = formatGPS(effectiveData.substring(start, end), deviceId, true);
                console.log('gpsData ' + i + ' : ' + JSON.stringify(gpsData));
                data["gpsData" + i] = gpsData;
                gps.push(gpsData);
                start = end;
                end += 48;
                i++;
            }
            if (gps.length > 0) {
                insertMany('GPSData', gps, function (insertedIds) {
                    var client = redis.createClient();
                    client.publish("zteGPSData", JSON.stringify({
                        "deviceId": deviceId
                    }));
                });
            }

            console.log('*********************End GPS data*********************');
            break;
        case "03":
            //Report vehicle data, include: VIN, data flow.
            switch (dataTypeMinor) {
                case "00":
                    //VIN
                    console.log('*********************Start VIN code*********************');
                    var typeComProtocol = effectiveData.substring(4, 6);
                    var numberOfVinCode = parseInt(effectiveData.substring(6, 8), 16);
                    var vinValue = common.chars_from_hex(effectiveData.substring(8, 8 + numberOfVinCode * 2));

                    data["typeComProtocol"] = typeComProtocol;
                    data["numberOfVinCode"] = numberOfVinCode;
                    data["vinValue"] = vinValue;

                    var historicalData = {};
                    historicalData["deviceId"] = deviceId;
                    historicalData["deviceDataTypeId"] = new MongoObjectId("59966b86d63375278131e63c");
                    historicalData["reportTime"] = common.dateToUTCText(new Date());
                    historicalData["value"] = {
                        "typeComProtocol": typeComProtocol,
                        "numberOfVinCode": numberOfVinCode,
                        "vinValue": vinValue
                    };

                    MongoClient.connect(url, function (err, db) {
                        insert(db, "DeviceHistoricalData", historicalData, function (insertedId) {
                            var deviceData = {};
                            deviceData["deviceId"] = deviceId;
                            deviceData["deviceDataTypeId"] = historicalData["deviceDataTypeId"];
                            deviceData["reportTime"] = historicalData["reportTime"];
                            deviceData["value"] = historicalData["value"];
                            db.collection('DeviceData').findOneAndUpdate({
                                deviceId: deviceId,
                                deviceDataTypeId: deviceData["deviceDataTypeId"]
                            }, deviceData, {
                                upsert: true
                            });
                        });
                    });

                    console.log('typeComProtocol : ' + typeComProtocol);
                    console.log('numberOfVinCode : ' + numberOfVinCode);
                    console.log('vinValue : ' + vinValue);
                    console.log('*********************End VIN code*********************');
                    break;
                case "01":
                    //data flow
                    console.log('*********************Start data flow*********************');
                    var reportTime = common.dateToUTCText(common.date_from_hex(effectiveData.substring(4, 12)));
                    var rpm = effectiveData.substring(12, 16) == "ffff" ? "N/A" : parseInt(effectiveData.substring(12, 16), 16);
                    var speed = effectiveData.substring(16, 20) == "ffff" ? "N/A" : parseInt(effectiveData.substring(16, 20), 16);
                    var engineCoolantTemperature = effectiveData.substring(20, 24) == "ffff" ? "N/A" : parseInt(effectiveData.substring(20, 24), 16) - 40;
                    var throttlePosition = effectiveData.substring(24, 28) == "ffff" ? "N/A" : parseInt(effectiveData.substring(24, 28), 16) / 10;
                    var engineDuty = effectiveData.substring(28, 32) == "ffff" ? "N/A" : parseInt(effectiveData.substring(28, 32), 16) / 10;
                    var intakeAirFlow = effectiveData.substring(32, 36) == "ffff" ? "N/A" : parseInt(effectiveData.substring(32, 36), 16) / 10;
                    var intakeAirTemp = effectiveData.substring(36, 40) == "ffff" ? "N/A" : parseInt(effectiveData.substring(36, 40), 16) - 40;
                    var intakeAirPressure = effectiveData.substring(40, 44) == "ffff" ? "N/A" : parseInt(effectiveData.substring(40, 44), 16);
                    var batteryVolt = parseInt(effectiveData.substring(44, 46), 16) / 10;
                    var fli = effectiveData.substring(46, 50) == "ffff" ? "N/A" : parseInt(effectiveData.substring(46, 50), 16) / 100;
                    var dt = effectiveData.substring(50, 54) == "ffff" ? "N/A" : parseInt(effectiveData.substring(50, 54), 16);
                    var mli = effectiveData.substring(54, 58) == "ffff" ? "N/A" : parseInt(effectiveData.substring(54, 58), 16);
                    var totalMileage = parseInt(effectiveData.substring(58, 66), 16);
                    var totalFuelConsumption = parseInt(effectiveData.substring(66, 74), 16);
                    var totalDrivingTime = parseInt(effectiveData.substring(74, 82), 16);

                    data["reportTime"] = reportTime;
                    data["rpm"] = rpm;
                    data["speed"] = speed;
                    data["engineCoolantTemperature"] = engineCoolantTemperature;
                    data["engineCoolantTemperatureStatus"] = "Normal";
                    data["throttlePosition"] = throttlePosition;
                    data["engineDuty"] = engineDuty;
                    data["intakeAirFlow"] = intakeAirFlow;
                    data["intakeAirTemp"] = intakeAirTemp;
                    data["intakeAirPressure"] = intakeAirPressure;
                    data["batteryVolt"] = batteryVolt;
                    data["batteryVoltStatus"] = "Normal";
                    data["fli"] = fli;
                    data["dt"] = dt;
                    data["mli"] = mli;
                    data["totalMileage"] = totalMileage;
                    data["totalFuelConsumption"] = totalFuelConsumption;
                    data["totalDrivingTime"] = totalDrivingTime;

                    // Low battery voltage (<10.2V) will trigger low_voltage alert with message
                    // "Warning. Weak Battery. Please check.". Voltage <10.2 will also trigger the warning icon in app car status page for lowest voltage.
                    // High temperature (>115C) will trigger over_heat alert with message
                    // " Warning. Coolant Temperature Running High ". Temperature > 115C will also trigger the warning icon in app car status page for highest temperature.
                    MongoClient.connect(url, function (err, db) {
                        db.collection('DeviceSetting').findOne({
                            deviceId: deviceId,
                            settingCode: "0x05000000"
                        }, function (err, roadSpeedSetting) {
                            console.log('******************Checking RoadOverSpeed Alert******************');
                            console.log('speed: ' + speed);
                            var roadRedisKey = "ZTE-" + deviceId + "-roadOverSpeed";
                            var client = redis.createClient();
                            if (speed != "N/A" && roadSpeedSetting != null && parseInt(roadSpeedSetting["value"]) < speed) {
                                console.log('roadSpeedSetting: ' + roadSpeedSetting["value"]);
                                client.hgetall(roadRedisKey, function (err, roadOverSpeed) {
                                    if (err || roadOverSpeed == null) {
                                        var roadOverSpeedCached = {};
                                        roadOverSpeedCached["maxSpeed"] = speed;
                                        roadOverSpeedCached["speedLimit"] = roadSpeedSetting["value"];
                                        roadOverSpeedCached["speedingMileage"] = totalMileage;
                                        roadOverSpeedCached["speedingStart"] = reportTime;

                                        client.hmset(roadRedisKey, roadOverSpeedCached);
                                    } else {
                                        if (roadOverSpeed["maxSpeed"] < speed) {
                                            roadOverSpeed["maxSpeed"] = speed;
                                        }

                                        console.log('cached roadOverSpeed: ' + JSON.stringify(roadOverSpeed));

                                        client.hmset(roadRedisKey, roadOverSpeed);
                                    }
                                });
                            } else {
                                client.hgetall(roadRedisKey, function (err, roadOverSpeed) {
                                    if (!err && roadOverSpeed !== null) {
                                        // var roadOverSpeed = JSON.parse(roadOverSpeed.toString());
                                        console.log('******************Saving RoadOverSpeed Alert******************');
                                        var roadOverSpeedData = {
                                            "deviceId": deviceId,
                                            "alertCategoryId": new MongoObjectId("5991411f0e8828a2ff3d1049"),
                                            "alertTypeId": new MongoObjectId("59d6fbbcb4e2548c4ae92915"),
                                            "reportTime": reportTime,
                                            "gpsPosition": null,
                                            "status": "Pending",
                                            "readStatus": "Unread",
                                            "value": {
                                                "maxSpeed": roadOverSpeed["maxSpeed"],
                                                "speedLimit": roadOverSpeed["speedLimit"],
                                                "speedingMileage": totalMileage - roadOverSpeed["speedingMileage"],
                                                "speedingStart": roadOverSpeed["speedingStart"],
                                                "speedingEnd": reportTime
                                            }
                                        };

                                        insert(db, "Alert", roadOverSpeedData, function (insertedId) {
                                            var cmd = 'php ' + config.zte.artisanURL + ' notify ' + insertedId.toHexString();
                                            console.log("Trigger Alert notification: " + cmd);
                                            exec(cmd, function (error, stdout, stderr) {
                                                if (error) console.log(error);
                                                if (stdout) console.log(stdout);
                                                if (stderr) console.log(stderr);
                                            });
                                        });

                                        client.del(roadRedisKey, function (err, reply) {
                                            console.log(reply);
                                        });
                                    }
                                });
                            }

                            db.collection('DeviceSetting').findOne({
                                deviceId: deviceId,
                                settingCode: "0x04000000"
                            }, function (err, tempSetting) {
                                console.log('******************Checking Overheat Alert******************');
                                console.log('engineCoolantTemperature: ' + engineCoolantTemperature);
                                if (engineCoolantTemperature != "N/A" && tempSetting != null && parseInt(tempSetting["value"]) < engineCoolantTemperature) {
                                    console.log('tempSettingValue: ' + tempSetting["value"]);
                                    console.log('******************Saving Overheat Alert******************');
                                    data["engineCoolantTemperatureStatus"] = "Warning";
                                    var alertData = {
                                        "deviceId": deviceId,
                                        "alertCategoryId": new MongoObjectId("5991411f0e8828a2ff3d1048"),
                                        "alertTypeId": new MongoObjectId("599cfb516b8f82252a0c4d25"),
                                        "reportTime": reportTime,
                                        "gpsPosition": null,
                                        "status": "Pending",
                                        "readStatus": "Unread",
                                        "value": {
                                            "engineCoolantTemperature": engineCoolantTemperature,
                                            "heatLimit": parseInt(tempSetting["value"])
                                        }
                                    }
                                    insert(db, "Alert", alertData, function (insertedId) {
                                        var cmd = 'php ' + config.zte.artisanURL + ' notify ' + insertedId.toHexString();
                                        console.log("Trigger Alert notification: " + cmd);
                                        exec(cmd, function (error, stdout, stderr) {
                                            if (error) console.log(error);
                                            if (stdout) console.log(stdout);
                                            if (stderr) console.log(stderr);
                                        });
                                    });
                                }

                                db.collection('DeviceSetting').findOne({
                                    deviceId: deviceId,
                                    settingCode: "0x00060000"
                                }, function (err, lowVoltage) {
                                    console.log('******************Checking lowVoltage Alert******************');
                                    console.log('batteryVolt: ' + batteryVolt);
                                    if (batteryVolt != "N/A" && lowVoltage != null && parseInt(lowVoltage["value"]) > batteryVolt) {
                                        console.log('lowVoltage: ' + lowVoltage["value"]);
                                        data["batteryVoltStatus"] = "Warning";
                                    }
    
                                    console.log('******************Saving Vehicle Status******************');
                                    insert(db, "VehicleHistoricalStatus", data, function (insertedId) {
                                        var vehicleData = {};
                                        vehicleData["deviceId"] = deviceId;
                                        vehicleData["reportTime"] = reportTime;
                                        vehicleData["rpm"] = rpm;
                                        vehicleData["speed"] = speed;
                                        vehicleData["engineCoolantTemperature"] = engineCoolantTemperature;
                                        vehicleData["engineCoolantTemperatureStatus"] = data["engineCoolantTemperatureStatus"];
                                        vehicleData["throttlePosition"] = throttlePosition;
                                        vehicleData["engineDuty"] = engineDuty;
                                        vehicleData["intakeAirFlow"] = intakeAirFlow;
                                        vehicleData["intakeAirTemp"] = intakeAirTemp;
                                        vehicleData["intakeAirPressure"] = intakeAirPressure;
                                        vehicleData["batteryVolt"] = batteryVolt;
                                        vehicleData["batteryVoltStatus"] = data["batteryVoltStatus"];
                                        vehicleData["fli"] = fli;
                                        vehicleData["dt"] = dt;
                                        vehicleData["mli"] = mli;
                                        vehicleData["totalMileage"] = totalMileage;
                                        vehicleData["totalFuelConsumption"] = totalFuelConsumption;
                                        vehicleData["totalDrivingTime"] = totalDrivingTime;
                                        db.collection('VehicleStatus').findOneAndUpdate({
                                            deviceId: deviceId
                                        }, vehicleData, {
                                            upsert: true
                                        });
                                    });
                                });
                            });
                        });
                    });

                    console.log('reportTime : ' + reportTime);
                    console.log('rpm : ' + rpm);
                    console.log('speed : ' + speed);
                    console.log('engineCoolantTemperature : ' + engineCoolantTemperature);
                    console.log('throttlePosition : ' + throttlePosition);
                    console.log('engineDuty : ' + engineDuty);
                    console.log('intakeAirFlow : ' + intakeAirFlow);
                    console.log('intakeAirTemp : ' + intakeAirTemp);
                    console.log('intakeAirPressure : ' + intakeAirPressure);
                    console.log('batteryVolt : ' + batteryVolt);
                    console.log('fli : ' + fli);
                    console.log('dt : ' + dt);
                    console.log('mli : ' + mli);
                    console.log('totalMileage : ' + totalMileage);
                    console.log('totalFuelConsumption : ' + totalFuelConsumption);
                    console.log('totalDrivingTime : ' + totalDrivingTime);
                    console.log('*********************End data flow*********************');
                    break;
            }
            break;
        case "04":
            //Report the terminal device information, include: IMSI，device failure, sleep, wake, no location long time，modem update status, WIFI credentials.
            switch (dataTypeMinor) {
                //No longer have, moved to device info
                // case "00":
                //     //IMSI
                //     console.log('*********************Start IMSI*********************');
                //     var reportingDate = common.dateToUTCText(common.date_from_hex(effectiveData.substring(4, 12)));
                //     var lengthOfIMSI = parseInt(effectiveData.substring(12, 14), 16);
                //     var IMSI = parseInt(effectiveData.substring(14, 14 + (lengthOfIMSI * 2)), 16);

                //     data["reportingDate"] = reportingDate;
                //     data["lengthOfIMSI"] = lengthOfIMSI;
                //     data["IMSI"] = IMSI;

                //     console.log('reportingDate : ' + reportingDate);
                //     console.log('lengthOfIMSI : ' + lengthOfIMSI);
                //     console.log('IMSI : ' + IMSI);
                //     console.log('*********************End IMSI*********************');
                //     break;
                case "01":
                    //Device bug
                    console.log('*********************Start Device bug*********************');
                    var reportingDate = common.dateToUTCText(common.date_from_hex(effectiveData.substring(4, 12)));
                    var failureCode = effectiveData.substring(12, 14);

                    data["reportingDate"] = reportingDate;
                    data["failureCode"] = failureCode;

                    var alertData = {};
                    alertData["deviceId"] = deviceId;
                    alertData["alertCategoryId"] = new MongoObjectId("5991411f0e8828a2ff3d1048");
                    alertData["alertTypeId"] = new MongoObjectId("599177f6e55de693e45b7175");
                    alertData["reportTime"] = reportingDate;
                    alertData["gpsPosition"] = null;
                    alertData["status"] = "Pending";
                    alertData["readStatus"] = "Unread";
                    alertData["value"] = {
                        "failureCode": failureCode
                    }
                    insertOne("Alert", alertData, function (insertedId) {
                        var cmd = 'php ' + config.zte.artisanURL + ' notify ' + insertedId.toHexString();
                        console.log("Trigger Alert notification: " + cmd);
                        exec(cmd, function (error, stdout, stderr) {
                            if (error) console.log(error);
                            if (stdout) console.log(stdout);
                            if (stderr) console.log(stderr);
                        });
                    });

                    console.log('reportingDate : ' + reportingDate);
                    console.log('failureCode : ' + failureCode);
                    console.log('*********************End Device bug*********************');
                    break;
                case "02":
                    //Sleep
                    console.log('*********************Start Sleep*********************');
                    var sleepTime = common.dateToUTCText(common.date_from_hex(effectiveData.substring(4, 12)));
                    var sleepVoltage = parseInt(effectiveData.substring(12, 14), 16) / 10;

                    data["sleepTime"] = sleepTime;
                    data["failureCode"] = failureCode;

                    var historicalData = {};
                    historicalData["deviceId"] = deviceId;
                    historicalData["deviceDataTypeId"] = new MongoObjectId("59966b93d63375278131e63d");
                    historicalData["reportTime"] = sleepTime;
                    historicalData["value"] = {
                        "failureCode": failureCode
                    };

                    MongoClient.connect(url, function (err, db) {
                        insert(db, "DeviceHistoricalData", historicalData, function (insertedId) {
                            var deviceData = {};
                            deviceData["deviceId"] = deviceId;
                            deviceData["deviceDataTypeId"] = historicalData["deviceDataTypeId"];
                            deviceData["reportTime"] = historicalData["reportTime"];
                            deviceData["value"] = historicalData["value"];
                            db.collection('DeviceData').findOneAndUpdate({
                                deviceId: deviceId,
                                deviceDataTypeId: deviceData["deviceDataTypeId"]
                            }, deviceData, {
                                upsert: true
                            });
                        });

                        // Set device as offline since it's sleeping
                        db.collection('DeviceStage').findOneAndUpdate({
                            deviceId: deviceId
                        }, {
                            $set: {
                                status: "Offline"
                            }
                        }, {
                            upsert: true
                        });
                    });

                    console.log('sleepTime : ' + sleepTime);
                    console.log('failureCode : ' + failureCode);
                    console.log('*********************End Sleep*********************');
                    break;
                case "03":
                    //Wake up
                    console.log('*********************Start Wake up*********************');
                    var wakeUpTime = common.dateToUTCText(common.date_from_hex(effectiveData.substring(4, 12)));
                    var wakeUpVoltage = parseInt(effectiveData.substring(12, 14), 16) / 10;
                    var wakeUpType = effectiveData.substring(16, 18);

                    data["wakeUpTime"] = wakeUpTime;
                    data["wakeUpVoltage"] = wakeUpVoltage;
                    data["wakeUpType"] = wakeUpType;

                    var historicalData = {};
                    historicalData["deviceId"] = deviceId;
                    historicalData["deviceDataTypeId"] = new MongoObjectId("59966ba0d63375278131e63e");
                    historicalData["reportTime"] = wakeUpTime;
                    historicalData["value"] = {
                        "wakeUpVoltage": wakeUpVoltage,
                        "wakeUpType": wakeUpType
                    };

                    MongoClient.connect(url, function (err, db) {
                        insert(db, "DeviceHistoricalData", historicalData, function (insertedId) {
                            var deviceData = {};
                            deviceData["deviceId"] = deviceId;
                            deviceData["deviceDataTypeId"] = historicalData["deviceDataTypeId"];
                            deviceData["reportTime"] = historicalData["reportTime"];
                            deviceData["value"] = historicalData["value"];
                            db.collection('DeviceData').findOneAndUpdate({
                                deviceId: deviceId,
                                deviceDataTypeId: deviceData["deviceDataTypeId"]
                            }, deviceData, {
                                upsert: true
                            });
                        });
                    });

                    console.log('wakeUpTime : ' + wakeUpTime);
                    console.log('wakeUpVoltage : ' + wakeUpVoltage);
                    console.log('wakeUpType : ' + wakeUpType);
                    console.log('*********************End Wake up*********************');
                    break;
                case "04":
                    //Can not locate for long time
                    console.log('*********************Start Can not locate*********************');
                    var timeNoLocation = common.dateToUTCText(common.date_from_hex(effectiveData.substring(4, 12)));
                    var gpsPosition = formatGPS(effectiveData.substring(12, 60), deviceId, false); //TODO

                    data["timeNoLocation"] = timeNoLocation;
                    data["gpsPosition"] = gpsPosition;

                    MongoClient.connect(url, function (err, db) {
                        insert(db, 'GPSData', gpsPosition, function (insertedId) {
                            var alertData = {};
                            alertData["deviceId"] = deviceId;
                            alertData["alertCategoryId"] = new MongoObjectId("5991411f0e8828a2ff3d1048");
                            alertData["alertTypeId"] = new MongoObjectId("5991780ae55de693e45b7176");
                            alertData["reportTime"] = timeNoLocation;
                            alertData["gpsPosition"] = insertedId;
                            alertData["status"] = "Pending";
                            alertData["readStatus"] = "Unread";
                            alertData["value"] = {}
                            insert(db, "Alert", alertData, function (insertedId) {
                                var cmd = 'php ' + config.zte.artisanURL + ' notify ' + insertedId.toHexString();
                                console.log("Trigger Alert notification: " + cmd);
                                exec(cmd, function (error, stdout, stderr) {
                                    if (error) console.log(error);
                                    if (stdout) console.log(stdout);
                                    if (stderr) console.log(stderr);
                                });
                                db.close();
                            });
                        });
                    });

                    console.log('timeNoLocation : ' + timeNoLocation);
                    console.log('gpsPosition : ' + gpsPosition);
                    console.log('*********************End Can not locate*********************');
                    break;
                case "05":
                    //Power on after reboot
                    console.log('*********************Start Power on*********************');
                    var timePoweredOn = common.dateToUTCText(common.date_from_hex(effectiveData.substring(4, 12)));
                    var timeLastPoweredOff = common.dateToUTCText(common.date_from_hex(effectiveData.substring(12, 20)));
                    var typeOfPowerOn = effectiveData.substring(20, 22);

                    data["timePoweredOn"] = timePoweredOn;
                    data["timeLastPoweredOff"] = timeLastPoweredOff;
                    data["typeOfPowerOn"] = typeOfPowerOn;

                    var historicalData = {};
                    historicalData["deviceId"] = deviceId;
                    historicalData["deviceDataTypeId"] = new MongoObjectId("59966bacd63375278131e63f");
                    historicalData["reportTime"] = timePoweredOn;
                    historicalData["value"] = {
                        "timeLastPoweredOff": timeLastPoweredOff,
                        "typeOfPowerOn": typeOfPowerOn
                    };

                    MongoClient.connect(url, function (err, db) {
                        insert(db, "DeviceHistoricalData", historicalData, function (insertedId) {
                            var deviceData = {};
                            deviceData["deviceId"] = deviceId;
                            deviceData["deviceDataTypeId"] = historicalData["deviceDataTypeId"];
                            deviceData["reportTime"] = historicalData["reportTime"];
                            deviceData["value"] = historicalData["value"];
                            db.collection('DeviceData').findOneAndUpdate({
                                deviceId: deviceId,
                                deviceDataTypeId: deviceData["deviceDataTypeId"]
                            }, deviceData, {
                                upsert: true
                            });
                        });
                    });

                    console.log('timePoweredOn : ' + timePoweredOn);
                    console.log('timeLastPoweredOff : ' + timeLastPoweredOff);
                    console.log('typeOfPowerOn : ' + typeOfPowerOn);
                    console.log('*********************End Power on*********************');
                    break;
                case "06":
                    //Upgrade status
                    console.log('*********************Start Upgrade status*********************');
                    var reportingTime = common.dateToUTCText(common.date_from_hex(effectiveData.substring(4, 12)));
                    var upgradeState = effectiveData.substring(12, 14);

                    data["reportingTime"] = reportingTime;
                    data["upgradeState"] = upgradeState;

                    var historicalData = {};
                    historicalData["deviceId"] = deviceId;
                    historicalData["deviceDataTypeId"] = new MongoObjectId("59966bb9d63375278131e640");
                    historicalData["reportTime"] = reportingTime;
                    historicalData["value"] = {
                        "upgradeState": upgradeState
                    };

                    MongoClient.connect(url, function (err, db) {
                        insert(db, "DeviceHistoricalData", historicalData, function (insertedId) {
                            var deviceData = {};
                            deviceData["deviceId"] = deviceId;
                            deviceData["deviceDataTypeId"] = historicalData["deviceDataTypeId"];
                            deviceData["reportTime"] = historicalData["reportTime"];
                            deviceData["value"] = historicalData["value"];
                            db.collection('DeviceData').findOneAndUpdate({
                                deviceId: deviceId,
                                deviceDataTypeId: deviceData["deviceDataTypeId"]
                            }, deviceData, {
                                upsert: true
                            });
                        });
                    });

                    console.log('reportingTime : ' + reportingTime);
                    console.log('upgradeState : ' + upgradeState);
                    console.log('*********************End Upgrade status*********************');
                    break;
                case "07":
                    //Accelerator calibration status
                    console.log('*********************Start calibration*********************');
                    var acceleratorCalibrationStatus = effectiveData.substring(4, 6);

                    data["acceleratorCalibrationStatus"] = acceleratorCalibrationStatus;

                    var historicalData = {};
                    historicalData["deviceId"] = deviceId;
                    historicalData["deviceDataTypeId"] = new MongoObjectId("59966bc5d63375278131e641");
                    historicalData["reportTime"] = common.dateToUTCText(new Date());
                    historicalData["value"] = {
                        "acceleratorCalibrationStatus": acceleratorCalibrationStatus
                    };

                    MongoClient.connect(url, function (err, db) {
                        insert(db, "DeviceHistoricalData", historicalData, function (insertedId) {
                            var deviceData = {};
                            deviceData["deviceId"] = deviceId;
                            deviceData["deviceDataTypeId"] = historicalData["deviceDataTypeId"];
                            deviceData["reportTime"] = historicalData["reportTime"];
                            deviceData["value"] = historicalData["value"];
                            db.collection('DeviceData').findOneAndUpdate({
                                deviceId: deviceId,
                                deviceDataTypeId: deviceData["deviceDataTypeId"]
                            }, deviceData, {
                                upsert: true
                            });
                        });
                    });

                    console.log('acceleratorCalibrationStatus : ' + acceleratorCalibrationStatus);
                    console.log('*********************End calibration*********************');
                    break;
                    // case "08":
                    //     //Upgrade status of Modem FOTA
                    //     console.log('*********************Start status of Modem FOTA*********************');
                    //     var statusIndication = effectiveData.substring(4, 6);
                    //     var softwareVersion = effectiveData.substring(6);

                    //     data["statusIndication"] = statusIndication;
                    //     data["softwareVersion"] = softwareVersion;

                    //     console.log('statusIndication : ' + statusIndication);
                    //     console.log('softwareVersion : ' + softwareVersion);
                    //     console.log('*********************End status of Modem FOTA*********************');
                    //     break;
                    // case "09":
                    //     //Modem reset to factory configuration
                    //     console.log('*********************Start Modem reset*********************');
                    //     var wifiSSIDLength = parseInt(effectiveData.substring(4, 6), 16);
                    //     var wifiSSIDEndPosition = 6 + (wifiSSIDLength * 2);
                    //     var wifiSSID = common.chars_from_hex(effectiveData.substring(6, wifiSSIDEndPosition));

                    //     var wifiPasswordLength = parseInt(effectiveData.substring(wifiSSIDEndPosition, wifiSSIDEndPosition + 2), 16);
                    //     var wifiPasswordEndPosition = wifiSSIDEndPosition + 2 + (wifiPasswordLength * 2);
                    //     var wifiPassword = common.chars_from_hex(effectiveData.substring(wifiSSIDEndPosition + 2, wifiPasswordEndPosition));

                    //     var wifiOpenState = effectiveData.substring(wifiPasswordEndPosition, wifiPasswordEndPosition + 2);

                    //     var wifiAPNLength = parseInt(effectiveData.substring(wifiPasswordEndPosition + 2, wifiPasswordEndPosition + 4), 16);
                    //     var wifiAPNEndPosition = wifiPasswordEndPosition + 4 + (wifiAPNLength * 2);
                    //     var wifiAPN = common.chars_from_hex(effectiveData.substring(wifiPasswordEndPosition + 4, wifiAPNEndPosition));

                    //     data["wifiSSID"] = wifiSSID;
                    //     data["wifiPassword"] = wifiPassword;
                    //     data["wifiOpenState"] = wifiOpenState;
                    //     data["wifiAPN"] = wifiAPN;

                    //     console.log('wifiSSID : ' + wifiSSID);
                    //     console.log('wifiPassword : ' + wifiPassword);
                    //     console.log('wifiOpenState : ' + wifiOpenState);
                    //     console.log('wifiAPN : ' + wifiAPN);
                    //     console.log('*********************End Modem reset*********************');
                    //     break;
                case "0c":
                    //Device Info
                    console.log('*********************Start Device Info*********************');
                    var reportingTime = common.dateToUTCText(common.date_from_hex(effectiveData.substring(4, 12)));
                    data["reportingTime"] = reportingTime;

                    console.log('reportingTime : ' + reportingTime);
                    var start = 12;
                    var end = 14;
                    var length = parseInt(effectiveData.substring(start, end), 16);

                    start = end;
                    end += length * 2;
                    var phoneNumber = "+" + parseInt(effectiveData.substring(start, end), 16);

                    start = end;
                    end += 2;
                    length = parseInt(effectiveData.substring(start, end), 16);

                    start = end;
                    end += length * 2;
                    var ICCID = parseInt(effectiveData.substring(start, end), 16);

                    start = end;
                    end += 2;
                    length = parseInt(effectiveData.substring(start, end), 16);

                    start = end;
                    end += length * 2;
                    var IMSI = parseInt(effectiveData.substring(start, end), 16);

                    start = end;
                    end += 2;
                    length = parseInt(effectiveData.substring(start, end), 16);

                    start = end;
                    end += length * 2;
                    var wifiMac = common.chars_from_hex(effectiveData.substring(start, end));

                    start = end;
                    end += 2;
                    length = parseInt(effectiveData.substring(start, end), 16);

                    start = end;
                    end += length * 2;
                    var btMac = common.chars_from_hex(effectiveData.substring(start, end));

                    data["phoneNumber"] = phoneNumber;
                    data["ICCID"] = ICCID;
                    data["IMSI"] = IMSI;
                    data["wifiMac"] = wifiMac;
                    data["btMac"] = btMac;

                    var historicalData = {};
                    historicalData["deviceId"] = deviceId;
                    historicalData["deviceDataTypeId"] = new MongoObjectId("59966bd0d63375278131e642");
                    historicalData["reportTime"] = reportingTime;
                    historicalData["value"] = {
                        "phoneNumber": phoneNumber,
                        "ICCID": ICCID,
                        "IMSI": IMSI,
                        "wifiMac": wifiMac,
                        "btMac": btMac
                    };

                    MongoClient.connect(url, function (err, db) {
                        insert(db, "DeviceHistoricalData", historicalData, function (insertedId) {
                            var deviceData = {};
                            deviceData["deviceId"] = deviceId;
                            deviceData["deviceDataTypeId"] = historicalData["deviceDataTypeId"];
                            deviceData["reportTime"] = historicalData["reportTime"];
                            deviceData["value"] = historicalData["value"];
                            db.collection('DeviceData').findOneAndUpdate({
                                deviceId: deviceId,
                                deviceDataTypeId: deviceData["deviceDataTypeId"]
                            }, deviceData, {
                                upsert: true
                            });
                        });
                    });

                    console.log('phoneNumber : ' + phoneNumber);
                    console.log('ICCID : ' + ICCID);
                    console.log('IMSI : ' + IMSI);
                    console.log('wifiMac : ' + wifiMac);
                    console.log('btMac : ' + btMac);
                    console.log('*********************End Device Info*********************');
                    break;
            }
            break;
        case "05":
            //Report the vehicle secure data, include: Trouble code, low voltage, vibration after ignition off, high engine speed in low water temperature ,tow, suspected collision
            switch (dataTypeMinor) {
                case "00":
                    //DTC code
                    console.log('*********************Start DTC code*********************');
                    var occurTime = common.dateToUTCText(common.date_from_hex(effectiveData.substring(4, 12)));
                    console.log('occurTime : ' + occurTime);
                    var alerts = new Array();
                    var i = 1;
                    var start = 12;
                    var end = 14;
                    var obdFaultCodeCount = parseInt(effectiveData.substring(start, end), 16);

                    if (obdFaultCodeCount != 0) {
                        start = end;
                        end += 6;
                        while (i <= obdFaultCodeCount) {
                            var obdFaultCode = effectiveData.substring(start, end);
                            var alertData = {
                                "deviceId": deviceId,
                                "alertCategoryId": new MongoObjectId("5991411f0e8828a2ff3d1049"),
                                "alertTypeId": new MongoObjectId("5991463795dfe43d4ca834b7"),
                                "reportTime": occurTime,
                                "gpsPosition": null,
                                "status": "Pending",
                                "readStatus": "Unread",
                                "value": {
                                    "codeType": "obd",
                                    "stateCode": obdFaultCode.substring(4, 6),
                                    "faultCode": "P" + obdFaultCode.substring(0, 4)
                                }
                            }

                            console.log('obdStateCode : ' + obdFaultCode.substring(4, 6));
                            console.log('obdFaultCode : ' + "P" + obdFaultCode.substring(0, 4));
                            alerts.push(alertData);
                            i++;
                            start = end;
                            end += 6;
                        }
                    }

                    start = end;
                    end += 2;
                    var privateFaultCodeCount = parseInt(effectiveData.substring(start, end), 16);
                    if (privateFaultCodeCount != 0) {
                        i = 1;
                        start = end;
                        end += 8;
                        while (i <= privateFaultCodeCount) {
                            var privateFaultCode = effectiveData.substring(start, end);
                            var alertData = {
                                "deviceId": deviceId,
                                "alertCategoryId": new MongoObjectId("5991411f0e8828a2ff3d1049"),
                                "alertTypeId": new MongoObjectId("5991463795dfe43d4ca834b7"),
                                "reportTime": occurTime,
                                "gpsPosition": null,
                                "status": "Pending",
                                "readStatus": "Unread",
                                "value": {
                                    "codeType": "private",
                                    "stateCode": null,
                                    "faultCode": privateFaultCode
                                }
                            }

                            console.log('privateFaultCode : ' + privateFaultCode);
                            alerts.push(alertData);
                            i++;
                            start = end;
                            end += 8;
                        }
                    }
                    if (alerts.count > 0) {
                        insertMany("Alert", alerts, function (insertedIds) {
                            insertedIds.forEach(function (insertedId) {
                                var cmd = 'php ' + config.zte.artisanURL + ' notify ' + insertedId.toHexString();
                                console.log("Trigger Alert notification: " + cmd);
                                exec(cmd, function (error, stdout, stderr) {
                                    if (error) console.log(error);
                                    if (stdout) console.log(stdout);
                                    if (stderr) console.log(stderr);
                                });
                            }, this);
                        });
                    }

                    console.log('*********************End DTC code*********************');
                    break;
                case "01":
                    //Low voltage
                    console.log('*********************Start Low voltage*********************');
                    var occurTime = common.dateToUTCText(common.date_from_hex(effectiveData.substring(4, 12)));
                    var gpsPosition = formatGPS(effectiveData.substring(12, 60), deviceId, false); //TODO
                    var batteryVolt = parseInt(effectiveData.substring(60, 62), 16) / 10;

                    data["occurTime"] = occurTime;
                    data["gpsPosition"] = gpsPosition;
                    data["batteryVolt"] = batteryVolt;

                    MongoClient.connect(url, function (err, db) {
                        insert(db, 'GPSData', gpsPosition, function (insertedId) {
                            var alertData = {};
                            alertData["deviceId"] = deviceId;
                            alertData["alertCategoryId"] = new MongoObjectId("5991411f0e8828a2ff3d1049");
                            alertData["alertTypeId"] = new MongoObjectId("5991465195dfe43d4ca834b8");
                            alertData["reportTime"] = occurTime;
                            alertData["gpsPosition"] = insertedId;
                            alertData["status"] = "Pending";
                            alertData["readStatus"] = "Unread";
                            alertData["value"] = {
                                "batteryVolt": batteryVolt
                            }
                            insert(db, "Alert", alertData, function (insertedId) {
                                var cmd = 'php ' + config.zte.artisanURL + ' notify ' + insertedId.toHexString();
                                console.log("Trigger Alert notification: " + cmd);
                                exec(cmd, function (error, stdout, stderr) {
                                    if (error) console.log(error);
                                    if (stdout) console.log(stdout);
                                    if (stderr) console.log(stderr);
                                });
                                db.close();
                            });
                        });
                    });

                    console.log('occurTime : ' + occurTime);
                    console.log('gpsPosition : ' + gpsPosition);
                    console.log('batteryVolt : ' + batteryVolt);
                    console.log('*********************End Low voltage*********************');
                    break;
                case "02":
                    //Vibration after ignition off
                    console.log('*********************Start Vibration after ignition off*********************');
                    var occurTime = common.dateToUTCText(common.date_from_hex(effectiveData.substring(4, 12)));
                    var gpsPosition = formatGPS(effectiveData.substring(12, 60), deviceId, false); //TODO
                    var peekValue = parseInt(effectiveData.substring(60, 64), 16);

                    data["occurTime"] = occurTime;
                    data["gpsPosition"] = gpsPosition;
                    data["peekValue"] = peekValue;

                    MongoClient.connect(url, function (err, db) {
                        insert(db, 'GPSData', gpsPosition, function (insertedId) {
                            var alertData = {};
                            alertData["deviceId"] = deviceId;
                            alertData["alertCategoryId"] = new MongoObjectId("5991411f0e8828a2ff3d1049");
                            alertData["alertTypeId"] = new MongoObjectId("5991466495dfe43d4ca834b9");
                            alertData["reportTime"] = occurTime;
                            alertData["gpsPosition"] = insertedId;
                            alertData["status"] = "Pending";
                            alertData["readStatus"] = "Unread";
                            alertData["value"] = {
                                "peekValue": peekValue
                            }
                            insert(db, "Alert", alertData, function (insertedId) {
                                var cmd = 'php ' + config.zte.artisanURL + ' notify ' + insertedId.toHexString();
                                console.log("Trigger Alert notification: " + cmd);
                                exec(cmd, function (error, stdout, stderr) {
                                    if (error) console.log(error);
                                    if (stdout) console.log(stdout);
                                    if (stderr) console.log(stderr);
                                });
                                db.close();
                            });
                        });
                    });

                    console.log('occurTime : ' + occurTime);
                    console.log('gpsPosition : ' + gpsPosition);
                    console.log('peekValue : ' + peekValue);
                    console.log('*********************End Vibration after ignition off*********************');
                    break;
                case "03":
                case "04":
                    //Preserve
                    break;
                case "05":
                    //Suspected collision
                    console.log('*********************Start Suspected collision*********************');
                    var occurTime = common.dateToUTCText(common.date_from_hex(effectiveData.substring(4, 12)));
                    var gpsPosition = formatGPS(effectiveData.substring(12, 60), deviceId, false); //TODO
                    var collisionValue = parseInt(effectiveData.substring(60, 62), 16) / 10;

                    data["occurTime"] = occurTime;
                    data["gpsPosition"] = gpsPosition;
                    data["collisionValue"] = collisionValue;

                    MongoClient.connect(url, function (err, db) {
                        insert(db, 'GPSData', gpsPosition, function (insertedId) {
                            var alertData = {};
                            alertData["deviceId"] = deviceId;
                            alertData["alertCategoryId"] = new MongoObjectId("5991411f0e8828a2ff3d1049");
                            alertData["alertTypeId"] = new MongoObjectId("5991468295dfe43d4ca834ba");
                            alertData["reportTime"] = occurTime;
                            alertData["gpsPosition"] = insertedId;
                            alertData["status"] = "Pending";
                            alertData["readStatus"] = "Unread";
                            alertData["value"] = {
                                "collisionValue": collisionValue
                            }
                            insert(db, "Alert", alertData, function (insertedId) {
                                var cmd = 'php ' + config.zte.artisanURL + ' notify ' + insertedId.toHexString();
                                console.log("Trigger Alert notification: " + cmd);
                                exec(cmd, function (error, stdout, stderr) {
                                    if (error) console.log(error);
                                    if (stdout) console.log(stdout);
                                    if (stderr) console.log(stderr);
                                });
                                db.close();
                            });
                        });
                    });

                    console.log('occurTime : ' + occurTime);
                    console.log('gpsPosition : ' + gpsPosition);
                    console.log('sollisionValue : ' + sollisionValue);
                    console.log('*********************End Suspected collision*********************');
                    break;
                case "06":
                    //Preserve
                    break;
                case "07":
                    //Device pulled out
                    console.log('*********************Start Device pulled out*********************');
                    var occurTime = common.dateToUTCText(common.date_from_hex(effectiveData.substring(4, 12)));
                    var gpsPosition = formatGPS(effectiveData.substring(12, 60), deviceId, false); //TODO

                    data["occurTime"] = occurTime;
                    data["gpsPosition"] = gpsPosition;

                    MongoClient.connect(url, function (err, db) {
                        insert(db, 'GPSData', gpsPosition, function (insertedId) {
                            var alertData = {};
                            alertData["deviceId"] = deviceId;
                            alertData["alertCategoryId"] = new MongoObjectId("5991411f0e8828a2ff3d1049");
                            alertData["alertTypeId"] = new MongoObjectId("5991469095dfe43d4ca834bb");
                            alertData["reportTime"] = occurTime;
                            alertData["gpsPosition"] = insertedId;
                            alertData["status"] = "Pending";
                            alertData["readStatus"] = "Unread";
                            alertData["value"] = {}
                            insert(db, "Alert", alertData, function (insertedId) {
                                var cmd = 'php ' + config.zte.artisanURL + ' notify ' + insertedId.toHexString();
                                console.log("Trigger Alert notification: " + cmd);
                                exec(cmd, function (error, stdout, stderr) {
                                    if (error) console.log(error);
                                    if (stdout) console.log(stdout);
                                    if (stderr) console.log(stderr);
                                });
                                db.close();
                            });
                        });
                    });

                    console.log('occurTime : ' + occurTime);
                    console.log('gpsPosition : ' + gpsPosition);
                    console.log('*********************End Device pulled out*********************');
                    break;
                case "08":
                    //Suspected towed
                    //Document missing
                    break;
            }
            break;
        case "f0":
            //Device report the data from platform server
            console.log('**********Device report the data from platform server***************');
            switch (dataTypeMinor) {
                case "01":
                    // Request update package
                    console.log('*********************Start Request update package*********************');
                    // var reportTime = common.dateToUTCText(common.date_from_hex(effectiveData.substring(4, 12)));
                    var start = 4;
                    var end = 6;
                    var fileNameDataLength = parseInt(effectiveData.substring(start, end), 16);
                    start = end;
                    end += fileNameDataLength * 2;
                    var fileNameData = common.chars_from_hex(effectiveData.substring(start, end));
                    start = end;
                    end += 8;
                    var fileStartingPosition = parseInt(effectiveData.substring(start, end), 16);
                    start = end;
                    end += 4;
                    var requestLengthInBytes = parseInt(effectiveData.substring(start, end), 16);
                    that.UpdatePackage = {};
                    that.UpdatePackage.fileName = fileNameData;
                    that.UpdatePackage.fileNameLength = fileNameDataLength;
                    that.UpdatePackage.fileStartingPosition = fileStartingPosition;
                    that.UpdatePackage.requestLengthInBytes = requestLengthInBytes;

                    // console.log('reportTime : ' + reportTime);
                    console.log('fileNameLength : ' + fileNameDataLength);
                    console.log('fileName : ' + fileNameData);
                    console.log('fileStartingPosition : ' + fileStartingPosition);
                    console.log('requestLengthInBytes : ' + requestLengthInBytes);

                    // data["reportTime"] = reportTime;
                    data["fileNameLength"] = fileNameDataLength;
                    data["fileName"] = fileNameData;
                    data["fileStartingPosition"] = fileStartingPosition;
                    data["requestLengthInBytes"] = requestLengthInBytes;
                    console.log('*********************End Request update package*********************');
                    break;
                case "02":
                    // Request AGPS data
                    console.log('*********************Start Request AGPS data*********************');
                    // var lngData = parseInt(effectiveData.substring(4, 12), 16);
                    console.log('*********************Start Request AGPS data*********************');
                    break;
                case "03":
                    // Update package verification
                    console.log('*********************Start Package Verification*********************');
                    // var reportTime = common.dateToUTCText(common.date_from_hex(effectiveData.substring(4, 12)));
                    var start = 4;
                    var end = 6;
                    var fileNameDataLength = parseInt(effectiveData.substring(start, end), 16);
                    start = end;
                    end += fileNameDataLength * 2;
                    var fileNameData = common.chars_from_hex(effectiveData.substring(start, end));
                    that.VerifyPackage = {};
                    that.VerifyPackage.fileName = fileNameData;
                    that.VerifyPackage.fileNameLength = fileNameDataLength;

                    // console.log('reportTime : ' + reportTime);
                    console.log('fileNameLength : ' + fileNameDataLength);
                    console.log('fileName : ' + fileNameData);

                    // data["reportTime"] = reportTime;
                    data["fileNameLength"] = fileNameDataLength;
                    data["fileName"] = fileNameData;
                    console.log('*********************End Package Verification*********************');
                    break;
            }
            console.log('**********Device report the data from platform server***************');
            break;
        case "f1":
            //Server report the data from the terminal device
            console.log('**********Server report the data from the terminal device***************');
            console.log('*Not supported yet*');
            console.log('**********Server report the data from the terminal device***************');
            break;
    }

    return data;
}

function responseMessageHandle(deviceId, frameId, effectiveData, dataTypeMajor, dataTypeMinor) {
    var common = new Common();

    var data = {};

    switch (dataTypeMinor) {
        case "00":
            console.log('*********************Start Device Update*********************');
            var currentState = effectiveData.substring(4, 6);
            data["currentState"] = currentState;
            switch (currentState) {
                case "00":
                    data["description"] = "Update immediately";
                    break;
                case "01":
                    data["description"] = "In driving now，update later";
                    break;
                case "02":
                    data["description"] = "Reporting data is not completed, waiting for upgrade";
                    break;
                case "03":
                    data["description"] = "The length of the effective is incorrect";
                    break;
                case "04":
                    data["description"] = "CRC32 is 0，invalid";
                    break;
                case "05":
                    data["description"] = "Upgraded version is consistent with the current version ,could not be upgraded";
                    break;
            }
            console.log('occurTime : ' + occurTime);
            console.log('description : ' + data["description"]);
            console.log('*********************End Device Update*********************');
            break;
        case "01":
            //Vehicle detection
            console.log('*********************Start Vehicle detection*********************');
            var occurTime = common.dateToUTCText(common.date_from_hex(effectiveData.substring(4, 12)));
            console.log('occurTime : ' + occurTime);
            var alerts = new Array();
            var obdFaultCodeCount = parseInt(effectiveData.substring(12, 14), 16);
            var i = 1;
            var start = 12;
            var end = 14;

            if (obdFaultCodeCount != 0) {
                start = end;
                end += 6;
                while (i <= obdFaultCodeCount) {
                    var obdFaultCode = effectiveData.substring(start, end);
                    var alertData = {
                        "deviceId": deviceId,
                        "alertCategoryId": new MongoObjectId("5991411f0e8828a2ff3d1049"),
                        "alertTypeId": new MongoObjectId("5991463795dfe43d4ca834b7"),
                        "reportTime": occurTime,
                        "gpsPosition": null,
                        "status": "Pending",
                        "readStatus": "Unread",
                        "value": {
                            "codeType": "obd",
                            "stateCode": obdFaultCode.substring(4, 6),
                            "faultCode": "P" + obdFaultCode.substring(0, 4)
                        }
                    }

                    console.log('obdStateCode : ' + obdFaultCode.substring(4, 6));
                    console.log('obdFaultCode : ' + "P" + obdFaultCode.substring(0, 4));
                    alerts.push(alertData);
                    i++;
                    start = end;
                    end += 6;
                }
            }


            start = end;
            end += 2;
            var privateFaultCodeCount = parseInt(effectiveData.substring(start, end), 16);

            if (privateFaultCodeCount != 0) {
                i = 1;
                start = end;
                end += 8;
                while (i <= privateFaultCodeCount) {
                    var privateFaultCode = effectiveData.substring(start, end);
                    var alertData = {
                        "deviceId": deviceId,
                        "alertCategoryId": new MongoObjectId("5991411f0e8828a2ff3d1049"),
                        "alertTypeId": new MongoObjectId("5991463795dfe43d4ca834b7"),
                        "reportTime": occurTime,
                        "gpsPosition": null,
                        "status": "Pending",
                        "readStatus": "Unread",
                        "value": {
                            "codeType": "private",
                            "stateCode": null,
                            "faultCode": privateFaultCode
                        }
                    }

                    console.log('privateFaultCode : ' + privateFaultCode);
                    alerts.push(alertData);
                    i++;
                    start = end;
                    end += 8;
                }
            }

            if (alerts.count > 0) {
                insertMany("Alert", alerts, function (insertedIds) {
                    insertedIds.forEach(function (insertedId) {
                        var cmd = 'php ' + config.zte.artisanURL + ' notify ' + insertedId.toHexString();
                        console.log("Trigger Alert notification: " + cmd);
                        exec(cmd, function (error, stdout, stderr) {
                            if (error) console.log(error);
                            if (stdout) console.log(stdout);
                            if (stderr) console.log(stderr);
                        });
                    }, this);
                });
            }

            console.log('*********************End Vehicle detection*********************');
            break;
        case "02":
            //Set parameters
            console.log('*********************Start Set parameters*********************');
            var paramName = effectiveData.substring(4, 8);
            var resultCode = effectiveData.substring(8, 10);
            var result = "Rejected";
            switch (resultCode) {
                case "00":
                    result = "Rejected";
                    break;
                case "01":
                    result = "Accept";
                    break;
            }

            var cmd = 'php ' + config.zte.artisanURL + ' configuration:device-update-status ' + deviceId + ' ' + frameId + ' ' + result;
            exec(cmd, function (error, stdout, stderr) {
                if (error) console.log(error);
                if (stdout) console.log(stdout);
                if (stderr) console.log(stderr);
            });

            data["result"] = result;
            console.log('Result : ' + result);
            console.log('*********************Start Set parameters*********************');
            break;
        case "03":
            //Inquire parameters
            var start = 4;
            var end = 8;
            var eom = false;
            MongoClient.connect(url, function (err, db) {
                while (!eom) {
                    var paramNo = effectiveData.substring(start, end);
                    paramNo = "0x" + paramNo + "0000";
                    start = end;
                    switch (paramNo) {
                        case "0xf0000000":
                            //Should not be here, this one only for set.
                            break;
                        case "0x00010000":
                            end += 2;
                            data[paramNo] = parseInt(effectiveData.substring(start, end), 16) / 10;
                            db.collection('DeviceSetting').findOneAndUpdate({
                                deviceId: deviceId,
                                settingCode: paramNo
                            }, {
                                deviceId: deviceId,
                                name: "Threshold of rapid acceleration",
                                settingCode: paramNo,
                                value: data[paramNo],
                                status: 'Latest'
                            }, {
                                upsert: true
                            });
                            break;
                        case "0x00020000":
                            end += 2;
                            data[paramNo] = parseInt(effectiveData.substring(start, end), 16) / 10;
                            db.collection('DeviceSetting').findOneAndUpdate({
                                deviceId: deviceId,
                                settingCode: paramNo
                            }, {
                                deviceId: deviceId,
                                name: "Threshold of rapid deceleration",
                                settingCode: paramNo,
                                value: data[paramNo],
                                status: 'Latest'
                            }, {
                                upsert: true
                            });
                            break;
                        case "0x00030000":
                            end += 2;
                            data[paramNo] = parseInt(effectiveData.substring(start, end), 16) / 100;
                            db.collection('DeviceSetting').findOneAndUpdate({
                                deviceId: deviceId,
                                settingCode: paramNo
                            }, {
                                deviceId: deviceId,
                                name: "Threshold of sharp turn",
                                settingCode: paramNo,
                                value: data[paramNo],
                                status: 'Latest'
                            }, {
                                upsert: true
                            });
                            break;
                        case "0x00040000":
                            end += 4;
                            data[paramNo] = parseInt(effectiveData.substring(start, end), 16);
                            db.collection('DeviceSetting').findOneAndUpdate({
                                deviceId: deviceId,
                                settingCode: paramNo
                            }, {
                                deviceId: deviceId,
                                name: "Fatigue driving",
                                settingCode: paramNo,
                                value: data[paramNo],
                                status: 'Latest'
                            }, {
                                upsert: true
                            });
                            break;
                        case "0x00050000":
                            end += 2;
                            var value = parseInt(effectiveData.substring(start, end), 16);
                            data[paramNo] = (isNaN(value) ? 0 : value);
                            //Device not support
                            // db.collection('DeviceSetting').findOneAndUpdate({ deviceId: deviceId, settingCode: paramNo }, { deviceId: deviceId, name: "Over speed", settingCode: paramNo, value: data[paramNo], status: 'Latest' }, { upsert: true });
                            break;
                        case "0x00060000":
                            end += 2;
                            data[paramNo] = parseInt(effectiveData.substring(start, end), 16) / 10;
                            db.collection('DeviceSetting').findOneAndUpdate({
                                deviceId: deviceId,
                                settingCode: paramNo
                            }, {
                                deviceId: deviceId,
                                name: "Low voltage",
                                settingCode: paramNo,
                                value: data[paramNo],
                                status: 'Latest'
                            }, {
                                upsert: true
                            });
                            break;
                        case "0x00070000":
                            end += 2;
                            data[paramNo] = parseInt(effectiveData.substring(start, end), 16);
                            db.collection('DeviceSetting').findOneAndUpdate({
                                deviceId: deviceId,
                                settingCode: paramNo
                            }, {
                                deviceId: deviceId,
                                name: "Wake vibration level",
                                settingCode: paramNo,
                                value: data[paramNo],
                                status: 'Latest'
                            }, {
                                upsert: true
                            });
                            break;
                        case "0x00080000":
                            end += 2;
                            data[paramNo] = parseInt(effectiveData.substring(start, end), 16) / 10;
                            db.collection('DeviceSetting').findOneAndUpdate({
                                deviceId: deviceId,
                                settingCode: paramNo
                            }, {
                                deviceId: deviceId,
                                name: "Threshold of suspected collision",
                                settingCode: paramNo,
                                value: data[paramNo],
                                status: 'Latest'
                            }, {
                                upsert: true
                            });
                            break;
                        case "0x00090000":
                            end += 4;
                            data[paramNo] = parseInt(effectiveData.substring(start, end), 16);
                            db.collection('DeviceSetting').findOneAndUpdate({
                                deviceId: deviceId,
                                settingCode: paramNo
                            }, {
                                deviceId: deviceId,
                                name: "Threshold of exceed idle",
                                settingCode: paramNo,
                                value: data[paramNo],
                                status: 'Latest'
                            }, {
                                upsert: true
                            });
                            break;
                        case "0x000a0000":
                            end += 2;
                            if (effectiveData.substring(start, end) == "00") {
                                data[paramNo] = "Not allowed to report the speed";
                            } else if (effectiveData.substring(start, end) == "01") {
                                data[paramNo] = "Allowed to report the speed";
                            }
                            db.collection('DeviceSetting').findOneAndUpdate({
                                deviceId: deviceId,
                                settingCode: paramNo
                            }, {
                                deviceId: deviceId,
                                name: "If allowed to report the speed",
                                settingCode: paramNo,
                                value: data[paramNo],
                                status: 'Latest'
                            }, {
                                upsert: true
                            });
                            break;
                        case "0x000b0000":
                            end += 4;
                            data[paramNo] = parseInt(effectiveData.substring(start, end), 16);
                            db.collection('DeviceSetting').findOneAndUpdate({
                                deviceId: deviceId,
                                settingCode: paramNo
                            }, {
                                deviceId: deviceId,
                                name: "GPS report frequency",
                                settingCode: paramNo,
                                value: data[paramNo],
                                status: 'Latest'
                            }, {
                                upsert: true
                            });
                            break;
                        case "0x000c0000":
                            end += 4;
                            data[paramNo] = parseInt(effectiveData.substring(start, end), 16);
                            db.collection('DeviceSetting').findOneAndUpdate({
                                deviceId: deviceId,
                                settingCode: paramNo
                            }, {
                                deviceId: deviceId,
                                name: "Report frequency of vehicle data flow",
                                settingCode: paramNo,
                                value: data[paramNo],
                                status: 'Latest'
                            }, {
                                upsert: true
                            });
                            break;
                        case "0x02000000":
                            end += 2;
                            var count = parseInt(effectiveData.substring(start, end), 16);
                            start = end;
                            end += count;
                            data[paramNo] = common.chars_from_hex(effectiveData.substring(start, end));
                            db.collection('DeviceSetting').findOneAndUpdate({
                                deviceId: deviceId,
                                settingCode: paramNo
                            }, {
                                deviceId: deviceId,
                                name: "Change the reporting address and port",
                                settingCode: paramNo,
                                value: data[paramNo],
                                status: 'Latest'
                            }, {
                                upsert: true
                            });
                            break;
                        case "0x02010000":
                            end += 2;
                            var count = parseInt(effectiveData.substring(start, end), 16);
                            start = end;
                            end += count;
                            data[paramNo] = common.chars_from_hex(effectiveData.substring(start, end));
                            db.collection('DeviceSetting').findOneAndUpdate({
                                deviceId: deviceId,
                                settingCode: paramNo
                            }, {
                                deviceId: deviceId,
                                name: "Wifi client ip address & subnet",
                                settingCode: paramNo,
                                value: data[paramNo],
                                status: 'Latest'
                            }, {
                                upsert: true
                            });
                            break;
                        case "0x02020000":
                            end += 2;
                            var count = parseInt(effectiveData.substring(start, end), 16);
                            start = end;
                            end += count;
                            data[paramNo] = common.chars_from_hex(effectiveData.substring(start, end));
                            db.collection('DeviceSetting').findOneAndUpdate({
                                deviceId: deviceId,
                                settingCode: paramNo
                            }, {
                                deviceId: deviceId,
                                name: "Wifi SSID",
                                settingCode: paramNo,
                                value: data[paramNo],
                                status: 'Latest'
                            }, {
                                upsert: true
                            });
                            break;
                        case "0x02030000":
                            end += 2;
                            var count = parseInt(effectiveData.substring(start, end), 16);
                            start = end;
                            end += count;
                            data[paramNo] = common.chars_from_hex(effectiveData.substring(start, end));
                            db.collection('DeviceSetting').findOneAndUpdate({
                                deviceId: deviceId,
                                settingCode: paramNo
                            }, {
                                deviceId: deviceId,
                                name: "Wifi Password",
                                settingCode: paramNo,
                                value: data[paramNo],
                                status: 'Latest'
                            }, {
                                upsert: true
                            });
                            break;
                        case "0x02040000":
                            end += 2;
                            var count = parseInt(effectiveData.substring(start, end), 16);
                            start = end;
                            end += count;
                            data[paramNo] = common.chars_from_hex(effectiveData.substring(start, end));
                            db.collection('DeviceSetting').findOneAndUpdate({
                                deviceId: deviceId,
                                settingCode: paramNo
                            }, {
                                deviceId: deviceId,
                                name: "Wifi router APN",
                                settingCode: paramNo,
                                value: data[paramNo],
                                status: 'Latest'
                            }, {
                                upsert: true
                            });
                            break;
                        case "0x02050000":
                            end += 2;
                            var count = parseInt(effectiveData.substring(start, end), 16);
                            start = end;
                            end += count;
                            data[paramNo] = common.chars_from_hex(effectiveData.substring(start, end));
                            db.collection('DeviceSetting').findOneAndUpdate({
                                deviceId: deviceId,
                                settingCode: paramNo
                            }, {
                                deviceId: deviceId,
                                name: "Modem DNS servers",
                                settingCode: paramNo,
                                value: data[paramNo],
                                status: 'Latest'
                            }, {
                                upsert: true
                            });
                            break;
                        case "0x02060000":
                            end += 2;
                            var count = parseInt(effectiveData.substring(start, end), 16);
                            start = end;
                            end += count;
                            data[paramNo] = common.chars_from_hex(effectiveData.substring(start, end));
                            db.collection('DeviceSetting').findOneAndUpdate({
                                deviceId: deviceId,
                                settingCode: paramNo
                            }, {
                                deviceId: deviceId,
                                name: "Modem APN",
                                settingCode: paramNo,
                                value: data[paramNo],
                                status: 'Latest'
                            }, {
                                upsert: true
                            });
                            break;
                        case "0x02070000":
                            end += 2;
                            if (effectiveData.substring(start, end) == "00") {
                                data[paramNo] = "Not controlled by the server";
                            } else if (effectiveData.substring(start, end) == "01") {
                                data[paramNo] = "HOTSPOT on";
                            } else {
                                data[paramNo] = "HOTSPOT off";
                            }
                            db.collection('DeviceSetting').findOneAndUpdate({
                                deviceId: deviceId,
                                settingCode: paramNo
                            }, {
                                deviceId: deviceId,
                                name: "Wifi on / Off",
                                settingCode: paramNo,
                                value: data[paramNo],
                                status: 'Latest'
                            }, {
                                upsert: true
                            });
                            break;
                        case "0x02080000":
                            end += 2;
                            data[paramNo] = effectiveData.substring(start, end);
                            db.collection('DeviceSetting').findOneAndUpdate({
                                deviceId: deviceId,
                                settingCode: paramNo
                            }, {
                                deviceId: deviceId,
                                name: "Inquiry network type",
                                settingCode: paramNo,
                                value: data[paramNo],
                                status: 'Latest'
                            }, {
                                upsert: true
                            });
                            break;
                        case "0x02090000":
                            end += 2;
                            var count = parseInt(effectiveData.substring(start, end), 16);
                            start = end;
                            end += count;
                            data[paramNo] = common.chars_from_hex(effectiveData.substring(start, end));
                            db.collection('DeviceSetting').findOneAndUpdate({
                                deviceId: deviceId,
                                settingCode: paramNo
                            }, {
                                deviceId: deviceId,
                                name: "Inquiry Operator name",
                                settingCode: paramNo,
                                value: data[paramNo],
                                status: 'Latest'
                            }, {
                                upsert: true
                            });
                            break;
                        case "0x020a0000":
                            end += 2;
                            data[paramNo] = parseInt(effectiveData.substring(start, end), 16);
                            db.collection('DeviceSetting').findOneAndUpdate({
                                deviceId: deviceId,
                                settingCode: paramNo
                            }, {
                                deviceId: deviceId,
                                name: "Inquiry Signal strength",
                                settingCode: paramNo,
                                value: data[paramNo],
                                status: 'Latest'
                            }, {
                                upsert: true
                            });
                            break;
                        case "0x03000000":
                            end += 2;
                            data[paramNo] = effectiveData.substring(start, end);
                            db.collection('DeviceSetting').findOneAndUpdate({
                                deviceId: deviceId,
                                settingCode: paramNo
                            }, {
                                deviceId: deviceId,
                                name: "The current status of the accelerator self-learning",
                                settingCode: paramNo,
                                value: data[paramNo],
                                status: 'Latest'
                            }, {
                                upsert: true
                            });
                            break;
                    }
                    if (end >= effectiveData.length) {
                        eom = true;
                    }
                    start = end;
                    end += 4;
                }
            });
            break;
        case "04":
            //Inquiry log
            console.log('*********************Start Inquiry log*********************');
            var logHex = effectiveData.substring(4, effectiveData.length);
            var log = common.chars_from_hex(logHex);

            data["logDetails"] = log;
            console.log('logDetails : ' + log);
            console.log('*********************Start Inquiry log*********************');
            break;
        case "05":
            //Reserved
            break;
        case "06":
            //Set vehicle information
            console.log('*********************Start Set vehicle information*********************');
            var resultCode = effectiveData.substring(4, 6);
            var result = "Invalid";
            switch (resultCode) {
                case "00":
                    result = "Invalid";
                    break;
                case "01":
                    result = "Valid";
                    break;
            }

            data["result"] = result;
            console.log('Result : ' + result);
            console.log('*********************Start Set vehicle information*********************');
            break;
        case "07":
            //Re-study the accelerator calibration  //Just requestType is ok
            console.log('*********************Start Re-study*********************');
            var result = "Successful";
            data["result"] = result;
            console.log('Result : ' + result);
            console.log('*********************Start Re-study*********************');
            break;
    }

    return data;
}

ZTEDataService.prototype.generateReply = function (hexData) {
    var common = new Common();
    var deviceId = hexData.substring(24, 54);
    var frameType = this.decryptedHex.substring(16, 18);
    var frameId = this.decryptedHex.substring(18, 22);

    // Data length always = 1
    var dataLength = "0001";
    var mainMessage = "01";

    var returnFrameType = "0d";

    switch (frameType) {
        case '11':
            // Return connect with connack
            returnFrameType = "02";
            break;

        case '0c':
            // Return ping request with ping response
            returnFrameType = "0d";
            dataLength = "0000";
            mainMessage = "";
            break;

        case '03':
            // Return publish request with Publish Acknowledgment
            returnFrameType = "04";
            dataLength = "0002";
            mainMessage = this.dataTypeMajor + this.dataTypeMinor;
            if (this.dataTypeMajor == "f0") {
                switch (this.dataTypeMinor) {
                    case "01":
                        var fileStartingPosition = common.recorrectHexString(this.UpdatePackage.fileStartingPosition.toString(16), 8);
                        var buff = fs.readFileSync('./assets/' + this.UpdatePackage.fileName);
                        var dataPortion = buff.toString('hex');
                        var start = this.UpdatePackage.fileStartingPosition * 2;
                        var end = start + this.UpdatePackage.requestLengthInBytes * 2;
                        if (end > dataPortion.length) {
                            end = dataPortion.length;
                        }
                        var fwData = dataPortion.substring(start, end);
                        var len = fwData.length / 2;
                        var paddingBytes = 4 - (len - (Math.floor(len / 4) * 4));
                        // console.log('++++++++++++++++++++++++++++++++++++++++++++++++++');
                        // console.log('paddingBytes needed: ' + paddingBytes);
                        // // for (var i = 0; i < paddingBytes; i++) {
                        // //     fwData += "ff";
                        // // }
                        // console.log('++++++++++++++++++++++++++++++++++++++++++++++++++');
                        // console.log('fileStartingPosition : ' + fileStartingPosition);
                        // console.log('fwData : ' + fwData);
                        var checksumBuffer = Buffer.from(fwData, "hex");
                        var checksumHex = common.recorrectHexString(adler32.sum(checksumBuffer).toString(16), 8);
                        fwData = checksumHex + fileStartingPosition + fwData;
                        mainMessage += fwData;
                        dataLength = common.recorrectHexString((mainMessage.length / 2).toString(16), 4);

                        // console.log('fwDataFull : ' + fwData);
                        // console.log('fwDataLength : ' + fwData.length);
                        // console.log('messageLength : ' + mainMessage.length);
                        break;
                    case "02":
                        break;
                    case "03":
                        var fileNameData = common.hex_from_chars(this.VerifyPackage.fileName);
                        var fileNameDataLength = common.recorrectHexString((fileNameData.length / 2).toString(16), 2);
                        var verifyData = fileNameDataLength + fileNameData;
                        var buff = fs.readFileSync('./assets/' + this.VerifyPackage.fileName);
                        var dataPortion = buff.toString('hex');
                        var len = dataPortion.length / 2;
                        verifyData += common.recorrectHexString(len.toString(16), 8);
                        mainMessage += verifyData;
                        dataLength = common.recorrectHexString((mainMessage.length / 2).toString(16), 4);
                        break;
                }
            }
            break;

        case '04':
            // Do not response to response message from device
            return false;
    }

    return dataPacking(deviceId, returnFrameType, frameId, dataLength, mainMessage, this.encryptionKey);
}

function getNotifyDeviceForNewFWMessage(){
    var common = new Common();

    //Notify new fw available to upgrade
    var serverAddressData = common.hex_from_chars(config.zte.serverAddress);
    var serverAddressDataLength = common.recorrectHexString((serverAddressData.length / 2).toString(16), 2);
    var fileNameData = common.hex_from_chars(config.zte.currentFWVersion);
    var fileNameDataLength = common.recorrectHexString((fileNameData.length / 2).toString(16), 2);

    return serverAddressDataLength + serverAddressData + fileNameDataLength + fileNameData;
}

function dataPacking(deviceId, frameType, frameId, dataLength, mainMessage, encryptionKey) {
    var common = new Common();

    var iv = CryptoJS.lib.WordArray.random(16);
    var ivText = CryptoJS.enc.Utf16.stringify(iv);
    var ivHex = common.hex_from_chars(ivText);

    var randomNoise = CryptoJS.lib.WordArray.random(16);
    var randomNoiseText = CryptoJS.enc.Utf16.stringify(randomNoise);
    var randomNoiseHex = common.hex_from_chars(randomNoiseText);

    var tobeEncrypted = randomNoiseHex;
    tobeEncrypted += frameType;
    tobeEncrypted += frameId;
    tobeEncrypted += dataLength;
    tobeEncrypted += mainMessage;

    // (4 + 4 + 16 + 30 + 8 + 4 + 2 + 4 + 2 + 2 + 16) / 2
    var messageLength = (config.zte.frameHeader.length + //4
        4 + //message length itself
        ivHex.length + //16
        deviceId.length + //30
        randomNoiseHex.length + //16
        frameType.length + //2
        frameId.length + //4
        dataLength.length + //4
        mainMessage.length + //2
        8 + //checksum
        config.zte.frameEnd.length) / 2; //4

    // calculate length of padding for 3des
    var tobeEncryptedLength = (tobeEncrypted.length + 8) / 2;
    var paddingBytes = 8 - (tobeEncryptedLength - (Math.floor(tobeEncryptedLength / 8) * 8));
    messageLength += paddingBytes;

    var messageLengthHex = common.recorrectHexString(messageLength.toString(16), 4);

    var checksum = messageLengthHex + ivHex + deviceId + randomNoiseHex + frameType + frameId + dataLength + mainMessage;
    // console.log('++++++++++++++++++++++++++++++++++++++++++++++++++');
    // console.log('messageLengthHex : ' + messageLengthHex);
    // console.log('ivHex : ' + ivHex);
    // console.log('deviceId : ' + deviceId);
    // console.log('randomNoiseHex : ' + randomNoiseHex);
    // console.log('frameType : ' + frameType);
    // console.log('frameId : ' + frameId);
    // console.log('dataLength : ' + dataLength);
    // console.log('mainMessage : ' + mainMessage);
    // console.log('checksum : ' + checksum);
    // console.log('++++++++++++++++++++++++++++++++++++++++++++++++++');
    var checksumBuffer = Buffer.from(checksum, "hex");
    var checksumHex = common.recorrectHexString(adler32.sum(checksumBuffer).toString(16), 8);
    tobeEncrypted += checksumHex;

    var key = CryptoJS.enc.Hex.parse(encryptionKey);
    var ivHexParse = CryptoJS.enc.Hex.parse(ivHex);

    var encrypted = CryptoJS.TripleDES.encrypt(CryptoJS.enc.Hex.parse(tobeEncrypted), key, {
        iv: ivHexParse
    });
    var ciphertext = CryptoJS.enc.Hex.stringify(encrypted.ciphertext);

    console.log('frameID : ' + frameId);

    var beforeEncrypted = config.zte.frameHeader + messageLengthHex + ivHex + deviceId + tobeEncrypted + config.zte.frameEnd;
    console.log('Response message: ' + beforeEncrypted);

    return config.zte.frameHeader + messageLengthHex + ivHex + deviceId + ciphertext + config.zte.frameEnd;
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
    gpsData["address"] = "";

    return gpsData;
}

function formatDrivingDistance(drivingDistance) {
    var common = new Common();
    var drivingDistanceData = {};
    var rawData = common.hex2bits(drivingDistance);

    drivingDistanceData["statisticsSource"] = rawData.substring(0, 1) == '0' ? "OBD" : "GPS";
    drivingDistanceData["mileage"] = parseInt(rawData.substring(1, rawData.length), 2);

    return drivingDistanceData;
}

function insertMany(collection, data, callback) {
    MongoClient.connect(url, function (connectionErr, db) {
        db.collection(collection).insertMany(data, function (err, result) {
            if (err) {
                console.log("Error when write to mongodb: " + err);
            }
            callback(result.insertedIds);
            db.close();
        });
    });
}

function insertOne(collection, data, callback) {
    MongoClient.connect(url, function (connectionErr, db) {
        db.collection(collection).insertOne(data, function (err, result) {
            if (err) {
                console.log("Error when write to mongodb: " + err);
            }
            callback(result.insertedId);
            db.close();
        });
    });
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

module.exports = ZTEDataService;