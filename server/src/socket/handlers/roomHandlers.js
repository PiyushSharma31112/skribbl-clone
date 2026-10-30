import { randomBytes } from 'node:crypto';
import Room from '../../models/room.js';
import rooms from '../../state/rooms.js';
import {
  cleanRoom,
  emitLobby,
  getRoom,
  safeName,
  sendError,
} from '../helpers.js';

function createRoom(io, socket, { hostName, settings = {}, isPrivate = true } = {}) {
  const maxPlayers = Number(settings.maxPlayers ?? 8);
  const rounds = Number(settings.rounds ?? 3);
  const drawTime = Number(settings.drawTime ?? 80);
  const wordCount = Number(settings.wordCount ?? 3);
  const hints = Number(settings.hints ?? 2);

  if (
    maxPlayers < 2 ||
    maxPlayers > 20 ||
    rounds < 2 ||
    rounds > 10 ||
    drawTime < 15 ||
    drawTime > 240 ||
    wordCount < 1 ||
    wordCount > 5 ||
    hints < 0 ||
    hints > 5
  ) {
    return sendError(socket, 'Room settings are outside the allowed limits.');
  }

  const id = randomBytes(3).toString('hex').toUpperCase();
  const room = new Room(
    io,
    id,
    socket.id,
    safeName(hostName),
    {
      maxPlayers,
      rounds,
      drawTime,
      wordCount,
      hints,
      category: settings.category || 'All',
    },
    !!isPrivate,
  );
  rooms.set(id, room);
  socket.join(id);
  socket.data.roomId = id;
  socket.emit('room_created', { roomId: id, playerId: socket.id });
  socket.emit('lobby_update', room.lobbyState());
  room.game.broadcastState();
}

function joinRoom(socket, { roomId, playerName } = {}) {
  const id = String(roomId || '')
    .trim()
    .toUpperCase();
  const room = rooms.get(id);

  if (!room) {
    return sendError(
      socket,
      'Room not found. Check the room code or ask for a new invite link.',
    );
  }
  if (room.game.phase !== 'lobby') {
    return sendError(socket, 'This game has already started.');
  }
  if (room.players.size >= room.settings.maxPlayers) {
    return sendError(socket, 'Room is full.');
  }
  if (
    [...room.players.values()].some(
      (player) =>
        player.name.toLowerCase() === safeName(playerName).toLowerCase(),
    )
  ) {
    return sendError(
      socket,
      'That player name is already in use in this room.',
    );
  }

  const player = room.addPlayer(socket.id, safeName(playerName));
  socket.join(id);
  socket.data.roomId = id;
  room.broadcast('player_joined', {
    player: player.publicData(),
    players: [...room.players.values()].map((entry) => entry.publicData()),
  });
  socket.emit('room_joined', { roomId: id, playerId: socket.id });
  emitLobby(room);
}

function getPublicRooms(socket) {
  socket.emit(
    'public_rooms',
    [...rooms.values()]
      .filter((room) => !room.isPrivate && room.game.phase === 'lobby')
      .map((room) => ({
        roomId: room.id,
        players: room.players.size,
        maxPlayers: room.settings.maxPlayers,
        hostName: room.players.get(room.hostId)?.name || 'Host',
      })),
  );
}

function toggleReady(socket) {
  const room = getRoom(socket);
  const player = room?.players.get(socket.id);
  if (!room || !player || room.game.phase !== 'lobby') return;

  player.ready = !player.ready;
  emitLobby(room);
}

function startGame(socket) {
  const room = getRoom(socket);
  if (!room) return sendError(socket, 'Join a room first.');
  if (room.hostId !== socket.id) {
    return sendError(socket, 'Only the host can start the game.');
  }
  if (room.game.phase !== 'lobby') {
    return sendError(socket, 'The game has already started.');
  }
  if (room.players.size < 2) {
    return sendError(socket, 'At least 2 players are needed to start.');
  }

  room.game.start();
}

function leave(socket) {
  const room = getRoom(socket);
  if (!room) return;

  room.players.delete(socket.id);
  socket.leave(room.id);
  delete socket.data.roomId;
  if (!room.players.size) {
    cleanRoom(room);
    return;
  }
  if (room.hostId === socket.id) room.hostId = [...room.players.keys()][0];
  if (room.game.phase !== 'lobby' && room.game.drawer?.id === socket.id) {
    room.game.endRound();
  }

  room.broadcast('player_left', {
    playerId: socket.id,
    players: [...room.players.values()].map((player) => player.publicData()),
  });
  emitLobby(room);
}

export function registerRoomHandlers(io, socket) {
  socket.on('create_room', (payload) => createRoom(io, socket, payload));
  socket.on('join_room', (payload) => joinRoom(socket, payload));
  socket.on('get_public_rooms', () => getPublicRooms(socket));
  socket.on('ready_toggle', () => toggleReady(socket));
  socket.on('start_game', () => startGame(socket));
  socket.on('leave_room', () => leave(socket));
  socket.on('disconnect', () => leave(socket));
}
