var forward = require('http-port-forward');

// forward all local 3000 port http requests to 80 port. 
forward(3000, 80);