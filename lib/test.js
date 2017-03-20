var request = require('request');
var oauth = require('./oauth');

var utils = {
  count: 0,

  transform: function(topo, inv, ht) {
    var _this = this;
    var out = {};
    var intermediates = {};

    // save a map of links that have been taken down
    intermediates.downlinks = {};
    if (inv.nodes.node) {
      inv.nodes.node.forEach(function(node) {
        node["node-connector"].forEach(function(connector) {
          if (connector["flow-node-inventory:state"]["link-down"]) {
            intermediates.downlinks[connector.id] = true;
          }
        });
      });
    }

    // save a map of node ids/tp ids to mac address
    // save a map of switch names
    intermediates.macs = {};
    intermediates.names = {};
    intermediates.tables = {};
    if (inv.nodes.node) {
      inv.nodes.node.forEach(function(node) {
        node["node-connector"].forEach(function(connector) {
          if (connector.id.indexOf("LOCAL") >= 0) {
            intermediates.macs[node.id] = connector["flow-node-inventory:hardware-address"];
            intermediates.names[node.id] = connector["flow-node-inventory:name"];
            intermediates.tables[node.id] = _this.getFlowTableById(node['flow-node-inventory:table'], 0);
          } else {
            intermediates.macs[connector.id] = connector["flow-node-inventory:hardware-address"];
          }
        });
      });
    }

    var topology = topo["network-topology"].topology[0];

    // push nodes
    out.nodes = [];
    var seenNode = {};

    // push switches to out.nodes
    if (topology.node) {
      this.count = 0;
      topology.node.forEach(function(n, i) {
        var node = {};
        if (_this.extractNodeType(n["node-id"]) == "host") {
          intermediates.names[n["node-id"]] = _this.extractHostName(n["node-id"]);
          node = {
            deviceId: n["node-id"],
            name: intermediates.names[n["node-id"]],
            address: _this.extractNodeNo(n["node-id"]),
            type: 'host'
          };
        } else {
          node = {
            deviceId: n["node-id"],
            name: intermediates.names[n["node-id"]],
            address: intermediates.macs[n["node-id"]],
            table: intermediates.tables[n["node-id"]],
            type: 'switch'
          };
        }

        if (!seenNode[node.name]) {
          seenNode[node.name] = true;
          out.nodes.push(node);
        }
      });
    }

    // push links
    out.links = [];
    var seenPort = {};
    var seenLink = {};

    if (topology.link) {
      topology.link.forEach(function(l) {
        // prune redundant links
        if (!intermediates.downlinks[l["link-id"]] && !seenPort[l.source["source-tp"]] && !seenPort[l.destination["dest-tp"]]) {
          var link = {
            id: l["link-id"],
            source: l.source["source-node"],
            target: l.destination["dest-node"],
            sourcePort: l.source["source-tp"],
            targetPort: l.destination["dest-tp"]
          };
          seenPort[l.source["source-tp"]] = true;
          seenPort[l.destination["dest-tp"]] = true;
          out.links.push(link);
        }
        seenLink[l["link-id"]] = true;
      });
    }

    // Augment host table from Maple if existing
    var hostTable = ht['host-table'] || {};
    var hostItem = hostTable['host-item'] || [];
    hostItem
      .sort(function(a, b) {return a['host-id'] - b['host=id'];})
      .forEach(function(n, i) {
        n["node-id"] = "maple-host:" + n["host-id"];
        intermediates.names[n["node-id"]] = _this.extractHostName(n["node-id"]);
        var node = {
          deviceId: n["node-id"],
          name: intermediates.names[n["node-id"]],
          address: _this.extractAddress(n["host-id"]),
          type: 'host'
        };
        if (!seenNode[node.name]) {
          seenNode[node.name] = true;
          out.nodes.push(node);
        }

        var link = {
          id: n["tp-id"],
          source: node.name,
          target: intermediates.names[_this.extractNodeId(n["tp-id"])],
          targetPort: n["tp-id"]
        };
        seenPort[n["tp-id"]] = true;
        out.links.push(link);
        seenLink[link.id] = true;
      });

    return out;
  },

  extractHostName: function(nodeName) {
    return "h" + (++this.count);
  },

  extractNodeType: function(nodeName) {
    return nodeName.slice(0, nodeName.indexOf(":"));
  },

  extractNodeNo: function(nodeName) {
    return nodeName.slice(nodeName.indexOf(":") + 1);
  },

  extractNodeId: function(tpName) {
    return tpName.slice(0, tpName.lastIndexOf(":"));
  },

  extractPort: function(tpName) {
    return parseInt(tpName.slice(tpName.lastIndexOf(":") + 1));
  },

  getFlowTableById: function(tables, id) {
    var _this = this;
    var flows = [];

    if ( tables ) {
      var target_table = tables.find(function(t) {
        return t.id == id;
      });

      if (target_table && target_table.flow) {
        target_table.flow.forEach(function (f, i) {
          var flow = {
            match: _this.extractMatch(f.match),
            action: _this.extractAction(f.instructions.instruction)
          };
          flows.push(flow);
        });
      }
    }

    return flows;
  },

  extractMatch: function(match) {
    var out = [];
    if (match["ethernet-match"]) {
      var ethmatch = match["ethernet-match"];
      ethmatch["ethernet-type"] && out.push("type=0x" + (ethmatch["ethernet-type"].type).toString(16));
      ethmatch["ethernet-source"] && out.push("src=" + ethmatch["ethernet-source"].address);
      ethmatch["ethernet-destination"] && out.push("dst=" + ethmatch["ethernet-destination"].address);
    }
    return out.join(",\n");
  },

  extractAction: function(instructions) {
    var out = [];
    instructions.forEach(function (inst, i) {
      if (inst["apply-actions"]) {
        var actions = inst["apply-actions"].action;
        actions.forEach(function (a, i) {
          a["output-action"] && out.push(a["output-action"]["output-node-connector"]);
        });
      }
    });
    return out.join(",");
  },

  extractAddress: function(binary) {
    var sep1 = binary >> 24;
    binary -= sep1 << 24;
    var sep2 = binary >> 16;
    binary -= sep2 << 16;
    var sep3 = binary >> 8;
    binary -= sep3 << 8;
    var sep4 = binary;
    return [sep1, sep2, sep3, sep4].join('.');
  },

  prettifyUnderscoreCase: function(str) {
    return str.toLowerCase().replace(/_(.)/g, function(match, group1) {
      return group1.toUpperCase();
    });
  }
}

