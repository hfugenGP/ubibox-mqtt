'use strict'

// garage.js
const mqtt = require('mqtt')

var fabrick_broker_host = '52.187.41.181'
var fabrick_broker_port = 1883
var fabrick_broker_client_id = 'FabrickClient002'

var broker_options = {
    keepalive: 120,
    host: fabrick_broker_host,
    port: fabrick_broker_port,
    clientId: fabrick_broker_client_id
}

var broker = mqtt.connect(broker_options)

broker.on('connect', () => {
    console.log('Fabrick Broker connected')
})

var gemtek_broker_host = "tcp://52.193.146.103"
var gemtek_broker_port = 80
var gemtek_broker_client_id = 'FabrickClient002'
var gemtek_username = "200000217"
var gemtek_password = "92132667"

var options = {
    keepalive: 120,
    port: gemtek_broker_port,
    clean: true,
    clientId: gemtek_broker_client_id,
    username: gemtek_username,
    password: gemtek_password,
    reconnectPeriod: 4000,
    rejectUnauthorized: true,
    protocolId: 'MQIsdp',
    protocolVersion: 3
}

// var options = {
//   keepalive: 120,
//   host: 'mqtt.opensensors.io',
//   port: 1883,
//   clean: true,
//   clientId: '5291',
//   username: 'phongvu',
//   password: 'TuSqQtu8',
//   reconnectPeriod: 4000,
//   rejectUnauthorized: false
// }

var client = mqtt.connect(gemtek_broker_host, options)

client.on('connect', () => {
    console.log('Gemtek broker connected')

    console.log('Update client status to Fabrick broker')
    broker.publish('fabrick.io/' + gemtek_username + '/Status', '{"status":"Connected"}', { qos: 1, retain: true })

    client.subscribe({ 'client/200000217/200000217-GIOT-MAKER': 1 }, function(err, granted) {
        if (err) {
            console.log('False to subscribe to sensor')
            console.log(err)
        }
    })
})

client.on('message', function(topic, message, packet) {
    console.log('Message received from sensor')
        // console.log('topic: ' + topic)
        // console.log('message : ')
    var json_object = JSON.parse(message)

    // console.log(json_object)

    switch (topic) {
        case 'client/200000217/200000217-GIOT-MAKER':
            // var id = json_object['id']
            var macAddr = json_object['macAddr']
            var publishMessage = generate_data(macAddr, json_object['data'], json_object['buff'])


            // console.log('publish_message : ')
            console.log(publishMessage)

            broker.publish('fabrick.io/' + gemtek_username + '/' + macAddr, JSON.stringify(publishMessage), { qos: 1, retain: true })
            break
        default:
            console.log('No handler for topic %s', topic)
    }
})

client.on('error', function(err) {
    console.log('error happen')
    console.log(err)
    broker.publish('fabrick.io/' + gemtek_username + '/Status', '{"status":"Error"}', { qos: 1, retain: true })
    client.end()
})

client.on('close', function() {
    console.log('Sensor disconnected')
    broker.publish('fabrick.io/' + gemtek_username + '/Status', '{"status":"Disconnected"}', { qos: 1, retain: true })
})

client.on('reconnect', () => {
    console.log('Sensor reconnecting...')
})

client.on('offline', () => {
    console.log('Sensor is offline')
    broker.publish('fabrick.io/' + gemtek_username + '/Status', '{"status":"Offline"}', { qos: 1, retain: true })
})

// client.on('packetsend', (packet) => {
//   console.log('Send a package to sensor')
//   console.log(packet)
// })

// client.on('packetreceive', (packet) => {
//   console.log('Got a packet to sensor')
//   console.log(packet)
// })

function generate_data(macAddr, raw_data, received_date) {
    var data = { "raw_data": raw_data }

    if (macAddr == '04000d6c') {
        data["depth"] = 31 - parseFloat(raw_data.substring(0, 3))
    } else if (macAddr == '04000d71') {
        data["ph_level"] = parseFloat(raw_data.substring(0, 2) + '.' + raw_data.substring(2, 3))
    } else if (macAddr == '040005c4') {
        data['alert_code'] = hex2a(raw_data);
    } else {
        var device_type = raw_data.substring(0, 2)
        var temperature = parseInt('0x' + raw_data.substring(2, 6)) / 100
        var rh = parseInt('0x' + raw_data.substring(6, 10)) / 100
        var co2 = "N/A"
        var co = "N/A"
        var pm25 = "N/A"

        switch (device_type) {
            case '01':
                co2 = parseInt('0x' + raw_data.substring(10, 14))
                break
            case '02':
                co = parseInt('0x' + raw_data.substring(10, 14))
                break
            case '03':
                pm25 = parseInt('0x' + raw_data.substring(10, 14))
                break
            default:
        }

        data["device_type"] = device_type;
        data["temperature"] = temperature;
        data["rh"] = rh;
        data["co2"] = co2;
        data["co"] = co;
        data["pm25"] = pm25;
    }

    data["macAddr"] = macAddr;
    data["received_date"] = received_date;

    return data;
}

function hex2a(hexx) {
    var hex = hexx.toString(); //force conversion
    var str = '';
    for (var i = 0; i < hex.length; i += 2)
        str += String.fromCharCode(parseInt(hex.substr(i, 2), 16));
    return str;
}