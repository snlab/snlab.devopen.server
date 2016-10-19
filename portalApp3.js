var bodyParser = require('../../node_modules/body-parser');
var express = require('../../node_modules/express');
var http = require('http');

var app = express();
var server = http.createServer(app);

module.exports = function(url, port) {
  app.get('/', function(req, res) {
    res.redirect(url);
    res.end();
  });

  server.port = port || 9090;
  server.listen(server.port, function() {
    console.log('Controller UI (Custom) listening on ', port);
    console.log('Custom Info: ', url);
  });
  return server;
};
