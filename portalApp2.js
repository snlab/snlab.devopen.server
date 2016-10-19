var bodyParser = require('../../node_modules/body-parser');
var express = require('../../node_modules/express');
var http = require('http');

var app = express();
var server = http.createServer(app);

module.exports = function(controller, port) {
  var cfg = controller;

  app.use(express.static(__dirname + '/public_html2'));
  app.use(bodyParser.urlencoded({ extended: true }));
  app.use(bodyParser.json());

  app.get('/', function(req, res) {
    res.writeHead(302, {Location: '/index.html'});
    res.end();
  });

  server.port = port || 9090;
  server.listen(server.port, function() {
    console.log('Controller UI (OF-NG) listening on ', port);
    console.log('Controller Info: ', controller);
  });
  return server;
};
