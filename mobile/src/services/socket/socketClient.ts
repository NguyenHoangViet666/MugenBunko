import { io, Socket } from 'socket.io-client';
import { SERVER_HOST } from '../api/client';

// Cắt phần `/api` ra để lấy base URL cho socket
const SOCKET_URL = SERVER_HOST;

let socket: Socket | null = null;

export const initializeSocket = (token?: string) => {
  if (socket && (socket.auth as { token?: string }).token === token) return socket;
  if (socket) socket.disconnect();

  socket = io(SOCKET_URL, {
    auth: {
      token: token,
    },
    transports: ['websocket'],
    reconnection: true,
    reconnectionAttempts: 5,
    reconnectionDelay: 1000,
  });

  socket.on('connect', () => {
    console.log('[Socket] Connected to server');
  });

  socket.on('disconnect', () => {
    console.log('[Socket] Disconnected from server');
  });

  return socket;
};

export const getSocket = () => {
  if (!socket) {
    console.warn('[Socket] Socket is not initialized. Call initializeSocket first.');
  }
  return socket;
};

export const disconnectSocket = () => {
  if (socket) {
    socket.disconnect();
    socket = null;
  }
};
