import React from 'react';
import { Pencil, Eraser, Undo2, Trash2, Send, Trophy } from 'lucide-react';

export default function GameScreen({
  game,
  input,
  setInput,
  sendMessage,
  messages,
  chatEnd,
  result,
  chooseWord,
  isDrawer,
  timeLeft,
  sortedPlayers,
  color,
  setColor,
  brushSize,
  setBrushSize,
  eraser,
  setEraser,
  tool,
  setTool,
  canvasRef,
  pointerDown,
  pointerMove,
  pointerUp,
  clearCanvas,
  undo,
  COLORS,
}) {
  const currentWord = game?.word || null;
  const hiddenWord = isDrawer ? currentWord : game?.wordHint || '•••••';

  return (
    <main className="game-layout">
      <div className="game-topline">
        <div>
          <span className="page-kicker">ROUND {Math.min(game.round, game.totalRounds)} / {game.totalRounds}</span>
          <h1>
            {game.phase === 'choosing'
              ? isDrawer ? 'Pick your word!' : 'The artist is thinking…'
              : game.phase === 'roundEnd'
                ? 'Round complete!'
                : game.phase === 'gameOver'
                  ? 'That’s a wrap!'
                  : isDrawer
                    ? 'Your turn to draw!'
                    : `${game.drawer?.name || 'Someone'} is drawing`}
          </h1>
        </div>

        <div className={`timer ${timeLeft <= 10 ? 'timer-low' : ''}`}>
          <span>TIME LEFT</span>
          <strong>{timeLeft}s</strong>
        </div>
      </div>

      <div className="game-body">
        <aside className="chat-panel">
          <div className="panel-header">
            <span>CHAT</span>
          </div>
          <div className="chat-list">
            {messages.map((msg) => (
              <div key={msg.id} className={`chat-message ${msg.system ? 'system' : ''}`}>
                {!msg.system && <strong>{msg.playerName || 'Player'}:</strong>}
                <span>{msg.text}</span>
              </div>
            ))}
            <div ref={chatEnd} />
          </div>

          <form onSubmit={sendMessage} className="chat-compose">
            <input
              className="text-input"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder={isDrawer ? 'Send a hint or chat…' : 'Guess the word…'}
            />
            <button type="submit" className="primary-button small-button">
              <Send size={15} />
            </button>
          </form>
        </aside>

        <section className="board-panel">
          {game.phase === 'choosing' && isDrawer && (
            <div className="word-picker" role="group" aria-label="Choose a word">
              <span className="field-label">CHOOSE A WORD</span>
              <div className="word-options">
                {game.wordOptions.map((word) => (
                  <button
                    type="button"
                    className="secondary-button"
                    key={word}
                    onClick={() => chooseWord(word)}
                  >
                    {word}
                  </button>
                ))}
              </div>
            </div>
          )}

          <div className="word-banner">
            <span>Word</span>
            <strong>{hiddenWord}</strong>
          </div>

          {result && (
            <div className="result-banner">
              {result.type === 'round' ? `Round over! It was “${result.word}”.` : `Game over! Winner: ${result.winner?.name || 'Nobody'}.`}
            </div>
          )}

          <div className="canvas-shell">
            <canvas
              ref={canvasRef}
              width={900}
              height={480}
              onPointerDown={pointerDown}
              onPointerMove={pointerMove}
              onPointerUp={pointerUp}
              onPointerLeave={pointerUp}
            />
          </div>

          <div className="toolbar">
            <div className="tool-controls">
              <button type="button" className={`tool-button ${tool === 'pen' ? 'active' : ''}`} onClick={() => { setEraser(false); setTool('pen'); }}>
                <Pencil size={16} />
              </button>
              <button type="button" className={`tool-button ${eraser ? 'active' : ''}`} onClick={() => { setEraser(true); setTool('eraser'); }}>
                <Eraser size={16} />
              </button>
              <button type="button" className="tool-button" onClick={undo}>
                <Undo2 size={16} />
              </button>
              <button type="button" className="tool-button" onClick={() => clearCanvas(true)}>
                <Trash2 size={16} />
              </button>
            </div>

            <div className="color-picker">
              {COLORS.map((swatch) => (
                <button
                  key={swatch}
                  type="button"
                  className={`swatch ${color === swatch ? 'selected' : ''}`}
                  style={{ background: swatch }}
                  onClick={() => { setEraser(false); setColor(swatch); }}
                  aria-label="Pick color"
                />
              ))}
            </div>

            <label className="brush-slider">
              <span>Size</span>
              <input type="range" min="2" max="22" value={brushSize} onChange={(e) => setBrushSize(Number(e.target.value))} />
            </label>
          </div>
        </section>

        <aside className="score-panel">
          <div className="panel-header">
            <span>LEADERBOARD</span>
          </div>
          <div className="leaderboard-list">
            {sortedPlayers.map((player, index) => (
              <div className="leader-row" key={player.id}>
                <div className="leader-meta">
                  <span className="leader-rank">#{index + 1}</span>
                  <span>{player.name}</span>
                </div>
                <strong>{player.score}</strong>
              </div>
            ))}
          </div>

          <div className="mini-summary">
            <div className="summary-pill"><Trophy size={14} /> {game.players?.filter((p) => p.score > 0).length || 0} scorers</div>
            <div className="summary-pill">{game.phase}</div>
          </div>
        </aside>
      </div>
    </main>
  );
}
