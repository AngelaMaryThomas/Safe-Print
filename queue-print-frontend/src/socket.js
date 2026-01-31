import { io } from 'socket.io-client';

// IMPORTANT: Replace this URL with the actual address of your backend server.
// If your frontend and backend are on the same machine for development,
// 'http://localhost:3001' is usually correct.
const SOCKET_URL = 'http://172.20.10.2:3001';

export const socket = io(SOCKET_URL, {
  autoConnect: false // We will connect manually when a component mounts.
});
