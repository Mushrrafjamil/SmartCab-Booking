let ioInstance = null;

const initSocket = (httpServer) => {
  const { Server } = require('socket.io');
  const io = new Server(httpServer, {
    cors: { origin: process.env.FRONTEND_URL || 'http://localhost:3000', credentials: true },
  });

  io.on('connection', (socket) => {
    socket.on('join:user', (userId) => {
      if (userId) socket.join(`user:${userId}`);
    });

    socket.on('leave:user', (userId) => {
      if (userId) socket.leave(`user:${userId}`);
    });

    socket.on('join:driver', (userId) => {
      if (userId) socket.join(`driver:${userId}`);
    });

    socket.on('leave:driver', (userId) => {
      if (userId) socket.leave(`driver:${userId}`);
    });

    socket.on('join:ride', (rideId) => {
      if (rideId) socket.join(`ride:${rideId}`);
    });

    socket.on('leave:ride', (rideId) => {
      if (rideId) socket.leave(`ride:${rideId}`);
    });

    socket.on('driver:location', ({ rideId, lat, lng }) => {
      if (rideId && lat && lng) {
        io.to(`ride:${rideId}`).emit('ride:location', { rideId, lat, lng, updatedAt: new Date() });
      }
    });
  });

  ioInstance = io;
  return io;
};

const getIO = () => {
  if (!ioInstance) throw new Error('Socket.io not initialized');
  return ioInstance;
};

module.exports = { initSocket, getIO };
