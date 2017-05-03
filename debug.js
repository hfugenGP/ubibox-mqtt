const Common = require('./common')

var rawData = "2f01200016e26e0cd000";
var data = {};

var common = new Common();
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
var soilTemperatureValue = ((120 * soilTemperature) / 1024) - 40;
var airTemperatureValue = ((90 * airTemperature) / 1024) - 10;
var airHumidityValue = (100 * airHumidity) / 1024;
var soilMoistureValue = (100 * soilMoisture) / 1024;
var batteryLevelValue = (5 * batteryLevel) / 256;

data['ph'] = [common.roundFloat(phValue, 2), 'pH'];
data['soilElectrical'] = [common.roundFloat(soilElectricalValue, 2), 'us/cm'];
data['soilTemperature'] = [common.roundFloat(soilTemperatureValue, 2), '°C'];
data['airTemperature'] = [common.roundFloat(airTemperatureValue, 2), '°C'];
data['airHumidity'] = [common.roundFloat(airHumidityValue, 2), '%RH'];
data['soilMoisture'] = [common.roundFloat(soilMoistureValue, 2), '%'];
data['batteryLevel'] = [common.roundFloat(batteryLevelValue, 2), '%'];