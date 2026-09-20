const Incident = require('../models/Incident');
const TransportRoute = require('../models/TransportRoute');
const { logAudit } = require('../utils/auditLogger');

module.exports = (io, socket) => {
  /**
   * Real-time Emergency SOS Trigger Event (sos:trigger permission required)
   */
  socket.on('sos:trigger', async (data, callback) => {
    try {
      const user = socket.user;
      if (!user) {
        if (typeof callback === 'function') callback({ success: false, message: 'Unauthenticated socket' });
        return;
      }

      const permissions = user.effectivePermissions || [];
      if (!permissions.includes('sos:trigger')) {
        await logAudit({
          actorId: user._id,
          action: 'SOS_TRIGGER',
          resource: 'Incident',
          resourceId: data.tripId || 'N/A',
          result: 'DENIED',
          errorMessage: "Missing required permission 'sos:trigger'",
          ipAddress: socket.handshake.address
        });

        if (typeof callback === 'function') callback({ success: false, message: "Forbidden: Missing required permission 'sos:trigger'" });
        return;
      }

      const { eventId, tripId, orderId, latitude, longitude, coordinates, description } = data;
      const targetTripId = tripId || orderId;
      const coords = coordinates || [longitude, latitude];

      if (!targetTripId || !coords || coords.length !== 2 || typeof coords[0] !== 'number' || typeof coords[1] !== 'number') {
        if (typeof callback === 'function') callback({ success: false, message: 'Invalid SOS coordinates [lng, lat] or missing tripId' });
        return;
      }

      const lng = coords[0];
      const lat = coords[1];

      let route = await TransportRoute.findById(targetTripId);
      if (!route) {
        route = await TransportRoute.findOne({ orderId: targetTripId });
      }

      if (!route) {
        if (typeof callback === 'function') callback({ success: false, message: 'Transport route not found' });
        return;
      }

      // Idempotency check: Reuse existing incident if eventId exists
      let incident = null;
      let isDuplicate = false;

      if (eventId) {
        incident = await Incident.findOne({ eventId });
      }

      if (incident) {
        isDuplicate = true;
      } else {
        const sosEventId = eventId || `sos-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;

        incident = await Incident.create({
          eventId: sosEventId,
          tripId: route._id,
          reportedBy: user._id,
          location: {
            type: 'Point',
            coordinates: [lng, lat] // [longitude, latitude]
          },
          description: description || 'CRITICAL EMERGENCY SOS TRIGGERED',
          status: 'OPEN'
        });

        // Update TransportRoute status to INCIDENT_HANDLING
        route.status = 'INCIDENT_HANDLING';
        route.currentLocation = {
          type: 'Point',
          coordinates: [lng, lat],
          updatedAt: new Date()
        };
        await route.save();
      }

      const sosAlertPayload = {
        incidentId: incident._id.toString(),
        tripId: route._id.toString(),
        eventId: incident.eventId,
        location: {
          latitude: lat,
          longitude: lng
        },
        description: incident.description,
        status: incident.status,
        reportedAt: incident.createdAt.toISOString(),
        isDuplicate
      };

      // Broadcast alert to room trip_<tripId>
      const roomName = `trip_${route._id.toString()}`;
      io.to(roomName).emit('sos:alert_broadcast', sosAlertPayload);

      // Also broadcast to all connected sockets where user has sos:manage permission (Coordinators/Managers)
      for (const [id, s] of io.sockets.sockets) {
        if (s.user && s.user.effectivePermissions && s.user.effectivePermissions.includes('sos:manage')) {
          s.emit('sos:alert_broadcast', sosAlertPayload);
        }
      }

      await logAudit({
        actorId: user._id,
        action: 'SOS_ALERT_BROADCAST',
        resource: 'Incident',
        resourceId: incident._id.toString(),
        result: 'SUCCESS',
        metadata: { tripId: route._id.toString(), latitude: lat, longitude: lng, isDuplicate }
      });

      if (typeof callback === 'function') {
        callback({ success: true, isDuplicate, message: 'Emergency SOS broadcasted successfully', data: incident });
      }
    } catch (err) {
      console.error('SOS Socket Error:', err.message);
      if (typeof callback === 'function') callback({ success: false, message: err.message });
    }
  });
};
