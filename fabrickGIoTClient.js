'use strict'

// const mqtt = require('mqtt');
const Broker = require('./broker');
const Common = require('./common')
const config = require('./conf');

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
fabrick_Broker.onMessage((gatewayName, topic, message, packet) => {
    console.log('Message received for topic: ' + topic);
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

            console.log(gateways);

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

function generateMessage(macAddr, receivedDate, rawData) {
    var message = { "extId": macAddr };
    message["rawData"] = rawData;
    message["receivedDate"] = new Date();
    message["receivedDateLoRa"] = receivedDate;

    var common = new Common();

    var data = {};
    switch (subcribe_devices['MAC-' + macAddr]) {
        case 1: //'air_sensor'
            data["deviceType"] = [rawData.substring(0, 2)];
            var temperature = parseInt('0x' + rawData.substring(2, 6)) / 100;
            data["temperature"] = [temperature, '°C', common.getDataStatus("temperature", temperature)];
            var humidity = parseInt('0x' + rawData.substring(6, 10)) / 100;
            data["humidity"] = [humidity, '%RH', common.getDataStatus("humidity", humidity)];
            // var co2 = "N/A"
            // var co = "N/A"
            // var pm25 = "N/A"

            switch (data["deviceType"][0]) {
                case '01':
                    var co2 = parseInt('0x' + rawData.substring(10, 14));
                    data["co2"] = [co2, 'ppm', common.getDataStatus("co2", co2)];
                    break
                case '02':
                    var co = parseInt('0x' + rawData.substring(10, 14));
                    data["co"] = [parseInt('0x' + rawData.substring(10, 14)), 'ppm', common.getDataStatus("co", co)];
                    break
                case '03':
                    var pm25 = parseInt('0x' + rawData.substring(10, 14));
                    data["pm25"] = [parseInt('0x' + rawData.substring(10, 14)), 'ug/m3', common.getDataStatus("pm25", pm25)];
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
            data["depth"] = [depth, 'cm', common.getDataStatus("depth", depth)];

            break;
        case 3: //'ph_sensor'
            data["ph"] = [parseFloat(rawData.substring(0, 2) + '.' + rawData.substring(2, 3))];

            break;
        case 4: //'alarm_sensor'

            data['alert'] = [common.hex2a(rawData)];

            break;
        case 5: //'parking_sensor'

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

            data['secondTimeMagneticCorrection'] = [flags[1] == '0' ? false : true]; //Only for new sensors
            data['magneticCorrection'] = [flags[2] == '0' ? false : true];
            data['lowBattery'] = [flags[3] == '0' ? false : true];
            data['keepAlive'] = [flags[6] == '0' ? false : true];
            data['state'] = [flags[7] == '0' ? false : true];
            data["voltage"] = [voltage, 'V'];
            data['magneticDisturbanceIntensity'] = [magneticDisturbanceIntensity];
            data["temperature"] = [temperature, '°C', common.getDataStatus("temperature", temperature)];
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
        case 9: //'scooter_sensor' 0003017b827e0736773c
            var alertFlags = Array.from(common.hex2bits(rawData.substring(0, 2)));
            var statusFlags = Array.from(common.hex2bits(rawData.substring(2, 4)));

            data['speed'] = [parseInt('0x' + rawData.substring(20, 24)), 'km/h'];
            data['direction'] = [parseInt('0x' + rawData.substring(24, 28))];

            data['illegalDisplacement'] = [alertFlags[7] == '0' ? false : true];
            data['vibrationAlarm'] = [alertFlags[6] == '0' ? false : true];
            data['mainPowerUnderVoltage'] = [alertFlags[5] == '0' ? false : true];
            data['mainPowerDown'] = [alertFlags[4] == '0' ? false : true];

            data['ACC'] = [statusFlags[7] == '0' ? false : true];
            data['positioned'] = [statusFlags[6] == '0' ? false : true];

            var latType = -1;
            if (statusFlags[5] == '0') {
                latType = 1;
            }
            // if (statusFlags[2] == '0') {
            //     data['latitudeType'] = ['north'];
            // } else {
            //     data['latitudeType'] = ['south'];
            //     latType = -1;
            // }

            var lngType = -1;
            if (statusFlags[4] == '0') {
                lngType = 1;
            }
            // if (statusFlags[3] == '0') {
            //     data['longitudeType'] = ['east'];
            // } else {
            //     data['longitudeType'] = ['west'];
            //     lngType = -1;
            // }
            // 24871678000000,121009733000000
            data['latitude'] = [parseInt('0x' + rawData.substring(4, 12)) * latType / 1000000];
            data['longitude'] = [parseInt('0x' + rawData.substring(12, 20)) * lngType / 1000000];
            data['latlng'] = [data['latitude'] + ',' + data['longitude']];

            break;
        case 10: //'manhole_sensor'
            var alertFlags = Array.from(common.hex2bits(rawData.substring(0, 2)));

            data['batteryVoltage'] = [parseInt('0x' + rawData.substring(2, 4)) / 10, 'V'];
            data['temperature'] = [parseInt('0x' + rawData.substring(4, 6)), '°C'];
            data['gSensor3Axis'] = [parseInt('0x' + rawData.substring(6, 18)) * 1000];

            data['status'] = [alertFlags[7] == '0' ? false : true];
            data['alert'] = [alertFlags[6] == '0' ? false : true];
            data['calibration'] = [alertFlags[5] == '0' ? true : false];
            data['lowBattery'] = [alertFlags[4] == '0' ? false : true];

            break;
        case 11: //'asset_tracker' 0124fd017b8298073676dc 05 63 70 0261ae8a 297174138 047b04d6 41234214
            var statusFlags = Array.from(common.hex2bits(rawData.substring(0, 2)));

            var temperatureSet = common.hex2bits(rawData.substring(2, 4));
            var intergerOffet = temperatureSet.substring(0, 1) == "0" ? 1 : -1;
            var floatOffet = temperatureSet.substring(1, 2) == "0" ? 0 : 0.5;
            data['temperature'] = [(parseInt(temperatureSet.substring(2, 8), 2) + floatOffet) * intergerOffet, '°C'];

            var batt = parseInt('0x' + rawData.substring(4, 6));
            if (batt == "255" || batt == "0") {
                data['batteryLevel'] = [0, "%"];
            } else {
                data['batteryLevel'] = [batt / 254 * 100, "%"];
            }

            data['positioned'] = [statusFlags[7] == '0' ? false : true];
            var latType = -1;
            if (statusFlags[6] == '0') {
                latType = 1;
            }
            // if (statusFlags[1] == '0') {
            //     data['latitudeType'] = ['north'];
            // } else {
            //     data['latitudeType'] = ['south'];
            //     latType = -1;
            // }

            var lngType = -1;
            if (statusFlags[5] == '0') {
                lngType = 1;
            }
            // if (statusFlags[2] == '0') {
            //     data['longitudeType'] = ['east'];
            // } else {
            //     data['longitudeType'] = ['west'];
            //     lngType = -1;
            // }

            if (statusFlags[2] == '0') {
                data['loraPacketType'] = ['lora'];
            } else {
                data['loraPacketType'] = ['mftLora'];
            }

            if (statusFlags[4] == '0') {
                data['latitude'] = [parseInt('0x' + rawData.substring(6, 14)) * latType / 1000000]; //297174138 
                data['longitude'] = [parseInt('0x' + rawData.substring(14, 22)) * lngType / 1000000]; //41234214
                data['latlng'] = [data['latitude'] + ',' + data['longitude']];
            } else {
                data['gSensor3Axis'] = [parseInt('0x' + rawData.substring(6, 18))];
            }

            var statusCode = statusFlags[0] + statusFlags[1] + statusFlags[3];

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
            var alertFlags = Array.from(common.hex2bits(rawData.substring(0, 1)));
            data['status'] = [alertFlags[0] == '0' ? false : true];
            data['batteryVoltage'] = [parseInt('0x' + rawData.substring(1, 2)) / 10, 'V'];
            data['temperature'] = [parseInt('0x' + rawData.substring(2, 3))];

            break;
        case 13: //Farm sensors / 3e 010 000 18c 272 142 000 // 40 180 2AE 1F4 0BD 185 AA 0
            var binaryData = common.hex2bits(rawData);
            var ph = parseInt(common.hex2bits(rawData.substring(0, 2)), 2); //parseInt(binaryData.substring(0, 8), 2); 2d 00101101 45
            var soilElectrical = parseInt(common.hex2bits(rawData.substring(2, 5)), 2); //parseInt(binaryData.substring(8, 20), 2); 00a 000000001010 10
            var soilTemperature = parseInt(common.hex2bits(rawData.substring(5, 8)), 2); //parseInt(binaryData.substring(20, 32), 2); 000 000000000000
            var airTemperature = parseInt(common.hex2bits(rawData.substring(8, 11)), 2); //parseInt(binaryData.substring(32, 44), 2); 164 000101100100 356 16f 000101101111 367
            var airHumidity = parseInt(common.hex2bits(rawData.substring(11, 14)), 2); //parseInt(binaryData.substring(44, 56), 2); 2bc 001010111100 700
            var soilMoisture = parseInt(common.hex2bits(rawData.substring(14, 17)), 2); //parseInt(binaryData.substring(56, 68), 2); 0f5 000011110101 245
            var batteryLevel = parseInt(common.hex2bits(rawData.substring(17, 19)), 2); //parseInt(binaryData.substring(68, 76), 2);

            var phValue = (14 * ph) / 256;
            var soilElectricalValue = (20000 * soilElectrical) / 1024;
            if (soilTemperature != 0) {
                var soilTemperatureValue = ((120 * soilTemperature) / 1024) - 40;
                data['soilTemperature'] = [common.roundFloat(soilTemperatureValue, 2), '°C'];
            }

            var airTemperatureValue = ((90 * airTemperature) / 1024) - 10;
            var airHumidityValue = (100 * airHumidity) / 1024;
            var soilMoistureValue = (100 * soilMoisture) / 1024;
            var batteryLevelValue = (5 * batteryLevel) / 256;

            data['ph'] = [common.roundFloat(phValue, 2), 'pH'];
            data['soilElectrical'] = [common.roundFloat(soilElectricalValue, 2), 'us/cm'];
            data['airTemperature'] = [common.roundFloat(airTemperatureValue, 2), '°C'];
            data['airHumidity'] = [common.roundFloat(airHumidityValue, 2), '%RH'];
            data['soilMoisture'] = [common.roundFloat(soilMoistureValue, 2), '%'];
            data['batteryLevel'] = [common.roundFloat(batteryLevelValue, 2), 'V'];

            break;
        default:
            console.log('No handler for device on MAC %s', macAddr);
            return;
    }

    message["data"] = data;

    return message;
}