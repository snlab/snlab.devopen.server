var fs = require('fs');
var bodyParser = require('../../node_modules/body-parser');
var express = require('../../node_modules/express');
var http = require('http');
var request = require('request');
var sqlite3 = require('../../node_modules/sqlite3');
var Client = require('../../node_modules/ssh2').Client;
var fuuid = require('./fast-uuid.js');

var portalApp = require('./portalApp.js');

var app = express();
var server = http.createServer(app);
app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json());
app.use(function(req, res, next) {
  res.header("Access-Control-Allow-Origin", "*");
  res.header("Access-Control-Allow-Methods", "GET, PUT, POST, DELETE");
  res.header("Access-Control-Allow-Headers", "Access-Control-Allow-Headers, Access-Control-Allow-Origin, Origin, Accept, X-Requested-With, Content-Type, Access-Controller-Requested-Method, Accept-Control-Request-Headers");
  next();
});

// TCP ports pool
var ports = Array(null, Array(100)).map(function(_, i) { return 9001+i; });

// Cache list for controllers' information
var cacheList = {};

function allocatePort(uuid) {
  var controller = cacheList[uuid];
  console.log(controller);
  if (controller && !controller.port) {
    return ports.shift();
  }
}

function testSSHStatus(controller, res) {
  var sshTest = new Client();
  sshTest.on('ready', function() {
    var noerr = true;
    sshTest.shell(function(err, stream) {
      stream.on('close', function() {
        if (noerr)
          console.log("SSH test successfully!");
        res.status(200).json({status: "connect"});
        sshTest.end();
      }).on('data', function() {});
      if (err) {
        noerr = false;
        console.log("Stream error, disconnect");
        res.status(200).json({message: err, status: "disconnect"});
        stream.close();
      };
      stream.end('exit\n');
    });
  }).on('error', function(err) {
    if (err) {
      console.log("Connection error, disconnect");
      res.status(200).json({message: err, status: "disconnect"});
      sshTest.end();
    };
  }).connect({
    host: controller.ip,
    port: controller.sshPort,
    username: controller.login,
    password: controller.password,
    algorithms: {
      kex: [ 'diffie-hellman-group14-sha1', 'diffie-hellman-group1-sha1' ],
      serverHostKey: [ 'ssh-rsa', 'ssh-dss' ]
    }
  });
}

function testTopology(controller, res) {
  var opts = {
    url: "http://" + controller.ip + ":" + controller.restPort +
      "/restconf/operational/network-topology:network-topology",
    headers: {
      'Authorization': 'Basic ' + new Buffer('admin:admin').toString('base64')
    }
  };
  request.get(opts, function(error, response, body) {
    if (response && response.statusCode == 200) {
      var topo = JSON.parse(body)["network-topology"].topology[0];
      if (topo.node) {
        res.status(200).json({topology: topo.node.length});
      } else {
        res.status(200).json({topology: 0});
      }
      return;
    }
    res.status(400).json({message: "Cannot access network topology"});
  });
}

function refreshCache(db, success, fail) {
  console.log("Refresh cache list");
  db.all("SELECT * FROM controllers", function(err, rows) {
    if (err) {
      console.log("Fail to refresh cache list");
      if (fail) fail(err);
      return;
    }
    rows.forEach(function(e, i) {
      if (!cacheList[e.uuid]) {
        cacheList[e.uuid] = {status: {ssh: "unknown", activate: false}};
      }
      cacheList[e.uuid].name = e.name;
      cacheList[e.uuid].ip = e.ip;
      cacheList[e.uuid].sshPort = e.sshPort;
      cacheList[e.uuid].restPort = e.restPort;
      cacheList[e.uuid].login = e.login;
      cacheList[e.uuid].password = e.password;
      rows[i].status = cacheList[e.uuid].status;
    });
    console.log("Cache List:", cacheList);
    if (success) success(rows);
  });
}

/**
 * Database scheme:
 *
 * TABLE controllers:
 *   String  uuid
 *   String  name
 *   String  ip
 *   Integer sshPort
 *   Integer restPort
 *   String  login
 *   String  password
 *   LIVE STATE:
 *     Object  status
 *       Boolean ssh
 *       Boolean activate
 *     Integer port
 *     Object  app
 *
 */

