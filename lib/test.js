var request = require('request');
var oauth = require('./oauth');

module.exports = function(cfg) {
  var cfg = cfg;
  cfg.endpoint = "http://" + cfg.address + ":" + cfg.restPort;

  this.info = function(req, res) {
    res.status(200).json({cfg});
  };

  this.oauth = oauth(cfg);

  this.fast = {
    getAllFunction: function(req, res) {
      res.status(400).json({error: "Unsupported API"});
    },
    getFunction: function(req, res) {
      res.status(400).json({error: "Unsupported API"});
    },
    deleteFunction: function(req, res) {
      res.status(400).json({error: "Unsupported API"});
    },

    /**
     * grouping instance-attributes {
     *   leaf instance-id {
     *     type string;
     *   }
     *   leaf class-type {
     *     type string;
     *   }
     *   leaf group-id {
     *     type string;
     *   }
     *   leaf submit-time {
     *     type string;
     *   }
     *   leaf state {
     *     type string;
     *   }
     * }
     *
     * container instance-store {
     *   list instance {
     *     key instance-id;
     *     uses instance-attributes;
     *   }
     * }
     */
    getAllInstance: function(req, res) {
      var opts = {
        url: cfg.endpoint +
          "/restconf/operational/fast-system:instance-store",
        headers: {'Authorization': 'Bearer ' + this.oauth.getToken()}
      };
      request.get(opts, function(error, response, body) {
        if (response.statusCode == 200 ||
            response.statusCode == 201) {
          var data = JSON.parse(body);
          var yangInstances = data['instance-store']['instance'];
          var instances = [];
          yangInstances.forEach(function(e) {
            var instance = {
              instanceId: e['instance-id'],
              instance: {
                invoke: e['class-type'],
                status: e['state'],
                submitTime: e['submit-time']
              }
            };
            if (e['group-id']) {
              instance.instance.groupId = e['group-id'];
            }
            instances.push(instance);
          });
          res.status(200).json(instances);
          return;
        }
        res.status(400).json({error: "Unknown error"});
      });
    },
    getInstance: function(req, res) {
      var opts = {
        url: cfg.endpoint +
          "/restconf/operational/fast-system:instance-store/instance" +
          req.body.uuid,
        headers: {'Authorization': 'Bearer ' + this.oauth.getToken()}
      };
      request.get(opts, function(error, response, body) {
        if (response.statusCode == 200 ||
            response.statusCode == 201) {
          var data = JSON.parse(body);
          var yangInstance = data['instance'][0];
          var instance = {
            invoke: yangInstance['class-type'],
            status: yangInstance['state'],
            submitTime: yangInstance['submit-time']
          };
          if (yangInstance['group-id']) {
            instance.groupId = yangInstance['group-id'];
          }
          res.status(200).json(instance);
          return;
        }
        res.status(400).json({error: "Unknown error"});
      });
    },
    submitInstance: function(req, res) {
      res.status(400).json({error: "Unsupported API"});
    },
    deleteInstance: function(req, res) {
      res.status(400).json({error: "Unsupported API"});
    },

    /**
     * grouping link-attributes {
     *   leaf link-id {
     *     type string;
     *   }
     *   leaf source {
     *     type string;
     *   }
     *   leaf target {
     *     type string;
     *   }
     * }
     *
     * container precedence-graph {
     *   list node {
     *     key instance-id;
     *     uses instance-attributes;
     *   }
     *   list link {
     *     key link-id;
     *     uses link-attributes;
     *   }
     * }
     */
    getPrecedence: function(req, res) {
      var opts = {
        url: cfg.endpoint +
          "/restconf/operational/fast-system:precedence-graph",
        headers: {'Authorization': 'Bearer ' + this.oauth.getToken()}
      };
      request.get(opts, function(error, response, body) {
        if (response.statusCode == 200 ||
            response.statusCode == 201) {
          var data = JSON.parse(body);
          var yangPrecedence = data['precedence-graph'];
          yangPrecedence.node = yangPrecedence.node || [];
          yangPrecedence.link = yangPrecedence.link || [];
          var precedence = {
            nodes: yangPrecedence.node.map(function(e) {
              return e['instance-id'];
            }),
            links: yangPrecedence.link.map(function(e) {
              return {source: e.source, target: e.target};
            })
          };
          res.status(200).json(precedence);
          return;
        }
        res.status(400).json({error: "Unknown error"});
      });
    },

    /**
     * container access-graph {
     *   list access-node {
     *     key id;
     *     leaf id {
     *       type string;
     *     }
     *     leaf type {
     *       type string;
     *     }
     *   }
     *   list access-link {
     *     key link-id;
     *     uses link-attributes;
     *   }
     * }
     */
    getAllDataFlowGraph: function(req, res) {
      var opts = {
        url: cfg.endpoint +
          "/restconf/operational/fast-system:access-graph",
        headers: {'Authorization': 'Bearer ' + this.oauth.getToken()}
      };
      request.get(opts, function(error, response, body) {
        if (response.statusCode == 200 ||
            response.statusCode == 201) {
          var data = JSON.parse(body);
          var yangDataFlow = data['access-graph'];
          var dataflow = {
            nodes: yangDataFlow['access-node'],
            links: yangDataFlow['access-link'].map(function(e) {
              return {source: e.source, target: e.target};
            })
          };
          res.status(200).json(dataflow);
          return;
        }
        res.status(400).json({error: "Unknown error"});
      });
    },
    getDataFlowGraph: function(req, res) {
      var opts = {
        url: cfg.endpoint +
          "/restconf/operational/fast-system:access-graph",
        headers: {'Authorization': 'Bearer ' + this.oauth.getToken()}
      };
      var uuid = req.body.uuid;
      request.get(opts, function(error, response, body) {
        if (response.statusCode == 200 ||
            response.statusCode == 201) {
          var data = JSON.parse(body);
          var yangDataFlow = data['access-graph'];
          var nodes = [];
          var links = yangDataFlow['access-link'].filter(function(e) {
            if (e.source == uuid || e.target == uuid) {
              if (!nodes.find(e.source)) {
                nodes.push(e.source);
              }
              if (!nodes.find(e.target)) {
                nodes.push(e.target);
              }
              return true;
            }
            return false;
          });
          var dataflow = {nodes: nodes, links: links};
          res.status(200).json(dataflow);
          return;
        }
        res.status(400).json({error: "Unknown error"});
      });
    }
  };

  this.maple = {
    // TODO: Maple Management API
    getTrace: function(req, res) {
      var opts = {
        url: cfg.endpoint +
          "/restconf/config/maple-example-api:trace-store",
        headers: {'Authorization': 'Bearer ' + this.oauth.getToken()}
      };
      request.get(opts, function(error, response, body) {
        // TODO: get trace history
        if (response.statusCode == 200 ||
            response.statusCode == 201) {
          res.status(200).json({message: "Test!"});
        }
      });
    }
  };

  return this;
};
