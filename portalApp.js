var fs = require('fs');
var bodyParser = require('../../node_modules/body-parser');
var express = require('../../node_modules/express');
var http = require('http');
var sqlite3 = require('../../node_modules/sqlite3');
var fuuid = require('./fast-uuid');

var lib_api = require('./lib/test');

var app = express();
var server = http.createServer(app);

module.exports = function(controller, port) {
  var cfg = controller;
  var api = lib_api(cfg);

  app.use(express.static(__dirname + '/public_html'));
  app.use(bodyParser.urlencoded({ extended: true }));
  app.use(bodyParser.json());

  app.get('/', function(req, res) {
    res.writeHead(302, {Location: '/index.html'});
    res.end();
  });

  // Basic Controller Information
  app.get('/test/info', api.info);

  // FAST API
  // Function Management
  app.get('/test/fast/function', api.fast.getAllFunction);
  app.get('/test/fast/function/:uuid', api.fast.getFunction);
  app.delete('/test/fast/function/:uuid', api.fast.deleteFunction);
  // Function Instance Management
  app.get('/test/fast/instance', api.fast.getAllInstance);
  app.get('/test/fast/instance/:uuid', api.fast.getInstance);
  app.post('/test/fast/instance', api.fast.submitInstance);
  app.delete('/test/fast/instance/:uuid', api.fast.deleteInstance);
  // Dependency Track
  app.get('/test/fast/precedence', api.fast.getPrecedence);
  app.get('/test/fast/dataflow', api.fast.getAllDataFlowGraph);
  app.get('/test/fast/dataflow/:uuid', api.fast.getDataFlowGraph);

  // Maple API
  app.get('/test/maple/trace', api.maple.getTrace);
  app.get('/test/maple/tracetree', api.maple.getTraceTree);
  app.get('/test/maple/tracetreehistory/:seqnum', api.maple.getTraceTreeHistory);
  app.get('/test/maple/tracetreehistory_seq', api.maple.getTraceTreeSequenceNumber);
  app.get('/test/maple/pkthistory', api.maple.getPacketHistory);

  // Network API
  app.get('/test/network/topology', api.network.getTopology);

  server.port = port || 9090;
  server.listen(server.port, function() {
    console.log('Controller UI listening on ', port);
    console.log('Controller Info: ', controller);
  });
  return server;
};
