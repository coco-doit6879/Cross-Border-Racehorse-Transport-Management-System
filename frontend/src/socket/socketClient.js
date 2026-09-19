import { io } from 'socket.io-client';

let socket;

export const getSocket = () => {
  if (!socket) {
    socket = io(import.meta.env.VITE_SOCKET_URL || 'http://localhost:5000', {
      autoConnect: false
    });
  }

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
