var net = require('net');
var crypto = require('crypto');
const Common = require('./common')
const SimpleCrypto = require('./simpleCrypto')
var CryptoJS = require("crypto-js");
var ADLER32 = require('adler-32');
var adler32 = require('adler32');

// Different per device
var SECRET_KEY = "c3d7c43a438fa2268d3e37f81ac1261ada57dfb8fa092465";

var common = new Common();
var simpleCrypto = new SimpleCrypto();
var frameType = '11';
var frameId = '0001';
var deviceId = '383631343733303330313439363833';

//Header
var frameHeader = "5555";
// End
var frameEnd = "aaaa";

var iv = CryptoJS.lib.WordArray.random(16);
// var iv = CryptoJS.lib.WordArray.create(64 / 8);
var ivText = CryptoJS.enc.Utf16.stringify(iv);
var ivHex = common.hex_from_chars(ivText); //

var randomNoise = CryptoJS.lib.WordArray.random(16);
var randomNoiseText = CryptoJS.enc.Utf16.stringify(randomNoise);
var randomNoiseHex = common.hex_from_chars(randomNoiseText);

var tobeEncrypted = randomNoiseHex;

var returnFrameType = "0d";

switch (frameType) {
    case '11':
        // Return connect with connack
        returnFrameType = "02";
        break;

    case '0c':
        // Return ping request with ping response
        returnFrameType = "0d";
        break;

    case '03':
        // Return publish request with Publish Acknowledgment
        returnFrameType = "04";
        break;
}

tobeEncrypted += returnFrameType;

tobeEncrypted += frameId;

// Data length always = 1
var dataLength = "0001";
tobeEncrypted += "0001";

var mainMessage = "01";
tobeEncrypted += "01";

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
    12 + // extra for 3des
    frameEnd.length) / 2; //4
var messageLengthHex = messageLength.toString(16);
if (messageLengthHex.length == 2) {
    messageLengthHex = "00" + messageLengthHex;
}

var checksum = messageLengthHex + ivHex + deviceId + randomNoiseHex + returnFrameType + frameId + dataLength + mainMessage;
var checksumBuffer = Buffer.from(checksum, "hex");
// var checksumValue = ADLER32.buf(checksumBuffer);
var checksumHex = adler32.sum(checksumBuffer).toString(16);
// var checksumHex1 = adler32.sum(checksumBuffer).toString(16);
if (checksumHex.length == 6) {
    checksumHex = '00' + checksumHex;
} else if (checksumHex.length == 7) {
    checksumHex = '0' + checksumHex;
}
tobeEncrypted += checksumHex;

// when the length of encrypted data is not a multiple of 8,we shall add 0xFF in the end of the encrypted data
tobeEncrypted += "ffffffffffff";

var key = CryptoJS.enc.Hex.parse(SECRET_KEY);
var ivHexParse = CryptoJS.enc.Hex.parse(ivHex);

var encrypted = CryptoJS.TripleDES.encrypt(CryptoJS.enc.Hex.parse(tobeEncrypted), key, { iv: ivHexParse });
var encryptedKey = CryptoJS.enc.Hex.stringify(encrypted.key);
var encryptedIV = CryptoJS.enc.Hex.stringify(encrypted.iv);
var ciphertext = CryptoJS.enc.Hex.stringify(encrypted.ciphertext);

ciphertext = ciphertext.substring(0, ciphertext.length - 16);

var decryptedData = simpleCrypto.des(common.chars_from_hex(SECRET_KEY), common.chars_from_hex(ciphertext), 0, 1, common.chars_from_hex(ivHex));
var decryptedHex = common.hex_from_chars(decryptedData);


var finalHex = frameHeader + messageLengthHex + ivHex + deviceId + ciphertext + frameEnd;