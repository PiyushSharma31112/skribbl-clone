import cors from 'cors';
import express from 'express';
import http from 'node:http';
import { Server } from 'socket.io';
import { CLIENT_ORIGINS } from './config/env.js';
import gameRoutes from './routes/gameRoutes.js';
import roomRoutes from './routes/roomRoutes.js';
import { errorHandler, notFoundHandler } from './middleware/errorHandlers.js';
import registerSocketHandlers from './socket/registerSocketHandlers.js';

const app = express();
app.use(cors({ origin: CLIENT_ORIGINS }));
app.use(express.json({ limit: '10kb' }));
app.get('/api/health', (_req, res) =>
  res.json({ ok: true, service: 'scribbly-backend' }),
);
app.use('/api/rooms', roomRoutes);
app.use('/api/games', gameRoutes);
app.use(notFoundHandler);
app.use(errorHandler);

const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: CLIENT_ORIGINS,
    methods: ['GET', 'POST'],
  },
});

registerSocketHandlers(io);

export { app, io, server };
