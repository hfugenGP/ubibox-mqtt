var net = require('net');
var _ = require('lodash');
var HOST = '13.75.120.211';
var PORT = 8884;

function testPerformance(existedClient, count){
    if(!existedClient){
        console.log('NEW CLIENT CREATED!!!!');
        var client = new net.Socket();
        client.connect(PORT, HOST, function() {

            console.log('CONNECTED TO: ' + HOST + ':' + PORT);
            var data = "5555004d8b86d3cb004f9407383631343733303330303131383637b836c7d76e906f34a8e54caae10a55ca66be6378bc3a637be9865cb68bea702978165b9aa151fa977ec1ee8e999aab56aaaa";
            var buff = new Buffer(data, 'hex');

            console.log('Send message: ');
            client.write(buff);
        });

        // Add a 'data' event handler for the client socket
        // data is what the server sent to this socket
        client.on('data', function(data) {
            var buff = new Buffer(data, 'utf8');
            var hexData = buff.toString('hex');

            console.log('Server response: ' + hexData);
            // Close the client socket completely
            // client.destroy();

        });

        // Add a 'close' event handler for the client socket
        client.on('close', function() {
            console.log('Connection closed');
        });

        if(count <= 360){
            count++;
            setTimeout(function(){
                testPerformance(client, count);
            }, 5000);
        }
        
    }else{
        var data = "5555004d8b86d3cb004f9407383631343733303330303131383637b836c7d76e906f34a8e54caae10a55ca66be6378bc3a637be9865cb68bea702978165b9aa151fa977ec1ee8e999aab56aaaa";
        var buff = new Buffer(data, 'hex');

        existedClient.write(buff);

        if(count <= 360){
            count++;
            setTimeout(function(){
                testPerformance(existedClient, count);
            }, 5000);
        }
    }
}

for(var i = 1; i <= 500; i++){
    testPerformance(null, 1);
}