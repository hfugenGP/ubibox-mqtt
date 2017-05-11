var net = require('net');

var HOST = '52.163.116.94';
var PORT = 8884;

var client = new net.Socket();
client.connect(PORT, HOST, function() {

    console.log('CONNECTED TO: ' + HOST + ':' + PORT);
    // Write a message to the socket as soon as the client is connected, the server will receive it as message from the client 
    client.write("55550035d674d8c21a03e8193836313437333033303134393638337a18b6896b42483d61c9de90ac195bf3a1822df2cc09d59daaaa");

});

// Add a 'data' event handler for the client socket
// data is what the server sent to this socket
client.on('data', function(data) {

    var buff = new Buffer(data, 'utf8');
    var hexData = buff.toString('hex');

    console.log('DATA: ' + hexData);
    // Close the client socket completely
    client.destroy();

});

// Add a 'close' event handler for the client socket
client.on('close', function() {
    console.log('Connection closed');
});