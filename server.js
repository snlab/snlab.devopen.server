var fs = require('fs');
var bodyParser = require('../../node_modules/body-parser');
var express = require('../../node_modules/express');
var sqlite3 = require('../../node_modules/sqlite3');
var fuuid = require('./fast-uuid.js');

var app = express();
app.use(bodyParser.json());

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
      res.status(200).json(rows);
    });
  });

  app.post('/controllers', function(req, res) {
    var uuid = fuuid.v4();
    db.run("INSERT INTO controllers VALUES (?, ?, ?, ?, ?, ?, ?)",
      uuid,
      req.body && req.body.name || 'untitled',
      req.body && req.body.ip || '127.0.0.1',
      req.body && req.body.sshPort || 8101,
      req.body && req.body.restPort || 8181,
      req.body && req.body.login || 'karaf',
      req.body && req.body.password || 'karaf',
      function(err) {
        if (err) {
          res.status(400).json({message: err});
          return;
        }
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
      res.status(200).json({uuid: uuid});
    });

  });

  port = port || 3000;

  // TODO: close sqlite3 connection once express app closed

  app.listen(port, function() {
    console.log('Controller manager listening on ', port);
  });
  return app;
}
