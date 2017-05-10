var net = require('net');
var crypto = require('crypto');
const Common = require('./common')
const SimpleCrypto = require('./simpleCrypto')

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

        var buff = new Buffer(data, 'utf8');
        var hexData = buff.toString('hex');
        var common = new Common();
        var simpleCrypto = new SimpleCrypto();

        //no sure about this
        // console.log('data received: ' + buff.toString(hex));

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
        var iv = hexData.substring(8, 24);
        console.log('iv : ' + iv);
        var deviceId = hexData.substring(24, 54);
        console.log('deviceId : ' + deviceId);
        var frameEnd = hexData.substring(hexData.length - 4, hexData.length);
        console.log('frameEnd : ' + frameEnd);

        // Waiting for ZZTE key
        var SECRET_KEY = common.chars_from_hex("c3d7c43a438fa2268d3e37f81ac1261ada57dfb8fa092465");

        // Remove frame header (4), message length (4), device id (16) and frame end (4).
        var cryptedHex = hexData.substring(54, hexData.length - 4);
        console.log('cryptedText : ' + cryptedHex);

        var cryptedText = common.chars_from_hex(cryptedHex);
        var ivText = common.chars_from_hex(iv);

        var decryptedData = simpleCrypto.des(SECRET_KEY, cryptedText, 0, 1, ivText);

        // var buffKey = new Buffer(SECRET_KEY, 'hex');
        // var buffIV = new Buffer(iv, 'hex');
        // var decipher = crypto.createCipheriv('des-ede3-cbc', buffKey, buffIV);
        // var decryptedData = decipher.update(cryptedText, ENCODING, 'hex');
        // decryptedData += decipher.final('hex');

        console.log('Decrypted Data : ' + decryptedData);
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