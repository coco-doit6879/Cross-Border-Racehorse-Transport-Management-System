const TransportRoute = require('../models/TransportRoute');

module.exports = (io, socket) => {
  // Join specific order tracking room
  socket.on('gps:join_room', (orderId) => {
    socket.join(`order:${orderId}`);
    console.log(`Socket ${socket.id} joined tracking room for order ${orderId}`);
  });

  // Listen to driver real-time GPS stream
  socket.on('gps:update', async (data) => {
    try {
      const { routeId, orderId, latitude, longitude } = data;

      if (routeId) {
        await TransportRoute.findByIdAndUpdate(routeId, {
          currentLocation: {
            type: 'Point',
            coordinates: [longitude, latitude]
          }
        });
      }

      // Broadcast live position to Web Dashboard & Customer Map
      io.to(`order:${orderId}`).emit('gps:position_changed', {
        routeId,
        orderId,
        latitude,
        longitude,
        timestamp: new Date()
      });
    } catch (err) {
      console.error('GPS Socket Error:', err.message);
    }
  });
};
