var net = require('net');
var crypto = require('crypto');
const Common = require('./common')

// var HOST = '127.0.0.1';
var PORT = 8884;

// Create a server instance, and chain the listen function to it
// The function passed to net.createServer() becomes the event handler for the 'connection' event
// The sock object the callback function receives UNIQUE for each connection
net.createServer(function(sock) {

    // We have a connection - a socket object is assigned to the connection automatically
    console.log('CONNECTED: ' + sock.remoteAddress + ':' + sock.remotePort);

    // Add a 'data' event handler to this instance of socket
    sock.on('data', function(data) {

        var common = new Common();
        var hexData = common.hexEncode(data);

        console.log('************************New data received************************');
        console.log('Address : ' + sock.remoteAddress);
        console.log('Received : ' + new Date());
        console.log('DATA : ' + hexData);

        // Write the data back to the socket, the client will receive it as data from the server
        sock.write('Got your data successfully!!!');

        var frameHeader = hexData.substring(0, 4);
        console.log('frameHeader : ' + frameHeader);
        var messageLength = hexData.substring(4, 8);
        console.log('messageLength : ' + messageLength);
        var deviceId = hexData.substring(8, 24);
        console.log('deviceId : ' + deviceId);
        // var frameEnd = hexData.substring(hexData.length - 4, hexData.length);

        // var header = data.substring(0, 10);
        // console.log('Header : ' + header);
        // var deviceId = data.substring(10, 25);
        // console.log('Device Id : ' + deviceId);
        // var mainData = data.substring(25, data.length);
        // console.log('Main Data : ' + mainData);

        // Waiting for ZZTE key
        var SECRET_KEY = "c3d7c43a438fa2268d3e37f81ac1261ada57dfb8fa092465";

        // Waiting for ZZTE encode
        var ENCODING = 'hex';

        // Remove frame header (4), message length (4), device id (16) and frame end (4).
        var cryptedText = hexData.substring(24, hexData.length - 4);

        var decipher = crypto.createDecipher('des-ede3-cbc', SECRET_KEY);
        var decryptedData = decipher.update(cryptedText, ENCODING, 'utf8');
        decryptedData += decipher.final('utf8');

        console.log('Decrypted Data : ' + decryptedData);

        // var cipher = crypto.createCipher('des-ede3-cbc', SECRET_KEY)
        // var cryptedPassword = cipher.update(text, 'utf8', ENCODING)
        // cryptedPassword += cipher.final(ENCODING)
        console.log('*****************************************************************');
    });

    // Add a 'close' event handler to this instance of socket
    sock.on('close', function(data) {
        console.log('CLOSED: ' + sock.remoteAddress + ' ' + sock.remotePort);
    });

    sock.on('error', function(data) {
        console.log('ERROR: ' + sock.remoteAddress + ' ' + data);
    });

}).listen(PORT, () => {
    console.log('Server listening on ' + ':' + PORT);
});