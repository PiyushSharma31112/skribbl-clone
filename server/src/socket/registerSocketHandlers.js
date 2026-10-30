import { registerChatHandlers } from './handlers/chatHandlers.js';
import { registerDrawingHandlers } from './handlers/drawingHandlers.js';
import { registerGameHandlers } from './handlers/gameHandlers.js';
import { registerRoomHandlers } from './handlers/roomHandlers.js';

export default function registerSocketHandlers(io) {
  io.on('connection', (socket) => {
    registerRoomHandlers(io, socket);
    registerGameHandlers(socket);
    registerDrawingHandlers(socket);
    registerChatHandlers(socket);
  });
}
