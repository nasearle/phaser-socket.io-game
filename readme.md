### Game made with Phaser and Socket.io
This game was made with [Phaser](https://phaser.io/) (v3.12) and [Socket.io](https://socket.io/) on Node. The game allows multiple players to join a server and play together in real time. When a player joins, they get a ship to control and are randomly assigned to a team. The goal is to collect the most stars to get the highest score.

[DEMO](https://awesome-top.glitch.me/)

### Server Logic (server.js)
The server is written in Express and uses the Socket.io library to establish a connection with the client. The server contains an `io.on('connection', socket => { ... })` event listener that is called when a new player connects. The listener creates a new socket object that can receive events from the client and emit events to just the one client (`socket.emit`), all other clients (`socket.broadcast.emit`), or all existing clients (`io.emit`). The `connection` listener contains all the server-side logic for the game.

When a new player connects, the server adds the new player to a `players` object with the socket id as the key. It sets random values for the player's location and team properties, and stores the socket id as the `playerId`.

The server then sends the updated `players` object, a random star location, and the current score to the new player using `socket.emit`, and sends just the new player's information to all the other players using `socket.broadcast.emit`.

The `connection` event listener contains three event listeners on the `socket` object that listen for events from the client. The first listens for a `disconnect` event. When it is triggered, it removes the player from the `players` object and emits a `disconnect` event with the socket id to all players (including the current one) using `io.emit`.

The second socket event listener listens for a `playerMovement` event. It is responsible for updating all other players with the movement of an individual player. When it is triggered, it updates the `x`, `y`, and `rotation` properties of the player with that socket id in the `players` object, and broadcasts the player's updated information to all other players.

The last listener listens for a `starCollected` event. When a star is collected, this listener updates the scores and sets a new location for the star. The new star location and updated scores are sent to all players.

### Client Logic (game.js)
The client uses [Phaser](https://phaser.io/) to build the game logic and the Socket.io API to connect with the server.

At the top of `game.js` a new game instance is created with the following configuration options:
- `type: Phaser.AUTO` - the type of renderer to use. `Phaser.AUTO` will auto-detect the availability of WebGL or Canvas. It will use WebGl, if available, and fall back to Canvas.
- `parent: 'phaser-example'` - used to tell Phaser to render the game in an existing `<canvas>` element with that id if it exists. If it does not exist, then Phaser will create it
- `width` and `height` - specify the viewable area of the game
- `physics`
  - `default: arcade` - Phaser's built-in arcade physics engine with gravity set to `0`.
- `scene` - contains the functions that determine the state of the game world at any given time

The `preload` function loads all of the game's images.

The `create` function is responsible for initializing the game world and establishing a connection with the server. It also updates the game environment when it receives information about the game state from the server. The function first sets up a reference to the `Phaser.Game` instance and stores it in a `self` variable for use later. Then it establishes a socket connection with a call to `io()`. It also sets up a new `group` to contain all other players.

When the player first connects to the server they will receive a `currentPlayers` event that gives them the `players` object with all of the players info. The `currentPlayers` event listener loops through this object and adds the players to the game. When it reaches the player with an id matching the current player's socket id, it adds the player's ship object (complete with sprite and physics) to the game world. For all other players, it initializes an `'otherPlayer'` object with the player info adds the player to the `otherPlayers` `group` object.

When a new player joins the game after the current player has joined, the `newPlayer` event listener will fire and add the new player sprite to the world and add their info to the `otherPlayers` `group` object.

When another player disconnects, the `disconnect` event listener loops through the `otherPlayers` `group` object and `destroy`s the player with the matching id.

Whenever a player moves, the server sends a `playerMoved` event to all other clients with the moving player's new location data. The `playerMoved` event listener updates the `otherPlayers` object with the new data.

When the player first connects or a star is collected, the server sends `scoreUpdate` and `starLocation` events to the client with the latest data. The `scoreUpdate` listener updates the text with the new score. The `starLocation` destroys the previous star object if it exists and adds a new star object to the game world. It also adds an overlap listener to the new star that emits a `starCollected` event to the server if the player's ship touches the star.

The `update` function defines the ships movement based on key inputs. It then compares the ships current position to it's previous position and if they are not the same, it emits a `playerMovement` event to the server with the player's new coordinates.
