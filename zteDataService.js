"use strict";

const Common = require('./common')
    // const SimpleCrypto = require('./simpleCrypto')
const CryptoJS = require("crypto-js");
const adler32 = require('adler32');

// Different per device
const SECRET_KEY = "c3d7c43a438fa2268d3e37f81ac1261ada57dfb8fa092465";
//Header
const frameHeader = "5555";
// End
const frameEnd = "aaaa";

var ZTEDataService = function() {};

ZTEDataService.prototype.processData = function(hexData, cryptedHex, decryptedHex) {

    var messageLength = hexData.substring(4, 8);
    var iv = hexData.substring(8, 24);
    var deviceId = hexData.substring(24, 54);

    var randomNoiseHex = decryptedHex.substring(0, 16);
    var frameType = decryptedHex.substring(16, 18);
    var frameId = decryptedHex.substring(18, 22);

    var dataLengthHex = decryptedHex.substring(22, 26);
    var dataLength = parseInt(dataLengthHex, 16);
    var endOfEffectiveData = 26 + (dataLength * 2);
    var effectiveData = decryptedHex.substring(26, endOfEffectiveData);
    var checksumHex = decryptedHex.substring(endOfEffectiveData, endOfEffectiveData + 8);

    var checksum = messageLength + iv + deviceId + randomNoiseHex + frameType + frameId + dataLengthHex + effectiveData;
    var calculatedCheckSumHex = adler32.sum(Buffer.from(checksum, "hex")).toString(16);
    if (calculatedCheckSumHex.length == 6) {
        calculatedCheckSumHex = '00' + calculatedCheckSumHex;
    } else if (calculatedCheckSumHex.length == 7) {
        calculatedCheckSumHex = '0' + calculatedCheckSumHex;
    }

    if (checksumHex != calculatedCheckSumHex) {
        console.log('Error: ^^^^^^^ Checksum is not corect calculated ^^^^^^^ ');
        return false;
    }

    console.log('frameType : ' + frameType);
    console.log('frameId : ' + frameId);
    console.log('deviceId : ' + deviceId);
    console.log('Crypted Hex : ' + cryptedHex);
    console.log('Decrypted Hex : ' + decryptedHex);

    console.log('effectiveData : ' + effectiveData);

    switch (frameType) {
        case "03":
            publishMessageHandle(effectiveData);
            break;
    }

    return true;
}

