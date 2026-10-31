import { createContext, useContext, useEffect, useMemo, useState } from 'react';
import { createSocket } from '../services/socket';

const SocketContext = createContext(null);

export function SocketProvider({ children }) {
  const socket = useMemo(createSocket, []);
  const [connected, setConnected] = useState(false);

  useEffect(() => {
    if (!socket) return undefined;

    const handleConnect = () => setConnected(true);
    const handleDisconnect = () => setConnected(false);

    socket.on('connect', handleConnect);
    socket.on('disconnect', handleDisconnect);
    socket.connect();

    return () => {
      socket.off('connect', handleConnect);
      socket.off('disconnect', handleDisconnect);
      socket.disconnect();
    };
  }, [socket]);

  if (!socket) {
    return (
      <main className="app-shell grid min-h-screen place-items-center p-8 text-center">
        <section role="alert" className="max-w-lg rounded-2xl border border-slate-200 bg-white p-8 shadow-sm">
          <h1 className="mb-3 text-xl font-bold">Backend configuration required</h1>
          <p className="text-sm text-slate-600">
            Set <code>VITE_API_URL</code> and <code>VITE_SERVER_URL</code> in the
            frontend deployment environment, then rebuild the site.
          </p>
        </section>
      </main>
    );
  }

  return (
    <SocketContext.Provider value={{ socket, connected }}>
      {children}
    </SocketContext.Provider>
  );
}

export function useSocket() {
  const context = useContext(SocketContext);
  if (!context) throw new Error('useSocket must be used within a SocketProvider.');
  return context;
}
