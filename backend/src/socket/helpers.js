import rooms from '../state/rooms.js';

export function sendError(socket, message) {
  socket.emit('app_error', { message });
}

export function emitLobby(room) {
  room.broadcast('lobby_update', room.lobbyState());
  room.game.broadcastState();
}

export function getRoom(socket) {
  const id = socket.data.roomId;
  return id ? rooms.get(id) : null;
}

export function cleanRoom(room) {
  if (room && room.players.size === 0) {
    room.game.stopTimer();
    rooms.delete(room.id);
  }
}

export function clamp(value) {
  return Math.max(0, Math.min(1, Number(value) || 0));
}

export function validColor(color) {
  return /^#[0-9a-f]{6}$/i.test(color || '') ? color : '#252525';
}
