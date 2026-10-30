import React, { useEffect, useMemo, useRef, useState } from 'react';
import TopBar from '../components/layout/TopBar';
import GameScreen from '../features/game/GameScreen';
import useCanvasDrawing from '../features/game/hooks/useCanvasDrawing';
import HomeScreen from '../features/home/HomeScreen';
import LobbyScreen from '../features/lobby/LobbyScreen';
import { COLORS, initialSettings } from './constants';
import { createSocket } from '../services/socket';

function App() {
  const socket = useMemo(createSocket, []);
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

  const chatEnd = useRef(null);
  const {
    canvasRef,
    clearCanvas,
    handleDrawData,
    pointerDown,
    pointerMove,
    pointerUp,
    redrawStrokes,
    undo,
  } = useCanvasDrawing({ socket, game, color, brushSize, eraser });

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
    socket.on('draw_data', handleDrawData);
    socket.on('canvas_clear', () => clearCanvas(false));
    socket.on('canvas_undo', (data) => redrawStrokes(data.strokes || []));
    socket.connect();

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
