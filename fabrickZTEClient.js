const net = require('net');
const Common = require('./lib/common');
const config = require('./config/conf');
const SimpleCrypto = require('./lib/simpleCrypto');
const CryptoJS = require("crypto-js");
const adler32 = require('adler32');
const ZTEDataService = require('./services/zteDataService');

// Create a server instance, and chain the listen function to it
// The function passed to net.createServer() becomes the event handler for the 'connection' event
// The sock object the callback function receives UNIQUE for each connection
net.createServer(function(sock) {

    // We have a connection - a socket object is assigned to the connection automatically
    console.log('CONNECTED: ' + sock.remoteAddress + ':' + sock.remotePort);

    // sock.setEncoding("utf8");
    sock.setNoDelay(true);

    // Add a 'data' event handler to this instance of socket
    sock.on('data', function(data) {

        // console.log('************************New data received************************');

        // var buff = Buffer.from("555538390A0F7647BA720ED377F7AAAA", "hex");

        // sock.write(buff, function(err) {
        //     if (err) {
        //         console.log('Sock write error : ' + err);
        //         console.log('*****************************************************************');
        //     }
        // });

        // console.log('Return mock data : ' + buff.toString("hex"));
        // console.log('*****************************************************************');

        var zteDataService = new ZTEDataService();

        var buff = new Buffer(data, 'utf8');
        var hexData = buff.toString('hex');
        var common = new Common();
        var simpleCrypto = new SimpleCrypto();

        // Remove frame header (4), message length (4), device id (16) and frame end (4).
        var cryptedHex = hexData.substring(54, hexData.length - 4);
        var iv = hexData.substring(8, 24);
        var decryptedData = simpleCrypto.des(common.chars_from_hex(config.zte.encryptionKey), common.chars_from_hex(cryptedHex), 0, 1, common.chars_from_hex(iv));
        var decryptedHex = common.hex_from_chars(decryptedData);

        console.log('************************New data received************************');
        console.log('Address : ' + sock.remoteAddress + ':' + sock.remotePort);
        console.log('Received : ' + new Date());
        console.log('DATA : ' + hexData);
        console.log('Crypted Data : ' + cryptedHex);
        console.log('Decrypted Data : ' + decryptedHex);

        // if (!zteDataService.processData(hexData, cryptedHex, decryptedHex)) {
        //     return;
        // }

        console.log('*****************************************************************');

        // var messageCallback = zteDataService.generateReply(hexData, decryptedHex);

        // console.log('*****************************************************************');

        // var buffer = Buffer.from(messageCallback, "hex");

        // // Write the data back to the socket, the client will receive it as data from the server
        // sock.write(buffer, function(err) {
        //     if (err) {
        //         console.log('Sock write error : ' + err);
        //         console.log('*****************************************************************');
        //     }
        // });

        // // sock.end(buffer);

        // console.log('Returned data : ' + buffer.toString("hex"));
        // console.log('************************End data received************************');
    });

    // Add a 'close' event handler to this instance of socket
    sock.on('close', function(data) {
        console.log('CLOSED: ' + sock.remoteAddress + ' ' + sock.remotePort);
    });

    sock.on('error', function(data) {
        console.log('ERROR: ' + sock.remoteAddress + ' ' + data);
    });

}).listen(config.zte.PORT, () => {
    console.log('Server listening on ' + ':' + config.zte.PORT);
});

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