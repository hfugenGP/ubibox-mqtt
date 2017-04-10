'use strict'

// const mqtt = require('mqtt');
const Broker = require('./broker');
const Common = require('./common')
const config = require('./config');

var subcribe_devices = new Array();
var subcribe_gateways = new Array();
var subcribe_brokers = new Array();

var fabrick_gateway = {
    id: "Fabrick GIoT Client " + config.fabrickBroker.idKey,
    host: config.fabrickBroker.host,
    port: config.fabrickBroker.port,
    topics: { 'config/GIoT/Gateways': 1, 'config/GIoT/Devices': 1 }
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
    console.log('Message received from Fabrick');
    console.log('topic: ' + topic);
    // console.log('message : ')
    var json_object = JSON.parse(message);

    var gateways = new Array();
    var devices = new Array();

    switch (topic) {
        case 'config/GIoT/Gateways':
            json_object.forEach(function(element) {
                var gateway = {
                    id: element['id'],
                    host: element['host'],
                    port: element['port'],
                    username: element['username'],
                    password: element['password'],
                    topics: element['topics']
                };

                gateways[gateway.id] = gateway;

            });

            for (var id in subcribe_gateways) {
                if (subcribe_gateways.hasOwnProperty(id) && subcribe_brokers[id] != null && gateways[id] == null) {
                    subcribe_brokers[id].end();
                    subcribe_brokers[id] = null;
                    subcribe_gateways[id] = null;
                }
            }

            for (var id in gateways) {
                if (gateways.hasOwnProperty(id)) {
                    var gateway = gateways[id];
                    if (subcribe_brokers[id] == null) {
                        subcribe_gateways[id] = gateway;

                        var broker_host = "tcp://" + gateway.host;
                        var options = {
                            keepalive: config.defaultBroker.keepalive,
                            port: gateway.port,
                            clean: config.defaultBroker.clean,
                            clientId: gateway.id,
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

                        subcribe_brokers[id] = broker;
                    } else if (subcribe_gateways[id].topics != gateway.topics) {
                        //Subcrible/Unsubcrible topics within gateway
                        // var broker = subcribe_brokers[id];

                        // subcribe_gateways[id].topics.forEach(function(topic){
                        //     broker.unsubscribe(topic);
                        // });

                        // gateway.topics.forEach(function(topic){
                        //     broker.subscribe(topic);
                        // });
                    }
                }
            }
            break;
        case 'config/GIoT/Devices':
            // console.log(json_object);
            subcribe_devices = [];
            json_object.forEach(function(element) {
                subcribe_devices['MAC-' + element['device'].toLowerCase()] = element['deviceType'];
            });
            console.log(subcribe_devices);
            break;
        default:
            console.log('No handler for topic %s', topic);
    }
});

function processGemtekMessage(topic, message, packet, username) {
    console.log('Message received from sensor');
    // console.log('topic: ' + topic)
    // console.log('message : ')
    var json_object = JSON.parse(message);

    // console.log(json_object)
    var publishMessage = generateMessage(json_object['macAddr'], json_object['buff'], json_object['data']);
    if (publishMessage) {
        // console.log('publish_message : ')
        console.log(publishMessage);

        // fabrick_Broker.publish('fabrick.io/'+username+'/'+macAddr, JSON.stringify(publishMessage), {qos: 1, retain: true});
        fabrick_Broker.publish('fabrick.io/device/data', JSON.stringify(publishMessage), { qos: 1, retain: true });
    }
}