module.exports = function(cfg) {
  var cfg = cfg;
  cfg.endpoint = "http://" + cfg.address + ":" + cfg.restPort;

  this.info = function(req, res) {
    res.status(200).json(cfg);
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
        if (error) {
          res.status(400).json({error: error});
          return;
        }
        if (response.statusCode == 200 ||
            response.statusCode == 201) {
          var data = JSON.parse(body);
          var yangInstances = data['instance-store']['instance'] || [];
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
        if (error) {
          res.status(400).json({error: error});
          return;
        }
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
        if (error) {
          res.status(400).json({error: error});
          return;
        }
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
        if (error) {
          res.status(400).json({error: error});
          return;
        }
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
        if (error) {
          res.status(400).json({error: error});
          return;
        }
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
        // TODO: get trace store
        if (error) {
          res.status(400).json({error: error});
          return;
        }
        if (response.statusCode == 200 ||
            response.statusCode == 201) {
          res.status(200).json({message: "Test!"});
          return;
        }
        res.status(400).json({error: "Unknown error"});
      });
    },

    getTraceTreeSequenceNumber: function(req, res) {
      var opts = {
        url: cfg.endpoint +
          "/restconf/operational/maple-tracetree-history:tracetreehistory/history-count/",
        headers: {'Authorization': 'Bearer ' + this.oauth.getToken()}
      };
      request.get(opts, function(error, response, body) {
        if (error) {
          res.status(400).json({error: error});
          return;
        }
        if (response.statusCode == 200 ||
            response.statusCode == 201) {
          var data = JSON.parse(body);
          var seq_num = data['history-count']['count'];
          var out = {}
          out.seq_num = seq_num;
          res.status(200).json(out);
          return;
        }
        res.status(400).json({error: "Unknown error"});
      });
    },

    getTraceTreeHistory: function(req, res) {
      var seq = parseInt(req.params["seqnum"]);
      var opts = {
        url: cfg.endpoint +
          "/restconf/operational/maple-tracetree-history:tracetreehistory/history/" + seq + "/",
        headers: {'Authorization': 'Bearer ' + this.oauth.getToken()}
      };
      request.get(opts, function(error, response, body) {
        if (error) {
          res.status(400).json({error: error});
          return;
        }
        if (response.statusCode == 200 ||
            response.statusCode == 201) {
          var data = JSON.parse(body);
          var yangTT = data['history'][0]['tracetree-v2'];
          var tree = {};
          tree.ttnodes = yangTT['tt-node-v2'].map(function(n) {
            var outnode = {};
            Object.keys(n).forEach(function(k) {
              switch(k) {
                case 'action-type': // make history API like live API
                  outnode["maple-l-type:action-type"] = n[k]
                  break;
                case "matchfield":
                  outnode["maple-v-type:field"] = n[k];
                  break;
                case "link":
                  outnode["maple-l-type:link"] = n[k];
                case "testfield":
                  outnode["maple-t-type:field"] = n[k];
                default:
                  outnode[k] = n[k];
                  break;
              }
            });
            // if (outnode.type == "V") {
            //   outnode.type = utils.prettifyUnderscoreCase(outnode['maple-v-type:field']);
            //   outnode['maple-v-type:field'] = undefined;
            // }
            return outnode;
          });
          tree.ttlinks = yangTT['tt-link-v2'].map(function(l) {
            var outlink = {};
            Object.keys(l).forEach(function(k) {
              switch(k) {
              case 'predicate-id':
                outlink.predicateID = l[k];
                break;
              case 'destination-id':
                outlink.destinationID = l[k];
                break;
              default:
                outlink[k] = l[k];
                break;
              }
            });
            return outlink;
          });
          var packetStr = data['history'][0]['pkt']['pkt-str'];
          var out = {'tracetree': tree, 'packet': packetStr};
          res.status(200).json(out);
          return;
        }
        res.status(400).json({error: "Unknown error"});
      });
 
      return;
    },

    getTraceTree: function(req, res) {
       var opts = {
        url: cfg.endpoint +
          "/restconf/config/maple-tracetree:tracetree",
        headers: {'Authorization': 'Bearer ' + this.oauth.getToken()}
      };
      request.get(opts, function(error, response, body) {
        if (error) {
          res.status(400).json({error: error});
          return;
        }
        if (response.statusCode == 200 ||
            response.statusCode == 201) {
          var data = JSON.parse(body);
          var yangTT = data['tracetree'];
          var out = {};
          out.ttnodes = yangTT.ttnode.map(function(n) {
            var outnode = {};
            Object.keys(n).forEach(function(k) {
              outnode[k] = n[k];
            });
            // if (outnode.type == "V") {
            //   outnode.type = utils.prettifyUnderscoreCase(outnode['maple-v-type:field']);
            //   outnode['maple-v-type:field'] = undefined;
            // }
            return outnode;
          });
          out.ttlinks = data.tracetree.ttlink.map(function(l) {
            var outlink = {};
            Object.keys(l).forEach(function(k) {
              switch(k) {
              case 'predicate-id':
                outlink.predicateID = l[k];
                break;
              case 'destination-id':
                outlink.destinationID = l[k];
                break;
              default:
                outlink[k] = l[k];
                break;
              }
            });
            return outlink;
          });
          res.status(200).json(out);
          return;
        }
        res.status(400).json({error: "Unknown error"});
      });
      // res.status(200).json(require('./tt_test.json'));
      // res.status(200).json(require('./tt_test2.json'));
   },

    getPacketHistory: function(req, res) {
      res.status(400).json({error: "Unsupported API"});
    }
  };

  this.network = {
    getTopology: function(req, res) {
      var topoOpts = {
        url: cfg.endpoint +
          "/restconf/operational/network-topology:network-topology",
        headers: {'Authorization': 'Bearer ' + this.oauth.getToken()}
      };
      var invOpts = {
        url: cfg.endpoint +
          "/restconf/operational/opendaylight-inventory:nodes",
        headers: {'Authorization': 'Bearer ' + this.oauth.getToken()}
      };
      var htOpts = {
        url: cfg.endpoint +
          "/restconf/config/host-store:host-table",
        headers: {'Authorization': 'Bearer ' + this.oauth.getToken()}
      };
      request.get(topoOpts, function(error, response, body) {
        if (error) {
          res.status(400).json({error: error});
          return;
        }
        if (response.statusCode == 200 ||
            response.statusCode == 201) {
          var topo = JSON.parse(body);
          request.get(invOpts, function(error, response, body) {
            if (error) {
              res.status(400).json({error: error});
              return;
            }
            if (response.statusCode == 200 ||
                response.statusCode == 201) {
              var inv = JSON.parse(body);
              request.get(htOpts, function(error, response, body) {
                var ht = {};
                if (response && response.statusCode == 200) {
                  ht = JSON.parse(body);
                }
                var out = utils.transform(topo, inv, ht);
                res.status(200).json(out);
              });
              return;
            }
            res.status(400).json({error: "Cannot get inventory"});
          });
        } else {
          res.status(400).json({error: "Cannot get topology"});
        }
      });
    }
  };

  return this;
};
