
var express = require('express');
var app = express();
var http = require('http').Server(app);
var io = require('socket.io')(http);

app.use(express.static(__dirname + "/public"));

var u = require('./utilities.js');

// ------ globals ------
var game_width = 50;
var game_height = 50;
var sockets_in_game = [];
var game_matrix = u.gen_2d_matrix(game_height, game_width, {});
var max_fruit_in_game = 5;
var fruit_array = [];

var new_fruit = []; // freshly spawned fruit; information to be sent to every client

// intial file served to a connecting browser
app.get('/', function(req, res) {
	res.sendFile(__dirname + '/client.html');
});


// ------ listener functions ------
// bound to each unique socket, accessed via 'this'

// disconnect logic
var handle_disconnect = function() {
  console.log("client  " + this.id + "  has left");
  
  // eject from update list if needed
  index = sockets_in_game.indexOf( this );
  if (index >= 0) {
    sockets_in_game.splice(index, 1)
  }
}

var join_game = function() {
  sockets_in_game.push(this);
  this.snake = new Snake();
  
  var segment_array = [];
  for (socket of sockets_in_game) {
    for (segment of socket.snake.segments) {
      segment_array.push( {row:segment.row, column:segment.column, color:'#dddddd'} );
    }
  }
  
  var initial_data = {
    game_width : game_width,
    game_height : game_height,
    fruit_array : fruit_array,
    segment_array : segment_array
  }
  this.emit('game_setup', initial_data);    // NOTE: will also need to initialize a new player with positions of all objects    
}

var player_input = function(direction) {
  this.snake.direction = direction;
}

// ------ bind listeners to socket emit events from browser ------
io.on('connection', function(socket) {		
	console.log("client  " + socket.id + "  has joined");	
	
  socket.on('join_game', join_game.bind(socket) );
	socket.on('disconnect', handle_disconnect.bind(socket) );
  socket.on('direction_control', player_input.bind(socket) );
});

// ------ other functions ------
function update_game() {
  // initialize fruit and replace as the game goes on
  while (fruit_array.length < max_fruit_in_game) {
    spawn_fruit(1);
  }

  for (var socket of sockets_in_game) {
    var s = socket.snake;
    var head = s.segments[0];

    if (s.alive) {
      var new_pos = {column : head.column + s.direction.x, row : head.row + s.direction.y};
      if (validate_position(new_pos) == false) {
        s.alive = false;
      } else {
        new_segments.push( {row:new_pos.row, column:new_pos.column, color:'#dddddd'} );
        s.segments.unshift( new_pos );
      }     
    } else {
      s.size -= 1;
      if (s.size < 0) {        
        s.respawn();
      }
    }

    // remove the end of the snake as it moves forward
    if(s.segments.length > s.size) {
      var removed = s.segments.pop();
      new_segments.push( {row:removed.row, column:removed.column, color:'#333333'} );
    }
  }
}

function update_clients()	{
	for (var i=0; i<sockets_in_game.length; i++) {
    var update_data = {
      new_fruit : new_fruit,
      new_segments : new_segments
    }
		sockets_in_game[i].emit('screen_update', update_data);
	}
  new_fruit = [];
  new_segments = [];
}

function spawn_fruit(number_fruit) {
  for(var i=0; i<number_fruit; i++) {
    // find a tile where there is not already a fruit...
    var found = false;
    while (!found) {
      var row = u.random(0, game_height-1);
      var col = u.random(0, game_width-1);
      if (!game_matrix[row][col].has_fruit) {
        game_matrix[row][col].has_fruit = true;
        fruit_array.push( {row:row, column:col} );
        new_fruit.push( {row:row, column:col} );
        found = true;
      }
    }
  }
}

function validate_position(position) {
  var p = position;

  // check out of bounds
  if (p.row < 0 || p.row >= game_height || p.column < 0 || p.column >= game_width) {
    return false;
  }
  return true;
}

// ------ snake class ------
function Snake() {
  // ------ snake local variables ------

  // ------ snake methods ------
  this.respawn = function() {   
    this.segments = [ {column:0, row:0} ];
    this.direction = {x:1, y:0};
    this.size = 3;
    this.alive = true;    
  };

  this.respawn();
}

// ------ the main server logic loop ------
var FPS = 10;
setInterval( function() {
  update_game();
  update_clients();
}, 1000/FPS);



http.listen(80, function() {		// 80 is default for web browsers visiting a page
  console.log('listening on :80');
});
