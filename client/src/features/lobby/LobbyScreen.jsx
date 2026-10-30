import React from 'react';
import { Copy, Sparkles, CheckCircle2 } from 'lucide-react';

export default function LobbyScreen({ room, joinCode, copyInvite, socket, isHost }) {
  return (
    <main className="lobby-layout">
      <section className="lobby-main">
        <div className="page-kicker">THE HANGOUT</div>
        <h1>
          Waiting for the <span>artists.</span>
        </h1>
        <p className="muted">Share your room code and gather your crew before the masterpiece begins.</p>

        <div className="invite-box">
          <div>
            <span className="field-label">ROOM CODE</span>
            <strong>{room.roomId || joinCode}</strong>
          </div>
          <button className="secondary-button" onClick={copyInvite}>
            <Copy size={16} /> Copy invite link
          </button>
        </div>

        <div className="players-heading">
          <h2>
            Players <span className="count-badge">{room.players?.length || 0}/{room.settings.maxPlayers}</span>
          </h2>
          <span className="muted">{room.players?.length >= 2 ? 'Ready when you are' : 'Need at least 2 players'}</span>
        </div>

        <div className="lobby-players">
          {(room.players || []).map((p, i) => (
            <div className="lobby-player" key={p.id}>
              <div className={`avatar avatar-${i % 6}`}>{p.name.slice(0, 1).toUpperCase()}</div>
              <div className="player-info">
                <strong>
                  {p.name}
                  {p.id === room.hostId && <span className="host-tag">HOST</span>}
                </strong>
                <span>{p.id === socket.id ? 'That’s you!' : p.ready ? 'Ready to draw' : 'Picking a pencil…'}</span>
              </div>
              {p.ready ? <CheckCircle2 className="ready-icon" size={20} /> : <span className="waiting-dot" />}
            </div>
          ))}

          {Array.from({ length: Math.max(0, Math.min(4, room.settings.maxPlayers - (room.players?.length || 0))) }, (_, i) => (
            <div className="lobby-player empty-slot" key={`empty${i}`}>
              <div className="avatar empty-avatar">+</div>
              <div className="player-info">
                <strong>Waiting for a friend</strong>
                <span>Send them the invite link</span>
              </div>
            </div>
          ))}
        </div>

        <div className="lobby-actions">
          <button className="secondary-button" onClick={() => socket.emit('ready_toggle')}>
            I'm ready ✓
          </button>
          {isHost ? (
            <button className="primary-button" onClick={() => socket.emit('start_game')}>
              Start game <span>→</span>
            </button>
          ) : (
            <div className="host-wait">The host will start the game.</div>
          )}
        </div>
      </section>

      <aside className="settings-summary">
        <div className="summary-icon"><Sparkles /></div>
        <h3>Game settings</h3>
        <p className="muted">Set up for a good time.</p>
        <div className="summary-line"><span>Players</span><strong>{room.settings.maxPlayers} max</strong></div>
        <div className="summary-line"><span>Rounds per player</span><strong>{room.settings.rounds}</strong></div>
        <div className="summary-line"><span>Draw time</span><strong>{room.settings.drawTime}s</strong></div>
        <div className="summary-line"><span>Word choices</span><strong>{room.settings.wordCount}</strong></div>
        <div className="summary-line"><span>Category</span><strong>{room.settings.category}</strong></div>
        <div className="tip-box">💡 <span>Quick tip: the faster you guess, the more points you earn!</span></div>
      </aside>
    </main>
  );
}
