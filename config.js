"use strict";

var config = {};

// config.twitter = {};
// config.redis = {};
// config.web = {};

// config.default_stuff =  ['red','green','blue','apple','yellow','orange','politics'];
// config.twitter.user_name = process.env.TWITTER_USER || 'username';
// config.twitter.password=  process.env.TWITTER_PASSWORD || 'password';
// config.redis.uri = process.env.DUOSTACK_DB_REDIS;
// config.redis.host = 'hostname';
// config.redis.port = 6379;
// config.web.port = process.env.WEB_PORT || 9980;

config.twilio = {};
config.fabrickBroker = {};
config.gemtekBroker = {};
config.defaultBroker = {};

config.twilio.accountSid = 'AC052250b50d66b44dbbe4df2f65eec760';
config.twilio.authToken = 'c2b7883dd9854de0d86e9b4d634d2818';
config.twilio.phoneTo = '+84908565785';
config.twilio.phoneFrom = '+16502579348';

// config.fabrickBroker.idKey = '52.187.41.181'; //Staging
config.fabrickBroker.idKey = '52.187.188.56'; //Production
// config.fabrickBroker.host = 'tcp://52.187.41.181'; //Staging
config.fabrickBroker.host = 'tcp://52.187.188.56'; //Production
config.fabrickBroker.port = 1883;
config.fabrickBroker.keepalive = 120;

config.defaultBroker.keepalive = 120;
config.defaultBroker.clean = true;
config.defaultBroker.reconnectPeriod = 4000;
config.defaultBroker.rejectUnauthorized = true;
config.defaultBroker.protocolId = 'MQIsdp';
config.defaultBroker.protocolVersion = 3;

config.gatewayTopic = 'config/GIoT/Gateways';
config.deviceTopic = 'config/GIoT/Devices';

//config.artisanURL = 'D:/fabrick/fabrickgit/artisan'; //Local
//config.artisanURL = '/var/www/brazn/fabrick/dashboard/artisan'; //Staging
config.artisanURL = '/var/www/fabrick/artisan'; //Production

module.exports = config;