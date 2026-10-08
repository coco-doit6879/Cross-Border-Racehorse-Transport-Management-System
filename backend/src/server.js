const express = require('express');
const http = require('http');
const cors = require('cors');
const { Server } = require('socket.io');
require('dotenv').config();
if (process.env.NODE_ENV === 'production' && (!process.env.JWT_SECRET || process.env.JWT_SECRET.length < 32 || process.env.JWT_SECRET === 'cbrt_super_secret_jwt_key_2026')) throw new Error('Production requires a strong JWT_SECRET of at least 32 characters.');

const connectDB = require('./config/db');
const setupSwagger = require('./config/swagger');
const routes = require('./routes');
const { errorHandler } = require('./middlewares/errorMiddleware');

const socketAuthMiddleware = require('./socket/socketAuth');
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
app.set('io', io);

// Socket.io JWT Authentication Middleware
io.use(socketAuthMiddleware);

// Connect MongoDB
connectDB();
require('./services/operationsWatchdog').start();

// Middlewares
app.use(cors());
app.use(express.json());
const requestLimits = require('./middlewares/requestLimits');
app.use(['/api/auth/login', '/api/v1/auth/login', '/api/auth/register', '/api/v1/auth/register'], requestLimits(20, 60000));
app.use(['/api/horses/files', '/api/v1/horses/files'], (req, res, next) => req.method === 'POST' ? uploadLimit(req, res, next) : next());
const uploadLimit = requestLimits(60, 60000);

// Setup Swagger API Documentation UI at /api-docs
setupSwagger(app);

// Base Route
app.get('/api/health', (req, res) => {
  res.json({ status: 'OK', message: 'CBRT Backend Service is running' });
});
app.get('/api/v1/health', (req, res) => {
  res.json({ status: 'OK', message: 'CBRT Backend Service v1 is running' });
});

// API Routes (supports both /api/v1 and /api for backward compatibility)
app.use('/api/v1', routes);
app.use('/api', routes);

// Centralized Error Handler
app.use(errorHandler);

// Socket.io Connection Event
io.on('connection', (socket) => {
  console.log(`Socket connected: ${socket.id} (User: ${socket.user ? socket.user.username : 'Unknown'})`);

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
