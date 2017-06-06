var broker_host = "tcp://" + gateway.host;
var options = {
    keepalive: config.defaultBroker.keepalive,
    port: gateway.port,
    clean: config.defaultBroker.clean,
    clientId: config.defaultBroker.idKey + gateway.id,
    username: gateway.username,
    password: gateway.password,
    reconnectPeriod: config.defaultBroker.reconnectPeriod,
    rejectUnauthorized: config.defaultBroker.rejectUnauthorized,
    protocolId: config.defaultBroker.protocolId,
    protocolVersion: config.defaultBroker.protocolVersion
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