var fs = require('fs');
var bodyParser = require('../../node_modules/body-parser');
var express = require('../../node_modules/express');
var http = require('http');
var sqlite3 = require('../../node_modules/sqlite3');
var fuuid = require('./fast-uuid');

var lib_api = require('./lib/test');

var app = express();
var server = http.createServer(app);
var io = require('socket.io')(server);

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

  io.set("origins", "*:*");
  io.on('connection', function(socket){
      console.log("Socket Connected");
  });

  app.use(function(req, res, next) {
    res.header("Access-Control-Allow-Origin", "*");
    res.header("Access-Control-Allow-Methods", "GET, PUT, POST, DELETE");
    res.header("Access-Control-Allow-Headers", "Access-Control-Allow-Headers, Access-Control-Allow-Origin, Origin, Accept, X-Requested-With, Content-Type, Access-Controller-Requested-Method, Accept-Control-Request-Headers");
    next();
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
  app.get('/test/maple/packetlist', api.maple.getPacketList);
  app.get('/test/maple/pkthistory', api.maple.getPacketHistory);

  // Network API
  app.get('/test/network/topology', api.network.getTopology);

  // Integrated with visual programming API
  app.get('/test/visual/linenumber', function(req, res){
    res.send("GET request");
    var linenumber = req.query.line;
    if(linenumber === undefined) return;
    if(typeof(linenumber) === "string"){
        linenumber = parseInt(linenumber);
    }
    console.log(linenumber);
    io.emit("lineNumber", linenumber);
    console.log("sent");
    return;
  });

  server.port = port || 9090;
  server.listen(server.port, function() {
    console.log('Controller UI listening on ', port);
    console.log('Controller Info: ', controller);
  });
  return server;
};
