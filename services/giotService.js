"use strict";

const Common = require('../lib/common');
var HI = require('heat-index');

var giotService = function () { };

giotService.prototype.generateMessage = function (subcribeDevices, macAddr, receivedDate, rawData) {
    var message = { "extId": macAddr };
    message["rawData"] = rawData;
    message["receivedDate"] = new Date();
    message["receivedDateLoRa"] = receivedDate;

    var common = new Common();

    var data = {};
    var deviceType = subcribeDevices['MAC-' + macAddr];
    switch (deviceType) {
        case 1: //'air_sensor'
            data["deviceType"] = [rawData.substring(0, 2)];
            var temperature = parseInt('0x' + rawData.substring(2, 6)) / 100;
            data["temperature"] = [temperature, '°C', common.getDataStatus("temperature", temperature)];
            var humidity = parseInt('0x' + rawData.substring(6, 10)) / 100;
            data["humidity"] = [humidity, '%RH', common.getDataStatus("humidity", humidity)];
            var heatIndex = parseFloat(HI.heatIndex({ temperature: temperature, humidity: humidity })).toFixed(2);
            data["heatIndex"] = [heatIndex, '°C', common.getDataStatus("heatIndex", heatIndex)];

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

            var readingValue = rawData.substring(16, 22);
            readingValue = readingValue.split('').reverse().join('');
            data['reading'] = [readingValue];
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

            var lngType = -1;
            if (statusFlags[4] == '0') {
                lngType = 1;
            }

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

            var lngType = -1;
            if (statusFlags[5] == '0') {
                lngType = 1;
            }

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
            var adjustment = {};
            // Temp - Hum - Soil Mois - PH - Soil EC
            adjustment["MAC-05000153"] = [0, 0, 0, 0, -286]; //farm 1
            adjustment["MAC-0400067c"] = [0, 15, 0, 1.5, 0]; //farm 11
            adjustment["MAC-05000154"] = [0, 21, 0, 1.5, 0]; //farm 3
            adjustment["MAC-05000151"] = [0, 20, 0, 2.7, 300]; //farm 4
            adjustment["MAC-05000152"] = [0, 18, 0, 1.5, 0]; //farm 6
            adjustment["MAC-05000158"] = [4, 9, 0, 1.5, -110]; //farm 7
            adjustment["MAC-05000155"] = [0, 18, 27, 1.3, 0]; //farm 8
            adjustment["MAC-05000159"] = [0, 18, 0, 1.5, -189]; //farm 9
            adjustment["MAC-040006d8"] = [0, 14, -37, 1.5, 0]; //farm 10
            adjustment["MAC-05000157"] = [10, 0, 37, 2.4, 0]; //farm 5

            var binaryData = common.hex2bits(rawData);
            var ph = parseInt(common.hex2bits(rawData.substring(0, 2)), 2); //parseInt(binaryData.substring(0, 8), 2); 2d 00101101 45
            var soilElectrical = parseInt(common.hex2bits(rawData.substring(2, 5)), 2); //parseInt(binaryData.substring(8, 20), 2); 00a 000000001010 10
            var soilTemperature = parseInt(common.hex2bits(rawData.substring(5, 8)), 2); //parseInt(binaryData.substring(20, 32), 2); 000 000000000000
            var airTemperature = parseInt(common.hex2bits(rawData.substring(8, 11)), 2); //parseInt(binaryData.substring(32, 44), 2); 164 000101100100 356 16f 000101101111 367
            var airHumidity = parseInt(common.hex2bits(rawData.substring(11, 14)), 2); //parseInt(binaryData.substring(44, 56), 2); 2bc 001010111100 700
            var soilMoisture = parseInt(common.hex2bits(rawData.substring(14, 17)), 2); //parseInt(binaryData.substring(56, 68), 2); 0f5 000011110101 245
            var batteryLevel = parseInt(common.hex2bits(rawData.substring(17, 19)), 2); //parseInt(binaryData.substring(68, 76), 2);

            var phValue = common.roundFloat((14 * ph) / 256, 2);
            var soilElectricalValue = common.roundFloat((20000 * soilElectrical) / 1024, 2);
            if (soilTemperature != 0) {
                var soilTemperatureValue = ((120 * soilTemperature) / 1024) - 40;
                data['soilTemperature'] = [common.roundFloat(soilTemperatureValue, 2), '°C'];
            }

            var airTemperatureValue = common.roundFloat(((90 * airTemperature) / 1024) - 10, 2);
            var airHumidityValue = common.roundFloat((100 * airHumidity) / 1024, 2);
            var soilMoistureValue = common.roundFloat((100 * soilMoisture) / 1024, 2);
            var batteryLevelValue = common.roundFloat((5 * batteryLevel) / 256, 2);

            var adjustmentValue = adjustment['MAC-' + macAddr];
            if (adjustmentValue) {
                airTemperatureValue += adjustmentValue[0];
                airHumidityValue += adjustmentValue[1];
                soilMoistureValue += adjustmentValue[2];
                phValue += adjustmentValue[3];
                soilElectricalValue += adjustmentValue[4];
            }

            var heatIndex = parseFloat(HI.heatIndex({ temperature: airTemperatureValue, humidity: airHumidityValue })).toFixed(2);
            data["heatIndex"] = [heatIndex, '°C', common.getDataStatus("heatIndex", heatIndex)];

            data['ph'] = [phValue, 'pH'];
            data['soilElectrical'] = [soilElectricalValue, 'us/cm'];
            data['airTemperature'] = [airTemperatureValue, '°C'];
            data['airHumidity'] = [airHumidityValue, '%RH'];
            data['soilMoisture'] = [soilMoistureValue, '%'];
            data['batteryLevel'] = [batteryLevelValue, 'V'];

            break;
        case 14: //Turbo Parking Sensor
            // ab11df01ae

            // ab 	frameType
            // 1	frameCount
            // 1	status
            // df 	ParkFlag and BattryLevel
            // 01 	Reserved
            // ae	frameEnd
            var frameType = rawData.substring(0, 2);
            var info = common.hex2bits(rawData.substring(4, 6));
            var frameEnd = rawData.substring(8, 10);
            var frameCount = parseInt('0x' + rawData.substring(2, 3));
            // var reserved = rawData.substring(6, 8);

            var status = rawData.substring(3, 4);
            var alertText = "N/A";
            var alertCode = status;
            switch (status) {
                case "0":
                case "1":
                case "2":
                    alertCode = "N/A";
                    break;
                case "3":
                    // Strong-magnetic interference
                    alertText = "There is strong-magnetic interference";
                    break;
                case "4":
                    // Low-Voltage Alarm
                    alertText = "Low-voltage alarm";
                    break;
                case "5":
                    // Detector failure
                    alertText = "Detector failure (IC information is readable)";
                    break;
                case "f":
                    // Sensor damage
                    alertText = "Sensor damage (IC information is not readable)";
                    break;
            }
            var parkFlag = info.substring(0, 1);
            var battery = parseInt(info.substring(1), 2);
            var batteryVolt = ((battery * 1.6) / 100) + 2;

            data['state'] = [parkFlag == '0' ? false : true];
            data['batteryLevel'] = [battery, '%'];
            data['batteryVolt'] = [batteryVolt, 'V'];
            data['alertCode'] = [alertCode];
            data['alertText'] = [alertText];

            break;
        case 18: // Weather station
            data = ipsoDataFormat(deviceType, rawData);
            break;
        case 19: // Sensor Hub (Agriculture)
            data = ipsoDataFormat(deviceType, rawData);
            break;
        case 20: // Sensor Hub (Aquaculture)
            data = ipsoDataFormat(deviceType, rawData);
            break;
        case 21: //Sensor Hub (Environment)
            data = ipsoDataFormat(deviceType, rawData);
            break;
        default:
            console.log('No handler for device on MAC %s', macAddr);
            return;
    }

    message["data"] = data;

    return message;
}

