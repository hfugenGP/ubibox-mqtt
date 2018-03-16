const Common = require('../lib/common');
const config = require('../config/conf');
// const ZTEDataService = require('../services/zteDataService');
const redis = require("redis");

const f = require('util').format;
const MongoClient = require('mongodb').MongoClient;
const fs = require('fs');
// var CRC32 = require('crc-32');
// var ADLER32 = require('adler-32');
const adler32 = require('adler32');
var HI = require('heat-index');

const CryptoJS = require("crypto-js");

const SimpleCrypto = require('../lib/simpleCrypto');
var simpleCrypto = new SimpleCrypto();

// var user = encodeURIComponent(config.zte.mongoUsername);
// var password = encodeURIComponent(config.zte.mongoPassword);
var common = new Common();

var hexData = "5555005d9c672cf3f7ecbd0938363134373330333035393432313942d5aca37f0caacb7af226b2c0b7ceb253e5d67fb140794e01e323b15e9797cbcae6667e928e3eef741d3f6c24ff5918b9722ce5dcc7081cd8bb638ba5d4480aaaaa";
var encryptionKey = "54d2a1c52701598cb583c58d90f23b280fa0c5b869a95289";

// var dateTime = parseInt('564EB453', 16);
// var date = new Date(dateTime * 1000);

var currentTime = new Date();
var time = currentTime.getTime();
var timeCut = parseInt(time / 1000);
var occurTime = timeCut.toString(16);

console.log(occurTime);

// var messageLength = hexData.substring(4, 8);
// var messageLengthDec = parseInt(messageLength, 16);
// // var iv = hexData.substring(8, 24);
// var deviceId = hexData.substring(8, 38);
// var imei = common.chars_from_hex(deviceId);
// var cryptedHex = hexData.substring(38, hexData.length - 4);

// var decryptedData = simpleCrypto.des(common.chars_from_hex(encryptionKey), common.chars_from_hex(cryptedHex), 0, 0);
// var decryptedHex = common.hex_from_chars(decryptedData).replace(/(\r\n|\n|\r)/gm, "");
// var fullDecryptedMessage = hexData.substring(0, 54) + decryptedHex + "aaaa";

// var revertTest = "010393004402011102224d43555f4154494c5a45564d363230305356302e302e304230325f54313731323138174154494c5a455f564d363230305356302e302e30423032005a9ce35b71141537";
// var cici = "2c266cc650aa391b2c611f9376e060b9c8d9f9654235cfc7dacdb4fa5a9d711754be49c5766fc04525e8f8e30b680fa37884e0a02fb0d9d5dacdb4fa5a9d711788802cbf74957b1441ebc8f7f628ca90";

// var asd = simpleCrypto.des(common.chars_from_hex(encryptionKey), common.chars_from_hex(decryptedHex), 1, 0);
// var asdasd = common.hex_from_chars(asd).replace(/(\r\n|\n|\r)/gm, "");

// var encrypted = CryptoJS.TripleDES.encrypt(CryptoJS.enc.Hex.parse(decryptedHex), encryptionKey, {mode: CryptoJS.mode.ECB, padding: CryptoJS.pad.ZeroPadding});
// var ciphertext = CryptoJS.enc.Hex.stringify(encrypted.ciphertext);

// var decryptedData1 = simpleCrypto.des(common.chars_from_hex(ciphertext), common.chars_from_hex(cryptedHex), 0, 0);
// var decryptedHex1 = common.hex_from_chars(decryptedData1).replace(/(\r\n|\n|\r)/gm, "");
// var fullDecryptedMessage1 = hexData.substring(0, 54) + decryptedHex1 + "aaaa";

// console.log(ciphertext);

    // Remove frame header (4), message length (4), device id (16) and frame end (4).
    // var messageLength = hexData.substring(4, 8);
    // var messageLengthDec = parseInt(messageLength, 16);
    // var iv = hexData.substring(8, 24);
    // var deviceId = hexData.substring(24, 54);
    // var imei = common.chars_from_hex(deviceId);
    // var cryptedHex = hexData.substring(54, hexData.length - 4);

    // var decryptedData = simpleCrypto.des(common.chars_from_hex(encryptionKey), common.chars_from_hex(cryptedHex), 0, 1, common.chars_from_hex(iv));
    // this.decryptedHex = common.hex_from_chars(decryptedData).replace(/(\r\n|\n|\r)/gm, "");
    // var fullDecryptedMessage = hexData.substring(0, 54) + this.decryptedHex + config.zte.frameEnd;

    // console.log('***************************Device Data***************************');
    // console.log('imei : ' + imei);
    // console.log('deviceId : ' + deviceId);
    // console.log('Decrypted Message : ' + fullDecryptedMessage);

    // var randomNoiseHex = this.decryptedHex.substring(0, 16);
    // var frameType = this.decryptedHex.substring(16, 18);
    // var frameId = this.decryptedHex.substring(18, 22);

    // var dataLengthHex = this.decryptedHex.substring(22, 26);
    // var dataLength = parseInt(dataLengthHex, 16);
    // var endOfEffectiveData = 26 + (dataLength * 2);
    // var effectiveData = this.decryptedHex.substring(26, endOfEffectiveData);
    // var checksumHex = this.decryptedHex.substring(endOfEffectiveData, endOfEffectiveData + 8);

    // var checksum = messageLength + iv + deviceId + randomNoiseHex + frameType + frameId + dataLengthHex + effectiveData;

    // var calculatedCheckSumHex = adler32.sum(Buffer.from(checksum, "hex")).toString(16);
    // if (calculatedCheckSumHex.length == 6) {
    //     calculatedCheckSumHex = '00' + calculatedCheckSumHex;
    // } else if (calculatedCheckSumHex.length == 7) {
    //     calculatedCheckSumHex = '0' + calculatedCheckSumHex;
    // }