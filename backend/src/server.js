const express = require('express');
const http = require('http');
const cors = require('cors');
const { Server } = require('socket.io');
require('dotenv').config();

const connectDB = require('./config/db');
const setupSwagger = require('./config/swagger');
const routes = require('./routes');
const { errorHandler } = require('./middlewares/errorMiddleware');

const gpsSocketHandler = require('./socket/gpsSocket');
const sosSocketHandler = require('./socket/sosSocket');

const app = express();
const server = http.createServer(app);

// Initialize Socket.io Server
const io = new Server(server, {
  cors: {
    origin: '*',
    methods: ['GET', 'POST', 'PATCH', 'PUT', 'DELETE']
  }
});

// Connect MongoDB
connectDB();

// Middlewares
app.use(cors());
app.use(express.json());

// Setup Swagger API Documentation UI at /api-docs
setupSwagger(app);

// Base Route
app.get('/api/health', (req, res) => {
  res.json({ status: 'OK', message: 'CBRT Backend Service is running' });
});

// API Routes
app.use('/api', routes);

// Centralized Error Handler
app.use(errorHandler);

// Socket.io Connection Event
io.on('connection', (socket) => {
  console.log(`Socket connected: ${socket.id}`);

  gpsSocketHandler(io, socket);
  sosSocketHandler(io, socket);

  socket.on('disconnect', () => {
    console.log(`Socket disconnected: ${socket.id}`);
  });
});

const PORT = process.env.PORT || 5000;

if (process.env.NODE_ENV !== 'test') {
  server.listen(PORT, () => {
    console.log(`Server running in ${process.env.NODE_ENV || 'development'} mode on port ${PORT}`);
    console.log(`Swagger Docs available at http://localhost:${PORT}/api-docs`);
  });
}

module.exports = { app, server, io };
