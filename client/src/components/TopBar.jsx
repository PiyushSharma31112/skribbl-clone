import React from 'react';
import { Users, LogOut, Wifi, WifiOff, Pencil } from 'lucide-react';

export default function TopBar({ connected, room, joinCode, leaveRoom }) {
  return (
    <header className="topbar">
      <a
        className="brand"
        href="#home"
        onClick={(e) => {
          e.preventDefault();
          if (!room) window.location.hash = '#home';
        }}
      >
        <span className="brand-icon"><Pencil size={22} /></span>
        <span>
          scribbly<span className="brand-dot">.</span>
        </span>
      </a>

      <div className="top-right">
        <span className={`connection ${connected ? 'online' : ''}`}>
          {connected ? <Wifi size={15} /> : <WifiOff size={15} />}
          {connected ? 'Connected' : 'Reconnecting'}
        </span>

        {room && (
          <span className="room-pill">
            <Users size={15} /> Room {room.roomId || joinCode}
          </span>
        )}

        {room && (
          <button className="icon-button" onClick={leaveRoom} title="Leave room">
            <LogOut size={17} />
          </button>
        )}
      </div>
    </header>
  );
}
