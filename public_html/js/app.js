var devopen = angular.module('devopen', [
  'ngRoute'
]);

devopen.config([
  '$routeProvider',
  function($routeProvider) {
    $routeProvider.when('/basicIntro', {
      templateUrl: 'basicIntro.html'
    }).when('/info', {
      templateUrl: 'info.html'
    }).when('/netIntro', {
      templateUrl: 'netIntro.html'
    }).when('/topology', {
      templateUrl: 'topology.html',
      controller: 'topoCtrl'
    }).when('/fastIntro', {
      templateUrl: 'fastIntro.html'
    }).when('/instances', {
      templateUrl: 'instances.html',
      controller: 'instancesCtrl'
    }).when('/precedence', {
      templateUrl: 'precedence.html',
      controller: 'precedenceCtrl'
    }).when('/dataflow', {
      templateUrl: 'dataflow.html',
      controller: 'dataflowCtrl'
    }).when('/mapleIntro', {
      templateUrl: 'mapleIntro.html'
    }).when('/tracetree', {
      templateUrl: 'tracetree.html',
      controller: 'ttCtrl'
    }).when('/tracetreehistory', {
      templateUrl: "tracetreehistory.html",
      controller: "ttHistCtrl"
    }).when('/pkthistory', {
      templateUrl: 'pkthistory.html',
      controller: 'pktCtrl'
    });
  }
]);

devopen.run(function($rootScope, $location) {
  $rootScope.$on('$routeChangeStart', function(event, next, current) {
    if (current != null) {
      if (current.originalPath == '/topology' &&
          next.originalPath != '/topology') {
        Topology.deinit();
      } else if (current.originalPath == '/tracetree' &&
                 next.originalPath != '/tracetree') {
        TraceTree.deinit();
      } else if (current.originalPath == '/tracetreehistory' &&
                 next.originalPath != '/tracetreehistory') {
        TraceTree.deinit();
      }
    }
  });
});

// Controllers

devopen.controller(
  'navbar',
  [
    '$scope',
    '$location',
    function($scope, $location) {
      $scope.isActive = function(viewLocation) {
        return viewLocation === $location.path();
      };
    }
  ]
);

var endpoint = location.protocol + "//" + location.host + "/test";

devopen.controller(
  'topoCtrl',
  [
    '$scope',
    '$http',
    function($scope, $http) {
      Topology.init();
      Topology.installView(document.getElementById('viz'));
      Topology.periodicallyUpdate(3000);
    }
  ]
);

devopen.controller(
  'instancesCtrl',
  [
    '$scope',
    '$http',
    function($scope, $http) {
      getInstances();
      setInterval(function() {
        getInstances();
      }, 1000);
    }
  ]
);

devopen.controller(
  'precedenceCtrl',
  [
    '$scope',
    function($scope) {
      updatePrecedence();
    }
  ]
);

devopen.controller(
  'dataflowCtrl',
  [
    '$scope',
    function($scope) {
      updateDataFlow();
    }
  ]
);

devopen.controller(
  'ttCtrl',
  [
    '$scope',
    '$http',
    function($scope, $http) {
      TraceTree.init(document.getElementById('tt-view'));
      TraceTree.periodicallyUpdate();
    }
  ]
);

devopen.controller(
  'ttHistCtrl',
  [
    '$scope',
    '$http',
    function($scope, $http) {
      $scope.next = function() { TraceTree.nextTracetree(); };
      $scope.prev = function() { TraceTree.prevTracetree(); };
      $scope.packet = function() { return TraceTree.packetStr; };

      $scope.tracetreehistory_seq = function() { return TraceTree.tracetreehistory_seq + 1; };
      $scope.num_tracetrees = function() { return TraceTree.num_tracetrees; };

      $scope.hide_next = function() {
        if (TraceTree.tracetreehistory_seq == -1 || !TraceTree.num_tracetrees || TraceTree.tracetreehistory_seq == TraceTree.num_tracetrees - 1) {
         return true;
        }
        return false;
      }
      $scope.hide_prev = function() {
        return TraceTree.tracetreehistory_seq == 0;
      }

      TraceTree.init(document.getElementById('tt-view'));
      TraceTree.updateTracetreeHistory();
    }
  ]
);
