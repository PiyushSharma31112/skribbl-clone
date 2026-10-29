import React, { useEffect, useMemo, useRef, useState } from 'react';
import { io } from 'socket.io-client';
import TopBar from './TopBar';
import HomeScreen from './HomeScreen';
import LobbyScreen from './LobbyScreen';
import GameScreen from './GameScreen';

const SERVER_URL = import.meta.env.VITE_SERVER_URL || (import.meta.env.DEV ? 'http://localhost:3001' : window.location.origin);
const COLORS = ['#252525', '#ef4444', '#f97316', '#eab308', '#22c55e', '#06b6d4', '#3b82f6', '#8b5cf6', '#ec4899', '#ffffff', '#854d0e', '#64748b'];
const initialSettings = { maxPlayers: 8, rounds: 3, drawTime: 80, wordCount: 3, hints: 2, category: 'All' };

function App() {
  const socket = useMemo(() => io(SERVER_URL, { autoConnect: true, transports: ['websocket', 'polling'] }), []);
  const [connected, setConnected] = useState(false);
  const [screen, setScreen] = useState('home');
  const [name, setName] = useState('');
  const [joinCode, setJoinCode] = useState('');
  const [settings, setSettings] = useState(initialSettings);
  const [isPrivate, setIsPrivate] = useState(true);
  const [room, setRoom] = useState(null);
  const [game, setGame] = useState(null);
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [notice, setNotice] = useState('');
  const [result, setResult] = useState(null);
  const [color, setColor] = useState('#252525');
  const [brushSize, setBrushSize] = useState(5);
  const [eraser, setEraser] = useState(false);
  const [tool, setTool] = useState('pen');

  const canvasRef = useRef(null);
  const canvasStrokes = useRef([]);
  const drawing = useRef(false);
  const lastPoint = useRef(null);
  const chatEnd = useRef(null);
  const localStroke = useRef(null);
  const roomRef = useRef(null);
  const gameRef = useRef(null);

  useEffect(() => { roomRef.current = room; }, [room]);
  useEffect(() => { gameRef.current = game; }, [game]);

  useEffect(() => {
    socket.on('connect', () => setConnected(true));
    socket.on('disconnect', () => setConnected(false));
    socket.on('room_created', ({ roomId }) => {
      setJoinCode(roomId);
      setScreen('room');
      setNotice('Room created. Share the code or invite link.');
    });
    socket.on('room_joined', ({ roomId }) => {
      setJoinCode(roomId);
      setScreen('room');
      setNotice('You joined the room!');
    });
    socket.on('lobby_update', (data) => setRoom(data));
    socket.on('game_state', (data) => {
      setGame(data);
      setScreen(data.phase === 'lobby' ? 'room' : 'game');
    });
    socket.on('round_start', (data) => {
      setMessages((m) => [...m, { id: crypto.randomUUID(), system: true, text: `Round ${data.round} started. ${data.drawerId === socket.id ? 'Choose a word!' : 'The drawer is choosing a word…'}` }]);
      setResult(null);
    });
    socket.on('round_end', (data) => {
      setResult({ type: 'round', ...data });
      setMessages((m) => [...m, { id: crypto.randomUUID(), system: true, text: `Round over! The word was “${data.word}”.` }]);
    });
    socket.on('game_over', (data) => {
      setResult({ type: 'game', ...data });
      setMessages((m) => [...m, { id: crypto.randomUUID(), system: true, text: `Game over! Winner: ${data.winner?.name || 'Nobody'}.` }]);
    });
    socket.on('chat_message', (data) => setMessages((m) => [...m.slice(-99), { ...data, id: crypto.randomUUID() }]));
    socket.on('guess_result', (data) => {
      if (data.playerId === socket.id) {
        if (data.correct) {
          setNotice(`Correct! +${data.points} points${data.drawerBonus ? '; drawer +25' : ''}`);
        } else {
          setNotice(data.close ? 'Very close! Try again.' : 'Not quite — keep trying!');
        }
      }
    });
    socket.on('app_error', (data) => setNotice(data.message));
    socket.on('draw_data', (data) => {
      if (data.action === 'start') {
        if (!canvasStrokes.current.some((s) => s.id === data.stroke.id)) {
          canvasStrokes.current.push(data.stroke);
        }
        drawStroke(data.stroke);
      } else if (data.action === 'move') {
        addRemotePoint(data.strokeId, data.point);
      }
    });
    socket.on('canvas_clear', () => clearCanvas(false));
    socket.on('canvas_undo', (data) => redrawStrokes(data.strokes || []));

    return () => {
      socket.removeAllListeners();
      socket.disconnect();
    };
  }, [socket]);

  useEffect(() => {
    chatEnd.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  useEffect(() => {
    if (game?.strokes && canvasRef.current && screen === 'game') {
      redrawStrokes(game.strokes);
    }
  }, [screen, game?.phase]);

  useEffect(() => {
    if (!notice) return undefined;
    const t = setTimeout(() => setNotice(''), 4000);
    return () => clearTimeout(t);
  }, [notice]);

  useEffect(() => {
    const code = new URLSearchParams(window.location.search).get('room');
    if (code) setJoinCode(code);
  }, []);

  function createRoom(e) {
    e?.preventDefault();
    if (!name.trim()) return setNotice('Enter your name first.');
    socket.emit('create_room', { hostName: name.trim(), settings, isPrivate });
  }

  function joinRoom(e) {
    e?.preventDefault();
    if (!name.trim()) return setNotice('Enter your name first.');
    if (!joinCode.trim()) return setNotice('Enter a room code.');
    socket.emit('join_room', { roomId: joinCode.trim(), playerName: name.trim() });
  }

  function leaveRoom() {
    socket.emit('leave_room');
    setRoom(null);
    setGame(null);
    setMessages([]);
    setResult(null);
    setScreen('home');
  }

  function sendMessage(e) {
    e?.preventDefault();
    const text = input.trim();
    if (!text) return;
    if (game?.phase === 'drawing' && game.drawerId !== socket.id) {
      socket.emit('guess', { text });
    } else {
      socket.emit('chat', { text });
    }
    setInput('');
  }

  function copyInvite() {
    const url = `${window.location.origin}/?room=${room?.roomId || joinCode}`;
    navigator.clipboard?.writeText(url)
      .then(() => setNotice('Invite link copied!'))
      .catch(() => setNotice(`Room code: ${room?.roomId || joinCode}`));
  }

  function getCtx() {
    const c = canvasRef.current;
    return c?.getContext('2d') || null;
  }

  function drawStroke(stroke) {
    const ctx = getCtx();
    if (!ctx || !stroke) return;
    ctx.save();
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.strokeStyle = stroke.erase ? '#ffffff' : stroke.color;
    ctx.lineWidth = stroke.size;
    ctx.beginPath();

    if (stroke.points?.length) {
      const p = stroke.points[0];
      ctx.moveTo(p.x * ctx.canvas.width, p.y * ctx.canvas.height);
      for (const pt of stroke.points.slice(1)) ctx.lineTo(pt.x * ctx.canvas.width, pt.y * ctx.canvas.height);
      if (stroke.points.length === 1) {
        ctx.lineTo(stroke.points[0].x * ctx.canvas.width + 0.1, stroke.points[0].y * ctx.canvas.height + 0.1);
      }
    }

    ctx.stroke();
    ctx.restore();
  }

  function addRemotePoint(strokeId, point) {
    const stroke = canvasStrokes.current.find((s) => s.id === strokeId);
    const ctx = getCtx();
    if (!ctx || !stroke) return;
    const prev = stroke.points[stroke.points.length - 1];
    ctx.save();
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.strokeStyle = stroke.erase ? '#ffffff' : stroke.color;
    ctx.lineWidth = stroke.size;
    ctx.beginPath();
    ctx.moveTo(prev.x * ctx.canvas.width, prev.y * ctx.canvas.height);
    ctx.lineTo(point.x * ctx.canvas.width, point.y * ctx.canvas.height);
    ctx.stroke();
    ctx.restore();
    stroke.points.push(point);
  }

  function redrawStrokes(strokes) {
    const c = canvasRef.current;
    if (!c) return;
    canvasStrokes.current = [...strokes];
    const ctx = c.getContext('2d');
    ctx.clearRect(0, 0, c.width, c.height);
    strokes.forEach(drawStroke);
  }

  function clearCanvas(emit = true) {
    canvasStrokes.current = [];
    const c = canvasRef.current;
    if (c) c.getContext('2d').clearRect(0, 0, c.width, c.height);
    if (emit) socket.emit('canvas_clear');
  }

  function undo() {
    socket.emit('draw_undo');
  }

  function pointFromEvent(e) {
    const c = canvasRef.current;
    const r = c.getBoundingClientRect();
    return {
      x: Math.max(0, Math.min(1, (e.clientX - r.left) / r.width)),
      y: Math.max(0, Math.min(1, (e.clientY - r.top) / r.height)),
    };
  }

  function pointerDown(e) {
    if (game?.phase !== 'drawing' || game.drawerId !== socket.id) return;
    const p = pointFromEvent(e);
    drawing.current = true;
    lastPoint.current = p;
    canvasRef.current.setPointerCapture(e.pointerId);
    const payload = { ...p, color, size: brushSize, erase: eraser };
    localStroke.current = { ...payload, points: [p] };
    drawStroke({ ...localStroke.current, points: [p] });
    socket.emit('draw_start', payload);
  }

  function pointerMove(e) {
    if (!drawing.current || game?.drawerId !== socket.id) return;
    const p = pointFromEvent(e);
    const ctx = getCtx();
    if (ctx && lastPoint.current) {
      ctx.save();
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';
      ctx.strokeStyle = eraser ? '#ffffff' : color;
      ctx.lineWidth = brushSize;
      ctx.beginPath();
      ctx.moveTo(lastPoint.current.x * ctx.canvas.width, lastPoint.current.y * ctx.canvas.height);
      ctx.lineTo(p.x * ctx.canvas.width, p.y * ctx.canvas.height);
      ctx.stroke();
      ctx.restore();
    }
    lastPoint.current = p;
    socket.emit('draw_move', p);
  }

  function pointerUp() {
    if (!drawing.current) return;
    drawing.current = false;
    lastPoint.current = null;
    localStroke.current = null;
    socket.emit('draw_end');
  }

  const isDrawer = game?.drawerId === socket.id;
  const isHost = room?.hostId === socket.id;
  const timeLeft = game?.timeLeft ?? 0;
  const sortedPlayers = [...(game?.players || room?.players || [])].sort((a, b) => b.score - a.score);

  return (
    <div className="app-shell">
      <TopBar connected={connected} room={room} joinCode={joinCode} leaveRoom={leaveRoom} />

      {notice && (
        <button className="toast" onClick={() => setNotice('')}>
          {notice} <span>×</span>
        </button>
      )}

      {screen === 'home' && (
        <HomeScreen
          name={name}
          setName={setName}
          createRoom={createRoom}
          joinCode={joinCode}
          setJoinCode={setJoinCode}
          joinRoom={joinRoom}
          settings={settings}
          setSettings={setSettings}
          isPrivate={isPrivate}
          setIsPrivate={setIsPrivate}
        />
      )}

      {screen === 'room' && room && (
        <LobbyScreen
          room={room}
          joinCode={joinCode}
          copyInvite={copyInvite}
          socket={socket}
          isHost={isHost}
        />
      )}

      {screen === 'game' && game && (
        <GameScreen
          game={game}
          socket={socket}
          input={input}
          setInput={setInput}
          sendMessage={sendMessage}
          messages={messages}
          chatEnd={chatEnd}
          result={result}
          isDrawer={isDrawer}
          timeLeft={timeLeft}
          sortedPlayers={sortedPlayers}
          color={color}
          setColor={setColor}
          brushSize={brushSize}
          setBrushSize={setBrushSize}
          eraser={eraser}
          setEraser={setEraser}
          tool={tool}
          setTool={setTool}
          canvasRef={canvasRef}
          pointerDown={pointerDown}
          pointerMove={pointerMove}
          pointerUp={pointerUp}
          clearCanvas={clearCanvas}
          undo={undo}
          COLORS={COLORS}
        />
      )}
    </div>
  );
}

export default App;
