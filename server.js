var fs = require('fs');
var bodyParser = require('../../node_modules/body-parser');
var express = require('../../node_modules/express');
var sqlite3 = require('../../node_modules/sqlite3');
var fuuid = require('./fast-uuid.js');

var portalApp = require('./portalApp.js');

var app = express();
app.use(bodyParser.urlencoded());
app.use(bodyParser.json());
app.use(function(req, res, next) {
  res.header("Access-Control-Allow-Origin", "*");
  res.header("Access-Control-Allow-Methods", "GET, PUT, POST, DELETE");
  res.header("Access-Control-Allow-Headers", "Access-Control-Allow-Headers, Access-Control-Allow-Origin, Origin, Accept, X-Requested-With, Content-Type, Access-Controller-Requested-Method, Accept-Control-Request-Headers");
  next();
});

var ports = Array(null, Array(100)).map(function(_, i) { return 9001+i; });
var cacheList = {};

function allocatePort(uuid) {
  var controller = cacheList[uuid];
  if (controller && !controller.port) {
    return ports.shift();
  }
}

module.exports = function(store, port) {
  var db = new sqlite3.Database(store);
  db.run("SELECT * FROM controllers", function(err) {
    db.serialize(function() {
      if (err) {
        db.run("CREATE TABLE controllers (uuid, name, ip, sshPort, restPort, login, password)");
      }
    });
  });

  app.get('/controllers', function(req, res) {
    db.all("SELECT * FROM controllers", function(err, rows) {
      if (err) {
        res.status(400).json({message: err});
        return;
      }
      rows.forEach(function(e) {
        cacheList[e.uuid] = e;
      });
      res.status(200).json(rows);
    });
  });

  app.post('/controllers', function(req, res) {
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
                                password: password};
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
        var controller = cacheList[uuid] || {};
        for (var k in req.body) {
          controller[k] = req.body[k];
        }
        cacheList[uuid] = controller;
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
      if (cacheList[uuid].port) {
        ports.push(cacheList[uuid].port);
      }
      delete cacheList[uuid];
      res.status(200).json({uuid: uuid});
    });

  });

  app.get('/activate/:uuid', function(req, res) {
    var uuid = req.params.uuid;
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
          return;
        }
      }
      res.status(404).json({message: "No such controller"});
    });
  });

  port = port || 3000;

  // TODO: close sqlite3 connection once express app closed

  app.listen(port, function() {
    console.log('Controller manager listening on ', port);
  });
  return app;
}
