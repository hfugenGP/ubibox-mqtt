// const net = require('net');
// // const crypto = require('crypto');
// const Common = require('./common')
//     // const SimpleCrypto = require('./simpleCrypto')
//     // const CryptoJS = require("crypto-js");
//     // const adler32 = require('adler32');
// const ZTEDataService = require('./zteDataService')

// var zteDataService = new ZTEDataService();

// var hexData = "55550035d2d951185d06caf6383631343733303330313439363833c1615e09abd5b0b2ed0a323a7c890e5e37df07d7e7f3886baaaa";
// var cryptedHex = "c1615e09abd5b0b2ed0a323a7c890e5e37df07d7e7f3886b";
// var decryptedHex = "e9b4c665e84ce6860c0271000007470d63d5ea4bd1f47abd";

// var common = new Common();
// var dateTime = parseInt('564EB453', 16);
// var date = new Date(dateTime * 1000);

// if (zteDataService.processData(hexData, cryptedHex, decryptedHex)) {
//     var messageCallback = zteDataService.generateReply(hexData, decryptedHex);
// }

var MongoClient = require('mongodb').MongoClient,
    f = require('util').format,

    var user = encodeURIComponent('dave');
var password = encodeURIComponent('abc123');
var authMechanism = 'DEFAULT';

// Connection URL
var url = f('mongodb://%s:%s@localhost:27017/myproject?authMechanism=%s',
    user, password, authMechanism);

// Use connect method to connect to the Server
MongoClient.connect(url, function(err, db) {
    console.log("Connected correctly to server");

    db.close();
});