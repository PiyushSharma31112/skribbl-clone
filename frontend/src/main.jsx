import React from 'react';
import { createRoot } from 'react-dom/client';
import App from './App.jsx';
import { SocketProvider } from './context/SocketContext.jsx';
import './styles/global.css';
import './styles/directory.css';

createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <SocketProvider>
      <App />
    </SocketProvider>
  </React.StrictMode>
);
