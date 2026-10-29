import express from 'express';
import cors from 'cors';
import http from 'http';
import { Server } from 'socket.io';
import { randomBytes } from 'node:crypto';

const app = express();
app.use(cors({ origin: process.env.CLIENT_ORIGIN?.split(',') || '*' }));
app.get('/api/health', (_req, res) => res.json({ ok: true, service: 'skribbl-clone-server' }));
const server = http.createServer(app);
const io = new Server(server, { cors: { origin: process.env.CLIENT_ORIGIN?.split(',') || '*', methods: ['GET', 'POST'] } });
const PORT = process.env.PORT || 3001;
const WORDS = {
  Animals: ['elephant','giraffe','penguin','butterfly','dolphin','turtle','kangaroo','octopus','rabbit','monkey','lion','owl'],
  Objects: ['umbrella','guitar','bicycle','camera','backpack','clock','chair','telephone','laptop','toothbrush','ladder','key'],
  Food: ['pizza','watermelon','sandwich','ice cream','hamburger','banana','carrot','donut','popcorn','pancake'],
  Actions: ['dancing','swimming','reading','cooking','sleeping','skateboarding','painting','running','fishing','singing']
};
const rooms = new Map();

class Player {
  constructor(id, name) { this.id = id; this.name = name; this.score = 0; this.ready = false; this.connected = true; this.guessed = false; }
  publicData() { return { id: this.id, name: this.name, score: this.score, ready: this.ready, connected: this.connected }; }
}
class Game {
  constructor(room) { this.room = room; this.phase = 'lobby'; this.round = 0; this.drawerIndex = -1; this.word = ''; this.wordOptions = []; this.strokes = []; this.guessedIds = new Set(); this.timer = null; this.startedAt = 0; }
  get players() { return [...this.room.players.values()]; }
  get drawer() { return this.players[this.drawerIndex] || null; }
  stopTimer() { if (this.timer) clearInterval(this.timer); this.timer = null; }
  state(forPlayerId) {
    const drawer = this.drawer;
    const isDrawer = drawer?.id === forPlayerId;
    const remaining = this.phase === 'drawing' ? Math.max(0, this.room.settings.drawTime - Math.floor((Date.now() - this.startedAt) / 1000)) : 0;
    let hint = '';
    if (this.phase === 'drawing' && this.word) {
      const revealCount = remaining <= this.room.settings.drawTime / 2 ? Math.min(2, Math.floor(this.word.replace(/ /g, '').length / 3)) : remaining <= this.room.settings.drawTime * .75 ? 1 : 0;
      let n = 0;
      hint = [...this.word].map(ch => { if (ch === ' ') return ' '; if (ch === this.word[0] || n++ < revealCount) return ch; return '_'; }).join(' ');
    }
    return { phase: this.phase, round: this.round, totalRounds: this.room.settings.rounds, drawer: drawer?.publicData() || null, drawerId: drawer?.id || null, word: isDrawer || this.phase === 'roundEnd' || this.phase === 'gameOver' ? this.word : '', wordHint: isDrawer ? this.word : hint, wordOptions: isDrawer ? this.wordOptions : [], drawTime: this.room.settings.drawTime, timeLeft: remaining, settings: this.room.settings, players: this.players.map(p => p.publicData()), hostId: this.room.hostId, strokes: this.strokes, guessedIds: [...this.guessedIds] };
  }
  broadcastState() { for (const p of this.players) io.to(p.id).emit('game_state', this.state(p.id)); }
  start() {
    this.stopTimer(); this.phase = 'drawing'; this.round += 1;
    if (this.round > this.room.settings.rounds * this.players.length) return this.finish();
    this.drawerIndex = (this.drawerIndex + 1) % this.players.length;
    this.word = ''; this.wordOptions = []; this.strokes = []; this.guessedIds = new Set();
    for (const p of this.players) p.guessed = false;
    const category = this.room.settings.category || 'All';
    let pool = category === 'All' ? Object.values(WORDS).flat() : (WORDS[category] || Object.values(WORDS).flat());
    this.wordOptions = [...pool].sort(() => Math.random() - .5).slice(0, this.room.settings.wordCount);
    this.phase = 'choosing';
    this.room.broadcast('round_start', { drawerId: this.drawer?.id, wordOptions: this.wordOptions, drawTime: this.room.settings.drawTime, round: this.round, totalRounds: this.room.settings.rounds * this.players.length });
    this.broadcastState();
    this.timer = setTimeout(() => { if (this.phase === 'choosing') this.chooseWord(this.wordOptions[0]); }, 20000);
  }
  chooseWord(word) {
    if (this.phase !== 'choosing' || !this.wordOptions.includes(word) || !this.drawer) return;
    this.stopTimer(); this.word = word; this.phase = 'drawing'; this.startedAt = Date.now(); this.strokes = [];
    this.room.broadcast('word_chosen', { drawerId: this.drawer.id, drawTime: this.room.settings.drawTime });
    this.broadcastState();
    this.timer = setInterval(() => { this.broadcastState(); if (Date.now() - this.startedAt >= this.room.settings.drawTime * 1000) this.endRound(); }, 1000);
  }
  endRound() {
    if (!['drawing','choosing'].includes(this.phase)) return;
    this.stopTimer(); this.phase = 'roundEnd';
    this.room.broadcast('round_end', { word: this.word || '(no word selected)', scores: this.players.map(p => p.publicData()), nextDrawer: this.players[(this.drawerIndex + 1) % this.players.length]?.id });
    this.broadcastState();
    this.timer = setTimeout(() => { if (this.round >= this.room.settings.rounds * this.players.length) this.finish(); else this.start(); }, 4500);
  }
  finish() {
    this.stopTimer(); this.phase = 'gameOver';
    const leaderboard = this.players.map(p => p.publicData()).sort((a,b) => b.score - a.score);
    this.room.broadcast('game_over', { winner: leaderboard[0] || null, leaderboard }); this.broadcastState();
  }
}
class Room {
  constructor(id, hostId, hostName, settings, isPrivate) {
    this.id = id; this.hostId = hostId; this.isPrivate = isPrivate; this.players = new Map();
    this.settings = { maxPlayers: 8, rounds: 3, drawTime: 80, wordCount: 3, hints: 2, category: 'All', ...settings };
    this.chat = []; this.game = new Game(this); this.addPlayer(hostId, hostName);
  }
  addPlayer(id, name) { const p = new Player(id, name); this.players.set(id, p); return p; }
  broadcast(event, payload) { io.to(this.id).emit(event, payload); }
  lobbyState() { return { roomId: this.id, isPrivate: this.isPrivate, hostId: this.hostId, settings: this.settings, players: [...this.players.values()].map(p => p.publicData()), phase: this.game.phase }; }
}
function sendError(socket, message) { socket.emit('app_error', { message }); }
function safeName(value) { return String(value || 'Player').trim().slice(0, 18) || 'Player'; }
function emitLobby(room) { room.broadcast('lobby_update', room.lobbyState()); room.game.broadcastState(); }
function getRoom(socket) { const id = socket.data.roomId; return id ? rooms.get(id) : null; }
function cleanRoom(room) { if (room && room.players.size === 0) { room.game.stopTimer(); rooms.delete(room.id); } }

