function updatePrecedence() {
  d3.json(endpoint + '/fast/precedence')
    .get(function(error, graph) {
      if (error) throw error;

      var nodes = [];
      var links = [];

      if (graph.nodes) {
        graph.nodes.forEach(function (node) {
          nodes.push({group: "nodes", classes: 'function', data: {id: node}});
        });
      }

      if (graph.links) {
        graph.links.forEach(function (link) {
          links.push({
            group: "edges", class: 'relation',
            data: {
              source: link['source'],
              target: link['target']
            }
          });
        });
      }

      var precedence = window.precedence = cytoscape({
        container: document.getElementById('precedence'),
        boxSelectionEnabled: false,
        autounselectify: true,
        layout: {
          name: 'dagre'
        },

        style: [
          {
            selector: 'node',
            style: {
              'content': 'data(id)',
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
        ],
        elements: {
          nodes: nodes,
          edges: links
        }
      });
    });
}
