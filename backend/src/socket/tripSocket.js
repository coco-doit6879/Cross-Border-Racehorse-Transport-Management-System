const TransportRoute = require('../models/TransportRoute');
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
  socket.on('leave_trip', data=>{if(/^[a-f0-9]{24}$/i.test(String(data?.tripId||'')))socket.leave(`trip_${data.tripId}`);});
};
