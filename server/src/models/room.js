import Game from './game.js';
import Player from './player.js';

export default class Room {
  constructor(io, id, hostId, hostName, settings, isPrivate) {
    this.io = io;
    this.id = id;
    this.hostId = hostId;
    this.isPrivate = isPrivate;
    this.players = new Map();
    this.settings = {
      maxPlayers: 8,
      rounds: 3,
      drawTime: 80,
      wordCount: 3,
      hints: 2,
      category: 'All',
      ...settings,
    };
    this.chat = [];
    this.game = new Game(this);
    this.addPlayer(hostId, hostName);
  }

  addPlayer(id, name) {
    const player = new Player(id, name);
    this.players.set(id, player);
    return player;
  }

  broadcast(event, payload) {
    this.io.to(this.id).emit(event, payload);
  }

  lobbyState() {
    return {
      roomId: this.id,
      isPrivate: this.isPrivate,
      hostId: this.hostId,
      settings: this.settings,
      players: [...this.players.values()].map((player) => player.publicData()),
      phase: this.game.phase,
    };
  }
}
