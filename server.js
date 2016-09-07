var fs = require('fs');
var bodyParser = require('../../node_modules/body-parser');
var express = require('../../node_modules/express');
var http = require('http');
var sqlite3 = require('../../node_modules/sqlite3');
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

function checkSSHStatus(controller) {
  // Check the status of ssh connection for each controller
  if (!controller) {
    Object.keys(cacheList).forEach(function(uuid) {
      checkSSHStatus(cacheList[uuid]);
    });
  }
  // TODO: test ssh connection for a given controller
  return;
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
 *   External
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
    db.all("SELECT * FROM controllers", function(err, rows) {
      if (err) {
        res.status(400).json({message: err});
        return;
      }
      rows.forEach(function(e) {
        if (!cacheList[e.uuid]) {
          cacheList[e.uuid] = {status: {ssh: false, activate: false}};
        }
        cacheList[e.uuid].name = e.name;
        cacheList[e.uuid].ip = e.ip;
        cacheList[e.uuid].sshPort = e.sshPort;
        cacheList[e.uuid].restPort = e.restPort;
        cacheList[e.uuid].login = e.login;
        cacheList[e.uuid].password = e.password;
      });
      checkSSHStatus();
      console.log("GET controllers:", rows);
      console.log("Cache List:", cacheList);
      res.status(200).json(rows);
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
                                status: {ssh: false, activate: false}};
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
    // TODO: check if already active
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
          cacheList[uuid].status.activate = true;
          console.log("Allocate a port for the above controller");
          console.log("Cache List:", cacheList);
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

  port = port || 3000;

  // TODO: close sqlite3 connection once express app closed

  db.run("SELECT * FROM controllers", function(err) {
    db.serialize(function() {
      if (err) {
        db.run("CREATE TABLE controllers (uuid, name, ip, sshPort, restPort, login, password)", function(err) {
          if (err) throw err;
          app.listen(port, function() {
            console.log('Controller manager listening on ', port);
          });
        });
      }
      else {
        server.listen(port, function() {
          console.log('Controller manager listening on ', port);
        });
      }
    });
  });
  return server;
}
