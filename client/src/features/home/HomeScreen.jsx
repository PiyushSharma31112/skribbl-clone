import React from 'react';
import { Sparkles } from 'lucide-react';

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
            <svg viewBox="0 0 330 205" role="img" aria-label="Colorful simple house drawing">
              <path d="M65 104 L164 28 L264 104" fill="none" stroke="#fa7968" strokeWidth="9" strokeLinecap="round" strokeLinejoin="round" />
              <path d="M88 96 V178 H240 V96" fill="#f9cf79" stroke="#252525" strokeWidth="5" strokeLinejoin="round" />
              <rect x="145" y="128" width="42" height="50" rx="3" fill="#84c9b4" stroke="#252525" strokeWidth="4" />
              <rect x="105" y="111" width="25" height="25" fill="#9ec7f5" stroke="#252525" strokeWidth="4" />
              <rect x="199" y="111" width="25" height="25" fill="#9ec7f5" stroke="#252525" strokeWidth="4" />
              <path d="M40 179 Q55 162 72 180 M248 180 Q270 155 293 179" fill="none" stroke="#4caa83" strokeWidth="6" strokeLinecap="round" />
              <circle cx="267" cy="38" r="17" fill="#f9cf79" stroke="#252525" strokeWidth="4" />
            </svg>
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
            placeholder="e.g. Picasso Jr."
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
            />
            <button className="secondary-button" type="button" onClick={joinRoom}>
              Join room <span>→</span>
            </button>
          </div>

          <p className="small-note">No account needed. Just good vibes and questionable art.</p>
        </form>
      </section>
    </main>
  );
}
