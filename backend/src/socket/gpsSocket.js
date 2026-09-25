const TransportRoute = require('../models/TransportRoute');
const Order = require('../models/Order');
const { processRouteDeviation } = require('../services/routeDeviationService');
const { logAudit } = require('../utils/auditLogger');

module.exports = (io, socket) => {

  /**
   * Room Join Event: Allows authorized users to join room trip_<tripId>
   */
  const handleJoinTripRoom = async (data, callback) => {
    try {
      const tripId = typeof data === 'string' ? data : (data && (data.tripId || data.orderId));

      if (!tripId) {
        if (typeof callback === 'function') callback({ success: false, message: 'tripId is required' });
        return;
      }

      let route = await TransportRoute.findById(tripId).populate('orderId');
      if (!route) {
        // Try looking up by orderId if tripId was an orderId
        route = await TransportRoute.findOne({ orderId: tripId }).populate('orderId');
      }

      if (!route) {
        if (typeof callback === 'function') callback({ success: false, message: 'Transport route not found' });
        return;
      }

      const user = socket.user;
      const permissions = user ? user.effectivePermissions || [] : [];

      const isAssignedStaff = (route.driverId && route.driverId.toString() === user._id.toString()) ||
                              (route.escortId && route.escortId.toString() === user._id.toString());
      const isCustomerOwner = route.orderId && route.orderId.customerId && route.orderId.customerId.toString() === user._id.toString();
      const hasPrivilegedPermission = permissions.some(p => ['sos:manage', 'route:dispatch', 'analytics:view', 'horse:manage_all', 'booking:approve'].includes(p));

      const isAuthorized = isAssignedStaff || isCustomerOwner || hasPrivilegedPermission;

      if (!isAuthorized) {
        await logAudit({
          actorId: user._id,
          action: 'TRIP_ROOM_JOIN_DENIED',
          resource: 'TransportRoute',
          resourceId: route._id.toString(),
          result: 'DENIED',
          errorMessage: 'User is not authorized to join this trip room',
          ipAddress: socket.handshake.address
        });

        if (typeof callback === 'function') callback({ success: false, message: 'Forbidden: You are not authorized to access this trip room' });
        return;
      }

      const roomName = `trip_${route._id.toString()}`;
      socket.join(roomName);

      if (typeof callback === 'function') {
        callback({ success: true, room: roomName, message: `Joined room ${roomName}` });
      }
    } catch (err) {
      console.error('Socket Join Room Error:', err.message);
      if (typeof callback === 'function') callback({ success: false, message: err.message });
    }
  };

  socket.on('join_trip', handleJoinTripRoom);
  socket.on('gps:join_room', handleJoinTripRoom);

  /**
   * Real-time GPS Update Event (trip:operate permission required)
   */
  socket.on('gps:update', async (data, callback) => {
    try {
      const user = socket.user;
      if (!user) {
        if (typeof callback === 'function') callback({ success: false, message: 'Unauthenticated socket' });
        return;
      }

      const permissions = user.effectivePermissions || [];
      if (!permissions.includes('trip:operate') && !permissions.includes('trip:start')) {
        await logAudit({
          actorId: user._id,
          action: 'GPS_UPDATE',
          resource: 'TransportRoute',
          resourceId: data.tripId || 'N/A',
          result: 'DENIED',
          errorMessage: "Missing required permission 'trip:operate'",
          ipAddress: socket.handshake.address
        });

        if (typeof callback === 'function') callback({ success: false, message: "Forbidden: Missing required permission 'trip:operate'" });
        return;
      }

      const { tripId, routeId, latitude, longitude, speedKmh, headingDegree, timestamp } = data;
      const targetTripId = tripId || routeId;

      // Coordinate validations
      if (!targetTripId || typeof latitude !== 'number' || typeof longitude !== 'number' ||
          latitude < -90 || latitude > 90 || longitude < -180 || longitude > 180) {
        await logAudit({
          actorId: user._id,
          action: 'GPS_UPDATE',
          resource: 'TransportRoute',
          resourceId: targetTripId || 'N/A',
          result: 'FAILURE',
          errorMessage: 'Invalid GPS coordinates or missing tripId',
          ipAddress: socket.handshake.address
        });

        if (typeof callback === 'function') callback({ success: false, message: 'Invalid GPS coordinates or tripId' });
        return;
      }

      let route = await TransportRoute.findById(targetTripId);
      if (!route) {
        if (typeof callback === 'function') callback({ success: false, message: 'Transport route not found' });
        return;
      }

      const isAssigned = String(route.driverId || '') === String(user._id) || String(route.escortId || '') === String(user._id);
      const canDispatch = permissions.includes('route:dispatch');
      if (!isAssigned && !canDispatch) {
        if (typeof callback === 'function') callback({ success: false, message: 'Forbidden: You are not assigned to this trip' });
        return;
      }

      // Check if trip is in an active transport state
      if (!['IN_TRANSIT', 'INCIDENT_HANDLING', 'DELIVERING'].includes(route.status)) {
        if (typeof callback === 'function') callback({ success: false, message: `Cannot update GPS for trip in status '${route.status}'` });
        return;
      }

      const updateTimestamp = timestamp ? new Date(timestamp) : new Date();

      // Update route currentLocation as GeoJSON [longitude, latitude]
      route.currentLocation = {
        type: 'Point',
        coordinates: [longitude, latitude],
        speedKmh: speedKmh || 0,
        headingDegree: headingDegree || 0,
        updatedAt: updateTimestamp
      };

      // Run server-side Route Deviation & Abnormal Stop detection service
      await processRouteDeviation({
        route,
        latitude,
        longitude,
        timestamp: updateTimestamp,
        io,
        actor: user
      });

      await route.save();

      // Broadcast location change to room trip_<tripId>
      const roomName = `trip_${route._id.toString()}`;
      io.to(roomName).emit('route:location_changed', {
        tripId: route._id.toString(),
        latitude,
        longitude,
        speedKmh: speedKmh || 0,
        headingDegree: headingDegree || 0,
        timestamp: updateTimestamp.toISOString()
      });

      await logAudit({
        actorId: user._id,
        action: 'GPS_UPDATE',
        resource: 'TransportRoute',
        resourceId: route._id.toString(),
        result: 'SUCCESS',
        metadata: { latitude, longitude, speedKmh }
      });

      if (typeof callback === 'function') {
        callback({ success: true, message: 'GPS updated and broadcasted' });
      }
    } catch (err) {
      console.error('GPS Socket Error:', err.message);
      if (typeof callback === 'function') callback({ success: false, message: err.message });
    }
  });
};
