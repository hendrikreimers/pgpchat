
// Configuration
var config = require('./config.js');

// Loading dependencies
var express    = require('express'),
    http       = require('http'),
    path       = require('path'),
    socket     = require('socket.io'),
    bodyParser = require('body-parser'),
    crypto     = require('crypto'),
    mvc        = require(__dirname + '/Classes/Mvc/App');

// Create the server [Trick to combine Socket.IO and Express]
var app    = module.exports.app = express(),
    server = http.createServer(app),
    io     = socket.listen(server);

// Set public folder
app.use(express.static(config.folders.public));

// Set bodyparser for POST data
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({extended: true}));

// Setup the template engine
app.set('views', config.folders.private + 'Templates/');
app.set('view engine', 'html');
app.engine('html', require('ejs').renderFile);

// Reset the login password every hour
config.password = Math.random().toString(36).slice(2, 13);
console.log('CURRENT PASSWORD: ' + config.password);
setInterval(function() {
    config.password = Math.random().toString(36).slice(2, 13);
    console.log('CURRENT PASSWORD: ' + config.password);
}, 1000 * 60 * 60); // 1 hour

// create data Object
config.data = {};

// Autoload controllers
mvc.autoload(path.join(__dirname, '/Classes/Controller'), function(controllers) {
    // Init the controllers
    for ( var controller in controllers ) {
        controllers[controller](app, io, config);
    };
});

// Start listening
server.listen(config.listen.port, config.listen.ip);
