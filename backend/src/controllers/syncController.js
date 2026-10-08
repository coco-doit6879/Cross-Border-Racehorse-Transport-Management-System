const HealthLog = require('../models/HealthLog');
const Incident = require('../models/Incident');
const DigitalPOD = require('../models/DigitalPOD');
const TransportRoute = require('../models/TransportRoute');
const Order = require('../models/Order');
const { logAudit } = require('../utils/auditLogger');
const { moveOrderHorsesToDestination } = require('../services/horseLocationService');
const { stageReady, clearanceReady, deliveryProblem } = require('../services/operationsWorkflow');
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

    if (!events || !Array.isArray(events) || events.length === 0 || events.length > 100) {
      return res.status(400).json({
        success: false,
        message: 'Please provide between 1 and 100 offline events'
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
            if (!waypoint) throw new Error('Waypoint not found');
            if (!['IN_TRANSIT', 'DELIVERING'].includes(route.status)) throw new Error('Chuyến không ở trạng thái cho phép check-in.');
            if (status && !['ARRIVED', 'SKIPPED'].includes(status)) throw new Error('Trạng thái điểm dừng không hợp lệ.');
            if (waypoint.status !== 'PENDING') { syncResults.push({ event_id: eventId, status: 'SUCCESS', isDuplicate: true }); break; }
            if (waypoint) {
              if (waypoint.type === 'BORDER_CUSTOMS') {
                const order = await Order.findById(route.orderId);
                if (status === 'SKIPPED' || !clearanceReady(route, order, waypoint.name) || !(await stageReady(order._id, 'BORDER', waypoint.name))) throw new Error('Hồ sơ thông quan chưa hoàn tất.');
              }
              waypoint.status = status || 'ARRIVED';
              waypoint.actualArrival = payload.recordedAt || new Date();
              await route.save();
            }
            syncResults.push({ event_id: eventId, status: 'SUCCESS', isDuplicate: false });
            break;
          }

          case 'HEALTH_LOG': {
            await require('../services/resourceAccess').validateHealthAssignment(req.user, payload.tripId, payload.horseId);
            const existingLog = await HealthLog.findOne({ eventId });
            if (existingLog) {
              if (String(existingLog.tripId) !== String(payload.tripId) || String(existingLog.recordedBy) !== String(req.user._id)) throw new Error('Sự kiện không thuộc nhật ký của bạn.');
              await require('../services/healthEscalation')(existingLog, req);
              syncResults.push({ event_id: eventId, status: 'SUCCESS', isDuplicate: true });
              break;
            }
            const healthLog = await HealthLog.create({
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
            await require('../services/healthEscalation')(healthLog, req);
            syncResults.push({ event_id: eventId, status: 'SUCCESS', isDuplicate: false });
            break;
          }

          case 'SOS_TRIGGER': {
            const sosResponse = { statusCode: 200, status(code) { this.statusCode = code; return this; }, json(body) { this.body = body; return this; } };
            await require('./incidentController').triggerSOS({ ...req, app: req.app, body: { ...payload, eventId }, get: req.get.bind(req) }, sosResponse, error => { throw error; });
            if (sosResponse.statusCode >= 400) throw new Error(sosResponse.body.message);
            syncResults.push({ event_id: eventId, status: 'SUCCESS', isDuplicate: Boolean(sosResponse.body.isDuplicate) });
            break;
          }

          case 'POD_SIGN': {
            throw new Error('Giao nhận cần xác nhận trực tuyến với GPS mới; vui lòng mở lại đơn để ký.');
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
