var net = require('net');
var crypto = require('crypto');
const Common = require('./common')
const SimpleCrypto = require('./simpleCrypto')
var CryptoJS = require("crypto-js");
var ADLER32 = require('adler-32');

// var HOST = '127.0.0.1';
var PORT = 8884;

// Different per device
var SECRET_KEY = "c3d7c43a438fa2268d3e37f81ac1261ada57dfb8fa092465";

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
        console.log('Address : ' + sock.remoteAddress + ':' + sock.remotePort);
        console.log('Received : ' + new Date());
        console.log('DATA : ' + hexData);

        var common = new Common();
        var simpleCrypto = new SimpleCrypto();

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

        // Remove frame header (4), message length (4), device id (16) and frame end (4).
        var cryptedHex = hexData.substring(54, hexData.length - 4);
        console.log('Crypted Text : ' + cryptedHex);

        var decryptedData = simpleCrypto.des(common.chars_from_hex(SECRET_KEY), common.chars_from_hex(cryptedHex), 0, 1, common.chars_from_hex(iv));
        var decryptedHex = common.hex_from_chars(decryptedData);
        var decryptedData = common.chars_from_hex(decryptedHex.substring(12, decryptedHex.length - 12));

        console.log('Decrypted Hex : ' + decryptedHex);
        console.log('Decrypted Data : ' + decryptedData);


        console.log('*****************************************************************');

        var messageCallback = generateReply(deviceId, decryptedHex) + "\r\n";

        var dataSize = Buffer.byteLength(messageCallback);
        var buffer = new Buffer(dataSize);

        // store string starting at index 1;
        buffer.write(messageCallback);

        // Write the data back to the socket, the client will receive it as data from the server
        sock.write(buffer, function(err) {
            if (err) {
                console.log('Sock write error : ' + err);
                console.log('*****************************************************************');
            }
        });
        console.log('Return data : ' + messageCallback);
        console.log('Return datasize : ' + dataSize);
        console.log('Return buffer : ' + buffer);

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

function generateReply(deviceId, decryptedHex) {
    var common = new Common();
    //Header
    var frameHeader = "5555"; //

    var iv = CryptoJS.lib.WordArray.random(16);
    // var iv = CryptoJS.lib.WordArray.create(64 / 8);
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
    var frameID = decryptedHex.substring(18, 22);
    tobeEncrypted += decryptedHex.substring(18, 22);
    checksum += decryptedHex.substring(18, 22);

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

    // End
    var frameEnd = "aaaa";

    var messageLength = frameHeader.length + ivHex.length + 4 + deviceId.length + ciphertext.length + frameEnd.length;
    var messageLengthHex = messageLength.toString(16);

    if (messageLengthHex.length == 2) {
        messageLengthHex = "00" + messageLengthHex;
    }

    var finalHex = frameHeader + ivHex + messageLengthHex + deviceId + ciphertext + frameEnd;

    return finalHex;
}

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

function decryptData(hexData) {
    var common = new Common();
    var simpleCrypto = new SimpleCrypto();

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

    // Remove frame header (4), message length (4), device id (16) and frame end (4).
    var cryptedHex = hexData.substring(54, hexData.length - 4);
    console.log('Crypted Text : ' + cryptedHex);

    var decryptedData = simpleCrypto.des(common.chars_from_hex(SECRET_KEY), common.chars_from_hex(cryptedHex), 0, 1, common.chars_from_hex(iv));
    var decryptedHex = common.hex_from_chars(decryptedData);

    console.log('Decrypted Hex : ' + decryptedHex);
    console.log('Decrypted Data : ' + decryptedData);
}