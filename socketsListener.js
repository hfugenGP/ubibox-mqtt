var net = require('net');
var crypto = require('crypto');
const Common = require('./common')
const SimpleCrypto = require('./simpleCrypto')
var CryptoJS = require("crypto-js");
var adler32 = require('adler32');

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

        // var frameHeader = hexData.substring(0, 4);
        var messageLength = hexData.substring(4, 8);
        var iv = hexData.substring(8, 24);
        var deviceId = hexData.substring(24, 54);
        // var frameEnd = hexData.substring(hexData.length - 4, hexData.length);

        // Remove frame header (4), message length (4), device id (16) and frame end (4).
        var cryptedHex = hexData.substring(54, hexData.length - 4);

        var decryptedData = simpleCrypto.des(common.chars_from_hex(SECRET_KEY), common.chars_from_hex(cryptedHex), 0, 1, common.chars_from_hex(iv));
        var decryptedHex = common.hex_from_chars(decryptedData);

        var frameType = decryptedHex.substring(16, 18);
        var frameId = decryptedHex.substring(18, 22);

        console.log('Crypted Hex : ' + cryptedHex);
        console.log('Decrypted Hex : ' + decryptedHex);
        console.log('Decrypted Data : ' + decryptedData);
        console.log('messageLength : ' + messageLength);
        console.log('iv : ' + iv);
        console.log('deviceId : ' + deviceId);
        console.log('frameType : ' + frameType);
        console.log('frameId : ' + frameId);

        console.log('*****************************************************************');

        var messageCallback = generateReply(deviceId, frameType, frameId, decryptedHex);

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

function generateReply(deviceId, frameType, frameId, decryptedHex) {
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

    // Data length always = 1
    var dataLength = "0001";

    var mainMessage = "01";


    var returnFrameType = "0d";

    switch (frameType) {
        case '11':
            // Return connect with connack
            returnFrameType = "02";
            break;

        case '0c':
            // Return ping request with ping response
            returnFrameType = "0d";
            dataLength = "0000";
            mainMessage = "";
            break;

        case '03':
            // Return publish request with Publish Acknowledgment
            returnFrameType = "04";
            break;
    }

    tobeEncrypted += returnFrameType;

    tobeEncrypted += dataLength;

    tobeEncrypted += mainMessage;

    tobeEncrypted += frameId;

    // (4 + 4 + 16 + 30 + 8 + 4 + 2 + 4 + 2 + 2 + 16) / 2
    var messageLength = (frameHeader.length + //4
        4 + //message length itself
        ivHex.length + //16
        deviceId.length + //30
        randomNoiseHex.length + //16
        returnFrameType.length + //2
        frameId.length + //4
        dataLength.length + //4
        mainMessage.length + //2
        8 + //checksum
        frameEnd.length) / 2; //4

    // extra for 3des
    if (dataLength == "0001") {
        messageLength += 12;
    } else if (dataLength == "0000") {
        messageLength += 13;
    }

    var messageLengthHex = messageLength.toString(16);
    if (messageLengthHex.length == 2) {
        messageLengthHex = "00" + messageLengthHex;
    }

    var checksum = messageLengthHex + ivHex + deviceId + randomNoiseHex + returnFrameType + frameId + dataLength + mainMessage;
    var checksumBuffer = Buffer.from(checksum, "hex");
    // var checksumValue = ADLER32.buf(checksumBuffer);
    // var checksumHex = checksumValue.toString(16);
    var checksumHex = adler32.sum(checksumBuffer).toString(16);
    if (checksumHex.length == 6) {
        checksumHex = '00' + checksumHex;
    } else if (checksumHex.length == 7) {
        checksumHex = '0' + checksumHex;
    }
    tobeEncrypted += checksumHex;

    // when the length of encrypted data is not a multiple of 8,we shall add 0xFF in the end of the encrypted data
    if (dataLength == "0001") {
        tobeEncrypted += "ffffffffffff";
    } else if (dataLength == "0000") {
        tobeEncrypted += "ffffffffffffff";
    }

    var key = CryptoJS.enc.Hex.parse(SECRET_KEY);
    var ivHexParse = CryptoJS.enc.Hex.parse(ivHex);

    var encrypted = CryptoJS.TripleDES.encrypt(CryptoJS.enc.Hex.parse(tobeEncrypted), key, { iv: ivHexParse });
    var encryptedKey = CryptoJS.enc.Hex.stringify(encrypted.key);
    var encryptedIV = CryptoJS.enc.Hex.stringify(encrypted.iv);
    var ciphertext = CryptoJS.enc.Hex.stringify(encrypted.ciphertext);

    ciphertext = ciphertext.substring(0, ciphertext.length - 16);

    console.log('frameHeader : ' + frameHeader);
    console.log('messageLengthHex : ' + messageLengthHex);
    console.log('ivHex : ' + ivHex);
    console.log('deviceId : ' + deviceId);
    console.log('randomNoiseHex : ' + randomNoiseHex);
    console.log('returnFrameType : ' + returnFrameType);
    console.log('frameID : ' + frameId);
    console.log('dataLength : ' + dataLength);
    console.log('message : ' + mainMessage);
    console.log('checksumHex : ' + checksumHex);
    console.log('frameEnd : ' + frameEnd);

    console.log('tobeEncrypted : ' + tobeEncrypted);
    console.log('ciphertext : ' + ciphertext);

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