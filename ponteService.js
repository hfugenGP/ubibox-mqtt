var ponte = require("ponte");
var request = require('request')
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

server.on("ready", function() {
    {
        server.authenticate = function(client, username, password, callback) {
            var authorized = (username === config.fabrickBroker.username && password.toString() === config.fabrickBroker.password);
            if (authorized) {
                client.user = username;
                callback(null, authorized);
            } else {
                var options = {
                    method: 'post',
                    body: {
                        "email": username,
                        "password": password
                    },
                    json: true, // Use,If you are sending JSON data
                    url: config.authAPI,
                    headers: {
                        'Content-Type': 'application/json',
                        'Accept': 'application/json'
                    },
                };

                request(options, function(err, res, body) {
                    if (err) {
                        console.log('Error :', err)
                        callback(null, authorized);
                        return;
                    }

                    if (body.status == "success") {
                        authorized = true;
                        client.user = username;
                        callback(null, authorized);
                    }
                });
            }
        };


        server.authorizePublish = function(client, topic, payload, callback) {
            callback(null, client.user == topic.split('/')[1]);
        };
        server.authorizeSubscribe = authorizeSubscribe: function(client, topic, callback) {
            callback(null, client.user == topic.split('/')[1]);
        };
    }
});