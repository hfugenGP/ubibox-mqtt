var net = require('net');
// var crypto = require('crypto');
const Common = require('./common');
const Crypto = require('./simpleCrypto');

// var hexData = "5b6efb5570e19b1ad56b4ab607306625e77f0a72871ceb0ac34bbcdadf0a083106e9f3036f2345f1e002248d7e500d6f667436fcaec0d091cbf82f6f9b0d33b8577a0dc94e641e5c";

// DATA : 5555005de0f5a909fff353cd3836313437333033303134393638330824b9ee9d15bc7bca7965cfcb22bd304f70bb54d01d3c0c4c83def901f71e57bfedfa189e22c2e96f27438a511a76d9f69eab1af670e44414509a4c467cd20eaaaa
// frameHeader : 5555
// messageLength : 005d
// iv : e0f5a909fff353cd
// deviceId : 383631343733303330313439363833
// frameEnd : aaaa
// cryptedText : 0824b9ee9d15bc7bca7965cfcb22bd304f70bb54d01d3c0c4c83def901f71e57bfedfa189e22c2e96f27438a511a76d9f69eab1af670e44414509a4c467cd20e
// Decrypted Data : 5b6efb5570e19b1ad56b4ab607306625e77f0a72871ceb0ac34bbcdadf0a083106e9f3036f2345f1e002248d7e500d6f667436fcaec0d091cbf82f6f9b0d33b8577a0dc94e641e5c

// 3|socketsL | frameHeader : 5555
// 3|socketsL | messageLength : 0035
// 3|socketsL | iv : e514928f4400c7b0
// 3|socketsL | deviceId : 383631343733303330313437393335
// 3|socketsL | frameEnd : aaaa
// 3|socketsL | cryptedText : 94d151365f2b3261490b7b323d781e50e9a7d3b4c97de441

var common = new Common();
var crypto = new Crypto();

// Waiting for ZZTE key
var SECRET_KEY = common.chars_from_hex("c3d7c43a438fa2268d3e37f81ac1261ada57dfb8fa092465");

var cryptedText = common.chars_from_hex("0824b9ee9d15bc7bca7965cfcb22bd304f70bb54d01d3c0c4c83def901f71e57bfedfa189e22c2e96f27438a511a76d9f69eab1af670e44414509a4c467cd20e");
var ivText = common.chars_from_hex("e0f5a909fff353cd");

var decryptedData = crypto.des(SECRET_KEY, cryptedText, 0, 1, ivText);
var hexEncode = common.hexEncode(decryptedData);

console.log('Decrypted Data : ' + decryptedData);