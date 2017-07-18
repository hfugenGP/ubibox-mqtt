const exec = require('child_process').exec;
const config = require('./config/conf');
//"frontail --ui-hide-topbar "
exec("frontail " + config.logStream, function(error, stdout, stderr) {
    if (error) console.log(error);
    if (stdout) console.log(stdout);
    if (stderr) console.log(stderr);
});