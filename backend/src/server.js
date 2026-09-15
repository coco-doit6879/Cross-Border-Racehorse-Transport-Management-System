// Server entrypoint skeleton for CBRT Backend
const express = require('express');
const http = require('http');
const cors = require('cors');
require('dotenv').config();

const app = express();
const server = http.createServer(app);

// Middlewares
app.use(cors());
app.use(express.json());

// Base Route Placeholder
app.get('/api/health', (req, res) => {
  res.json({ status: 'OK', message: 'CBRT Backend Service is running' });
});

// Import API Routes placeholder
// const routes = require('./routes');
// app.use('/api', routes);

const PORT = process.env.PORT || 5000;

if (process.env.NODE_ENV !== 'test') {
  server.listen(PORT, () => {
    console.log(`Server listening on port ${PORT}`);
  });
}

module.exports = { app, server };
