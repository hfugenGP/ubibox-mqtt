var net = require('net');
var crypto = require('crypto');
const Common = require('./common')

var hexData = "55550035f2ff17bcce9204cd3836313437333033303134393638336b6142ff38ce8a8021877f32c47c3868af9dbbae4d52d0f2aaaa";

// "5555 0035 f2ff17bcce9204cd 383631343733303330313439363833 6b6142ff38ce8a8021877f32c47c3868af9dbbae4d52d0f2 aaaa"
// "5555 0035 c9c772972718becd 383631343733303330313439363833 379da793a37bcc0d88eb6af86129e6a9a0fa3e5b28ee95b6 aaaa"


var frameHeader = hexData.substring(0, 4);
console.log('frameHeader : ' + frameHeader);
var messageLength = hexData.substring(4, 8);
console.log('messageLength : ' + messageLength);
var iv = hexData.substring(8, 24);
console.log('iv : ' + iv);
var deviceId = hexData.substring(24, 54);
console.log('deviceId : ' + deviceId);
var frameEnd = hexData.substring(hexData.length - 4, hexData.length);
console.log('frameEnd : ' + frameEnd);

// Waiting for ZZTE key
var SECRET_KEY = "c3d7c43a438fa2268d3e37f81ac1261ada57dfb8fa092465";

// Waiting for ZZTE encode
var ENCODING = 'hex';

// Remove frame header (4), message length (4), device id (16) and frame end (4).
var cryptedText = hexData.substring(54, hexData.length - 4);
console.log('cryptedText : ' + cryptedText);

var buffKey = new Buffer(SECRET_KEY, 'hex');
var buffIV = new Buffer(iv, 'hex');
var decipher = crypto.createCipheriv('des-ede3-cbc', SECRET_KEY, iv);
var decryptedData = decipher.update(cryptedText, ENCODING, 'hex');
decryptedData += decipher.final('hex');

console.log('Decrypted Data : ' + decryptedData);