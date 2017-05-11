// var rawData = "0563690261ae2c047b0468";

// // 05636e0261ae71047b04bc 39.956081, -75.171004
// // 05636f0261ae39047b0484 39.956025, -75.170948
// // 05636a0261ae40047b049b 39.956032, -75.170971
// // 05636e0261ae21047b0490 39.956001, -75.17096
// // 05636c0261ae0a047b0470 39.955978, -75.170928
// // 0563690261ae2c047b0468 39.956012, -75.17092

// var statusFlags = "00000101".split('');

// var data = {};

// var lat = parseInt('0x0261ae71');
// var lng = parseInt('0x047b04bc');

// data['positioned'] = [statusFlags[7] == '0' ? false : true];
// var latType = -1;
// if (statusFlags[6] == '0') {
//     latType = 1;
// }

// var lngType = -1;
// if (statusFlags[5] == '0') {
//     lngType = 1;
// }

// var latitude = parseInt('0x' + rawData.substring(6, 14)) * latType / 1000000; //297174138 
// var longitude = parseInt('0x' + rawData.substring(14, 22)) * lngType / 1000000; //41234214
// data['latlng'] = latitude + ',' + longitude;


var net = require('net');
var crypto = require('crypto');
const Common = require('./common');
const SimpleCrypto = require('./simpleCrypto');

// var hexData = "5b6efb5570e19b1ad56b4ab607306625e77f0a72871ceb0ac34bbcdadf0a083106e9f3036f2345f1e002248d7e500d6f667436fcaec0d091cbf82f6f9b0d33b8577a0dc94e641e5c";

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

// 3|socketsL | frameHeader : 5555
// 3|socketsL | messageLength : 0035
// 3|socketsL | iv : 43b08a87a4d08c05
// 3|socketsL | deviceId : 383631343733303330313437393335
// 3|socketsL | frameEnd : aaaa
// 3|socketsL | cryptedText : 91eb101e6c81b188a15eb1c4741cc594ccb34d48f0c6f86b
// 3|socketsL | Decrypted Data : ��@�âï>ð!dìÍ�|x�PQ��Cü|


var common = new Common();
var simpleCrypto = new SimpleCrypto();

// Waiting for ZZTE key
var SECRET_KEY = common.chars_from_hex("c3d7c43a438fa2268d3e37f81ac1261ada57dfb8fa092465");

var cryptedText = common.chars_from_hex("3ce153356246956e033850185d30334440b47ac897a8a939cdee1b2b99693bab92743855641989c7d11afdf6837efc00557d7606662b7abfb33888872f9225a5");
var ivText = common.chars_from_hex("34d8437a14a911f1");

var simpleDecryptedData = simpleCrypto.des(SECRET_KEY, cryptedText, 0, 1, ivText);
var hexEncode = common.hex_from_chars(simpleDecryptedData);

var hexText = "3ce153356246956e033850185d30334440b47ac897a8a939cdee1b2b99693bab92743855641989c7d11afdf6837efc00557d7606662b7abfb33888872f9225a5";

var buffKey = new Buffer("c3d7c43a438fa2268d3e37f81ac1261ada57dfb8fa092465", 'hex');
var buffIV = new Buffer("34d8437a14a911f1", 'hex');
var decipher = crypto.createCipheriv('des-ede3-cbc', buffKey, buffIV);
var decryptedData = decipher.update(hexText, 'hex', 'hex');
decryptedData += decipher.final('hex');


console.log('Decrypted Data : ' + decryptedData);