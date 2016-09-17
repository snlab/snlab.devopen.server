// Topology.js
// Helpers and NeXt viz to draw topology of a network

var Topology = function() {
  return {
    init: function() {
      nx.define('FRMNodeTooltip', nx.ui.Component, {
        properties: {
          node: {}
        },
        view: {
          content: [
            {
              tag: 'h1',
              content: '{#node.model.name}'
            },
            {
              tag: 'p',
              content: [
                {
                  tag: 'label',
                  props: {
                    style: 'margin-right: 5px;'
                  },
                  content: 'MAC:'
                },
                {
                  tag: 'span',
                  content: '{#node.model.mac}'
                }
              ]
            },
            {
              tag: 'p',
              props: {
                class: 'col-md-12',
                border: '1'
              },
              content: [
                {
                  tag: 'thead',
                  props: {
                    style: 'font-weight: bold'
                  },
                  content: [
                    {
                      tag: 'td',
                      content: 'match'
                    },
                    {
                      tag: 'td',
                      content: 'action'
                    }
                  ]
                },
                {
                  tag: 'tbody',
                  props: {
                    items: '{#node.model.table}',
                    template: {
                      tag: 'tr',
                      content: [
                        {
                          tag: 'td',
                          content: '{match}'
                        },
                        {
                          tag: 'td',
                          content: '{action}'
                        }
                      ]
                    }
                  }
                }
              ]
            }
          ]
        }
      });

      this.topo = new nx.graphic.Topology({
        width: 640,
        height: 640,
        nodeConfig: {
          label: 'model.name',
          iconType: 'model.iconType'
        },
        linkConfig: {
          linkType: 'curve'
        },
        tooltipManagerConfig: {
          nodeTooltipContentClass: 'FRMNodeTooltip'
        },
        showIcon: true,
        identityKey: 'name',
        autoLayout: true,
        dataProcessor: 'force'
      });

      $(window).resize(this.resize);
    },

    deinit: function() {
      this.topo = null;
      this.app = null;
      this.view = null;

      clearInterval(this.topologyTimerId);
    },

    resize: function() {
      if (this.view && this.topo) {
        this.topo.resize($(this.view).width(), $(this.view).height());
      }
    },

    installView: function(view) {
      this.view = view;
      this.app = new nx.ui.Application();
      this.app.container(this.view);
      this.topo.attach(this.app);
      this.resize();
    },

    pollServer: function() {
      var _this = this;
      d3.json(endpoint + '/network/topology')
        .get(function (error, graph) {
          if (error) throw error;

          var old = _this.topo.data();
          graph.nodes.forEach(function(node) {
            if (node.type === 'host') {
              node.iconType = 'server';
            } else if (node.type === 'switch') {
              node.iconType = 'switch';
            }

            var oldNode = old.nodes.find(function(e) {
              return e.name == node.name;
            });

            if (oldNode) {
              node.x = oldNode.x;
              node.y = oldNode.y;
              node.px = oldNode.px;
              node.py = oldNode.py;
            }
          });

          _this.topo.data(graph);
        });
    },

    periodicallyUpdate: function(interval) {
      interval = interval || 1000;
      this.topologyTimerId = setInterval(function() {
        Topology.pollServer();
      }, interval);
    }
  };
}();
