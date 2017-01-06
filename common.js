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
            return "1010";
        case "B":
            return "1011";
        case "C":
            return "1100";
        case "D":
            return "1101";
        case "E":
            return "1110";
        case "F":
            return "1111";
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