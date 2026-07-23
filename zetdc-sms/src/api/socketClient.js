import { io } from 'socket.io-client';

const WS_URL = import.meta.env.VITE_WS_URL || 'http://localhost:4000';

let socket = null;

/** Lazily creates (or returns) the single shared socket for the app. */
export function getSocket(token) {
  if (socket) return socket;
  socket = io(WS_URL, {
    autoConnect: true,
    auth: token ? { token } : {},
    transports: ['websocket', 'polling'],
  });
  return socket;
}

export function disconnectSocket() {
  if (socket) {
    socket.disconnect();
    socket = null;
  }
}
