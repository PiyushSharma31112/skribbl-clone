import React from 'react';
import { Sparkles } from 'lucide-react';
import houseDoodle from '../assets/house-doodle.svg';

export default function HomeScreen({
  name,
  setName,
  createRoom,
  joinCode,
  setJoinCode,
  joinRoom,
  settings,
  setSettings,
  isPrivate,
  setIsPrivate,
  publicRooms,
  recentGames,
  directoryLoading,
  directoryError,
  refreshDirectory,
  joinPublicRoom,
}) {
  return (
    <main className="home-layout">
      <section className="hero">
        <div className="eyebrow"><Sparkles size={15} /> DRAW. GUESS. REPEAT.</div>
        <h1>
          Good drawings.<br />
          <span>Terrible guesses.</span>
        </h1>
        <p className="hero-copy">
          A little creativity, a little chaos, and a whole lot of fun. Grab your friends and see who can guess the fastest.
        </p>

        <div className="hero-art">
          <div className="doodle doodle-sun">✳</div>
          <div className="doodle doodle-star">✦</div>
          <div className="art-card">
            <span className="art-label">TODAY'S MASTERPIECE</span>
            <img className="art-doodle" src={houseDoodle} alt="Colorful simple house drawing" />
            <div className="art-caption">“It's a house. Obviously.”</div>
          </div>
          <div className="doodle doodle-pencil">✎</div>
        </div>
      </section>

      <section className="entry-card">
        <div className="card-heading">
          <span className="step-number">01</span>
          <div>
            <h2>Ready to play?</h2>
            <p>First, what should we call you?</p>
          </div>
        </div>

        <form onSubmit={createRoom} className="form-stack">
          <label className="field-label">YOUR NICKNAME</label>
          <input
            className="text-input"
            placeholder="e.g. Piyush."
            maxLength={18}
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
          />

          <div className="divider"><span>THEN CHOOSE YOUR ADVENTURE</span></div>

          <button type="button" className="primary-button" onClick={createRoom}>
            <span>＋</span> Create a room <span className="button-arrow">→</span>
          </button>

          <div className="privacy-row">
            <span>Room visibility</span>
            <div className="segmented">
              <button type="button" className={isPrivate ? 'selected' : ''} onClick={() => setIsPrivate(true)}>Private</button>
              <button type="button" className={!isPrivate ? 'selected' : ''} onClick={() => setIsPrivate(false)}>Public</button>
            </div>
          </div>

          <div className="settings-grid">
            <label>
              Players
              <select value={settings.maxPlayers} onChange={(e) => setSettings({ ...settings, maxPlayers: +e.target.value })}>
                {[2, 4, 6, 8, 10, 12, 16, 20].map((n) => <option key={n}>{n}</option>)}
              </select>
            </label>

            <label>
              Rounds
              <select value={settings.rounds} onChange={(e) => setSettings({ ...settings, rounds: +e.target.value })}>
                {[2, 3, 4, 5, 6, 7, 8, 9, 10].map((n) => <option key={n}>{n}</option>)}
              </select>
            </label>

            <label>
              Draw time
              <select value={settings.drawTime} onChange={(e) => setSettings({ ...settings, drawTime: +e.target.value })}>
                {[15, 30, 45, 60, 80, 100, 120, 180, 240].map((n) => <option key={n} value={n}>{n}s</option>)}
              </select>
            </label>

            <label>
              Word choices
              <select value={settings.wordCount} onChange={(e) => setSettings({ ...settings, wordCount: +e.target.value })}>
                {[1, 2, 3, 4, 5].map((n) => <option key={n}>{n}</option>)}
              </select>
            </label>

            <label>
              Hints
              <select value={settings.hints} onChange={(e) => setSettings({ ...settings, hints: +e.target.value })}>
                {[0, 1, 2, 3, 4, 5].map((n) => <option key={n}>{n}</option>)}
              </select>
            </label>
          </div>

          <label className="field-label category-label">WORD CATEGORY</label>
          <select className="text-input" value={settings.category} onChange={(e) => setSettings({ ...settings, category: e.target.value })}>
            {['All', 'Animals', 'Objects', 'Food', 'Actions'].map((x) => <option key={x}>{x}</option>)}
          </select>

          <div className="divider"><span>OR JOIN YOUR FRIENDS</span></div>

          <div className="join-row">
            <input
              className="text-input"
              placeholder="Enter room code"
              value={joinCode}
              onChange={(e) => setJoinCode(e.target.value.toUpperCase())}
              maxLength={6}
              aria-label="Room code"
            />
            <button className="secondary-button" type="button" onClick={joinRoom}>
              Join room <span>→</span>
            </button>
          </div>

          <p className="small-note">No account needed. Just good vibes and questionable art.</p>
        </form>
      </section>

      <section className="directory-panel mt-8 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm" aria-label="Game directory">
        <div className="directory-section">
          <div className="directory-heading">
            <div>
              <h2>Open rooms</h2>
              <p className="muted">Join a public game that still has space.</p>
            </div>
            <button type="button" className="secondary-button" onClick={refreshDirectory} disabled={directoryLoading}>
              {directoryLoading ? 'Refreshing…' : 'Refresh'}
            </button>
          </div>
          {publicRooms.length ? (
            <div className="directory-grid">
              {publicRooms.map((room) => (
                <button
                  type="button"
                  className="directory-room"
                  key={room.roomId}
                  onClick={() => joinPublicRoom(room.roomId)}
                  aria-label={`Join room ${room.roomId}`}
                >
                  <strong>{room.hostName}'s room</strong>
                  <span>{room.players}/{room.maxPlayers} players · {room.roomId}</span>
                  <span className="directory-join">Join room →</span>
                </button>
              ))}
            </div>
          ) : (
            <p className="directory-empty">No public rooms are open right now. Create one and invite everyone in.</p>
          )}
          {directoryError && <p className="directory-error" role="alert">{directoryError}</p>}
        </div>

        <div className="directory-section recent-games">
          <div className="directory-heading">
            <div>
              <h2>Recent matches</h2>
              <p className="muted">A little inspiration from games just finished.</p>
            </div>
          </div>
          {recentGames.length ? (
            <div className="directory-grid">
              {recentGames.map((game) => (
                <article className="directory-room recent-game" key={game.id}>
                  <strong>{game.winnerName || 'No winner'} won</strong>
                  <span>{game.playerCount} players · room {game.roomId}</span>
                  <time dateTime={game.completedAt}>
                    {new Date(game.completedAt).toLocaleString()}
                  </time>
                </article>
              ))}
            </div>
          ) : (
            <p className="directory-empty">Finished matches will show up here.</p>
          )}
        </div>
      </section>
    </main>
  );
}
