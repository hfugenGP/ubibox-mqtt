"use strict";

const request = require('request');
const fs = require('fs');
const crypto = require('crypto');

const authUrl = "http://www2.senslink.net/RestService/Users";
const actionUrl = "http://www2.senslink.net/RestService/Actions";

var SenslinkModule = function() {};

var SenslinkModule = function(gateway) {
    this.id = gateway.id;
    this.username = gateway.username;
    this.password = gateway.password;
    this.devices = gateway.devices;
}



// var _loginUsername = "atilze";
// var _loginUserpwd = "smartcity";

// var authKey = "";

SenslinkModule.prototype.flexData = function() {
    request({
        uri: authUrl + "/GetKey",
        method: "POST",
        headers: {
            "MediaType": "HTTP/1.1",
            "Content-Type": "application/json",
        },
        body: JSON.stringify({
            Username: this.username,
            Password: this.password,
            Format: "json"
        })
    }, step1loginCallback)
}

function step1loginCallback(error, response, body) {
    if (!error && response.statusCode == 200) {
        var result = JSON.parse(body);
        this.authKey = result.Key;
        var step2Action = getAuthAction(this.authKey, "ReadSTInfo");

        request({
            uri: actionUrl + "/ReadSTInfo",
            method: "POST",
            headers: {
                "MediaType": "HTTP/1.1",
                "Content-Type": "application/json",
            },
            body: JSON.stringify(step2Action)
        }, step2ReadSTInfoCallback);
    } else if (error) {
        console.log(error.code + " : " + error.message);
    }
}

function step2ReadSTInfoCallback(error, response, body) {
    if (!error && response.statusCode == 200) {
        var result = JSON.parse(body);
        var step3Action = getAuthAction(this.authKey, "ReadPQInfoBySTId");

        result.forEach(function(object) {
            request({
                uri: actionUrl + "/ReadPQInfoBySTId",
                method: "POST",
                headers: {
                    "MediaType": "HTTP/1.1",
                    "Content-Type": "application/json",
                },
                body: JSON.stringify({ userAction: step3Action, sTId: object.STId })
            }, step3ReadPQInfoBySTIdCallback);
        })
    } else if (error) {
        console.log(error.code + " : " + error.message);
    }
}

function step3ReadPQInfoBySTIdCallback(error, response, body) {
    if (!error && response.statusCode == 200) {
        var result = JSON.parse(body);
        var step4Action = getAuthAction(this.authKey, "ReadRealTimeDataBySTId");
        request({
            uri: actionUrl + "/ReadRealTimeDataBySTId",
            method: "POST",
            headers: {
                "MediaType": "HTTP/1.1",
                "Content-Type": "application/json",
            },
            body: JSON.stringify({ userAction: step4Action, sTId: object.STId })
        }, step4ReadRealTimeDataBySTIdCallback);
    } else if (error) {
        console.log(error.code + " : " + error.message);
    }
}

function step4ReadRealTimeDataBySTIdCallback(error, response, body) {
    if (!error && response.statusCode == 200) {
        var result = JSON.parse(body);
    } else if (error) {
        console.log(error.code + " : " + error.message);
    }
}

function getAuthAction(keyResponse, actionName) {
    return {
        EncryptMessage: encryptMessage(keyResponse, actionName),
        Message: actionName,
        Format: "json",
        TimeStamp: new Date().toUTCString(),
        Username: _loginUsername
    }
}

function encryptMessage(keyResponse, actionName) {
    var algorithm = 'sha1';
    var message, hmac;

    var keyBuffer = new Buffer(keyResponse, 'utf-8');
    var actionBuffer = new Buffer(actionName, 'utf-8');

    message = crypto.createHmac('sha1', keyBuffer)
        .update(actionBuffer)
        .digest('base64');

    return message;
}

module.exports = SenslinkModule;