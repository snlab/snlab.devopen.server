var fs = require('fs');
var bodyParser = require('../../node_modules/body-parser');
var express = require('../../node_modules/express');
var http = require('http');
var sqlite3 = require('../../node_modules/sqlite3');
var fuuid = require('./fast-uuid');

var test = require('./lib/test');

var app = express();
var server = http.createServer(app);

module.exports = function(controller, port) {
  var cfg = controller;

  app.use(express.static(__dirname + '/public_html'));
  app.use(bodyParser.urlencoded({ extended: true }));
  app.use(bodyParser.json());

  app.get('/', function(req, res) {
    res.writeHead(302, {Location: '/index.html'});
    res.end();
  });

  // Function Management
  app.get('/test/fast/function', test.fast.getAllFunction);
  app.get('/test/fast/function/:uuid', test.fast.getFunction);
  app.delete('/test/fast/function/:uuid', test.fast.deleteFunction);
  // Function Instance Management
  app.get('/test/fast/instance', test.fast.getAllInstance);
  app.get('/test/fast/instance/:uuid', test.fast.getInstance);
  app.post('/test/fast/instance', test.fast.submitInstance);
  app.delete('/test/fast/instance/:uuid', test.fast.deleteInstance);
  // Dependency Track
  app.get('/test/fast/dependency/precedence', test.fast.getPrecedence);
  app.get('/test/fast/dependency/access', test.fast.getAllAccessGraph);
  app.get('/test/fast/dependency/access/:uuid', test.fast.getAccessGraph);

  server.port = port || 9090;
  server.listen(port, function() {
    console.log('Controller UI listening on ', port);
    console.log('Controller Info: ', controller);
  });
  return server;
}
