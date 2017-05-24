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

        var buff = new Buffer(data, 'utf8');
        var hexData = buff.toString('hex');
        var common = new Common();
        var simpleCrypto = new SimpleCrypto();

        console.log('************************New data received************************');
        console.log('Address : ' + sock.remoteAddress + ':' + sock.remotePort);
        console.log('Received : ' + new Date());
        console.log('DATA : ' + hexData);

        var common = new Common();
        var simpleCrypto = new SimpleCrypto();

        var frameHeader = hexData.substring(0, 4);
        var messageLength = hexData.substring(4, 8);
        var iv = hexData.substring(8, 24);
        var deviceId = hexData.substring(24, 54);
        var frameEnd = hexData.substring(hexData.length - 4, hexData.length);

        // Remove frame header (4), message length (4), device id (16) and frame end (4).
        var cryptedHex = hexData.substring(54, hexData.length - 4);

        var decryptedData = simpleCrypto.des(common.chars_from_hex(SECRET_KEY), common.chars_from_hex(cryptedHex), 0, 1, common.chars_from_hex(iv));
        var decryptedHex = common.hex_from_chars(decryptedData);

        // console.log('frameHeader : ' + frameHeader);
        console.log('messageLength : ' + messageLength);
        console.log('iv : ' + iv);
        console.log('deviceId : ' + deviceId);
        // console.log('frameEnd : ' + frameEnd);
        console.log('Crypted Hex : ' + cryptedHex);
        console.log('Decrypted Hex : ' + decryptedHex);
        console.log('Decrypted Data : ' + decryptedData);

        // console.log('*****************************************************************');

        var messageCallback = generateReply(deviceId, decryptedHex);

        // console.log('*****************************************************************');

        var buffer = Buffer.from(messageCallback, "hex");

        // Write the data back to the socket, the client will receive it as data from the server
        sock.write(buffer, function(err) {
            if (err) {
                console.log('Sock write error : ' + err);
                console.log('*****************************************************************');
            }
        });

        // sock.end(messageCallback);

        console.log('Return data : ' + buffer.toString("hex"));
        // console.log('Return datasize : ' + dataSize);
        // console.log('Return buffer : ' + buffer);

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
    var frameHeader = "5555";
    // End
    var frameEnd = "aaaa";

    var iv = CryptoJS.lib.WordArray.random(16);
    // var iv = CryptoJS.lib.WordArray.create(64 / 8);
    var ivText = CryptoJS.enc.Utf16.stringify(iv);
    var ivHex = common.hex_from_chars(ivText); //

    var randomNoise = CryptoJS.lib.WordArray.random(16);
    var randomNoiseText = CryptoJS.enc.Utf16.stringify(randomNoise);
    var randomNoiseHex = common.hex_from_chars(randomNoiseText);

    var tobeEncrypted = randomNoiseHex;
    // Message Connack
    var frameType = "02";
    tobeEncrypted += "02";

    //Gonna replace with device frame number
    var frameID = decryptedHex.substring(18, 22);
    tobeEncrypted += decryptedHex.substring(18, 22);

    // Data length always = 1
    var dataLength = "0001";
    tobeEncrypted += "0001";

    // Data length always = 1
    var mainMessage = "01";
    tobeEncrypted += "01";

    var messageLength = (frameHeader.length + 4 + ivHex.length + deviceId.length + tobeEncrypted.length + 8 + frameEnd.length) / 2;
    var messageLengthHex = messageLength.toString(16);
    if (messageLengthHex.length == 2) {
        messageLengthHex = "00" + messageLengthHex;
    }

    var checksum = messageLengthHex + ivHex + deviceId + randomNoiseHex + frameType + frameID + dataLength + mainMessage;
    var checksumBuffer = Buffer.from(checksum, "hex");
    var checksumValue = ADLER32.buf(checksumBuffer);
    var checksumHex = checksumValue.toString(16);
    tobeEncrypted += checksumHex;

    // when the length of encrypted data is not a multiple of 8,we shall add 0xFF in the end of the encrypted data
    tobeEncrypted += "ffffffffffff";

    var key = CryptoJS.enc.Hex.parse(SECRET_KEY);
    var ivHexParse = CryptoJS.enc.Hex.parse(ivHex);

    var encrypted = CryptoJS.TripleDES.encrypt(CryptoJS.enc.Hex.parse(tobeEncrypted), key, { iv: ivHexParse });
    var encryptedKey = CryptoJS.enc.Hex.stringify(encrypted.key);
    var encryptedIV = CryptoJS.enc.Hex.stringify(encrypted.iv);
    var ciphertext = CryptoJS.enc.Hex.stringify(encrypted.ciphertext);

    ciphertext = ciphertext.substring(0, ciphertext.length - 16);

    console.log('randomNoiseHex : ' + randomNoiseHex);
    // console.log('frameType : ' + frameType);
    console.log('frameID : ' + frameID);
    // console.log('dataLength : ' + dataLength);
    console.log('checksumHex : ' + checksumHex);
    console.log('tobeEncrypted : ' + tobeEncrypted);
    console.log('ciphertext : ' + ciphertext);
    // console.log('message : ' + mainMessage);
    console.log('messageLengthHex : ' + messageLengthHex);

    var finalHex = frameHeader + messageLengthHex + ivHex + deviceId + ciphertext + frameEnd;

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