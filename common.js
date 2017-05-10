"use strict";

var Common = function() {};

// Common.prototype.hexDecode = function(hexx) {
//     var j;
//     var hexes = hexx.match(/.{1,4}/g) || [];
//     var back = "";
//     for (j = 0; j < hexes.length; j++) {
//         back += String.fromCharCode(parseInt(hexes[j], 16));
//     }

//     return back;
// }

Common.prototype.hexEncode = function(str) {
    var hex, i;

    var result = "";
    for (i = 0; i < str.length; i++) {
        hex = str.charAt(i).toString(16);
        result += ("000" + hex).slice(-4);
    }

    return result
}

Common.prototype.hex2a = function(hexx) {
    var hex = hexx.toString(); //force conversion
    var str = '';
    for (var i = 0; i < hex.length; i += 2)
        str += String.fromCharCode(parseInt(hex.substr(i, 2), 16));
    return str;
}

Common.prototype.hex2bits = function(hex) {
    var bits = "";

    for (var i = 0; i < hex.length; i++)
        bits = bits + hexChar2bits(hex[i]);

    return bits;
}

function hexChar2bits(hexChar) {
    switch (hexChar) {
        case "0":
            return "0000";
        case "1":
            return "0001";
        case "2":
            return "0010";
        case "3":
            return "0011";
        case "4":
            return "0100";
        case "5":
            return "0101";
        case "6":
            return "0110";
        case "7":
            return "0111";
        case "8":
            return "1000";
        case "9":
            return "1001";
        case "A":
        case 'a':
            return "1010";
        case "B":
        case 'b':
            return "1011";
        case "C":
        case 'c':
            return "1100";
        case "D":
        case 'd':
            return "1101";
        case "E":
        case 'e':
            return "1110";
        case "F":
        case 'f':
            return "1111";
    }
}

Common.prototype.roundFloat = function(float, digit) {
    if (digit == 0) {
        return Math.round(float);
    } else if (digit == 1) {
        return Math.round(float * 10) / 10
    } else if (digit == 2) {
        return Math.round(float * 100) / 100;
    }
}


Common.prototype.getDataStatus = function(dataType, value) {
    switch (dataType) {
        case "temperature":
        case "Temperature":
            if (value < 10) {
                return "Normal";
            } else if (value < 20) {
                return "Caution";
            } else if (value < 30) {
                return "Warning";
            } else if (value < 40) {
                return "Danger";
            } else {
                return "Critical";
            }

        case "humidity":
        case "Humidity":
            if (value < 31) {
                return "Normal";
            } else if (value < 66) {
                return "Caution";
            } else if (value < 76) {
                return "Warning";
            } else if (value < 86) {
                return "Danger";
            } else {
                return "Critical";
            }

        case "pm25":
            if (value < 51) {
                return "Normal";
            } else if (value < 101) {
                return "Caution";
            } else if (value < 201) {
                return "Warning";
            } else if (value < 301) {
                return "Danger";
            } else {
                return "Critical";
            }

        case "co":
            if (value < 7) {
                return "Normal";
            } else if (value < 11) {
                return "Warning";
            } else {
                return "Critical";
            }

        case "co2":
            if (value < 451) {
                return "Normal";
            } else if (value < 601) {
                return "Warning";
            } else {
                return "Critical";
            }

        case "depth":
            if (value < 6) {
                return "Normal";
            } else if (value < 17) {
                return "Warning";
            } else {
                return "Critical";
            }

        case "WaterLevel":
            if (value < 51) {
                return "Normal";
            } else if (value < 201) {
                return "Warning";
            } else {
                return "Critical";
            }

        default:
            return "N/A";
    }
}

// function hex2a(hexx) {
//     var hex = hexx.toString();//force conversion
//     var str = '';
//     for (var i = 0; i < hex.length; i += 2)
//         str += String.fromCharCode(parseInt(hex.substr(i, 2), 16));
//     return str;
// }

module.exports = Common;