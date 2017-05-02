var TraceTree = function() {
  return {
    actionLabels: ['action', 'drop', 'flood', 'punt', 'toPorts'],

    tracetreeCache: {},

    init: function(view) {
      var _this = this;
      _this.view = view;
      _this.tracetreeStringCache = '';
      _this.buildsvg();
      _this.tracetreehistory_seq = -1;
      _this.num_tracetrees = 0;
      // _this.periodicallyUpdate();
      // serverEventSrc = new EventSource('/event');
      // serverEventSrc.newEventListener('message', function(msg) {
      //   _this.pollServer();
      // }, false);
      _this.resize();

      $(window).resize(function() {
        _this.resize();
      });
    },

    deinit: function() {
      this.drag = null;
      this.zoom = null;
      this.packet = null;
      this.svgg = null;
      this.svg = null;
      this.view = null;
      this.tracetreeStringCache = '';
      this.packetList = null;
      clearInterval(this.periodicallyUpdateId);
    },

    resize: function() {
      if (this.view) {
        this.svg
          .attr('height', window.innerHeight)
          .attr('width', $(this.view).width());
      }
    },

    buildsvg: function() {
      var _this = this;
      _this.svg = d3.select(_this.view).select( "svg" );
      _this.svg.classed( { 'grabbing': false, 'grabbable': true } );

      _this.svg.attr( "height", $(_this.view).height() );

      _this.svgg = _this.svg.append( "g" );
      // pan
      _this.zoom = d3.behavior.zoom().on( "zoom", function() {
        _this.svgg.attr( "transform", "translate(" + d3.event.translate + ")" +
                          "scale(" + d3.event.scale + ")" );
      } );

      _this.drag = d3.behavior.drag();

      _this.drag.on( "dragstart", function() {
        _this.dragging = true;
        _this.svg.classed( { 'grabbing': true, 'grabbable': false } );
      } );
      _this.drag.on( "dragend", function() {
        _this.dragging = false;
        _this.svg.classed( { 'grabbing': false, 'grabbable': true } );
      } );

      _this.svg.call( _this.zoom );
      _this.svg.call( _this.drag );
    },

    draw: function(data) {
      var _this = this;
      var tt = new dagreD3.graphlib.Graph( { multigraph: true } ).setGraph({}).setDefaultEdgeLabel( function() { return {}; });

      data.ttnodes.forEach( function( n ) {
        if (n.type == "V") {
          tt.setNode(n.id, {label: n['maple-v-type:field'], class: 'tracetree-node'});
        }
        else if (n.type == "T") {
          tt.setNode(n.id, {label: n['maple-t-type:field'], class: 'tracetree-node'});
        }
        else if (n.type == "L") {
          tt.setNode( n.id, { label: n['maple-l-type:action-type'], class: "tracetree-node" } );
          if (n['maple-l-type:action-type'] == "Path") {
            var actions_label = "";
            if (n["maple-l-type:link"] && n["maple-l-type:link"].length) {
              tt.setNode(n.id + ':action', {label: 'toPorts', class: 'tracetree-node'});
              n["maple-l-type:link"].forEach( function( l ) {
                actions_label = actions_label + l["src-node"].port + " -> " + "\n";
              });
            }
            else if (n["maple-l-type:path-tt"] && n["maple-l-type:path-tt"].length) {
              tt.setNode(n.id + ':action', {label: 'multiPath', class: 'tracetree-node'});
              n["maple-l-type:path-tt"].forEach( function( p ) {
                if (p["link-tt"] && p["link-tt"].length) {
                  actions_label = actions_label + "path" + p["path-id"] + " :\n";
                  p["link-tt"].forEach( function( l ) {
                    actions_label = actions_label + l["src-node"].port + " -> \n";
                  });
                }
              });
            }
            else {
              tt.setNode(n.id + ':action', {label: 'Drop', class: 'tracetree-node'});
            }
            tt.setEdge( n.id
                        , n.id + ":action"
                        , { label: actions_label
                            , lineInterpolate: "bundle" }
                        , n.id + ":path");
          }
        }
      } );

      data.ttlinks.forEach( function( l ) {
        tt.setEdge( l.predicateID
                  , l.destinationID
                  , { label: l.condition
                    , lineInterpolate: "bundle" }
                  , l.id );
      } );

      tt.nodes().forEach( function( n ) {
        var node = tt.node( n );

        if ( node ) {
          if ( _this.nodeIsAction( node ) ) {
            _this.applySpecialActionStyle( node );
            node.rx = 5;
            node.ry = 5;
          } else {
            node.shape = "ellipse";
          }
        }
      } );

      var renderer = new dagreD3.render();

      renderer( d3.select( "svg g" ), tt );

      if ( !_this.resetPosition ) {
        _this.resetPosition = true;
        var bbox = _this.svg.node().getBoundingClientRect();
        var graphScale = bbox.width / tt.graph().width; // fit to viewport
        var top_margin = 20;
        _this.zoom.scale( graphScale )
                   .translate( [ ( bbox.width - graphScale * tt.graph().width ) / 2, top_margin ] )
                   .event( _this.svg );
      }
    },

    drawTree: function( data ) {
      var _this = this;
      var diagonal = d3.svg.diagonal()
        .projection( function( d ) {
          return [d.x, d.y];
        } );

      var duration = 750;
      var tt = [];
      var nodes = {};
      var links = [];

      data.ttnodes.forEach( function( n ) {
        n.name = n.id;
        n.parent = null;
        nodes[ n.id ] = n;
        if (n.type == "V") {
          n.label = n['maple-v-type:field'];
        }
        else if (n.type == "T") {
          n.label = n['maple-t-type:field'];
        }
        else if (n.type == "L") {
          n.label = n['maple-l-type:action-type'];
          if (n['maple-l-type:action-type'] == "Path") {
            var actions_label = "";
            var newN = {};
            if (n["maple-l-type:link"] && n["maple-l-type:link"].length) {
              newN.id = n.id + ':action';
              newN.name = newN.id;
              newN.label = 'toPorts';
              newN.type = "L";
              n["maple-l-type:link"].forEach( function(l, idx, array) {
                actions_label = actions_label + l["src-node"].port;
                if (idx < array.length - 1) {
                  actions_label = actions_label + " -> ";
                }
              });
              data.ttlinks.push({
                predicateID: n.id,
                destinationID: newN.id,
                condition: actions_label});
              nodes[newN.id] = newN;
            }
          }
        }
      } );

      data.ttlinks.forEach( function( l ) {
        var prev = nodes[ l.predicateID ];
        var next = nodes[ l.destinationID ];
        next.parent = l.predicateID;
        if ( !prev.children ) prev.children = [];
        if ( l.condition.startsWith('==') )
          prev.children.unshift( next );
        else
          prev.children.push( next );

        links.push({
          source: prev,
          target: next,
          condition: l.condition });
      } );

      var root = null;
      data.ttnodes.forEach( function( n ) {
        if ( !nodes[ n.id ].parent ) root = nodes[ n.id ];
      } );

      if (this.packet) {
        var currentNode = root;
        while (currentNode && currentNode.children) {
          currentNode.color = true;
          if (currentNode.type == "L") {
            // done
            currentNode = currentNode.children ? currentNode.children[0] : null;
            continue;
          }
          var attribute = currentNode.label;
 
          // search packet for this attribute
          var currentObject = this.packet;
          var packetValue = null;
          while (currentObject) {
            if (currentObject[attribute]) {
              var rawValue = currentObject[attribute];
              switch(attribute) {
                case "ETH_TYPE":
                  if (rawValue == "0x0800") {
                    packetValue = "IPv4";
                  } else if (rawValue == "0x0806") {
                    packetValue = "ARP";
                  } else {
                    packetValue = parseInt(rawValue, 16).toString();
                  }
                  break;
                case "IPv4_DST":
                case "IPv4_SRC":
                  packetValue = rawValue;
                  break;
                default:
                  packetValue = parseInt(rawValue, 16).toString();
              }
              break;
            }
            currentObject = currentObject.payload;
          }

          var nextNode = null;
          links.forEach( function( l ) {
            if (l.source.id != currentNode.id) {
              return;
            }
            if (currentNode.type == "T") {
              if (l.condition.substring(0, 2) == "==" && l.condition.substring(3) == packetValue) {
                nextNode = l.target;
              }
              if (l.condition.substring(0, 2) == "!=" && l.condition.substring(3) != packetValue) {
                nextNode = l.target;
              }
            } else if (currentNode.type == "V") {
              if (l.condition == packetValue) {
                nextNode = l.target;
              }
            }
          });
          currentNode = nextNode;
        }
        if (currentNode) {
          currentNode.color = true;
        }
      } 
      var tree = d3.layout.tree().size([500, 600]);
      nodes = tree.nodes(root);
      // var links = tree.links(nodes);

      nodes.forEach( function( d ) {
        d.y = 100 + d.depth * 100;
        d.x = d.x * 3;
      } );

      var link = _this.svgg.selectAll( "path.link" )
        .data( links, function( d ) { return d.target.id; } );

      var linkLabels = link.enter().append( "g" )
        .attr( "class", "label" )
        .attr("width", 100);

      linkLabels.append( "path", "g" )
        .attr( "class", "link" )
        .attr( "d", diagonal);

      linkLabels.append( "text" )
        .attr( "transform", function( d ) {
          if (d.target.label == "toPorts") {
            return "translate(" + d.target.x + "," + (d.target.y + 30) + ")";
          }
          return "translate(" +
            ( ( d.source.x + d.target.x ) / 2 ) + "," + 
            ( ( d.source.y + d.target.y ) / 2 ) + ")";
        } )
        .attr( "dy", ".35em" )
        .attr( "text-anchor", "middle" )
        .html( function( d ) { return d.condition; } );

      link.transition()
        .duration( duration )
        .attr( "d", diagonal );

      link.exit().transition()
        .duration( duration )
        .attr( "d", function( d ) {
          var o = { x: root.x, y: root.y };
          return diagonal({ source: o, target: o });
        } )
        .remove();

      var node = _this.svgg.selectAll( "g.node" )
        .data( nodes )
        .enter().append( "g" )
        .attr( "class", "tracetree-node" )
        .attr( "transform", function(d) {
          return "translate(" + d.x + "," + d.y + ")";
        })
        .on("mouseover", function(d) {
          if (!d.debuginfo) { return; }
          var n = d3.select(this); // The node
          var textInBox = d.debuginfo.filename + ":" + d.debuginfo.linenumber;
          // render text to get width, then delete it
          var introText = n.append('text')
            .classed('introText', true)
            .attr('x', 0)
            .attr('y', 0)
            .text('Dependency recorded at:');
          var info = n.append('text')
            .classed('info', true)
            .attr('x', 0)
            .attr('y', 0)
            .text(textInBox);
          var textWidth = Math.max(info.node().getComputedTextLength(), introText.node().getComputedTextLength());
          d3.select(this).select("text.info").remove();
          d3.select(this).select("text.introText").remove();
          var rect = n.append("rect")
            .classed("info", true)
            .attr("x", 25)
            .attr("y", -50)
            .attr("width", textWidth + 40)
            .attr("height", 50);
          var introText = n.append('text')
            .classed('introText', true)
            .attr('x', 25 + 20 + textWidth / 2)
            .attr('y', -30)
            .style("text-anchor", "middle")
            .text('Dependency recorded at:');
          var info = n.append('text')
            .classed('info', true)
            .attr('x', 25 + 20 + textWidth / 2)
            .attr('y', -10)
            .style("text-anchor", "middle")
            .text(textInBox);
        })
        .on("mouseout", function() {
          // Remove the info text on mouse out.
          d3.select(this).select('text.introText').remove();
          d3.select(this).select('text.info').remove();
          d3.select(this).select('rect.info').remove();
        });

      node.filter( function( d ) { return d.type == "T"; } )
        .append( "polygon" )
        .attr( "points", "-50 0 0 30 50 0 0 -30" );

      node.filter( function( d ) { return d.type == "V"; } )
        .append( "ellipse" )
        .attr( "cx", 0 )
        .attr( "cy", 0 )
        .attr( "rx", 40 )
        .attr( "ry", 20 );

      node.filter( function( d ) { return d.type == "L"; } )
        .append( "rect" )
        .attr( "x", -25 )
        .attr( "y", -15 )
        .attr( "width", 50 )
        .attr( "height", 30 )
        .attr( "rx", 10 )
        .attr( "ry", 10 );

      node.append( "text" )
        .attr( "y", function( d ) { return 0; } )
        .attr( "dy", ".35em" )
        .attr( "text-anchor", function( d ) { return "middle"; } )
        .text( function( d ) { return d.label; } );

      var shapes = ["polygon", "ellipse", "rect"];
      for (var i in shapes) {
        node.filter( function( d ) { return d.color == true; } )
          .selectAll(shapes[i])
          .style("fill", "yellow");
      }

      nodes.forEach( function( d ) {
        d.x0 = d.x;
        d.y0 = d.y;
      } );

      // if ( !_this.resetPosition ) {
      //   _this.resetPosition = true;
      //   var bbox = _this.svg.node().getBoundingClientRect();
      //   var graphScale = bbox.width / tt.graph().width; // fit to viewport
      //   var top_margin = 20;
      //   _this.zoom.scale( graphScale )
      //              .translate( [ ( bbox.width - graphScale * tt.graph().width ) / 2, top_margin ] )
      //              .event( _this.svg );
      // }
    },

    nodeIsAction: function( node ) {
      return this.actionLabels.indexOf( node.label ) > -1;
    },

    applySpecialActionStyle: function( node ) {
      switch ( node.label ) {
      case "drop":
        node.style = 'fill: #f77; stroke: #000'; // red
        break;
      case "toPorts":
        node.style = 'fill: #afa; stroke: #000'; // green
        break;
      }
    },

    pollServer: function() {
      var _this = this;
      d3.json(endpoint + '/maple/tracetree')
        .get(function(err, data) {
          if (!err) {
            var tracetreeString = JSON.stringify(data);
            if (!(_.isEqual(tracetreeString, _this.tracetreeStringCache))) {
              _this.tracetreeCache = data;
              _this.tracetreeStringCache = tracetreeString;
              if (_this.svg.select("g")) {
                _this.svg.select("g").remove();
                _this.buildsvg();
              }
              _this.drawTree(data);
            }
          }
        });
    },

    nextTracetree: function() {
      var _this = this;
      _this.tracetreehistory_seq++;
      _this.updateTracetreeHistory();
      return _this.tracetreehistory_seq;
    },

    prevTracetree: function() {
      var _this = this;
      if (_this.tracetreehistory_seq > 0) {
        _this.tracetreehistory_seq--;
        _this.updateTracetreeHistory();
      }
      return _this.tracetreehistory_seq;
    },

    selectTracetreeByPacket: function(i) {
      var _this = this;
      _this.tracetreehistory_seq = i;
      _this.updateTracetreeHistory();
    },

    getSelectedTracetreeHistoryFromServer: function() {
      var _this = this;
      d3.json(endpoint + '/maple/tracetreehistory/' + _this.tracetreehistory_seq)
        .get(function(err, data) {
          if (_this.svg.select("g")) {
            _this.svg.select("g").remove();
            _this.buildsvg();
          } 
          if (!err) {
            _this.tracetreeCache = data.tracetree;
            _this.packetStr = data.packetStr;
            _this.packet = data.packetJSON.frame;
            _this.packetTimestamp = data.timestamp;
            document.getElementById("tracetreehistory-packet-timestamp").innerHTML = "Timestamp: ".concat(data.timestamp);
            document.getElementById("tracetreehistory-packet-string").innerHTML = data.packetStr;
            _this.drawTree(data.tracetree);
          }
        });
    },

    constructPacketDropdown: function() {
      var _this = this;
      var dropdown = document.getElementById("packet-dropdown");
      if (!dropdown) { return; }
      while (dropdown.firstChild) {
        dropdown.removeChild(dropdown.firstChild);
      }
      var blank = document.createElement("option");
      blank.setAttribute("value", 0);
      dropdown.appendChild(blank);
      _this.packetList.map(function(packetInfo, i) {
        var timestamp = packetInfo.timestamp;       
        var packetType = '';
        switch (packetInfo.packetJSON.frame.ETH_TYPE) {
          case "0x0800":
            packetType = "IPv4";
            break;
          case "0x0806":
            packetType = "ARP";
            break;
          default:
            packetType = parseInt(packetInfo.packetJSON.ETH_TYPE, 16).toString();
        }
        var item = document.createElement("option");
        item.innerHTML = (i+1).toString() + "       " + timestamp + "   (" + packetType + ")";
        item.setAttribute('value', i);
        dropdown.appendChild(item);
      });
    },

    initTracetreeHistory: function() {
      var _this = this;
      d3.json(endpoint + '/maple/tracetreehistory_seq')
        .get(function(err, data) {
          if (!err && data['seq_num'] > 0) {
            _this.tracetreehistory_seq = data['seq_num'] - 1;
            _this.num_tracetrees = data['seq_num'];
          } else {
            _this.tracetreehistory_seq = 0;
          }
          _this.getSelectedTracetreeHistoryFromServer();
          document.getElementById("tracetreehistory-seq").innerHTML = _this.tracetreehistory_seq + 1;
          document.getElementById("num-tracetrees").innerHTML = _this.num_tracetrees;      
        });

      d3.json(endpoint + '/maple/packetlist')
        .get(function(err, data) {
          if (!err) {
            _this.packetList = data['packet_list'];
            _this.constructPacketDropdown();
          }
        });
    },

    updateTracetreeHistory: function() {
      var _this = this;
      if (_this.tracetreehistory_seq == -1) {
        _this.initTracetreeHistory();
      }
      d3.json(endpoint + '/maple/tracetreehistory_seq')
        .get(function(err, data) {
          if (!err) {
            var morePackets = _this.num_tracetrees < data["seq_num"];
            _this.num_tracetrees = data['seq_num'];
            if (morePackets) {
              d3.json(endpoint + '/maple/packetlist')
                .get(function(err2, data2) {
                  if (!err2) {
                    _this.packetList = data2['packet_list'];
                    _this.constructPacketDropdown();
                  }
                });
            }
          }
          _this.getSelectedTracetreeHistoryFromServer();
          document.getElementById("tracetreehistory-seq").innerHTML = _this.tracetreehistory_seq + 1;
          document.getElementById("num-tracetrees").innerHTML = _this.num_tracetrees;
        });
    },

    periodicallyUpdate: function(interval) {
      var interval = interval || 1000;
      this.periodicallyUpdateId = setInterval(function() {
        TraceTree.pollServer();
      }, interval);
    },

    getPathFromTraceTree: function() {
      paths = [];
      return paths;
    }
  };
}();
