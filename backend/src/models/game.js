import { WORDS } from '../data/words.js';
import { saveCompletedGame } from '../services/gameHistoryService.js';

const WORD_CHOICE_SECONDS = 20;

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
    this.choosingStartedAt = 0;
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
    const remaining = this.phase === 'drawing'
      ? Math.max(
          0,
          this.room.settings.drawTime -
            Math.floor((Date.now() - this.startedAt) / 1000),
        )
      : this.phase === 'choosing'
        ? Math.max(
            0,
            WORD_CHOICE_SECONDS -
              Math.floor((Date.now() - this.choosingStartedAt) / 1000),
          )
        : 0;
    let hint = '';

    if (this.phase === 'drawing' && this.word) {
      const hintCount = this.room.settings.hints;
      const elapsed = this.room.settings.drawTime - remaining;
      const revealCount = hintCount
        ? Math.min(
            hintCount,
            Math.floor(elapsed / (this.room.settings.drawTime / (hintCount + 1))),
          )
        : 0;
      let n = 0;
      hint = [...this.word]
        .map((ch) => {
          if (ch === ' ') return ' ';
          if (n++ < revealCount) return ch;
          return '_';
        })
        .join(' ');
    }

    return {
      phase: this.phase,
      round: this.round,
      totalRounds: this.room.settings.rounds * this.players.length,
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
    this.choosingStartedAt = Date.now();
    this.room.broadcast('round_start', {
      drawerId: this.drawer?.id,
      drawTime: this.room.settings.drawTime,
      round: this.round,
      totalRounds: this.room.settings.rounds * this.players.length,
    });
    this.broadcastState();
    this.timer = setInterval(() => {
      this.broadcastState();
      if (Date.now() - this.choosingStartedAt >= WORD_CHOICE_SECONDS * 1000) {
        this.chooseWord(this.wordOptions[0]);
      }
    }, 1000);
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
    this.choosingStartedAt = 0;
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
    if (this.phase === 'gameOver') return;
    this.stopTimer();
    this.phase = 'gameOver';
    const leaderboard = this.players
      .map((player) => player.publicData())
      .sort((a, b) => b.score - a.score);
    try {
      saveCompletedGame(this.room.id, leaderboard);
    } catch (error) {
      console.error('Unable to save completed match history.', error);
      this.room.broadcast('app_error', {
        message: 'The game ended, but its match history could not be saved.',
      });
    }
    this.room.broadcast('game_over', {
      winner: leaderboard[0] || null,
      leaderboard,
    });
    this.broadcastState();
  }
}
