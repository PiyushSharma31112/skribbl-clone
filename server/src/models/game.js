import { WORDS } from '../data/words.js';

export default class Game {
  constructor(room) {
    this.room = room;
    this.phase = 'lobby';
    this.round = 0;
    this.drawerIndex = -1;
    this.word = '';
    this.wordOptions = [];
    this.strokes = [];
    this.guessedIds = new Set();
    this.timer = null;
    this.startedAt = 0;
  }

  get players() {
    return [...this.room.players.values()];
  }

  get drawer() {
    return this.players[this.drawerIndex] || null;
  }

  stopTimer() {
    if (this.timer) clearInterval(this.timer);
    this.timer = null;
  }

  state(forPlayerId) {
    const drawer = this.drawer;
    const isDrawer = drawer?.id === forPlayerId;
    const remaining =
      this.phase === 'drawing'
        ? Math.max(
            0,
            this.room.settings.drawTime -
              Math.floor((Date.now() - this.startedAt) / 1000),
          )
        : 0;
    let hint = '';

    if (this.phase === 'drawing' && this.word) {
      const revealCount =
        remaining <= this.room.settings.drawTime / 2
          ? Math.min(2, Math.floor(this.word.replace(/ /g, '').length / 3))
          : remaining <= this.room.settings.drawTime * 0.75
            ? 1
            : 0;
      let n = 0;
      hint = [...this.word]
        .map((ch) => {
          if (ch === ' ') return ' ';
          if (ch === this.word[0] || n++ < revealCount) return ch;
          return '_';
        })
        .join(' ');
    }

    return {
      phase: this.phase,
      round: this.round,
      totalRounds: this.room.settings.rounds,
      drawer: drawer?.publicData() || null,
      drawerId: drawer?.id || null,
      word:
        isDrawer || this.phase === 'roundEnd' || this.phase === 'gameOver'
          ? this.word
          : '',
      wordHint: isDrawer ? this.word : hint,
      wordOptions: isDrawer ? this.wordOptions : [],
      drawTime: this.room.settings.drawTime,
      timeLeft: remaining,
      settings: this.room.settings,
      players: this.players.map((player) => player.publicData()),
      hostId: this.room.hostId,
      strokes: this.strokes,
      guessedIds: [...this.guessedIds],
    };
  }

  broadcastState() {
    for (const player of this.players) {
      this.room.io.to(player.id).emit('game_state', this.state(player.id));
    }
  }

  start() {
    this.stopTimer();
    this.phase = 'drawing';
    this.round += 1;

    if (this.round > this.room.settings.rounds * this.players.length) {
      return this.finish();
    }

    this.drawerIndex = (this.drawerIndex + 1) % this.players.length;
    this.word = '';
    this.wordOptions = [];
    this.strokes = [];
    this.guessedIds = new Set();

    for (const player of this.players) {
      player.guessed = false;
    }

    const category = this.room.settings.category || 'All';
    const pool =
      category === 'All'
        ? Object.values(WORDS).flat()
        : WORDS[category] || Object.values(WORDS).flat();
    this.wordOptions = [...pool]
      .sort(() => Math.random() - 0.5)
      .slice(0, this.room.settings.wordCount);
    this.phase = 'choosing';
    this.room.broadcast('round_start', {
      drawerId: this.drawer?.id,
      wordOptions: this.wordOptions,
      drawTime: this.room.settings.drawTime,
      round: this.round,
      totalRounds: this.room.settings.rounds * this.players.length,
    });
    this.broadcastState();
    this.timer = setTimeout(() => {
      if (this.phase === 'choosing') this.chooseWord(this.wordOptions[0]);
    }, 20000);
  }

  chooseWord(word) {
    if (
      this.phase !== 'choosing' ||
      !this.wordOptions.includes(word) ||
      !this.drawer
    ) {
      return;
    }

    this.stopTimer();
    this.word = word;
    this.phase = 'drawing';
    this.startedAt = Date.now();
    this.strokes = [];
    this.room.broadcast('word_chosen', {
      drawerId: this.drawer.id,
      drawTime: this.room.settings.drawTime,
    });
    this.broadcastState();
    this.timer = setInterval(() => {
      this.broadcastState();
      if (Date.now() - this.startedAt >= this.room.settings.drawTime * 1000) {
        this.endRound();
      }
    }, 1000);
  }

  endRound() {
    if (!['drawing', 'choosing'].includes(this.phase)) return;

    this.stopTimer();
    this.phase = 'roundEnd';
    this.room.broadcast('round_end', {
      word: this.word || '(no word selected)',
      scores: this.players.map((player) => player.publicData()),
      nextDrawer:
        this.players[(this.drawerIndex + 1) % this.players.length]?.id,
    });
    this.broadcastState();
    this.timer = setTimeout(() => {
      if (this.round >= this.room.settings.rounds * this.players.length) {
        this.finish();
      } else {
        this.start();
      }
    }, 4500);
  }

  finish() {
    this.stopTimer();
    this.phase = 'gameOver';
    const leaderboard = this.players
      .map((player) => player.publicData())
      .sort((a, b) => b.score - a.score);
    this.room.broadcast('game_over', {
      winner: leaderboard[0] || null,
      leaderboard,
    });
    this.broadcastState();
  }
}
