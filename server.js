const express = require('express');
const http = require('http');
const socketIO = require('socket.io');

const app = express();
const server = http.createServer(app);
const io = socketIO(server);

const PORT = 3000;

// Store chat rooms and their sockets
const chatRooms = {};

io.on('connection', (socket) => {
  console.log('A user connected');

  socket.on('joinRoom', (chatCode) => {
    // Join the room
    socket.join(chatCode);
    if (!chatRooms[chatCode]) {
      chatRooms[chatCode] = [];
    }
    chatRooms[chatCode].push(socket.id);
    console.log(`Socket ${socket.id} joined room ${chatCode}`);
  });

  socket.on('leaveRoom', (chatCode) => {
    socket.leave(chatCode);
    if (chatRooms[chatCode]) {
      chatRooms[chatCode] = chatRooms[chatCode].filter(id => id !== socket.id);
      if (chatRooms[chatCode].length === 0) {
        delete chatRooms[chatCode];
      }
    }
  });

  socket.on('message', ({ chatCode, message }) => {
    // Broadcast message to room
    io.to(chatCode).emit('message', message);
  });

  socket.on('disconnect', () => {
    // Cleanup if necessary
    for (const chatCode in chatRooms) {
      chatRooms[chatCode] = chatRooms[chatCode].filter(id => id !== socket.id);
      if (chatRooms[chatCode].length === 0) {
        delete chatRooms[chatCode];
      }
    }
    console.log('A user disconnected');
  });
});

server.listen(PORT, () => {
  console.log(`Server listening on port ${PORT}`);
});
