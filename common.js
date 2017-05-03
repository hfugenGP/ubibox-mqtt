"use strict";

var Common = function() {};

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

// function hex2a(hexx) {
//     var hex = hexx.toString();//force conversion
//     var str = '';
//     for (var i = 0; i < hex.length; i += 2)
//         str += String.fromCharCode(parseInt(hex.substr(i, 2), 16));
//     return str;
// }

module.exports = Common;