function ipsoDataFormat(deviceType, rawData) {
    var data = {};
    // var deviceId = parseInt(rawData.substring(0, 2), 16);
    var frameCount = parseInt(rawData.substring(2, 4), 16);
    var start = 4;
    var end = 6;
    while (frameCount > 0) {
        var dataChannel = rawData.substring(start, end);
        start = end;
        end += 2;
        var dataType = rawData.substring(start, end);

        //Now, everything is 2 bytes, so data lenght will be here
        start = end;
        end += 4;
        var value = rawData.substring(start, end);

        switch (dataType) {
            case "67":
                data['temperature'] = [parseInt(value, 16) / 10, '°C'];
                break;
            case "68":
                data['humidity'] = [parseInt(value, 16) / 10, '%'];
                break;
            case "73":
                data["pressure"] = [parseInt(value, 16), 'hPa'];
                break;
            case "74":
                data['batteryLevel'] = [parseInt(value, 16) / 100, 'V'];
                break;
            case "77":
                switch (deviceType) {
                    case 18:
                        if (dataChannel == "00") {
                            data["rainPerHour"] = [parseInt(value, 16), 'mm'];
                        } else if (dataChannel == "01") {
                            data["rainPerDay"] = [parseInt(value, 16), 'mm'];
                        }
                        break;
                    case 19:
                        data['waterPressure'] = [parseInt(value, 16) / 100, 'm'];
                        break;
                }
                break;
            case "7e":
                data["ph"] = [parseInt(value, 16) / 10];
                break;
            case "7f":
                data["soilEC"] = [parseInt(value, 16) / 100, "us/cm"];
                break;
            case "84":
                if (dataChannel == "00") {
                    data['windDirection'] = [parseInt(value, 16), '°'];
                } else if (dataChannel == "01") {
                    data['windSpeedAvg'] = [parseInt(value, 16) / 1000, 'm/s'];
                } else if (dataChannel == "02") {
                    data['windSpeedMax'] = [parseInt(value, 16) / 1000, 'm/s'];
                }
                break;
            case "c9":
                data["soilMoisture"] = [parseInt(value, 16) / 100, "%"];
                break;
            case "ca":
                data['pm25'] = [parseInt(value, 16) / 100, 'ug/m3'];
                break;
            case "cb":
                data['dissolvedOxygen'] = [parseInt(value, 16) / 100, 'mg/l'];
                break;
        }

        frameCount--;
        start = end;
        end += 2;
    }

    if (data["temperature"] && data["humidity"]) {
        var heatIndex = parseFloat(HI.heatIndex({ temperature: data["temperature"], humidity: data["humidity"] })).toFixed(2);
        data["heatIndex"] = [heatIndex, '°C', common.getDataStatus("heatIndex", heatIndex)];
    }

    return data;
}

module.exports = giotService;