function updateDataFlow() {
  d3.json(endpoint + '/fast/dataflow')
    .get(function(error, graph) {
      if (error) throw error;

      var nodes = [];
      var links = [];

      var nodeMap = [];

      if (graph.nodes) {
        graph.nodes.forEach(function (node) {
          nodes.push({
            group: 'nodes',
            classes: node.type,
            data: {
              id: node.id,
              name: node.type == 'iid' ?
                node.id.split(',')[0].split('.').pop() : node.id,
              tooltip: node.type == 'iid' ?
                node.id : (endpoint + '/fast/instance/' + node.id)
            }
          });
        });
      }
      if (graph.links) {
        graph.links.forEach(function (link) {
          links.push({
            group: "edges", class: 'relation',
            data: {
              source: [link['source']],
              target: [link['target']]
            }
          });
        });
      }

      var dataflow = window.dataflow = cytoscape({
        container: document.getElementById('dataflow'),
        boxSelectionEnabled: false,
        autounselectify: true,
        layout: {
          name: 'dagre'
        },
        style: [
          {
            selector: 'node',
            style: {
              'content': 'data(name)',
              'text-opacity': 0.5,
              'text-valign': 'center',
              'text-halign': 'right',
              'background-color': '#11479e'
            }
          },
          {
            selector: 'edge',
            style: {
              'width': 4,
              'target-arrow-shape': 'triangle',
              'line-color': '#9dbaea',
              'target-arrow-color': '#9dbaea'
            }
          },
          {
            selector: '.iid',
            style: {
              'shape':'rectangle',
              'background-color': '#11479e'
            }
          }
        ],
        elements: {
          nodes: nodes,
          edges: links
        }
      });

      dataflow.nodes().qtip({
        content: function() {
          return this.data().tooltip;
        },
        position: {
          my: 'top center',
          at: 'bottom center'
        },
        show: {
          event: 'mousemove'
        },
        hide: {
          event: 'mouseout unfocus'
        }
      });
    });
}
