var ponte = require("ponte");
var request = require('sync-request');
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
            var authorized = (username === config.fabrickBroker.username && password.toString() === config.fabrickBroker.password);
            if (authorized) {
                client.user = username;
            } else if (username && password) {
                var options = {
                    json: {
                        "email": username,
                        "password": password.toString()
                    }
                };

                var res = request('POST', config.authAPI, options);
                var body = JSON.parse(res.body.toString("utf8"));

                if (body && body.result && body.result.status == "success") {
                    authorized = true;
                    client.user = username;
                }
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