const { Server } = require('socket.io');
const jwt = require('jsonwebtoken');
const env = require('../config/env');

/**
 * Creates the Socket.IO server bound to the given HTTP server. Clients
 * join a `site:{siteId}` room via the `subscribe` event; all telemetry,
 * alarm, and status pushes are scoped to that room so the browser only
 * receives traffic for sites it's actually looking at.
 */
function createSocketServer(httpServer) {
  const io = new Server(httpServer, {
    cors: { origin: env.CORS_ORIGIN },
  });

  io.use((socket, next) => {
    // Auth is optional-but-verified: if a token is supplied it must be
    // valid, but we don't hard-require sockets to be authenticated so the
    // simulator/demo flow keeps working out of the box. Tighten this for
    // production by making the token mandatory.
    const token = socket.handshake.auth?.token;
    if (token) {
      try {
        socket.user = jwt.verify(token, env.JWT_SECRET);
      } catch (err) {
        return next(new Error('invalid token'));
      }
    }
    next();
  });

  io.on('connection', (socket) => {
    socket.on('subscribe', ({ siteId }) => {
      if (!siteId) return;
      socket.join(`site:${siteId}`);
    });

    socket.on('unsubscribe', ({ siteId }) => {
      if (!siteId) return;
      socket.leave(`site:${siteId}`);
    });
  });

  return io;
}

module.exports = { createSocketServer };
