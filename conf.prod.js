"use strict";

var conf = {};

// conf.twitter = {};
// conf.redis = {};
// conf.web = {};

// conf.default_stuff =  ['red','green','blue','apple','yellow','orange','politics'];
// conf.twitter.user_name = process.env.TWITTER_USER || 'username';
// conf.twitter.password=  process.env.TWITTER_PASSWORD || 'password';
// conf.redis.uri = process.env.DUOSTACK_DB_REDIS;
// conf.redis.host = 'hostname';
// conf.redis.port = 6379;
// conf.web.port = process.env.WEB_PORT || 9980;

conf.twilio = {};
conf.fabrickBroker = {};
conf.gemtekBroker = {};
conf.defaultBroker = {};

conf.twilio.accountSid = 'AC052250b50d66b44dbbe4df2f65eec760';
conf.twilio.authToken = 'c2b7883dd9854de0d86e9b4d634d2818';
conf.twilio.phoneTo = '+84908565785';
conf.twilio.phoneFrom = '+16502579348';

// conf.fabrickBroker.idKey = '-Stagging'; //Staging
conf.fabrickBroker.idKey = '-Production'; //Production
// conf.fabrickBroker.host = 'tcp://52.187.41.181'; //Staging
conf.fabrickBroker.host = 'tcp://52.187.188.56'; //Production
conf.fabrickBroker.port = 1883;
conf.fabrickBroker.keepalive = 120;
conf.fabrickBroker.username = "fabrick.io";
conf.fabrickBroker.password = "f@brick@1234";

// conf.defaultBroker.idKey = "Stagging-";
conf.defaultBroker.idKey = "Production-";
conf.defaultBroker.keepalive = 120;
conf.defaultBroker.clean = true;
conf.defaultBroker.reconnectPeriod = 4000;
conf.defaultBroker.rejectUnauthorized = true;
conf.defaultBroker.protocolId = 'MQIsdp';
conf.defaultBroker.protocolVersion = 3;

conf.gatewayTopic = 'conf/GIoT/Gateways';
conf.deviceTopic = 'conf/GIoT/Devices';

conf.authAPI = 'http://fabrick.atilze.com/api/login';

//conf.artisanURL = 'D:/fabrick/fabrickgit/artisan'; //Local
// conf.artisanURL = '/var/www/brazn/fabrick/dashboard/artisan'; //Staging
conf.artisanURL = '/var/www/fabrick/artisan'; //Production


conf.debuggingDevices = ["0a0102b9", "01001003", "0a0102c1", "01001004", "0d01001b", "0d01003e", "01001002", "000003a9", "000003b6", "01001007", "000003aa", "000003b5"];

module.exports = conf;