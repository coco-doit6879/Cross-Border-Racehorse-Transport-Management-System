const Incident = require('../models/Incident');

module.exports = (io, socket) => {
  // Listen for One-Tap Emergency SOS Push Alerts
  socket.on('sos:trigger', async (data) => {
    try {
      const { orderId, driverId, latitude, longitude, description } = data;

      const incident = await Incident.create({
        orderId,
        driverId,
        location: {
          type: 'Point',
          coordinates: [longitude, latitude]
        },
        severity: 'CRITICAL_SOS',
        status: 'OPEN',
        description: description || 'Emergency SOS trigger received via Socket'
      });

      // Broadcast HIGH-PRIORITY RED ALERT pop-up to Web Dashboard (Manager & Coordinator)
      io.emit('sos:broadcast_alert', {
        incidentId: incident._id,
        orderId,
        latitude,
        longitude,
        message: '🚨 CRITICAL EMERGENCY SOS ALERT RECEIVED!',
        timestamp: new Date()
      });
    } catch (err) {
      console.error('SOS Socket Error:', err.message);
    }
  });
};