io.on('connection', socket => {
  socket.on('create_room', ({ hostName, settings = {}, isPrivate = true } = {}) => {
    const maxPlayers = Number(settings.maxPlayers ?? 8), rounds = Number(settings.rounds ?? 3), drawTime = Number(settings.drawTime ?? 80), wordCount = Number(settings.wordCount ?? 3), hints = Number(settings.hints ?? 2);
    if (maxPlayers < 2 || maxPlayers > 20 || rounds < 2 || rounds > 10 || drawTime < 15 || drawTime > 240 || wordCount < 1 || wordCount > 5 || hints < 0 || hints > 5) return sendError(socket, 'Room settings are outside the allowed limits.');
    const id = randomBytes(3).toString('hex').toUpperCase();
    const room = new Room(id, socket.id, safeName(hostName), { maxPlayers, rounds, drawTime, wordCount, hints, category: settings.category || 'All' }, !!isPrivate);
    rooms.set(id, room); socket.join(id); socket.data.roomId = id;
    socket.emit('room_created', { roomId: id, playerId: socket.id }); socket.emit('lobby_update', room.lobbyState()); room.game.broadcastState();
  });
  socket.on('join_room', ({ roomId, playerName } = {}) => {
    const id = String(roomId || '').trim().toUpperCase(); const room = rooms.get(id);
    if (!room) return sendError(socket, 'Room not found. Check the room code or ask for a new invite link.');
    if (room.game.phase !== 'lobby') return sendError(socket, 'This game has already started.');
    if (room.players.size >= room.settings.maxPlayers) return sendError(socket, 'Room is full.');
    if ([...room.players.values()].some(p => p.name.toLowerCase() === safeName(playerName).toLowerCase())) return sendError(socket, 'That player name is already in use in this room.');
    const player = room.addPlayer(socket.id, safeName(playerName)); socket.join(id); socket.data.roomId = id;
    room.broadcast('player_joined', { player: player.publicData(), players: [...room.players.values()].map(p => p.publicData()) });
    socket.emit('room_joined', { roomId: id, playerId: socket.id }); emitLobby(room);
  });
  socket.on('get_public_rooms', () => socket.emit('public_rooms', [...rooms.values()].filter(r => !r.isPrivate && r.game.phase === 'lobby').map(r => ({ roomId:r.id, players:r.players.size, maxPlayers:r.settings.maxPlayers, hostName:r.players.get(r.hostId)?.name || 'Host' }))));
  socket.on('ready_toggle', () => { const r=getRoom(socket); const p=r?.players.get(socket.id); if (!r || !p || r.game.phase !== 'lobby') return; p.ready=!p.ready; emitLobby(r); });
  socket.on('start_game', () => { const r=getRoom(socket); if (!r) return sendError(socket,'Join a room first.'); if (r.hostId!==socket.id) return sendError(socket,'Only the host can start the game.'); if (r.game.phase!=='lobby') return sendError(socket,'The game has already started.'); if (r.players.size<2) return sendError(socket,'At least 2 players are needed to start.'); r.game.start(); });
  socket.on('word_chosen', ({ word } = {}) => { const r=getRoom(socket); if (!r || r.game.drawer?.id!==socket.id) return; r.game.chooseWord(String(word || '')); });
  socket.on('draw_start', payload => { const r=getRoom(socket); if (!r || r.game.phase!=='drawing' || r.game.drawer?.id!==socket.id) return; const stroke={ id:randomBytes(5).toString('hex'), points:[{x:clamp(payload?.x),y:clamp(payload?.y)}], color:validColor(payload?.color), size:Math.min(32,Math.max(1,Number(payload?.size)||4)), erase:!!payload?.erase }; r.game.strokes.push(stroke); r.broadcast('draw_data', { action:'start', stroke }); });
  socket.on('draw_move', payload => { const r=getRoom(socket); if (!r || r.game.phase!=='drawing' || r.game.drawer?.id!==socket.id) return; const stroke=r.game.strokes[r.game.strokes.length-1]; if (!stroke) return; const point={x:clamp(payload?.x),y:clamp(payload?.y)}; stroke.points.push(point); r.broadcast('draw_data',{action:'move',strokeId:stroke.id,point}); });
  socket.on('draw_end', () => { const r=getRoom(socket); if (r?.game.drawer?.id===socket.id) r.broadcast('draw_data',{action:'end'}); });
  socket.on('canvas_clear', () => { const r=getRoom(socket); if (!r || r.game.phase!=='drawing' || r.game.drawer?.id!==socket.id) return; r.game.strokes=[]; r.broadcast('canvas_clear',{}); });
  socket.on('draw_undo', () => { const r=getRoom(socket); if (!r || r.game.phase!=='drawing' || r.game.drawer?.id!==socket.id) return; r.game.strokes.pop(); r.broadcast('canvas_undo',{strokes:r.game.strokes}); });
  socket.on('guess', ({ text } = {}) => {
    const r=getRoom(socket); const g=r?.game; const p=r?.players.get(socket.id); if (!r || !g || !p || g.phase!=='drawing' || p.id===g.drawer?.id || p.guessed) return;
    const guess=String(text||'').trim().slice(0,100); if (!guess) return;
    if (guess.toLowerCase() === g.word.trim().toLowerCase()) {
      p.guessed=true; g.guessedIds.add(p.id); const remaining=Math.max(0,r.settings.drawTime-Math.floor((Date.now()-g.startedAt)/1000)); const points=100+Math.round(remaining/r.settings.drawTime*100); p.score+=points; const drawer=g.drawer; if (drawer) drawer.score+=25;
      r.broadcast('guess_result',{correct:true,playerId:p.id,playerName:p.name,points,drawerBonus:25}); r.broadcast('chat_message',{playerId:p.id,playerName:p.name,text:'guessed the word correctly!',system:true});
      if ([...r.players.values()].filter(x=>x.id!==g.drawer?.id).every(x=>x.guessed)) g.endRound(); else g.broadcastState();
    } else {
      if (guess.toLowerCase()===g.word.toLowerCase() || (guess.length>=3 && g.word.toLowerCase().includes(guess.toLowerCase()))) return socket.emit('guess_result',{correct:false,playerId:p.id,playerName:p.name,points:0,close:true});
      socket.emit('guess_result',{correct:false,playerId:p.id,playerName:p.name,points:0});
      r.broadcast('chat_message',{playerId:p.id,playerName:p.name,text:guess,guess:true,recipientOnly:false});
    }
  });
  socket.on('chat', ({ text } = {}) => { const r=getRoom(socket); const p=r?.players.get(socket.id); const value=String(text||'').trim().slice(0,250); if (!r || !p || !value) return; if (r.game.phase==='drawing' && p.id!==r.game.drawer?.id) { socket.emit('chat_message',{playerId:p.id,playerName:p.name,text:'During a round, use chat to submit guesses.',system:true}); return; } r.broadcast('chat_message',{playerId:p.id,playerName:p.name,text:value}); });
  socket.on('leave_room', () => leave(socket));
  socket.on('disconnect', () => leave(socket));
});
function leave(socket) { const r=getRoom(socket); if (!r) return; const p=r.players.get(socket.id); r.players.delete(socket.id); socket.leave(r.id); delete socket.data.roomId; if (!r.players.size) { cleanRoom(r); return; } if (r.hostId===socket.id) r.hostId=[...r.players.keys()][0]; if (r.game.phase!=='lobby' && r.game.drawer?.id===socket.id) r.game.endRound(); r.broadcast('player_left',{playerId:socket.id,players:[...r.players.values()].map(x=>x.publicData())}); emitLobby(r); }
function clamp(v) { return Math.max(0,Math.min(1,Number(v)||0)); }
function validColor(c) { return /^#[0-9a-f]{6}$/i.test(c||'') ? c : '#252525'; }
server.listen(PORT, () => console.log(`Skribbl clone server listening on port ${PORT}`));
