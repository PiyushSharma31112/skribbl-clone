import { getRoom } from '../helpers.js';

export function registerChatHandlers(socket) {
  socket.on('chat', (payload = {}) => {
    const room = getRoom(socket);
    const player = room?.players.get(socket.id);
    const value = (typeof payload?.text === 'string' ? payload.text : '')
      .trim()
      .slice(0, 250);
    if (!room || !player || !value) return;

    if (
      room.game.phase === 'drawing' &&
      player.id !== room.game.drawer?.id
    ) {
      socket.emit('chat_message', {
        playerId: player.id,
        playerName: player.name,
        text: 'During a round, use chat to submit guesses.',
        system: true,
      });
      return;
    }

    room.broadcast('chat_message', {
      playerId: player.id,
      playerName: player.name,
      text: value,
    });
  });
}
