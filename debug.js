var net = require('net');
var crypto = require('crypto');
const Common = require('./common');
const SimpleCrypto = require('./simpleCrypto');
var CryptoJS = require("crypto-js");
var ADLER32 = require('adler-32');

// Different per device
var SECRET_KEY = "c3d7c43a438fa2268d3e37f81ac1261ada57dfb8fa092465";

// DATA : 5555005d34d8437a14a911f13836313437333033303134393638333ce153356246956e033850185d30334440b47ac897a8a939cdee1b2b99693bab92743855641989c7d11afdf6837efc00557d7606662b7abfb33888872f9225a5aaaa
// frameHeader : 5555
// messageLength : 005d
// iv : 34d8437a14a911f1
// deviceId : 383631343733303330313439363833
// frameEnd : aaaa
// cryptedText : 3ce153356246956e033850185d30334440b47ac897a8a939cdee1b2b99693bab92743855641989c7d11afdf6837efc00557d7606662b7abfb33888872f9225a5

// 55    d2    a8    d2    32    a7    45    11    11    00    1c    00    2f    11    c2    11
// 01    16    4d    43    55    5f    47    45    56    4d    36    32    30    30    53    56
// 30    2e    30    2e    30    42    30    33    13    47    45    5f    56    4d    36    32
// 30    30    53    56    30    2e    30    2e    30    42    30    32    03    6e    16    33

// 55d2a8d232a7451111001c002f11c21101164d43555f4745564d363230305356
// 302e302e304230331347455f564d363230305356302e302e30423032036e1633

// Response Package for Connack (Unencrypted):
// 55 55 -> Frame Header
// 00 00 00 00 00 00 00 00 -> Initialization Vector (Random)
// 00 00 -> Message Length (not calculated yet)
// 38 36 31 34 37 33 30 33 30 31 34 39 36 38 33 -> Device ID
// 55  d2  a8  d2  32  a7  45  11  -> Random Noise
// 02 -> Message Connack
// 00  1c -> Frame ID (Use the same message ID that you are replying to)
// 00  01  -> Data Length (only 1 because it is just acknowledgement message)
// 01 -> Allow Session Message
// 03  6e  16  33 - Checksum (not calculated yet)
// aa  aa -> Frame End

var common = new Common();
var simpleCrypto = new SimpleCrypto();

//Header
var frameHeader = "5555"; //
var deviceId = "383631343733303330313439363833"; //

var iv = CryptoJS.lib.WordArray.random(16);
var ivText = CryptoJS.enc.Utf16.stringify(iv);
var ivHex = common.hex_from_chars(ivText); //
var checksum = ivHex;

var randomNoise = CryptoJS.lib.WordArray.random(16);
var randomNoiseText = CryptoJS.enc.Utf16.stringify(randomNoise);
var randomNoiseHex = common.hex_from_chars(randomNoiseText);
var tobeEncrypted = randomNoiseHex;
// Message Connack
var messageType = "02";
tobeEncrypted += "02";
checksum += "02";

//Gonna replace with device frame number
var frameID = "001c";
tobeEncrypted += "001c";
checksum += "001c";

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

var key = CryptoJS.enc.Hex.parse(SECRET_KEY);
var ivHexParse = CryptoJS.enc.Hex.parse(ivHex);

var encrypted = CryptoJS.TripleDES.encrypt(CryptoJS.enc.Hex.parse(tobeEncrypted), key, { iv: ivHexParse });
var encryptedKey = CryptoJS.enc.Hex.stringify(encrypted.key);
var encryptedIV = CryptoJS.enc.Hex.stringify(encrypted.iv);
var ciphertext = CryptoJS.enc.Hex.stringify(encrypted.ciphertext);

var ciphertextTrim = ciphertext.substring(0, ciphertext.length - 12)

var decrypted = CryptoJS.TripleDES.decrypt(CryptoJS.enc.Hex.parse(ciphertextTrim), SECRET_KEY, { iv: ivHex });
var decryptedtext = decrypted.toString();


// End
var frameEnd = "aaaa";

var messageLength = frameHeader.length + ivHex.length + 4 + deviceId.length + ciphertext.length + frameEnd.length;
var messageLengthHex = messageLength.toString(16);

if (messageLengthHex.length == 2) {
    messageLengthHex = "00" + messageLengthHex;
}

var finalHex = frameHeader + ivHex + messageLengthHex + deviceId + ciphertext + frameEnd;
// var final = CryptoJS.enc.Hex.stringify(finalHex);

var simpleDecryptedData = simpleCrypto.des(common.chars_from_hex(SECRET_KEY), common.chars_from_hex(ciphertextTrim), 0, 1, common.chars_from_hex(ivHex));
var hexEncode = common.hex_from_chars(simpleDecryptedData);
var newText = common.chars_from_hex(hexEncode.substring(hexEncode.length - 12));

// var hexText = "3ce153356246956e033850185d30334440b47ac897a8a939cdee1b2b99693bab92743855641989c7d11afdf6837efc00557d7606662b7abfb33888872f9225a5";

// var buffKey = new Buffer("c3d7c43a438fa2268d3e37f81ac1261ada57dfb8fa092465", 'hex');
// var buffIV = new Buffer("34d8437a14a911f1", 'hex');
// var decipher = crypto.createCipheriv('des-ede3-cbc', buffKey, buffIV);
// var decryptedData = decipher.update(hexText, 'hex', 'hex');
// decryptedData += decipher.final('hex');
console.log('Decrypted Data : ' + hexEncode);