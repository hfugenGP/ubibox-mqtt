var app = require('express')();
var server = require('http').Server(app);
var io = require('socket.io')(server);
var Redis = require('ioredis');
var redis = new Redis();

redis.subscribe('notify');
redis.subscribe('notifyUnread');
redis.subscribe('application');
redis.subscribe('device');
redis.subscribe('event');
redis.on('message', function(channel, message){
	console.log('Channel: ' + channel + ' message: ' + message);
	io.emit(channel, message);
});

server.listen(9990);