// const net = require('net');
// // const crypto = require('crypto');
const Common = require('../lib/common')
    //     // const SimpleCrypto = require('./simpleCrypto')
    //     // const CryptoJS = require("crypto-js");
    //     // const adler32 = require('adler32');
    // const ZTEDataService = require('./zteDataService')

// var zteDataService = new ZTEDataService();

// var hexData = "55550035d2d951185d06caf6383631343733303330313439363833c1615e09abd5b0b2ed0a323a7c890e5e37df07d7e7f3886baaaa";
// var cryptedHex = "c1615e09abd5b0b2ed0a323a7c890e5e37df07d7e7f3886b";
// var decryptedHex = "e9b4c665e84ce6860c0271000007470d63d5ea4bd1f47abd";

var common = new Common();
// var dateTime = parseInt('564EB453', 16);
// var date = new Date(dateTime * 1000);

// if (zteDataService.processData(hexData, cryptedHex, decryptedHex)) {
//     var messageCallback = zteDataService.generateReply(hexData, decryptedHex);
// }

var http = require('http');
// var client = http.createClient(3000, 'localhost');
// var request = client.request('PUT', '/users/1');
// request.write("stuff");
// request.end();
// request.on("response", function (response) {
//   // handle the response
// });

var options = {
    protocol: "http:",
    host: "fabrick.atilze.com",
    port: 80,
    path: '/api/login',
    method: 'POST',
    headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json'
    },
    body: {
        "email": "masteradmin@brazn.co",
        "password": "secret"
    }
};

http.request(options, function(res) {
    console.log('STATUS: ' + res.statusCode);
    console.log('HEADERS: ' + JSON.stringify(res.headers));
    res.setEncoding('utf8');
    res.on('data', function(chunk) {
        console.log('BODY: ' + chunk);
    });
}).end();

var request = require('request')

var options = {
    method: 'post',
    body: {
        "email": "masteradmin@brazn.co",
        "password": "secret"
    },
    json: true, // Use,If you are sending JSON data
    url: "http://fabrick.atilze.com/api/login",
    headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json'
    },
}

request(options, function(err, res, body) {
    if (err) {
        console.log('Error :', err)
        return
    }
    console.log(' Body :', body)

});