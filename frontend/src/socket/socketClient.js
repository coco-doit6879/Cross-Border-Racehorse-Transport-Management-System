import { io } from 'socket.io-client';
import { getAccessToken } from '../utils/authSession';

let socket;

export const getSocket = () => {
  if (!socket) {
    socket = io(import.meta.env.VITE_SOCKET_URL || 'http://localhost:5000', {
      autoConnect: false,
      auth: { token: getAccessToken() }
    });
  }

  socket.auth = { token: getAccessToken() };

  return socket;
};

export const connectSocket = () => {
  const client = getSocket();
  if (!client.connected) client.connect();
  return client;
};

export const disconnectSocket = () => {
  if (socket) socket.disconnect();
};
