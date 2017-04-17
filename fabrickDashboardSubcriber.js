'use strict'

const Broker = require('./broker');
const Common = require('./common')
const config = require('./conf');

const exec = require('child_process').exec;

var fabrick_gateway = {
    id: 'Fabrick Dashboard Subcriber',
    host: config.fabrickBroker.host,
    port: config.fabrickBroker.port,
    topics: { 'fabrick.io/device/data': 1 }
};

var fabrick_Broker = new Broker(fabrick_gateway, fabrick_gateway.host, {
    keepalive: config.fabrickBroker.keepalive,
    port: fabrick_gateway.port,
    clientId: fabrick_gateway.id
});
var fabrick_client = fabrick_Broker.connect();
fabrick_Broker.onConnect(() => {
    console.log('Fabrick Broker connected');
});
fabrick_Broker.onError((err) => {
    console.log('error happen with Fabrick broker')
    console.log(err)
    fabrick_Broker.end()
});
fabrick_Broker.onClose(() => {
    console.log('Fabrick broker disconnected')
});
fabrick_Broker.onReconnect(() => {
    console.log('Fabrick reconnecting...')
});
fabrick_Broker.onOffline(() => {
    console.log('Fabrick broker is offline')
});
fabrick_Broker.onMessage((topic, message, packet) => {
    // console.log('Message received from Fabrick');
    // console.log('topic: ' + topic);
    // console.log('message : ')
    var json_object = JSON.parse(message);
    // console.log(json_object);
    var b64string = message;
    var buf = Buffer.from(b64string, 'base64');

    switch (topic) {
        case 'fabrick.io/device/data':
            var cmd = 'php ' + config.artisanURL + ' device ' + buf.toString('base64');

            exec(cmd, function(error, stdout, stderr) {
                console.log('Command executed !!!');
                // console.log(cmd);
                if (error) {
                    console.log(error);
                }
                if (stdout) {
                    console.log(stdout);
                }
                if (stderr) {
                    console.log(stderr);
                }
            });
            break;

        default:
            console.log('No handler for topic %s', topic);
    }
});