var TraceTree = function() {
  return {
    actionLabels: ['action', 'drop', 'flood', 'punt', 'toPorts'],

    init: function(view) {
      var _this = this;
      _this.view = view;
      _this.buildsvg();
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
      this.svgg = null;
      this.svg = null;
      this.view = null;

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
        tt.setNode( n.id, { label: n.type, class: "tracetree-node" } );
        if (n.type == "L" && n["maple-l-type:link"]) {
          tt.setNode( n.id + ":action", { label: "toPorts", class: "tracetree-node" } );
          var actions_label = "";
          n["maple-l-type:link"].forEach( function( l ) {
            actions_label = actions_label + l["src-node"].port + " -> " + l["dst-node"].port + "\n";
          });
          tt.setEdge( n.id
                    , n.id + ":action"
                    , { label: actions_label
                      , lineInterpolate: "bundle" }
                    , n.id + ":path");
        }
      } );

      data.ttlinks.forEach( function( l ) {
        tt.setEdge( l.predicateID
                  , l.destinationID
                  , { label: " " + ( l.operator == "==" ? "": l.operator ) + " " + l.condition.toString()
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
          _this.draw(data);
        });
    },

    periodicallyUpdate: function(interval) {
      var interval = interval || 1000;
      this.periodicallyUpdateId = setInterval(function() {
        TraceTree.pollServer();
      }, interval);
    }
  };
}();
