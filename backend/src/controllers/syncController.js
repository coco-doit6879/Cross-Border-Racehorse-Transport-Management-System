const HealthLog = require('../models/HealthLog');
const Incident = require('../models/Incident');
const DigitalPOD = require('../models/DigitalPOD');
const TransportRoute = require('../models/TransportRoute');
const Order = require('../models/Order');
const { logAudit } = require('../utils/auditLogger');
const { moveOrderHorsesToDestination } = require('../services/horseLocationService');
const canOperateRoute = (route, user) => String(route?.driverId || '') === String(user._id) || String(route?.escortId || '') === String(user._id) || (user.effectivePermissions || []).includes('route:dispatch');

// Event Permission Requirements Map
const EVENT_REQUIRED_PERMISSIONS = {
  'WAYPOINT_CHECKIN': 'waypoint:checkin',
  'HEALTH_LOG': 'welfare:log',
  'SOS_TRIGGER': 'sos:trigger',
  'POD_SIGN': 'pod:sign'
};

// @desc    Batch sync offline events from Mobile App with per-sub-event atomic permissions
// @route   POST /api/v1/sync/events
// @access  Private (sync:offline_events)
exports.syncOfflineEvents = async (req, res, next) => {
  try {
    const { events } = req.body;

    if (!events || !Array.isArray(events) || events.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Please provide a non-empty array of offline events'
      });
    }

    const userPermissions = req.user.effectivePermissions || [];
    const syncResults = [];

    for (const evt of events) {
      const eventId = evt.event_id || evt.eventId;
      const eventType = evt.event_type || evt.eventType;
      const payload = evt.payload || {};

      if (!eventId || !eventType) {
        syncResults.push({
          event_id: eventId || 'UNKNOWN',
          status: 'FAILURE',
          error: 'Missing event_id or event_type'
        });
        continue;
      }

      // Check sub-event specific permission
      const requiredPerm = EVENT_REQUIRED_PERMISSIONS[eventType];
      if (requiredPerm && !userPermissions.includes(requiredPerm)) {
        await logAudit({
          actorId: req.user._id,
          action: `OFFLINE_SYNC_${eventType}`,
          resource: 'OfflineSync',
          resourceId: eventId,
          result: 'DENIED',
          errorMessage: `Sub-event '${eventType}' denied: Missing required permission '${requiredPerm}'`,
          ipAddress: req.ip,
          userAgent: req.get('User-Agent')
        });

        syncResults.push({
          event_id: eventId,
          status: 'DENIED',
          error: `Missing required permission '${requiredPerm}' for sub-event '${eventType}'`
        });
        continue; // Do NOT abort batch; continue processing remaining valid events
      }

      try {
        let eventResult = null;

        switch (eventType) {
          case 'WAYPOINT_CHECKIN': {
            const { tripId, sequence, waypointId, status } = payload;
            let route = await TransportRoute.findById(tripId);
            if (!route) {
              syncResults.push({ event_id: eventId, status: 'FAILURE', error: 'Transport route not found' });
              break;
            }
            if (!canOperateRoute(route, req.user)) {
              syncResults.push({ event_id: eventId, status: 'DENIED', error: 'User is not assigned to this trip' });
              break;
            }
            let waypoint = waypointId ? route.waypoints.id(waypointId) : route.waypoints.find(w => w.sequence === Number(sequence));
            if (waypoint) {
              waypoint.status = status || 'ARRIVED';
              waypoint.actualArrival = payload.recordedAt || new Date();
              await route.save();
            }
            syncResults.push({ event_id: eventId, status: 'SUCCESS', isDuplicate: false });
            break;
          }

          case 'HEALTH_LOG': {
            const existingLog = await HealthLog.findOne({ eventId });
            if (existingLog) {
              syncResults.push({ event_id: eventId, status: 'SUCCESS', isDuplicate: true });
              break;
            }
            await HealthLog.create({
              eventId,
              tripId: payload.tripId,
              horseId: payload.horseId,
              recordedBy: req.user._id,
              temperatureCelsius: payload.temperatureCelsius,
              waterIntakeLiters: payload.waterIntakeLiters,
              foodIntakeStatus: payload.foodIntakeStatus,
              condition: payload.condition,
              alertType: payload.alertType || 'NONE',
              photoUrl: payload.photoUrl,
              notes: payload.notes,
              recordedAt: payload.recordedAt || new Date()
            });
            syncResults.push({ event_id: eventId, status: 'SUCCESS', isDuplicate: false });
            break;
          }

          case 'SOS_TRIGGER': {
            const existingIncident = await Incident.findOne({ eventId });
            if (existingIncident) {
              syncResults.push({ event_id: eventId, status: 'SUCCESS', isDuplicate: true });
              break;
            }
            const route = await TransportRoute.findById(payload.tripId);
            if (!route) {
              syncResults.push({ event_id: eventId, status: 'FAILURE', error: 'Transport route not found' });
              break;
            }
            if (!canOperateRoute(route, req.user)) {
              syncResults.push({ event_id: eventId, status: 'DENIED', error: 'User is not assigned to this trip' });
              break;
            }
            const coords = payload.coordinates || (payload.location && payload.location.coordinates);
            await Incident.create({
              eventId,
              tripId: payload.tripId,
              reportedBy: req.user._id,
              location: { type: 'Point', coordinates: coords },
              description: payload.description,
              status: 'OPEN'
            });
            route.status = 'INCIDENT_HANDLING';
            await route.save();
            syncResults.push({ event_id: eventId, status: 'SUCCESS', isDuplicate: false });
            break;
          }

          case 'POD_SIGN': {
            const existingPOD = await DigitalPOD.findOne({ tripId: payload.tripId });
            if (existingPOD) {
              syncResults.push({ event_id: eventId, status: 'SUCCESS', isDuplicate: true });
              break;
            }
            const coords = payload.coordinates || (payload.locationSigned && payload.locationSigned.coordinates);
            await DigitalPOD.create({
              tripId: payload.tripId,
              orderId: payload.orderId,
              signerName: payload.signerName,
              signerPhone: payload.signerPhone,
              signerRole: payload.signerRole,
              signatureImageUrl: payload.signatureImageUrl,
              locationSigned: { type: 'Point', coordinates: coords },
              horseConditionsOnArrival: payload.horseConditionsOnArrival || [],
              signedAt: payload.signedAt || new Date()
            });
            const route = await TransportRoute.findById(payload.tripId);
            if (route) {
              route.status = 'COMPLETED';
              await route.save();
            }
            const order = await Order.findById(payload.orderId);
            if (order) {
              order.status = 'COMPLETED';
              await order.save();
              await moveOrderHorsesToDestination(order);
            }
            syncResults.push({ event_id: eventId, status: 'SUCCESS', isDuplicate: false });
            break;
          }

          default:
            syncResults.push({ event_id: eventId, status: 'FAILURE', error: `Unsupported event type '${eventType}'` });
        }

        await logAudit({
          actorId: req.user._id,
          action: `SYNC_${eventType}`,
          resource: 'OfflineSync',
          resourceId: eventId,
          result: 'SUCCESS',
          ipAddress: req.ip,
          userAgent: req.get('User-Agent')
        });

      } catch (evtErr) {
        syncResults.push({
          event_id: eventId,
          status: 'FAILURE',
          error: evtErr.message
        });

        await logAudit({
          actorId: req.user._id,
          action: `SYNC_${eventType}`,
          resource: 'OfflineSync',
          resourceId: eventId,
          result: 'FAILURE',
          errorMessage: evtErr.message,
          ipAddress: req.ip,
          userAgent: req.get('User-Agent')
        });
      }
    }

    res.json({
      success: true,
      totalEvents: events.length,
      syncedEventsCount: syncResults.filter(r => r.status === 'SUCCESS').length,
      deniedEventsCount: syncResults.filter(r => r.status === 'DENIED').length,
      results: syncResults
    });
  } catch (error) {
    next(error);
  }
};
