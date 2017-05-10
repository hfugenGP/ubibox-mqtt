var net = require('net');

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

        console.log('************************New data received************************');
        console.log('Address : ' + sock.remoteAddress);
        console.log('Received : ' + new Date());
        console.log('DATA : ' + data);
        console.log('*****************************************************************');
        // Write the data back to the socket, the client will receive it as data from the server
        sock.write('Got your data successfully!!!');

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