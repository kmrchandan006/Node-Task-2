const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const mongoose = require('mongoose');
const path = require('path');

const app = express();
const server = http.createServer(app);
const io = socketIo(server);

// MongoDB Connection
mongoose.connect("mongodb+srv://kmrchandan006:chandan%40123@cluster0.dqtnskf.mongodb.net/liveUsers", { useNewUrlParser: true, useUnifiedTopology: true })
  .then(() => console.log('MongoDB connected'))
  .catch(err => console.error(err));

// Define User schema and model
const userSchema = new mongoose.Schema({
  email: String,
  name: String,
  socketId: String,
  room: String
});

const User = mongoose.model('User', userSchema);

// Serve static files from the 'public' directory
app.use(express.static(path.join(__dirname, 'public')));

// Handle socket connection
io.on('connection', (socket) => {
  console.log('New client connected', socket.id);

  socket.on('joinRoom', async ({ email, name }) => {
    const room = 'live_users';
    socket.join(room);

    console.log('User joined room:', { email, name });

    // Add user to database
    const user = new User({ email, name, socketId: socket.id, room });
    await user.save();

    // Broadcast the new user to all clients
    io.to(room).emit('userJoined', { email, name, socketId: socket.id });

    // Send current users list to the new user
    const users = await User.find({ room });
    socket.emit('currentUsers', users);
  });

  socket.on('disconnect', async () => {
    const user = await User.findOneAndDelete({ socketId: socket.id });
    if (user) {
      io.to(user.room).emit('userLeft', { email: user.email, name: user.name, socketId: socket.id });
    }
    console.log('Client disconnected', socket.id);
  });
});

// Start the server
const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
