var game = angular.module('game', ['ngRoute']);

game.component('game', {
  templateUrl : '/game.html',
  bindings : {
    data : '='
  },
  controller : ['$routeParams', '$scope', GameController]
});

function GameController($routeParams, $scope) {

  $scope.$on("$locationChangeStart", function() { socket.emit('stop_watching', {}); });
  var canvas = document.getElementById("gameCanvas");
  var ctx = canvas.getContext("2d");

  var socket = io();
  $scope.joined = false;

  var background_color = "#333333";
  var xsections = 0;
  var ysections = 0;
  var xinterval = 0
  var yinterval = 0

  var dir = {x:1, y:0};

  $scope.leaderboard = [];  

  // ------ controls ------
  addEventListener('keydown', function(event) {
    var old_dir = {x:dir.x, y:dir.y};
    
    if(event.keyCode == 37) {         // left
      dir = {x:-1, y:0};
    }
    else if(event.keyCode == 39) {    // right
      dir = {x:1, y:0};
    }
    else if(event.keyCode == 38) {    // up
      dir = {x:0, y:-1};
    }
    else if(event.keyCode == 40) {    // down
      dir = {x:0, y:1};
    }

    socket.emit("direction_control", dir);
  });

  // ------ socket listen events ------
  // one-time setup + screen update
  socket.on('game_setup', function(setup_data) {	
  	xsections = setup_data.game_width;
    ysections = setup_data.game_height;
    xinterval = canvas.width / xsections;
    yinterval = canvas.height / ysections;

    $scope.leaderboard = setup_data.leaderboard;

    draw_background();

    for (fruit of setup_data.fruit_array) {
      draw_square(fruit.row, fruit.column, fruit.color, 1);
    }

    for (segment of setup_data.segment_array) {
      draw_square(segment.row, segment.column, segment.color, 1);
    }
  });

  socket.on('respawned', function(data) {
    dir = data.initial_direction;
  });

  // continuous screen update; only what is *new* since joining
  socket.on('screen_update', function(new_data) {  
    for (fruit of new_data.new_fruit) {    
      draw_square(fruit.row, fruit.column, fruit.color, 1);
    }

    for (segment of new_data.new_segments) {
      draw_square(segment.row, segment.column, segment.color, 1);
    }
    
    if (new_data.new_leaderboard) {
      for (entry of new_data.new_leaderboard) {      
        var index = -1;        
        index = $scope.leaderboard.map(function(e) { return (e.name + e.copy_number); }).indexOf((entry.name+entry.copy_number));
        if (index >= 0) {
          $scope.leaderboard.splice(index,1);
        }
        if (entry.score >= 0) {
          $scope.leaderboard.push( entry );
        }
        $scope.$apply();
      }
    }
  });


  // ------ functions ------
  $scope.join = function() {
  	if ($scope.joined == false) {
  		$scope.joined = true;
      socket.emit("join_game", $scope.$ctrl.data);
    }
  }

  $scope.leave = function() {
    if ($scope.joined == true) {
      $scope.joined = false;
      socket.emit("leave_game", {});
    }
  }

  // used for drawing snake segments, fruit, ...
  function draw_square(row, col, color, margin) {
    ctx.fillStyle = color;
    ctx.fillRect(col * xinterval + margin, row * yinterval + margin, xinterval-margin, yinterval-margin);
  }

  // screen clear
  function draw_background() {
    ctx.fillStyle = background_color;
    ctx.fillRect(0,0, canvas.width, canvas.height);
  }
}