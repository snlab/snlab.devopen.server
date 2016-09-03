define(function(require, exports, module) {
  "use strict";

  main.consumes = [
    "Plugin"
  ];
  main.provides = ["controller.managerd"];
  return main;

  function main(options, imports, register) {
    var Plugin = imports.Plugin;
    var proc = require('child_process');
    var manager = require('./server');

    var join = require("path").join;
    var dirname = require("path").dirname;

    /***** Initialization *****/

    var plugin = new Plugin("snlab.org", main.consumes);
    var server;

    var loaded = false;
    function load() {
      if (loaded) return false;
      loaded = true;

      startServer();
    }

    /***** Methods *****/

    // TODO: Start a server to manage the information of controllers
    function startServer() {
      var path = join(dirname(options.packagePath), "controllers.db");
      // server = proc.spawn("node", [path]);
      if (!server) {
        server = manager(path);
      }
    }

    /***** Lifecycle *****/

    plugin.on("load", function(){
      load();
    });
    plugin.on("unload", function(){
      loaded = false;
      server.close();
    });

    /***** Register and define API *****/

    plugin.freezePublicAPI({});

    register(null, {
      "controller.managerd": plugin
    });
  }
});
