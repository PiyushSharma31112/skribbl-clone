import cors from 'cors';
import express from 'express';
import http from 'node:http';
import { Server } from 'socket.io';

import { CLIENT_ORIGINS } from './config/env.js';

import gameRoutes from './routes/gameRoutes.js';
import roomRoutes from './routes/roomRoutes.js';

import {
  errorHandler,
  notFoundHandler,
} from './middleware/errorHandlers.js';

import registerSocketHandlers from './socket/registerSocketHandlers.js';

// Initialize Express application
const app = express();

// CORS configuration
app.use(
  cors({
    origin: CLIENT_ORIGINS,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    credentials: true,
  }),
);

// Middleware
app.use(express.json({ limit: '10kb' }));
app.use(express.urlencoded({ extended: true }));

// Health check endpoint
app.get('/api/health', (_req, res) => {
  res.status(200).json({
    ok: true,
    service: 'scribbly-backend',
    message: 'Backend is running successfully',
  });
});

// API routes
app.use('/api/rooms', roomRoutes);
app.use('/api/games', gameRoutes);

// Handle unknown routes
app.use(notFoundHandler);

// Global error handler
app.use(errorHandler);

// Create HTTP server
const server = http.createServer(app);

// Initialize Socket.IO
const io = new Server(server, {
  cors: {
    origin: CLIENT_ORIGINS,
    methods: ['GET', 'POST'],
    credentials: true,
  },
});

// Register Socket.IO event handlers
registerSocketHandlers(io);

// Export application and server
export { app, io, server };
