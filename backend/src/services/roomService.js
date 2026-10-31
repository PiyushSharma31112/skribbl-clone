import rooms from '../state/rooms.js';

export function listAvailablePublicRooms() {
  return [...rooms.values()]
    .filter(
      (room) =>
        !room.isPrivate &&
        room.game.phase === 'lobby' &&
        room.players.size < room.settings.maxPlayers,
    )
    .map((room) => ({
      roomId: room.id,
      players: room.players.size,
      maxPlayers: room.settings.maxPlayers,
      hostName: room.players.get(room.hostId)?.name || 'Host',
    }));
}
