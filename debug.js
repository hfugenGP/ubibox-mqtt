    var net = require('net');
    var crypto = require('crypto');
    const Common = require('./common')

    var rawData = "UU U861473030068867����|f��:7K$�s�b�%|�";
    var data = {};

    var common = new Common();
    var hexData = common.hexEncode(rawData);

    console.log('************************New data received************************');
    console.log('DATA : ' + hexData);

    // Write the data back to the socket, the client will receive it as data from the server
    sock.write('Got your data successfully!!!');

    var frameHeader = hexData.substring(0, 4);
    console.log('frameHeader : ' + frameHeader);
    var messageLength = hexData.substring(4, 8);
    console.log('messageLength : ' + messageLength);
    var deviceId = hexData.substring(8, 24);
    console.log('deviceId : ' + deviceId);