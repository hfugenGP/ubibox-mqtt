var ponte = require("ponte");
const config = require('./conf');

var opts = {
    logger: {
        level: 'info'
    },
    http: {
        port: 3000 // tcp
    },
    mqtt: {
        port: 1883, // tcp
        authenticate: function(client, username, password, callback) {
            var authorized = (username === config.fabrick_Broker.username && password.toString() === config.fabrick_Broker.password);
            if (authorized) {
                client.user = username;
            } else {
                //Query user from fabrick dashboard to check
            }
            callback(null, authorized);
        },
        authorizePublish: function(client, topic, payload, callback) {
            callback(null, client.user == topic.split('/')[1]);
        },
        authorizeSubscribe: function(client, topic, callback) {
            callback(null, client.user == topic.split('/')[1]);
        }
    },
    persistence: {
        type: 'redis',
        host: "localhost"
    }
};

var server = ponte(opts);

server.on("updated", function(resource, buffer) {
    console.log("Resource Updated", resource, buffer);
});