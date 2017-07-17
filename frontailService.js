const exec = require('child_process').exec;

exec("frontail /home/fabrick/.pm2/logs/giot-out-3.log", function(error, stdout, stderr) {
    if (error) console.log(error);
    if (stdout) console.log(stdout);
    if (stderr) console.log(stderr);
});