function publishMessageHandle(effectiveData) {
    var dataTypeMajor = effectiveData.substring(0, 2); //41
    var dataTypeMinor = effectiveData.substring(2, 4); //42

    switch (dataTypeMajor) {
        case "00":
            //Report the trip data, include: ignition on/off, summary data.
            switch (dataTypeMinor) {
                case "00":
                    //Summary data
                    console.log('*********************Start Summary data*********************');
                    var ignitionOnTime = effectiveData.substring(4, 12);
                    var gpsWhenIgnitionOn = effectiveData.substring(12, 60);
                    var ignitionOffTime = effectiveData.substring(60, 68);
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
                    var timeOfIgnitionOn = effectiveData.substring(6, 14);
                    var informationOfDTC = effectiveData.substring(14, effectiveData.length);

                    console.log('typeOfIgnitionOn : ' + typeOfIgnitionOn);
                    console.log('timeOfIgnitionOn : ' + timeOfIgnitionOn);
                    console.log('informationOfDTC : ' + informationOfDTC);
                    console.log('*********************End Ignition on*********************');
                    break;
                case "02":
                    //Ignition off
                    console.log('*********************Start Ignition off*********************');
                    var typeOfIgnitionOff = effectiveData.substring(4, 6);
                    var timeOfIgnitionOff = effectiveData.substring(6, 14);
                    var informationOfDTC = effectiveData.substring(14, effectiveData.length);

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
                    var occurTime = effectiveData.substring(4, 12);
                    var gpsPosition = effectiveData.substring(12, 60);
                    var speedBeforeAcc = effectiveData.substring(60, 62);
                    var speedAfterAcc = effectiveData.substring(62, 64);
                    var accValue = effectiveData.substring(64, 66);

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
                    var occurTime = effectiveData.substring(4, 12);
                    var gpsPosition = effectiveData.substring(12, 60);
                    var speedBeforeDec = effectiveData.substring(60, 62);
                    var speedAfterDec = effectiveData.substring(62, 64);
                    var decValue = effectiveData.substring(64, 66);

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
                    var occurTime = effectiveData.substring(4, 12);
                    var gpsPosition = effectiveData.substring(12, 60);
                    var turn = effectiveData.substring(60, 62);

                    console.log('occurTime : ' + occurTime);
                    console.log('gpsPosition : ' + gpsPosition);
                    console.log('turn : ' + turn);
                    console.log('*********************End Sharp turn*********************');
                    break;
                case "03":
                    //Exceed idle
                    console.log('*********************Start Exceed idle*********************');
                    var occurTime = effectiveData.substring(4, 12);

                    console.log('occurTime : ' + occurTime);
                    console.log('*********************End Exceed idle*********************');
                    break;
                case "04":
                    //Driving tired
                    console.log('*********************Start Driving tired*********************');
                    var occurTime = effectiveData.substring(4, 12);

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
            if (numberOfPackage == 2) {
                var gpsData2 = effectiveData.substring(38, 74)
                console.log('gpsData2 : ' + gpsData2);
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
                    var numberOfVinCode = effectiveData.substring(6, 8);
                    var typeComProtocol = effectiveData.substring(4, 6);
                    console.log('*********************End VIN code*********************');
                    break;
                case "01":
                    //data flow
                    console.log('*********************Start data flow*********************');
                    console.log('*********************End data flow*********************');
                    break;
            }
            break;
        case "04":
            //Report the terminal device information, include: IMSI，device failure, sleep, wake, no location long time，modem update status, WIFI credentials.
            break;
        case "05":
            //Report the vehicle secure data, include: Trouble code, low voltage, vibration after ignition off, high engine speed in low water temperature ,tow, suspected collision
            break;
        case "F0":
            //Device report the data from platform server
            break;
        case "F1":
            //Server report the data from the terminal device
            break;
    }
}

ZTEDataService.prototype.generateReply = function(hexData, decryptedHex) {
    var common = new Common();

    var deviceId = hexData.substring(24, 54);
    var frameType = decryptedHex.substring(16, 18);
    var frameId = decryptedHex.substring(18, 22);

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
    var messageLength = (frameHeader.length + //4
        4 + //message length itself
        ivHex.length + //16
        deviceId.length + //30
        randomNoiseHex.length + //16
        returnFrameType.length + //2
        frameId.length + //4
        dataLength.length + //4
        mainMessage.length + //2
        8 + //checksum
        frameEnd.length) / 2; //4

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

    var key = CryptoJS.enc.Hex.parse(SECRET_KEY);
    var ivHexParse = CryptoJS.enc.Hex.parse(ivHex);

    var encrypted = CryptoJS.TripleDES.encrypt(CryptoJS.enc.Hex.parse(tobeEncrypted), key, { iv: ivHexParse });
    // var encryptedKey = CryptoJS.enc.Hex.stringify(encrypted.key);
    // var encryptedIV = CryptoJS.enc.Hex.stringify(encrypted.iv);
    var ciphertext = CryptoJS.enc.Hex.stringify(encrypted.ciphertext);
    // ciphertext = ciphertext.substring(0, ciphertext.length - 16);

    // console.log('frameHeader : ' + frameHeader);
    // console.log('messageLengthHex : ' + messageLengthHex);
    // console.log('ivHex : ' + ivHex);
    // console.log('deviceId : ' + deviceId);
    // console.log('randomNoiseHex : ' + randomNoiseHex);
    console.log('returnFrameType : ' + returnFrameType);
    console.log('frameID : ' + frameId);
    // console.log('dataLength : ' + dataLength);
    console.log('message : ' + mainMessage);
    // console.log('checksumHex : ' + checksumHex);
    // console.log('frameEnd : ' + frameEnd);

    // console.log('tobeEncrypted : ' + tobeEncrypted);
    console.log('ciphertext : ' + ciphertext);

    var finalHex = frameHeader + messageLengthHex + ivHex + deviceId + ciphertext + frameEnd;

    return finalHex;
}

module.exports = ZTEDataService;