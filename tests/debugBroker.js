const Broker = require('../lib/broker');
const Common = require('../lib/common')
const config = require('../config/conf');

var gateway = {
    id: "hahaha",
    host: "emqs-atilze.giotgateway.com",
    port: 8883
};

var broker_host = "mqtts://" + gateway.host;
var options = {
    keepalive: config.defaultBroker.keepalive,
    port: gateway.port,
    clean: config.defaultBroker.clean,
    clientId: config.defaultBroker.idKey + gateway.id,
    reconnectPeriod: config.defaultBroker.reconnectPeriod,
    rejectUnauthorized: config.defaultBroker.rejectUnauthorized,
    protocolId: config.defaultBroker.protocolId,
    protocolVersion: config.defaultBroker.protocolVersion,
    rejectUnauthorized: false
}

var broker = new Broker(gateway, broker_host, options);
var client = broker.connect();
// broker.subscribe();
broker.onConnect((name, username, topics) => {
    console.log(name + ' Broker connected');

    console.log('Update client status to Fabrick broker')
    fabrick_Broker.publish('fabrick.io/' + username + '/Status', '{"status":"Connected"}', { qos: 1, retain: true })

    // topics.forEach(function(topic){
    //   broker.subscribe(topic);
    // });
});
broker.onError((err, username) => {
    console.log('error happen with Gemtek broker')
    console.log(err)
    fabrick_Broker.publish('fabrick.io/' + username + '/Status', '{"status":"Error"}', { qos: 1, retain: true })
    broker.end()
});
broker.onClose((name, username) => {
    console.log(name + ' broker disconnected')
    fabrick_Broker.publish('fabrick.io/' + username + '/Status', '{"status":"Disconnected"}', { qos: 1, retain: true })
});
broker.onReconnect((name) => {
    console.log(name + ' reconnecting...')
});
broker.onOffline((name, username) => {
    console.log(name + ' broker is offline')
    fabrick_Broker.publish('fabrick.io/' + username + '/Status', '{"status":"Offline"}', { qos: 1, retain: true })
});
broker.onMessage(processGemtekMessage);

function processGemtekMessage(gatewayName, topic, message, packet, username) {
    var json_object = JSON.parse(message);

    // console.log(json_object)
    var publishMessage = generateMessage(json_object['macAddr'], json_object['buff'], json_object['data']);
    if (publishMessage) {
        // console.log('Message received from gateway ' + gatewayName);
        // console.log(publishMessage);
        // console.log("-----------------------------------");
        if (config.debuggingDevices.indexOf(json_object['macAddr']) != -1) {
            console.log('Message received from gateway ' + gatewayName);
            console.log(publishMessage);
            console.log("-----------------------------------");
        }

        // fabrick_Broker.publish('fabrick.io/'+username+'/'+macAddr, JSON.stringify(publishMessage), {qos: 1, retain: true});
        fabrick_Broker.publish('fabrick.io/device/data', JSON.stringify(publishMessage), { qos: 1, retain: true });
    }
}