const express = require('express');
const app = express();
const server = require('http').Server(app);
const io = require('socket.io').listen(server);
const session = require('express-session')({
  secret: 'ship game',
  resave: true,
  saveUninitialized: true,
  // cookie: {
  //   maxAge: 1000 * 60 * 10
  // },
});
const sharedsession = require('express-socket.io-session');

const players = {};
const star = {
  x: Math.floor(Math.random() * 700) + 50,
  y: Math.floor(Math.random() * 500) + 50,
};
const scores = {
  blue: 0,
  red: 0,
};

app.use(express.static(__dirname + '/public'));

app.use(session);
io.use(sharedsession(session));

app.get('/', (req, res) => {
  req.session.ship_exists = false;
  res.sendFile(__dirname + '/index.html');
});

io.on('connection', socket => {
  console.log('a user connected');

  // if the player doesn't already have an existing session, create a new player
  // (check prevents creating multiple ships when browser auto disconnects
  // and reconnects socket)
  if (!socket.handshake.session.ship_exists) {
    // create a new player and add it to our players object
    players[socket.id] = { rotation: 0, x: Math.floor(Math.random() * 700) + 50, y: Math.floor(Math.random() * 500) + 50, playerId: socket.id, team: Math.floor(Math.random() * 2) == 0 ? 'red' : 'blue' };
    // send the players object to the new player
    socket.emit('currentPlayers', players);
    // send the star object to the new player
    socket.emit('starLocation', star);
    // send the current scores
    socket.emit('scoreUpdate', scores);
    // update all other players of the new player
    socket.broadcast.emit('newPlayer', players[socket.id]);

    socket.handshake.session.ship_exists = true;
    socket.handshake.session.save();
  }

  socket.on('disconnect', () => {
    console.log('user disconnected');
    // remove this player from our players object
    delete players[socket.id];
    // emit a message to all players to remove this player
    io.emit('disconnect', socket.id);
  });

  // when a player moves, update the player data
  socket.on('playerMovement', movementData => {
    players[socket.id].x = movementData.x;
    players[socket.id].y = movementData.y;
    players[socket.id].rotation = movementData.rotation;
    // emit a message to all players about the player that moved
    socket.broadcast.emit('playerMoved', players[socket.id]);
  });

  socket.on('starCollected', () => {
    if (players[socket.id].team === 'red') {
      scores.red += 10;
    } else {
      scores.blue += 10;
    }
    star.x = Math.floor(Math.random() * 700) + 50;
    star.y = Math.floor(Math.random() * 500) + 50;
    io.emit('starLocation', star);
    io.emit('scoreUpdate', scores);
  })
});

server.listen(8081, () => {
  console.log(`Listening on ${server.address().port}`);
});