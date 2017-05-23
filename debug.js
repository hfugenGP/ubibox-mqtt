var net = require('net');
var crypto = require('crypto');
const Common = require('./common')
const SimpleCrypto = require('./simpleCrypto')
var CryptoJS = require("crypto-js");
var ADLER32 = require('adler-32');

// Different per device
var SECRET_KEY = "c3d7c43a438fa2268d3e37f81ac1261ada57dfb8fa092465";

var common = new Common();
//Header
var frameHeader = "5555"; //
var deviceId = "383634383637303232353131303135";

var iv = CryptoJS.lib.WordArray.random(16);
// var iv = CryptoJS.lib.WordArray.create(64 / 8);
var ivText = CryptoJS.enc.Utf16.stringify(iv);
var ivHex = common.hex_from_chars(ivText); //
var checksum = ivHex;

var randomNoise = CryptoJS.lib.WordArray.random(16);
var randomNoiseText = CryptoJS.enc.Utf16.stringify(randomNoise);
var randomNoiseHex = common.hex_from_chars(randomNoiseText);

var tobeEncrypted = randomNoiseHex;
// Message Connack
var frameType = "02";
tobeEncrypted += "02";

//Gonna replace with device frame number
var frameID = "006a";
tobeEncrypted += "006a";
checksum += "006a";

// Data length always = 1
var dataLength = "0001";
tobeEncrypted += "0001";
checksum += "0001";

// Data length always = 1
var mainMessage = "01";
tobeEncrypted += "01";
checksum += "01";

var checksumValue = ADLER32.str(checksum);
var checksumHex = checksumValue.toString(16);
tobeEncrypted += checksumHex;

// when the length of encrypted data is not a multiple of 8,we shall add 0xFF in the end of the encrypted data
// tobeEncrypted += "ffffffffffff";

var key = CryptoJS.enc.Hex.parse(SECRET_KEY);
var ivHexParse = CryptoJS.enc.Hex.parse(ivHex);

var encrypted = CryptoJS.TripleDES.encrypt(CryptoJS.enc.Hex.parse(tobeEncrypted), key, { iv: ivHexParse });
var encryptedKey = CryptoJS.enc.Hex.stringify(encrypted.key);
var encryptedIV = CryptoJS.enc.Hex.stringify(encrypted.iv);
var ciphertext = CryptoJS.enc.Hex.stringify(encrypted.ciphertext);

// End
var frameEnd = "aaaa";

var messageLength = frameHeader.length + 4 + ivHex.length + deviceId.length + ciphertext.length + frameEnd.length;
var messageLengthHex = messageLength.toString(16);

if (messageLengthHex.length == 2) {
    messageLengthHex = "00" + messageLengthHex;
}

// console.log('randomNoiseHex : ' + randomNoiseHex);
// console.log('frameType : ' + frameType);
// console.log('frameID : ' + frameID);
// console.log('dataLength : ' + dataLength);
// console.log('tobeEncrypted : ' + tobeEncrypted);
// console.log('ciphertext : ' + ciphertext);
// console.log('message : ' + mainMessage);
// console.log('messageLengthHex : ' + messageLengthHex);

var finalHex = frameHeader + messageLengthHex + ivHex + deviceId + ciphertext + frameEnd;