module.exports = function(store, port) {
  var db = new sqlite3.Database(store);

  app.get('/controllers', function(req, res) {
    refreshCache(db, function(data) {
      res.status(200).json(data);
    }, function(err) {
      res.status(400).json({message: err});
    });
  });

  app.post('/controllers', function(req, res) {
    // TODO: check if controller existing
    var uuid = fuuid.v4();
    var name = req.body && req.body.name || 'untitled';
    var ip = req.body && req.body.ip || '127.0.0.1';
    var sshPort = req.body && req.body.sshPort || 8101;
    var restPort = req.body && req.body.restPort || 8181;
    var login = req.body && req.body.login || 'karaf';
    var password = req.body && req.body.password || 'karaf';
    db.run("INSERT INTO controllers VALUES (?, ?, ?, ?, ?, ?, ?)",
           uuid, name, ip, sshPort, restPort, login, password,
           function(err) {
             if (err) {
               res.status(400).json({message: err});
               return;
             }
             cacheList[uuid] = {uuid: uuid, name: name, sshPort: sshPort,
                                restPort: restPort, login: login,
                                password: password,
                                status: {ssh: "unknown", activate: false}};
             console.log("POST controller:", cacheList[uuid]);
             res.status(200).json({uuid: uuid});
           }
          );

  });

  app.post('/controllers/:uuid', function(req, res) {
    var uuid = req.params.uuid;
    var args = [];
    if (req.body) {
      if (req.body.name) {
        args.push("name='" + req.body.name + "'");
      }
      if (req.body.ip) {
        args.push("ip='" + req.body.ip + "'");
      }
      if (req.body.sshPort) {
        args.push("sshPort=" + req.body.sshPort);
      }
      if (req.body.restPort) {
        args.push("restPort=" + req.body.restPort);
      }
      if (req.body.login) {
        args.push("login='" + req.body.login + "'");
      }
      if (req.body.password) {
        args.push("password='" + req.body.password + "'");
      }
    }
    if (!args) {
      console.log("No update");
      res.status(200).json({uuid: uuid});
      return;
    }

    db.run(
      "UPDATE controllers SET " + args.join(', ') + " WHERE uuid='" + uuid + "'",
      function(err) {
        if (err) {
          res.status(400).json({message: err});
          return;
        }
        // TODO: check and update active server if controller information update
        var controller = cacheList[uuid] || {};
        for (var k in req.body) {
          controller[k] = req.body[k];
        }
        cacheList[uuid] = controller;
        console.log("UPDATE controller:", controller);
        res.status(200).json({uuid: uuid, update: req.body});
      }
    );
  });

  app.delete('/controllers/:uuid', function(req, res) {
    var uuid = req.params.uuid;
    db.run("DELETE FROM controllers WHERE uuid='" + uuid + "'", function(err) {
      if (err) {
        res.status(400).json({message: err});
        return;
      }
      console.log("Delete controller", uuid);
      console.log("Cache List:", cacheList);
      if (cacheList[uuid].app) {
        cacheList[uuid].app.close();
      }
      if (cacheList[uuid].port) {
        ports.push(cacheList[uuid].port);
      }
      delete cacheList[uuid];
      res.status(200).json({uuid: uuid});
    });

  });

  app.get('/activate/:uuid', function(req, res) {
    var uuid = req.params.uuid;
    if (cacheList[uuid] && cacheList[uuid].app && cacheList[uuid].port) {
      res.status(200).json({port: app.port});
      return;
    }
    db.all("SELECT ip, restPort, login, password FROM controllers WHERE uuid='" + uuid + "'", function(err, rows) {
      if (err) {
        res.status(400).json({message: err});
        return;
      }
      if (rows) {
        var port = allocatePort(uuid);
        if (port) {
          var app = portalApp({address: rows[0].ip,
                               restPort: rows[0].restPort,
                               login: rows[0].login,
                               password: rows[0].password}, port);
          res.status(200).json({port: app.port});
          cacheList[uuid].app = app;
          cacheList[uuid].port = port;
          cacheList[uuid].status.activate = true;
          console.log("Allocate a port for the above controller");
          console.info("Cache List:", cacheList);
          return;
        }
      }
      res.status(404).json({message: "No such controller"});
    });
  });

  app.get('/inactivate/:uuid', function(req, res) {
    var uuid = req.params.uuid;
    if (cacheList[uuid] && cacheList[uuid].app) {
      cacheList[uuid].app.close();
      if (cacheList[uuid].port) {
        ports.push(cacheList[uuid].port);
      }
      delete cacheList[uuid].app;
      delete cacheList[uuid].port;
      cacheList[uuid].status.activate = false;
      res.status(200).json({message: "Success"});
      return;
    }
    res.status(404).json({message: "No such controller or controller is not activate"});
  });

  app.get('/testssh/:uuid', function(req, res) {
    var uuid = req.params.uuid;
    var controller = cacheList[uuid];
    if (controller) {
      testSSHStatus(controller, res);
    } else {
      res.status(404).json({message: "No such controller"});
    }
  });

  app.post('/testssh', function(req, res) {
    var controller = {
      ip: req.body && req.body.ip || '127.0.0.1',
      sshPort: req.body && req.body.sshPort || 8101,
      login: req.body && req.body.login || 'karaf',
      password: req.body && req.body.password || 'karaf'
    };
    testSSHStatus(controller, res);
  });

  app.get('/testtopology/:uuid', function(req, res) {
    var uuid = req.params.uuid;
    var controller = cacheList[uuid];
    if (controller) {
      testTopology(controller, res);
    } else {
      res.status(404).json({message: "No such controller"});
    }
  });

  port = port || 3000;

  // TODO: close sqlite3 connection once express app closed

  db.run("SELECT * FROM controllers", function(err) {
    db.serialize(function() {
      if (err) {
        db.run("CREATE TABLE controllers (uuid, name, ip, sshPort, restPort, login, password)", function(err) {
          if (err) throw err;
          server.listen(port, function() {
            console.log('Controller manager listening on ', port);
            refreshCache(db);
          });
        });
      }
      else {
        server.listen(port, function() {
          console.log('Controller manager listening on ', port);
          refreshCache(db);
        });
      }
    });
  });
  return server;
}
