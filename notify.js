// var app = require('express')();
// var server = require('http').Server(app);
// var io = require('socket.io')(server);
var io = require('socket.io').listen(9990);

var Redis = require('ioredis');
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

// server.listen(9990);