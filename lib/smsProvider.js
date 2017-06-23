"use strict";

var SMSProvider = function (id, token) {
    this.twilio_client = require('twilio')(twilioAccountSid, twilioAuthToken);
}

SMSProvider.prototype.send = function (phoneFrom, phoneTo, message) {
    this.twilio_client.messages.create({
        to: phoneTo,
        from: phoneFrom,
        body: message
    }, function (err, message) {
        console.log(message.sid);
    });
}

module.exports = SMSProvider;