function generateMessage(macAddr, receivedDate, rawData) {
    var message = { "extId": macAddr };
    message["rawData"] = rawData;
    message["receivedDate"] = new Date();
    message["receivedDateLoRa"] = receivedDate;

    var data = {};
    switch (subcribe_devices['MAC-' + macAddr]) {
        case 1: //'air_sensor'
            data["deviceType"] = [rawData.substring(0, 2)];
            var temperature = parseInt('0x' + rawData.substring(2, 6)) / 100;
            data["temperature"] = [temperature, '°C', getDataStatus("temperature", temperature)];
            var humidity = parseInt('0x' + rawData.substring(6, 10)) / 100;
            data["humidity"] = [humidity, '%RH', getDataStatus("humidity", humidity)];
            // var co2 = "N/A"
            // var co = "N/A"
            // var pm25 = "N/A"

            switch (data["deviceType"][0]) {
                case '01':
                    var co2 = parseInt('0x' + rawData.substring(10, 14));
                    data["co2"] = [co2, 'ppm', getDataStatus("co2", co2)];
                    break
                case '02':
                    var co = parseInt('0x' + rawData.substring(10, 14));
                    data["co"] = [parseInt('0x' + rawData.substring(10, 14)), 'ppm', getDataStatus("co", co)];
                    break
                case '03':
                    var pm25 = parseInt('0x' + rawData.substring(10, 14));
                    data["pm25"] = [parseInt('0x' + rawData.substring(10, 14)), 'ug/m3', getDataStatus("pm25", pm25)];
                    break
                default:
            }

            // data["device_type"] = device_type;
            // data["temperature"] = temperature;
            // data["rh"] = rh;
            // data["co2"] = co2;
            // data["co"] = co;
            // data["pm25"] = pm25;

            break;
        case 2: //'drainage_sensor'
            var depth = 31 - parseFloat(rawData.substring(0, 3));
            data["depth"] = [depth, 'cm', getDataStatus("depth", depth)];

            break;
        case 3: //'ph_sensor'
            data["ph"] = [parseFloat(rawData.substring(0, 2) + '.' + rawData.substring(2, 3))];

            break;
        case 4: //'alarm_sensor'
            var common = new Common();
            data['alert'] = [common.hex2a(rawData)];

            break;
        case 5: //'parking_sensor'
            var common = new Common();

            // Don't need to get this for now
            // var header = parseInt('0x' + rawData.substring(0, 2));
            // var type = parseInt('0x' + rawData.substring(2, 6));
            // var length = parseInt('0x' + rawData.substring(6, 8));

            var value = rawData.substring(8, 18);

            var flags = Array.from(common.hex2bits(value.substring(0, 2)));

            // Keep for debug later
            // var magneticCorrection = flags[2];
            // var lowBattery = flags[3];
            // var keepAlive = flags[6];
            // var car = flags[7];

            var voltage = parseInt('0x' + value.substring(2, 6)) / 100;
            var magneticDisturbanceIntensity = parseInt('0x' + value.substring(6, 8));
            var temperature = parseInt('0x' + value.substring(8, 10));

            data['magneticCorrection'] = [flags[2] == '0' ? false : true];
            data['lowBattery'] = [flags[3] == '0' ? false : true];
            data['keepAlive'] = [flags[6] == '0' ? false : true];
            data['car'] = [flags[7] == '0' ? false : true];
            data["voltage"] = [voltage, 'V'];
            data['magneticDisturbanceIntensity'] = [magneticDisturbanceIntensity];
            data["temperature"] = [temperature, '°C', getDataStatus("temperature", temperature)];
            break;
        case 8: //'electric_sensor'
            data['serialNo'] = [rawData.substring(0, 6)];
            var hour = rawData.substring(6, 8);
            var day = rawData.substring(8, 10);
            var month = rawData.substring(10, 12);
            var year = rawData.substring(12, 14);
            data['updatedOn'] = [new Date(year, month, day, hour)];
            data['voltage'] = [parseInt(rawData.substring(14, 16)) / 10, 'V'];
            data['reading'] = [rawData.substring(16, 22)];
            break;
        case 9: //'scooter_sensor'
            var alertFlags = Array.from(common.hex2bits(value.substring(0, 1)));
            var statusFlags = Array.from(common.hex2bits(value.substring(1, 2)));

            data['latitude'] = [parseInt('0x' + rawData.substring(2, 6)) * 10];
            data['longitude'] = [parseInt('0x' + rawData.substring(6, 10)) * 10];

            data['speed'] = [parseInt('0x' + rawData.substring(10, 12)), 'km/h'];
            data['direction'] = [parseInt('0x' + rawData.substring(12, 14))];

            data['illegalDisplacement'] = [alertFlags[0] == '0' ? false : true];
            data['vibrationAlarm'] = [alertFlags[1] == '0' ? false : true];
            data['mainPowerUnderVoltage'] = [alertFlags[2] == '0' ? false : true];
            data['mainPowerDown'] = [alertFlags[3] == '0' ? false : true];

            data['ACC'] = [statusFlags[0] == '0' ? false : true];
            data['positioned'] = [statusFlags[1] == '0' ? false : true];
            data['northlatitude'] = [statusFlags[2] == '0' ? true : false];
            data['southLatitude'] = [statusFlags[2] == '0' ? false : true];
            data['west'] = [statusFlags[3] == '0' ? false : true];
            data['east'] = [statusFlags[3] == '0' ? true : false];

            break;
        case 10: //'manhole_sensor'
            var alertFlags = Array.from(common.hex2bits(value.substring(0, 1)));

            data['batteryVoltage'] = [parseInt('0x' + rawData.substring(1, 2)) / 10, 'V'];
            data['temperature'] = [parseInt('0x' + rawData.substring(2, 3))];
            data['gSensor3Axis'] = [parseInt('0x' + rawData.substring(3, 9)) * 1000];

            data['status'] = [alertFlags[0] == '0' ? false : true];
            data['alert'] = [alertFlags[1] == '0' ? false : true];
            data['calibration'] = [alertFlags[2] == '0' ? true : false];
            data['lowBattery'] = [alertFlags[3] == '0' ? false : true];

            break;
        case 11: //'asset_tracker'
            var statusFlags = Array.from(common.hex2bits(value.substring(0, 1)));

            data['temperature'] = [parseInt('0x' + rawData.substring(1, 2))];
            data['batteryLevel'] = [parseInt('0x' + rawData.substring(2, 3))];

            if (statusFlags[0] == '0') {
                data['latitude'] = [parseInt('0x' + rawData.substring(3, 7)) * 10];
                data['longitude'] = [parseInt('0x' + rawData.substring(7, 11)) * 10];
            } else {
                data['gSensor3Axis'] = [parseInt('0x' + rawData.substring(3, 9))];
            }

            data['positioned'] = [statusFlags[0] == '0' ? false : true];
            data['northLatitude'] = [statusFlags[1] == '0' ? true : false];
            data['southLatitude'] = [statusFlags[1] == '0' ? false : true];

            data['eastLongitude'] = [statusFlags[2] == '0' ? true : false];
            data['westLongitude'] = [statusFlags[2] == '0' ? false : true];

            data['loraPacket'] = [statusFlags[5] == '0' ? true : false];
            data['mftLoraPacket'] = [statusFlags[5] == '0' ? false : true];

            var statusCode = statusFlags[7] + statusFlags[6] + statusFlags[4];

            switch (statusCode) {
                case "000":
                    data['status'] = "noError";
                    break;
                case "001":
                    data['status'] = "hardFault";
                    break;
                case "010":
                    data['status'] = "memManage";
                    break;
                case "011":
                    data['status'] = "busFault";
                    break;
                case "100":
                    data['status'] = "usageFault";
                    break;
                case "101":
                    data['status'] = "mallocFail";
                    break;
                case "110":
                    data['status'] = "stackOverflow";
                    break;
                case "111":
                    data['status'] = "lowBattery";
                    break;
            }

            break;
        case 12: //'ear_tag'
            var alertFlags = Array.from(common.hex2bits(value.substring(0, 1)));
            data['status'] = [alertFlags[0] == '0' ? false : true];
            data['batteryVoltage'] = [parseInt('0x' + rawData.substring(1, 2)) / 10, 'V'];
            data['temperature'] = [parseInt('0x' + rawData.substring(2, 3))];

            break;
        case 13: //Farm sensors
            var binaryData = common.hex2bits(value);
            var ph = binaryData.substring(0, 8);
            var soilElectrical = binaryData.substring(8, 20);
            var soilTemperature = binaryData.substring(20, 32);
            var airTemperature = binaryData.substring(32, 44);
            var airHumidity = binaryData.substring(44, 56);
            var soilMoisture = binaryData.substring(56, 68);
            var batteryLevel = binaryData.substring(68, 76);

            data['ph'] = [ph / 256 * 14, 'pH'];
            data['soilElectrical'] = [20000 * soilElectrical / 1024, 'us/cm'];
            data['soilTemperature'] = [(120 * soilTemperature / 1024) - 40, '°C'];
            data['airTemperature'] = [(90 * airTemperature / 1024) - 10, '°C'];
            data['airHumidity'] = [100 * airHumidity / 1024, '%RH'];
            data['soilMoisture'] = [100 * soilMoisture / 1024, '%'];
            data['batteryLevel'] = [5 * batteryLevel / 256, '%'];

            break;
        default:
            console.log('No handler for device on MAC %s', macAddr);
            return;
    }

    message["data"] = data;

    return message;
}

