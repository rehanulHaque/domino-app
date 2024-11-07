const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const app = express();

const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: 'http://localhost:5173',
    methods: ['GET', 'POST'],
  },
});

const domionesCard = [
  { id: 1, up: 1, down: 0 },
  { id: 2, up: 1, down: 1 },
  { id: 3, up: 1, down: 2 },
  { id: 4, up: 1, down: 3 },
  { id: 5, up: 1, down: 4 },
  { id: 6, up: 1, down: 5 },
  { id: 7, up: 1, down: 6 },
  { id: 8, up: 2, down: 0 },
  { id: 9, up: 0, down: 0 },
  { id: 10, up: 2, down: 2 },
  { id: 11, up: 2, down: 3 },
  { id: 12, up: 2, down: 4 },
  { id: 13, up: 2, down: 5 },
  { id: 14, up: 2, down: 6 },
  { id: 15, up: 3, down: 0 },
  { id: 16, up: 3, down: 4 },
  { id: 17, up: 3, down: 5 },
  { id: 18, up: 3, down: 6 },
  { id: 19, up: 4, down: 0 },
  { id: 20, up: 4, down: 4 },
  { id: 21, up: 4, down: 5 },
  { id: 22, up: 4, down: 6 },
  { id: 23, up: 5, down: 5 },
  { id: 24, up: 5, down: 6 },
  { id: 25, up: 6, down: 6 },
  { id: 26, up: 6, down: 0 },
  { id: 27, up: 3, down: 3 },
  { id: 28, up: 5, down: 0 },
];

function splitArrayIntoRandomParts(arr) {
  const shuffledArray = arr.sort(() => Math.random() - 0.5);
  return [
    shuffledArray.slice(0, 7),
    shuffledArray.slice(7, 14),
    shuffledArray.slice(14, 21),
    shuffledArray.slice(21, 28),
  ];
}

const roomUsers = {};
const gameStates = {}; // Stores game state for each room

io.on('connection', (socket) => {
  console.log('A user connected:', socket.id);

  socket.on('joinRoom', (roomId) => {
    socket.join(roomId);
    console.log(`User ${socket.id} joined room: ${roomId}`);

    if (!roomUsers[roomId]) {
      roomUsers[roomId] = [];
      gameStates[roomId] = {
        gameBox: [], // Cards on the board
        currentTurnIndex: 0,
        players: {},
      };
    }

    roomUsers[roomId].push(socket);

    if (roomUsers[roomId].length === 4) {
      const parts = splitArrayIntoRandomParts(domionesCard);
      roomUsers[roomId].forEach((user, index) => {
        const playerData = {
          socketId: user.id,
          hand: parts[index],
        };
        gameStates[roomId].players[user.id] = playerData;
        user.emit('receiveHand', parts[index]);
      });

      const startingPlayerId = roomUsers[roomId].find((user) =>
        gameStates[roomId].players[user.id].hand.some((card) => card.up === 0 && card.down === 0)
      )?.id;

      gameStates[roomId].currentTurnIndex = roomUsers[roomId].findIndex((user) => user.id === startingPlayerId);
      io.to(roomUsers[roomId][gameStates[roomId].currentTurnIndex].id).emit('yourTurn', gameStates[roomId].gameBox);
    }
  });

  socket.on('playCard', (roomId, card) => {
    const gameState = gameStates[roomId];
    const player = gameState.players[socket.id];
    const gameBox = gameState.gameBox;
    const isCurrentPlayer = roomUsers[roomId][gameState.currentTurnIndex].id === socket.id;

    // Check if it's the player's turn
    if (!isCurrentPlayer) {
      socket.emit('error', 'Not your turn!');
      return;
    }

    // Check if the card can be played
    const canPlay =
      gameBox.length === 0 ||
      card.up === gameBox[0].up ||
      card.down === gameBox[0].down ||
      card.up === gameBox[gameBox.length - 1].down ||
      card.down === gameBox[gameBox.length - 1].up;

    if (canPlay) {
      // Add card to the game box at the right position
      if (gameBox.length === 0 || card.up === gameBox[0].up || card.down === gameBox[0].down) {
        gameBox.unshift(card); // Add card to the beginning
      } else {
        gameBox.push(card); // Add card to the end
      }

      // Remove card from the player's hand
      player.hand = player.hand.filter((c) => c.id !== card.id);

      // Check if the player won
      if (player.hand.length === 0) {
        io.to(roomId).emit('gameOver', { winnerId: socket.id });
        delete roomUsers[roomId];
        delete gameStates[roomId];
        return;
      }

      // Move to the next player's turn
      gameState.currentTurnIndex = (gameState.currentTurnIndex + 1) % roomUsers[roomId].length;
      io.to(roomId).emit('updateGameBox', gameBox);
      io.to(roomUsers[roomId][gameState.currentTurnIndex].id).emit('yourTurn', gameBox);
    } else {
      // Emit error if the card is invalid, but don't change turn
      socket.emit('error', 'Invalid card! Choose a card that matches the gameBox ends.');
    }
});


  socket.on('disconnect', () => {
    console.log('User disconnected:', socket.id);
    for (const roomId in roomUsers) {
      roomUsers[roomId] = roomUsers[roomId].filter((user) => user.id !== socket.id);
      if (roomUsers[roomId].length === 0) {
        delete roomUsers[roomId];
        delete gameStates[roomId];
      }
    }
  });
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
