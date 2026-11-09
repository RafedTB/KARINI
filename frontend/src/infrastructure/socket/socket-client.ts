import { io, Socket } from "socket.io-client";
import { env } from "@/infrastructure/config/env";

let socket: Socket | null = null;
let currentToken: string | null = null;

/**
 * Returns a shared Socket.IO instance authenticated with the given JWT token.
 * If token changes, existing connection is recycled.
 */
export function getMessagingSocket(token?: string | null): Socket | null {
  if (typeof window === "undefined") return null;

  if (!token) {
    if (socket) {
      socket.disconnect();
      socket = null;
      currentToken = null;
    }
    return null;
  }

  if (socket && currentToken === token) {
    if (!socket.connected) {
      socket.connect();
    }
    return socket;
  }

  if (socket && currentToken !== token) {
    socket.disconnect();
    socket = null;
  }

  currentToken = token;
  socket = io(env.apiUrl, {
    auth: { token },
    transports: ["websocket", "polling"],
    reconnection: true,
    reconnectionAttempts: 10,
    reconnectionDelay: 1000,
  });

  return socket;
}

export function disconnectMessagingSocket() {
  if (socket) {
    socket.disconnect();
    socket = null;
    currentToken = null;
  }
}

