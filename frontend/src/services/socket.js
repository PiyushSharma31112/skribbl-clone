import { io } from 'socket.io-client';
import { serverUrl } from './config.js';

export function createSocket() {
  if (!serverUrl) return null;

  return io(serverUrl, {
    autoConnect: false,
    transports: ['websocket', 'polling'],
  });
}
