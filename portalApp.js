var fs = require('fs');
var bodyParser = require('../../node_modules/body-parser');
var express = require('../../node_modules/express');
var sqlite3 = require('../../node_modules/sqlite3');
var fuuid = require('./fast-uuid.js');

var app = express();
app.use(bodyParser.json());
app.use(function(req, res, next) {
  res.header("Access-Control-Allow-Origin", "*");
  res.header("Access-Control-Allow-Methods", "GET, PUT, POST, DELETE");
  res.header("Access-Control-Allow-Headers", "Access-Control-Allow-Headers, Access-Control-Allow-Origin, Origin, Accept, X-Requested-With, Content-Type, Access-Controller-Requested-Method, Accept-Control-Request-Headers");
  next();
});

module.exports = function(controller, port) {
  app.get('/', function(req, res) {
    res.status(200).send(JSON.stringify(controller));
  });

  app.port = port || 9090;
  app.listen(port, function() {
    console.log('Controller UI listening on ', port);
    console.log('Controller Info: ', controller);
  });
  return app;
}
