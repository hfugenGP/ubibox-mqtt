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
    var endOfEffectiveData = 26 + (dataLength / 2);
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

    console.log('Crypted Hex : ' + cryptedHex);
    console.log('Decrypted Hex : ' + decryptedHex);
    console.log('messageLength : ' + messageLength);
    console.log('iv : ' + iv);
    console.log('deviceId : ' + deviceId);

    return true;
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
    console.log('messageLengthHex : ' + messageLengthHex);
    // console.log('ivHex : ' + ivHex);
    // console.log('deviceId : ' + deviceId);
    // console.log('randomNoiseHex : ' + randomNoiseHex);
    console.log('returnFrameType : ' + returnFrameType);
    console.log('frameID : ' + frameId);
    console.log('dataLength : ' + dataLength);
    console.log('message : ' + mainMessage);
    console.log('checksumHex : ' + checksumHex);
    // console.log('frameEnd : ' + frameEnd);

    console.log('tobeEncrypted : ' + tobeEncrypted);
    console.log('ciphertext : ' + ciphertext);

    var finalHex = frameHeader + messageLengthHex + ivHex + deviceId + ciphertext + frameEnd;

    return finalHex;
}

module.exports = ZTEDataService;