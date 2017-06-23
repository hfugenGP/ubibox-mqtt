var Redis = require('ioredis');

var server = require('http').createServer(function(req, res) {
    response.writeHead(200, { 'Content-Type': 'text/html' });
    response.write('hello world');
    response.end();
});

server.listen(9990);
var io = require('socket.io').listen(server);

var redis = new Redis({ dropBufferSupport: true });
redis.subscribe('notify');
redis.subscribe('notifyUnread');
redis.subscribe('application');
redis.subscribe('device');
redis.subscribe('event');
redis.subscribe('manholeAlert');
redis.subscribe('notifyNotSeen');
redis.on('message', function(channel, message) {
    io.emit(channel, message);
});