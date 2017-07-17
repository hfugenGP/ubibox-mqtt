const exec = require('child_process').exec;
const config = require('./config/conf');

exec("frontail --ui-hide-topbar " + config.logStream, function(error, stdout, stderr) {
    if (error) console.log(error);
    if (stdout) console.log(stdout);
    if (stderr) console.log(stderr);
});