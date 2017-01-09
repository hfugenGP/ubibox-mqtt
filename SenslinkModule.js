"use strict";

const request = require('request');
const fs = require('fs');
const crypto = require('crypto');
const q = require('q');
const config = require('./config');
const Broker = require('./broker');

const authUrl = "http://www2.senslink.net/RestService/Users";
const actionUrl = "http://www2.senslink.net/RestService/Actions";

var SenslinkModule = function() {};

var SenslinkModule = function(gateway) {
    this.id = gateway.id;
    this.username = gateway.username;
    this.password = gateway.password;
    this.devices = gateway.devices;
}

var fabrick_gateway = {
    id: "Fabrick Senslink Publisher",
    host: config.fabrickBroker.host,
    port: config.fabrickBroker.port,
    topics: { 'config/Senslink/Devices': 1 }
};

var fabrick_Broker = new Broker(fabrick_gateway, fabrick_gateway.host, {
    keepalive: config.fabrickBroker.keepalive,
    port: fabrick_gateway.port,
    clientId: fabrick_gateway.id
});


// fabrick_Broker.onError((err) => {
//     console.log('error happen with Fabrick broker')
//     console.log(err)
//     fabrick_Broker.end()
// });
// fabrick_Broker.onClose(() => {
//     console.log('Fabrick broker disconnected')
// });
// fabrick_Broker.onReconnect(() => {
//     console.log('Fabrick reconnecting...')
// });
// fabrick_Broker.onOffline(() => {
//     console.log('Fabrick broker is offline')
// });

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
    }, step1loginCallback.bind({ username: this.username, password: this.password, devices: this.devices }));
}

function step1loginCallback(error, response, body) {
    if (!error && response.statusCode == 200) {
        var result = JSON.parse(body);
        var step2Action = getAuthAction(result.Key, "ReadSTInfo", this.username);

        request({
            uri: actionUrl + "/ReadSTInfo",
            method: "POST",
            headers: {
                "MediaType": "HTTP/1.1",
                "Content-Type": "application/json",
            },
            body: JSON.stringify(step2Action)
        }, step2ReadSTInfoCallback.bind({ username: this.username, devices: this.devices, authKey: result.Key }));
    } else if (error) {
        console.log(error.code + " : " + error.message);
    }
}

function step2ReadSTInfoCallback(error, response, body) {
    if (!error && response.statusCode == 200) {
        var result = JSON.parse(body);
        var step3Action = getAuthAction(this.authKey, "ReadPQInfoBySTId", this.username);

        result.forEach(function(object) {
            if (this.devices.indexOf(object.STId) != -1) {
                var message = { "extId": object.STId };
                message['address'] = object.Address;
                message['lng'] = object.LongitudeWGS84;
                message['lat'] = object.LatitudeWGS84;
                message['name'] = object.Name;

                request({
                    uri: actionUrl + "/ReadPQInfoBySTId",
                    method: "POST",
                    headers: {
                        "MediaType": "HTTP/1.1",
                        "Content-Type": "application/json",
                    },
                    body: JSON.stringify({ userAction: step3Action, sTId: object.STId })
                }, step3ReadPQInfoBySTIdCallback.bind({ username: this.username, message: message, authKey: this.authKey }));
            }
        }.bind({ username: this.username, devices: this.devices, authKey: this.authKey }));
    } else if (error) {
        console.log(error.code + " : " + error.message);
    }
}

function step3ReadPQInfoBySTIdCallback(error, response, body) {
    if (!error && response.statusCode == 200) {
        var results = JSON.parse(body);
        this.message['data'] = {};
        this.message['dataIds'] = [];

        var promises = results.map(function(d) {
            var dataName = d.Name.replace(/\s+/, "");
            this.message['dataIds'][d.PQId] = dataName;
            return this.message['data'][dataName] = ["N/A", d.Unit];
            // return this.message;
        }.bind({ message: this.message })); // run the function over all items.

        q.all(promises).then(function(data) {
            var step4Action = getAuthAction(this.authKey, "ReadRealTimeDataBySTId", this.username);
            request({
                uri: actionUrl + "/ReadRealTimeDataBySTId",
                method: "POST",
                headers: {
                    "MediaType": "HTTP/1.1",
                    "Content-Type": "application/json",
                },
                body: JSON.stringify({ userAction: step4Action, sTId: this.message.extId })
            }, step4ReadRealTimeDataBySTIdCallback.bind({ username: this.username, message: this.message, authKey: this.authKey }));
        }.bind({ username: this.username, message: this.message, authKey: this.authKey }));
    } else if (error) {
        console.log(error.code + " : " + error.message);
    }
}

function step4ReadRealTimeDataBySTIdCallback(error, response, body) {
    if (!error && response.statusCode == 200) {
        var results = JSON.parse(body);

        var promises = results.map(function(d) {
            this.message['data'][this.message['dataIds'][d.PQId]][0] = d.Data.Value;

            // var receivedDate = new Date(d.Data.TimeStampIso);

            if (!this.message['receivedDate']) {
                this.message['receivedDate'] = d.Data.TimeStampIso;
            }

            return this.message;
        }.bind({ message: this.message })); // run the function over all items.

        q.all(promises).then(function(data) {
            var fabrick_client = fabrick_Broker.connect();
            console.log(this.message);
            fabrick_Broker.onConnect(() => {
                fabrick_Broker.publish('fabrick.io/device/data', JSON.stringify(this.message), { qos: 1, retain: true }, function(err) {
                    process.exit(); // Done deal.
                });
            });

        }.bind({ message: this.message }));
    } else if (error) {
        console.log(error.code + " : " + error.message);
    }
}

function getAuthAction(keyResponse, actionName, userName) {
    return {
        EncryptMessage: encryptMessage(keyResponse, actionName),
        Message: actionName,
        Format: "json",
        TimeStamp: new Date().toUTCString(),
        Username: userName
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