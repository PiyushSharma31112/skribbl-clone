import { getRoom } from '../helpers.js';

function chooseWord(socket, payload = {}) {
  const room = getRoom(socket);
  if (!room || room.game.drawer?.id !== socket.id) return;

  room.game.chooseWord(typeof payload?.word === 'string' ? payload.word : '');
}

function submitGuess(socket, payload = {}) {
  const room = getRoom(socket);
  const game = room?.game;
  const player = room?.players.get(socket.id);
  if (
    !room ||
    !game ||
    !player ||
    game.phase !== 'drawing' ||
    player.id === game.drawer?.id ||
    player.guessed
  ) {
    return;
  }

  const guess =
    typeof payload?.text === 'string' ? payload.text.trim().slice(0, 100) : '';
  if (!guess) return;

  if (guess.toLowerCase() === game.word.trim().toLowerCase()) {
    player.guessed = true;
    game.guessedIds.add(player.id);
    const remaining = Math.max(
      0,
      room.settings.drawTime -
        Math.floor((Date.now() - game.startedAt) / 1000),
    );
    const points =
      100 + Math.round((remaining / room.settings.drawTime) * 100);
    player.score += points;
    const drawer = game.drawer;
    if (drawer) drawer.score += 25;

    room.broadcast('guess_result', {
      correct: true,
      playerId: player.id,
      playerName: player.name,
      points,
      drawerBonus: 25,
    });
    room.broadcast('chat_message', {
      playerId: player.id,
      playerName: player.name,
      text: 'guessed the word correctly!',
      system: true,
    });

    if (
      [...room.players.values()]
        .filter((entry) => entry.id !== game.drawer?.id)
        .every((entry) => entry.guessed)
    ) {
      game.endRound();
    } else {
      game.broadcastState();
    }
    return;
  }

  if (
    guess.toLowerCase() === game.word.toLowerCase() ||
    (guess.length >= 3 && game.word.toLowerCase().includes(guess.toLowerCase()))
  ) {
    return socket.emit('guess_result', {
      correct: false,
      playerId: player.id,
      playerName: player.name,
      points: 0,
      close: true,
    });
  }

  socket.emit('guess_result', {
    correct: false,
    playerId: player.id,
    playerName: player.name,
    points: 0,
  });
  room.broadcast('chat_message', {
    playerId: player.id,
    playerName: player.name,
    text: guess,
    guess: true,
    recipientOnly: false,
  });
}

export function registerGameHandlers(socket) {
  socket.on('word_chosen', (payload) => chooseWord(socket, payload));
  socket.on('guess', (payload) => submitGuess(socket, payload));
}
