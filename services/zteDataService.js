"use strict";

const Common = require('../lib/common');
const config = require('../config/conf');
const SimpleCrypto = require('../lib/simpleCrypto');
const CryptoJS = require("crypto-js");
const adler32 = require('adler32');
const f = require('util').format;
const MongoClient = require('mongodb').MongoClient;

var user = encodeURIComponent(config.zte.mongoUsername);
var password = encodeURIComponent(config.zte.mongoPassword);

// Connection URL
var url = f(config.zte.mongoUrl, user, password, config.zte.mongoAuthMechanism);

var ZTEDataService = function() {};

ZTEDataService.prototype.generateMessageToDevice = function(data) {

}

ZTEDataService.prototype.processData = function(hexData, subcribedDevices) {
    var common = new Common();
    var simpleCrypto = new SimpleCrypto();

    // Remove frame header (4), message length (4), device id (16) and frame end (4).
    var messageLength = hexData.substring(4, 8);
    var messageLengthDec = parseInt(messageLength, 16);
    var iv = hexData.substring(8, 24);
    var deviceId = hexData.substring(24, 54);
    var imei = common.chars_from_hex(deviceId);
    var cryptedHex = hexData.substring(54, hexData.length - 4);
    // this.encryptionKey = config.zte.encryptionKey;
    if (!subcribedDevices["ID-" + deviceId]) {
        console.log('Error: ^^^^^^^ No support device with deviceId : ' + deviceId + ' ^^^^^^^');
        return false;
    }

    this.encryptionKey = subcribedDevices["ID-" + deviceId];
    // switch (deviceId) {
    //     case "383631343733303330313437393335":
    //         this.encryptionKey = "fad238ec6c8f8381644ee54409b5119c071c0249cd6b5dad";
    //         break;
    //     case "303036383836376ae06a9506407a68":
    //         this.encryptionKey = "ce12c65ffa07aa5ea7e1f5ac314aaea5187da0a198b97a06";
    //         break;
    //     default:
    //         console.log('Error: ^^^^^^^ No support device with deviceId : ' + deviceId + ' ^^^^^^^');
    //         return false;
    // }

    var decryptedData = simpleCrypto.des(common.chars_from_hex(this.encryptionKey), common.chars_from_hex(cryptedHex), 0, 1, common.chars_from_hex(iv));
    this.decryptedHex = common.hex_from_chars(decryptedData).replace(/(\r\n|\n|\r)/gm, "");
    var fullDecryptedMessage = hexData.substring(0, 54) + this.decryptedHex + config.zte.frameEnd;

    console.log('***************************Device Data***************************');
    console.log('emei : ' + imei);
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
    console.log('Decrypted Hex : ' + this.decryptedHex);
    // console.log('checksumHex : ' + checksumHex);

    var receivedDate = new Date();
    var receivedDateText = receivedDate.getUTCFullYear() + "-" + (receivedDate.getUTCMonth() + 1) + "-" + receivedDate.getUTCDate() + " " + receivedDate.getUTCHours() + ":" + receivedDate.getUTCMinutes() + ":" + receivedDate.getUTCSeconds();
    var deviceData = {
        "DeviceId": deviceId,
        "MessageType": frameType,
        "MessageId": frameId,
        "RawData": hexData,
        "EffectiveRawData": effectiveData,
        "CreatedDateTime": receivedDateText
    };

    // Use connect method to connect to the Server
    MongoClient.connect(url, function(err, db) {
        db.collection('DeviceHistoricalDataDebug').insertOne(deviceData, function(err, r) {
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
    console.log('cal checksumHex : ' + calculatedCheckSumHex);
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

    switch (frameType) {
        case "03":
            var dataTypeMajor = effectiveData.substring(0, 2); //41
            var dataTypeMinor = effectiveData.substring(2, 4); //42

            console.log('dataTypeMajor : ' + dataTypeMajor);
            console.log('dataTypeMinor : ' + dataTypeMinor);

            deviceData["MajorDataTypeId"] = dataTypeMajor;
            deviceData["MinorDataTypeId"] = dataTypeMinor;
            deviceData["Data"] = publishMessageHandle(effectiveData, dataTypeMajor, dataTypeMinor);

            // Use connect method to connect to the Server
            MongoClient.connect(url, function(err, db) {
                db.collection('DeviceHistoricalDataTemp').insertOne(deviceData, function(err, r) {
                    if (err) {
                        console.log("Error when write to mongodb: " + err);
                    }
                    // console.log(r.insertedCount + " record has been saved to DeviceHistoricalData");
                    db.close();
                });
            });

            break;
    }

    return true;
}

function publishMessageHandle(effectiveData, dataTypeMajor, dataTypeMinor) {
    var common = new Common();

    var data = {};

    switch (dataTypeMajor) {
        case "00":
            //Report the trip data, include: ignition on/off, summary data.
            switch (dataTypeMinor) {
                case "00":
                    //Summary data
                    console.log('*********************Start Summary data*********************');
                    var ignitionOnTime = common.date_from_hex(effectiveData.substring(4, 12));
                    var gpsWhenIgnitionOn = effectiveData.substring(12, 60);
                    var ignitionOffTime = common.date_from_hex(effectiveData.substring(60, 68));
                    var gpsWhenIgnitionOff = effectiveData.substring(68, 116);
                    var drivingDistance = effectiveData.substring(116, 122);
                    var drivingFuelConsumption = effectiveData.substring(122, 128);
                    var maxSpeed = effectiveData.substring(128, 130);
                    var idleTime = effectiveData.substring(130, 134);
                    var idleFuelConsumption = effectiveData.substring(134, 138);
                    var numberRapidAcce = effectiveData.substring(138, 140);
                    var numberRapidDece = effectiveData.substring(140, 142);
                    var numberRapidSharpTurn = effectiveData.substring(142, 144);
                    var totalMileage = effectiveData.substring(144, 152);
                    var totalFuelConsumption = effectiveData.substring(152, 160);
                    var totalDrivingTime = effectiveData.substring(160, 168);

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
                    var timeOfIgnitionOn = common.date_from_hex(effectiveData.substring(6, 14));
                    var informationOfDTC = effectiveData.substring(14, effectiveData.length);

                    data["typeOfIgnitionOn"] = typeOfIgnitionOn;
                    data["timeOfIgnitionOn"] = timeOfIgnitionOn;
                    data["informationOfDTC"] = informationOfDTC;

                    console.log('typeOfIgnitionOn : ' + typeOfIgnitionOn);
                    console.log('timeOfIgnitionOn : ' + timeOfIgnitionOn);
                    console.log('informationOfDTC : ' + informationOfDTC);
                    console.log('*********************End Ignition on*********************');
                    break;
                case "02":
                    //Ignition off
                    console.log('*********************Start Ignition off*********************');
                    var typeOfIgnitionOff = effectiveData.substring(4, 6);
                    var timeOfIgnitionOff = common.date_from_hex(effectiveData.substring(6, 14));
                    var informationOfDTC = effectiveData.substring(14, effectiveData.length);

                    data["typeOfIgnitionOff"] = typeOfIgnitionOff;
                    data["timeOfIgnitionOff"] = timeOfIgnitionOff;
                    data["informationOfDTC"] = informationOfDTC;

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
                    var occurTime = common.date_from_hex(effectiveData.substring(4, 12));
                    var gpsPosition = effectiveData.substring(12, 60);
                    var speedBeforeAcc = effectiveData.substring(60, 62);
                    var speedAfterAcc = effectiveData.substring(62, 64);
                    var accValue = effectiveData.substring(64, 66);

                    data["occurTime"] = occurTime;
                    data["gpsPosition"] = gpsPosition;
                    data["speedBeforeAcc"] = speedBeforeAcc;
                    data["speedAfterAcc"] = speedAfterAcc;
                    data["accValue"] = accValue;

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
                    var occurTime = common.date_from_hex(effectiveData.substring(4, 12));
                    var gpsPosition = effectiveData.substring(12, 60);
                    var speedBeforeDec = effectiveData.substring(60, 62);
                    var speedAfterDec = effectiveData.substring(62, 64);
                    var decValue = effectiveData.substring(64, 66);

                    data["occurTime"] = occurTime;
                    data["gpsPosition"] = gpsPosition;
                    data["speedBeforeDec"] = speedBeforeDec;
                    data["speedAfterDec"] = speedAfterDec;
                    data["decValue"] = decValue;

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
                    var occurTime = common.date_from_hex(effectiveData.substring(4, 12));
                    var gpsPosition = effectiveData.substring(12, 60);
                    var turn = effectiveData.substring(60, 62);

                    data["occurTime"] = occurTime;
                    data["gpsPosition"] = gpsPosition;
                    data["turn"] = turn;

                    console.log('occurTime : ' + occurTime);
                    console.log('gpsPosition : ' + gpsPosition);
                    console.log('turn : ' + turn);
                    console.log('*********************End Sharp turn*********************');
                    break;
                case "03":
                    //Exceed idle
                    console.log('*********************Start Exceed idle*********************');
                    var occurTime = common.date_from_hex(effectiveData.substring(4, 12));

                    data["occurTime"] = occurTime;

                    console.log('occurTime : ' + occurTime);
                    console.log('*********************End Exceed idle*********************');
                    break;
                case "04":
                    //Driving tired
                    console.log('*********************Start Driving tired*********************');
                    var occurTime = common.date_from_hex(effectiveData.substring(4, 12));

                    data["occurTime"] = occurTime;

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
            var gpsData = effectiveData.substring(6, 38)
            console.log('gpsData : ' + gpsData);

            data["numberOfPackage"] = numberOfPackage;
            data["gpsData"] = gpsData;
            if (numberOfPackage == 2) {
                var gpsData2 = effectiveData.substring(38, 74)
                console.log('gpsData2 : ' + gpsData2);
                data["gpsData2"] = gpsData2;
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
                    var vinValue = effectiveData.substring(8, 8 + numberOfVinCode * 2);

                    data["typeComProtocol"] = typeComProtocol;
                    data["numberOfVinCode"] = numberOfVinCode;
                    data["vinValue"] = vinValue;

                    console.log('typeComProtocol : ' + typeComProtocol);
                    console.log('numberOfVinCode : ' + numberOfVinCode);
                    console.log('vinValue : ' + vinValue);
                    console.log('*********************End VIN code*********************');
                    break;
                case "01":
                    //data flow
                    console.log('*********************Start data flow*********************');
                    var reportTime = common.date_from_hex(effectiveData.substring(4, 12));
                    var rpm = effectiveData.substring(12, 16);
                    var speed = effectiveData.substring(16, 20);
                    var engineCoolantTemperature = effectiveData.substring(20, 24);
                    var throttlePosition = effectiveData.substring(24, 28);
                    var engineDuty = effectiveData.substring(28, 32);
                    var intakeAirFlow = effectiveData.substring(32, 36);
                    var intakeAirTemp = effectiveData.substring(36, 40);
                    var intakeAirPressure = effectiveData.substring(40, 44);
                    var batteryVolt = effectiveData.substring(44, 46);
                    var fli = effectiveData.substring(46, 50);
                    var dt = effectiveData.substring(50, 54);
                    var mli = effectiveData.substring(54, 58);
                    var totalMileage = effectiveData.substring(58, 66);
                    var totalFuelConsumption = effectiveData.substring(66, 74);
                    var totalDrivingTime = effectiveData.substring(74, 82);

                    data["reportTime"] = reportTime;
                    data["rpm"] = rpm;
                    data["speed"] = speed;
                    data["engineCoolantTemperature"] = engineCoolantTemperature;
                    data["throttlePosition"] = throttlePosition;
                    data["engineDuty"] = engineDuty;
                    data["intakeAirFlow"] = intakeAirFlow;
                    data["intakeAirTemp"] = intakeAirTemp;
                    data["intakeAirPressure"] = intakeAirPressure;
                    data["batteryVolt"] = batteryVolt;
                    data["fli"] = fli;
                    data["dt"] = dt;
                    data["mli"] = mli;
                    data["totalMileage"] = totalMileage;
                    data["totalFuelConsumption"] = totalFuelConsumption;
                    data["totalDrivingTime"] = totalDrivingTime;

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
                case "00":
                    //IMSI
                    console.log('*********************Start IMSI*********************');
                    var reportingDate = common.date_from_hex(effectiveData.substring(4, 12));
                    var lengthOfIMSI = parseInt(effectiveData.substring(12, 14), 16);
                    var IMSI = effectiveData.substring(14, 14 + (lengthOfIMSI * 2));

                    data["reportingDate"] = reportingDate;
                    data["lengthOfIMSI"] = lengthOfIMSI;
                    data["IMSI"] = IMSI;

                    console.log('reportingDate : ' + reportingDate);
                    console.log('lengthOfIMSI : ' + lengthOfIMSI);
                    console.log('IMSI : ' + IMSI);
                    console.log('*********************End IMSI*********************');
                    break;
                case "01":
                    //Device bug
                    console.log('*********************Start Device bug*********************');
                    var reportingDate = common.date_from_hex(effectiveData.substring(4, 12));
                    var failureCode = effectiveData.substring(12, 14);

                    data["reportingDate"] = reportingDate;
                    data["failureCode"] = failureCode;

                    console.log('reportingDate : ' + reportingDate);
                    console.log('failureCode : ' + failureCode);
                    console.log('*********************End Device bug*********************');
                    break;
                case "02":
                    //Sleep
                    console.log('*********************Start Sleep*********************');
                    var sleepTime = common.date_from_hex(effectiveData.substring(4, 12));
                    var sleepVoltage = parseInt(effectiveData.substring(12, 14), 16);

                    data["sleepTime"] = sleepTime;
                    data["failureCode"] = failureCode;

                    console.log('sleepTime : ' + sleepTime);
                    console.log('failureCode : ' + failureCode);
                    console.log('*********************End Sleep*********************');
                    break;
                case "03":
                    //Wake up
                    console.log('*********************Start Wake up*********************');
                    var wakeUpTime = common.date_from_hex(effectiveData.substring(4, 12));
                    var wakeUpVoltage = parseInt(effectiveData.substring(12, 14), 16);
                    var wakeUpType = effectiveData.substring(16, 18);

                    data["wakeUpTime"] = wakeUpTime;
                    data["wakeUpVoltage"] = wakeUpVoltage;
                    data["wakeUpType"] = wakeUpType;

                    console.log('wakeUpTime : ' + wakeUpTime);
                    console.log('wakeUpVoltage : ' + wakeUpVoltage);
                    console.log('wakeUpType : ' + wakeUpType);
                    console.log('*********************End Wake up*********************');
                    break;
                case "04":
                    //Can not locate for long time
                    console.log('*********************Start Can not locate*********************');
                    var timeNoLocation = common.date_from_hex(effectiveData.substring(4, 12));
                    var gpsPosition = effectiveData.substring(12, 60);

                    data["timeNoLocation"] = timeNoLocation;
                    data["gpsPosition"] = gpsPosition;

                    console.log('timeNoLocation : ' + timeNoLocation);
                    console.log('gpsPosition : ' + gpsPosition);
                    console.log('*********************End Can not locate*********************');
                    break;
                case "05":
                    //Power on after reboot
                    console.log('*********************Start Power on*********************');
                    var timePoweredOn = common.date_from_hex(effectiveData.substring(4, 12));
                    var timeLastPoweredOff = common.date_from_hex(effectiveData.substring(12, 20));
                    var typeOfPowerOn = effectiveData.substring(20, 22);

                    data["timePoweredOn"] = timePoweredOn;
                    data["timeLastPoweredOff"] = timeLastPoweredOff;
                    data["typeOfPowerOn"] = typeOfPowerOn;

                    console.log('timePoweredOn : ' + timePoweredOn);
                    console.log('timeLastPoweredOff : ' + timeLastPoweredOff);
                    console.log('typeOfPowerOn : ' + typeOfPowerOn);
                    console.log('*********************End Power on*********************');
                    break;
                case "06":
                    //Upgrade status
                    console.log('*********************Start Upgrade status*********************');
                    var reportingTime = common.date_from_hex(effectiveData.substring(4, 12));
                    var upgradeState = effectiveData.substring(12, 14);

                    data["reportingTime"] = reportingTime;
                    data["upgradeState"] = upgradeState;

                    console.log('reportingTime : ' + reportingTime);
                    console.log('upgradeState : ' + upgradeState);
                    console.log('*********************End Upgrade status*********************');
                    break;
                case "07":
                    //Accelerator calibration status
                    console.log('*********************Start calibration*********************');
                    var acceleratorCalibrationStatus = effectiveData.substring(4, 6);

                    data["acceleratorCalibrationStatus"] = acceleratorCalibrationStatus;

                    console.log('acceleratorCalibrationStatus : ' + acceleratorCalibrationStatus);
                    console.log('*********************End calibration*********************');
                    break;
                case "08":
                    //Upgrade status of Modem FOTA
                    console.log('*********************Start status of Modem FOTA*********************');
                    var statusIndication = effectiveData.substring(4, 6);
                    var softwareVersion = effectiveData.substring(6);

                    data["statusIndication"] = statusIndication;
                    data["softwareVersion"] = softwareVersion;

                    console.log('statusIndication : ' + statusIndication);
                    console.log('softwareVersion : ' + softwareVersion);
                    console.log('*********************End status of Modem FOTA*********************');
                    break;
                case "09":
                    //Modem reset to factory configuration
                    console.log('*********************Start Modem reset*********************');
                    var wifiSSIDLength = parseInt(effectiveData.substring(4, 6), 16);
                    var wifiSSIDEndPosition = 6 + (wifiSSIDLength * 2);
                    var wifiSSID = effectiveData.substring(6, wifiSSIDEndPosition);

                    var wifiPasswordLength = parseInt(effectiveData.substring(wifiSSIDEndPosition, wifiSSIDEndPosition + 2), 16);
                    var wifiPasswordEndPosition = wifiSSIDEndPosition + 2 + (wifiPasswordLength * 2);
                    var wifiPassword = effectiveData.substring(wifiSSIDEndPosition + 2, wifiPasswordEndPosition);

                    var wifiOpenState = effectiveData.substring(wifiPasswordEndPosition, wifiPasswordEndPosition + 2);

                    var wifiAPNLength = parseInt(effectiveData.substring(wifiPasswordEndPosition + 2, wifiPasswordEndPosition + 4), 16);
                    var wifiAPNEndPosition = wifiPasswordEndPosition + 4 + (wifiAPNLength * 2);
                    var wifiAPN = effectiveData.substring(wifiPasswordEndPosition + 4, wifiAPNEndPosition);

                    data["wifiSSID"] = wifiSSID;
                    data["wifiPassword"] = wifiPassword;
                    data["wifiOpenState"] = wifiOpenState;
                    data["wifiAPN"] = wifiAPN;

                    console.log('wifiSSID : ' + wifiSSID);
                    console.log('wifiPassword : ' + wifiPassword);
                    console.log('wifiOpenState : ' + wifiOpenState);
                    console.log('wifiAPN : ' + wifiAPN);
                    console.log('*********************End Modem reset*********************');
                    break;
            }
            break;
        case "05":
            //Report the vehicle secure data, include: Trouble code, low voltage, vibration after ignition off, high engine speed in low water temperature ,tow, suspected collision
            switch (dataTypeMinor) {
                case "00":
                    //DTC code
                    console.log('*********************Start DTC code*********************');
                    var occurTime = common.date_from_hex(effectiveData.substring(4, 12));
                    var obdFaultCode = effectiveData.substring(12, 14);
                    var obdFaultCodeInfo = effectiveData.substring(14, 20);
                    var privateFaultCode = effectiveData.substring(20, 22);
                    var privateFaultCodeInfo = effectiveData.substring(22, 30);

                    data["occurTime"] = occurTime;
                    data["obdFaultCode"] = obdFaultCode;
                    data["obdFaultCodeInfo"] = obdFaultCodeInfo;
                    data["privateFaultCode"] = privateFaultCode;
                    data["privateFaultCodeInfo"] = privateFaultCodeInfo;

                    console.log('occurTime : ' + occurTime);
                    console.log('obdFaultCode : ' + obdFaultCode);
                    console.log('obdFaultCodeInfo : ' + obdFaultCodeInfo);
                    console.log('privateFaultCode : ' + privateFaultCode);
                    console.log('privateFaultCodeInfo : ' + privateFaultCodeInfo);
                    console.log('*********************End DTC code*********************');
                    break;
                case "01":
                    //Low voltage
                    console.log('*********************Start Low voltage*********************');
                    var occurTime = common.date_from_hex(effectiveData.substring(4, 12));
                    var gpsPosition = effectiveData.substring(12, 60);
                    var batteryVolt = effectiveData.substring(60, 62);

                    data["occurTime"] = occurTime;
                    data["gpsPosition"] = gpsPosition;
                    data["batteryVolt"] = batteryVolt;

                    console.log('occurTime : ' + occurTime);
                    console.log('gpsPosition : ' + gpsPosition);
                    console.log('batteryVolt : ' + batteryVolt);
                    console.log('*********************End Low voltage*********************');
                    break;
                case "02":
                    //Vibration after ignition off
                    console.log('*********************Start Vibration after ignition off*********************');
                    var occurTime = common.date_from_hex(effectiveData.substring(4, 12));
                    var gpsPosition = effectiveData.substring(12, 60);
                    var peekValue = effectiveData.substring(60, 64);

                    data["occurTime"] = occurTime;
                    data["gpsPosition"] = gpsPosition;
                    data["peekValue"] = peekValue;

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
                    var occurTime = common.date_from_hex(effectiveData.substring(4, 12));
                    var gpsPosition = effectiveData.substring(12, 60);
                    var sollisionValue = effectiveData.substring(60, 62);

                    data["occurTime"] = occurTime;
                    data["gpsPosition"] = gpsPosition;
                    data["sollisionValue"] = sollisionValue;

                    console.log('occurTime : ' + occurTime);
                    console.log('gpsPosition : ' + gpsPosition);
                    console.log('sollisionValue : ' + sollisionValue);
                    console.log('*********************End Suspected collision*********************');
                    break;
                case "07":
                    //Device pulled out
                    console.log('*********************Start Device pulled out*********************');
                    var occurTime = common.date_from_hex(effectiveData.substring(4, 12));
                    var gpsPosition = effectiveData.substring(12, 60);

                    data["occurTime"] = occurTime;
                    data["gpsPosition"] = gpsPosition;

                    console.log('occurTime : ' + occurTime);
                    console.log('gpsPosition : ' + gpsPosition);
                    console.log('*********************End Device pulled out*********************');
                    break;
            }
            break;
        case "F0":
            //Device report the data from platform server
            console.log('**********Device report the data from platform server***************');
            console.log('*Not supported yet*');
            console.log('**********Device report the data from platform server***************');
            break;
        case "F1":
            //Server report the data from the terminal device
            console.log('**********Server report the data from the terminal device***************');
            console.log('*Not supported yet');
            console.log('**********Server report the data from the terminal device***************');
            break;
    }

    return data;
}

ZTEDataService.prototype.generateReply = function(hexData) {
    var common = new Common();

    var deviceId = hexData.substring(24, 54);
    var frameType = this.decryptedHex.substring(16, 18);
    var frameId = this.decryptedHex.substring(18, 22);

    var iv = CryptoJS.lib.WordArray.random(16);
    var ivText = CryptoJS.enc.Utf16.stringify(iv);
    var ivHex = common.hex_from_chars(ivText);

    var randomNoise = CryptoJS.lib.WordArray.random(16);
    var randomNoiseText = CryptoJS.enc.Utf16.stringify(randomNoise);
    var randomNoiseHex = common.hex_from_chars(randomNoiseText);

    var tobeEncrypted = randomNoiseHex;

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
            break;
    }

    tobeEncrypted += returnFrameType;
    tobeEncrypted += dataLength;
    tobeEncrypted += mainMessage;
    tobeEncrypted += frameId;

    // (4 + 4 + 16 + 30 + 8 + 4 + 2 + 4 + 2 + 2 + 16) / 2
    var messageLength = (config.zte.frameHeader.length + //4
        4 + //message length itself
        ivHex.length + //16
        deviceId.length + //30
        randomNoiseHex.length + //16
        returnFrameType.length + //2
        frameId.length + //4
        dataLength.length + //4
        mainMessage.length + //2
        8 + //checksum
        config.zte.frameEnd.length) / 2; //4

    // calculate length of padding for 3des
    var tobeEncryptedLength = (tobeEncrypted.length + 8) / 2;
    var paddingBytes = 8 - (tobeEncryptedLength - (Math.floor(tobeEncryptedLength / 8) * 8));
    messageLength += paddingBytes;

    var messageLengthHex = messageLength.toString(16);
    if (messageLengthHex.length == 2) {
        messageLengthHex = "00" + messageLengthHex;
    }

    var checksum = messageLengthHex + ivHex + deviceId + randomNoiseHex + returnFrameType + frameId + dataLength + mainMessage;
    var checksumBuffer = Buffer.from(checksum, "hex");
    var checksumHex = adler32.sum(checksumBuffer).toString(16);
    if (checksumHex.length == 6) {
        checksumHex = '00' + checksumHex;
    } else if (checksumHex.length == 7) {
        checksumHex = '0' + checksumHex;
    }
    tobeEncrypted += checksumHex;

    var key = CryptoJS.enc.Hex.parse(this.encryptionKey);
    var ivHexParse = CryptoJS.enc.Hex.parse(ivHex);

    var encrypted = CryptoJS.TripleDES.encrypt(CryptoJS.enc.Hex.parse(tobeEncrypted), key, { iv: ivHexParse });
    // var encryptedKey = CryptoJS.enc.Hex.stringify(encrypted.key);
    // var encryptedIV = CryptoJS.enc.Hex.stringify(encrypted.iv);
    var ciphertext = CryptoJS.enc.Hex.stringify(encrypted.ciphertext);
    // ciphertext = ciphertext.substring(0, ciphertext.length - 16);

    // console.log('config.zte.frameHeader : ' + config.zte.frameHeader);
    // console.log('messageLengthHex : ' + messageLengthHex);
    // console.log('ivHex : ' + ivHex);
    // console.log('deviceId : ' + deviceId);
    // console.log('randomNoiseHex : ' + randomNoiseHex);
    console.log('returnFrameType : ' + returnFrameType);
    console.log('frameID : ' + frameId);
    // console.log('dataLength : ' + dataLength);
    // console.log('checksumHex : ' + checksumHex);
    // console.log('config.zte.frameEnd : ' + config.zte.frameEnd);

    // console.log('tobeEncrypted : ' + tobeEncrypted);
    // console.log('ciphertext : ' + ciphertext);

    var beforeEncrypted = config.zte.frameHeader + messageLengthHex + ivHex + deviceId + tobeEncrypted + config.zte.frameEnd;
    console.log('Raw response : ' + beforeEncrypted);

    var finalHex = config.zte.frameHeader + messageLengthHex + ivHex + deviceId + ciphertext + config.zte.frameEnd;

    return finalHex;
}

module.exports = ZTEDataService;