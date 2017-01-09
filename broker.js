"use strict";

const mqtt = require('mqtt')

var Broker = function(gateway, host, options) {
    this.gateway = gateway;
    this.name = gateway.id;
    this.host = host;
    this.options = options;
}

Broker.prototype.connect = function() {
    if (this.options) {
        this.client = mqtt.connect(this.host, this.options);
    } else {
        this.client = mqtt.connect(this.host);
    }

    return this.client;
}

Broker.prototype.publish = function(topic, message, options, callback) {
    this.client.publish(topic, message, options, callback);
}

Broker.prototype.subscribeOne = function(topic) {
    this.client.subscribe(topic, function(err, granted) {
        if (err) {
            console.log('False to subscribe to topic on broker ' + this.name);
            console.log(err);
        }
    })
}

Broker.prototype.unsubscribeOne = function(topic) {
    this.client.unsubscribe(topic, function(err) {
        if (err) {
            console.log('False to unsubscribe to topic on broker ' + this.name);
            console.log(err);
        }
    })
}

Broker.prototype.subscribe = function() {
    console.log('Subcribe for toppics on ' + this.name + ' broker');
    console.log(this.gateway.topics);

    this.client.subscribe(this.gateway.topics, function(err, granted) {
        if (err) {
            console.log('False to subscribe to topic on broker ' + this.name);
            console.log(err);
        }
    })
}

Broker.prototype.unsubscribe = function() {
    console.log('Unsubcribe for toppics on ' + this.name + ' broker');
    console.log(this.gateway.topics);

    this.client.unsubscribe(this.gateway.topics, function(err, granted) {
        if (err) {
            console.log('False to unsubscribe to topic on broker ' + this.name);
            console.log(err);
        }
    })
}

Broker.prototype.end = function() {
    this.client.end();
}

Broker.prototype.onMessage = function(action) {
    this.client.on('message', (topic, message, packet) => {
        action(topic, message, packet, this.options.username);
    });
}

Broker.prototype.onConnect = function(action) {
    this.client.on('connect', () => {
        action(this.name, this.options.username, this.gateway.topics);
        this.subscribe();
    });
}

Broker.prototype.onError = function(action) {
    this.client.on('error', (err) => {
        action(err, this.options.username);
    });
}

Broker.prototype.onClose = function(action) {
    this.client.on('close', () => {
        action(this.name, this.options.username);
    });
}

Broker.prototype.onReconnect = function(action) {
    this.client.on('reconnect', () => {
        action(this.name);
    });
}

Broker.prototype.onOffline = function(action) {
    this.client.on('offline', () => {
        action(this.name, this.options.username);
    });
}

Broker.prototype.onPacketsend = function(action) {
    this.client.on('packetsend', (packet) => {
        action(packet);
    });
}

Broker.prototype.onPacketreceive = function(action) {
    this.client.on('close', (packet) => {
        action(packet);
    });
}

module.exports = Broker;