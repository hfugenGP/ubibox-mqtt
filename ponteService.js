var ponte = require("ponte");

var opts = {
    logger: {
        level: 'info'
    },
    http: {
        port: 3000 // tcp
    },
    mqtt: {
        port: 1883 // tcp
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