function getDataStatus(dataType, value) {
    switch (dataType) {
        case "temperature":
            if (value <= 19) {
                return "Normal";
            } else if (value <= 24) {
                return "Caution";
            } else if (value <= 28) {
                return "Warning";
            } else if (value <= 32) {
                return "Danger";
            } else {
                return "Critical";
            }

        case "humidity":
            if (value <= 30) {
                return "Normal";
            } else if (value <= 65) {
                return "Caution";
            } else if (value <= 75) {
                return "Warning";
            } else if (value <= 85) {
                return "Danger";
            } else {
                return "Critical";
            }

        case "pm25":
            if (value <= 50) {
                return "Normal";
            } else if (value <= 100) {
                return "Caution";
            } else if (value <= 200) {
                return "Warning";
            } else if (value <= 300) {
                return "Danger";
            } else {
                return "Critical";
            }

        case "co":
            if (value <= 6) {
                return "Normal";
            } else if (value <= 10) {
                return "Warning";
            } else {
                return "Critical";
            }

        case "co2":
            if (value <= 450) {
                return "Normal";
            } else if (value <= 600) {
                return "Warning";
            } else {
                return "Critical";
            }

        case "depth":
            if (value <= 5) {
                return "Normal";
            } else if (value <= 16) {
                return "Warning";
            } else {
                return "Critical";
            }
    }
}