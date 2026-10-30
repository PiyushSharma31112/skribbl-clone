import cors from 'cors';
import express from 'express';
import http from 'node:http';
import { Server } from 'socket.io';
import { CLIENT_ORIGINS } from './config/env.js';
import registerSocketHandlers from './socket/registerSocketHandlers.js';

const app = express();
app.use(cors({ origin: CLIENT_ORIGINS }));
app.get('/api/health', (_req, res) =>
  res.json({ ok: true, service: 'skribbl-clone-server' }),
);

const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: CLIENT_ORIGINS,
    methods: ['GET', 'POST'],
  },
});

registerSocketHandlers(io);

export { app, io, server };
