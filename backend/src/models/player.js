export default class Player {
  constructor(id, name) {
    this.id = id;
    this.name = name;
    this.score = 0;
    this.ready = false;
    this.connected = true;
    this.guessed = false;
  }

  publicData() {
    return {
      id: this.id,
      name: this.name,
      score: this.score,
      ready: this.ready,
      connected: this.connected,
    };
  }
}
