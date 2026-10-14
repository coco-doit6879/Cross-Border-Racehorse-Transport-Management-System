const Route = require('../models/TransportRoute');
const { activeIncident } = require('../services/tripSafety');

exports.simulate = async (req, res, next) => {
  try {
    if (process.env.NODE_ENV === 'production' || process.env.DEMO_SIMULATION === 'false') return res.status(403).json({ message: 'Mô phỏng chỉ dùng trong môi trường demo.' });
    const route = await Route.findById(req.params.id).populate('orderId');
    if (!route) return res.status(404).json({ message: 'Không tìm thấy chuyến.' });
    if (req.user.role !== 'DRIVER' || String(route.driverId) !== String(req.user._id)) return res.status(403).json({ message: 'Chỉ tài xế được phân công có thể mô phỏng.' });
    if (!['SCHEDULED', 'IN_TRANSIT', 'DELIVERING'].includes(route.status) || await activeIncident(route._id)) return res.status(409).json({ message: 'Chuyến đã kết thúc hoặc còn sự cố chưa xử lý.' });
    const action = req.body.action;
    const now = new Date();
    if (action === 'ENABLE') {
      if (!route.demoSimulation) {
        // Add illustrative stops only to the default two-point itinerary.
        if (route.waypoints.length === 2 && route.waypoints.every(w => w.status === 'PENDING')) {
          const [start, end] = [...route.waypoints].sort((a, b) => a.sequence - b.sequence);
          const a = start.location.coordinates, b = end.location.coordinates;
          const stops = [0.33, 0.66].map((fraction, index) => ({
            sequence: index + 2, name: `Trạm nghỉ mô phỏng ${index + 1} — ${index ? 'Kiểm tra ngựa' : 'Cho ngựa uống nước'}`,
            type: 'REST_STOP', status: 'PENDING',
            location: { type: 'Point', coordinates: a.map((value, i) => value + (b[i] - value) * fraction) },
            estimatedArrival: new Date(new Date(start.estimatedArrival).getTime() + (new Date(end.estimatedArrival) - new Date(start.estimatedArrival)) * fraction)
          }));
          route.waypoints = [start.toObject(), ...stops, { ...end.toObject(), sequence: 4 }];
        }
        route.demoSimulation = true;
      }
    } else {
      if (!route.demoSimulation || route.status === 'SCHEDULED') return res.status(409).json({ message: 'Bật demo và bắt đầu chuyến trước.' });
      const ordered = [...route.waypoints].sort((a, b) => a.sequence - b.sequence);
      const resting = ordered.find(w => w.type === 'REST_STOP' && w.status === 'ARRIVED' && !w.demoDepartedAt);
      const target = ordered.find(w => w.status === 'PENDING');
      if (action === 'CONTINUE') {
        if (!resting) return res.status(409).json({ message: 'Không có lượt nghỉ đang diễn ra.' });
        resting.demoDepartedAt = now;
      } else if (action === 'ARRIVE') {
        if (resting || !target) return res.status(409).json({ message: resting ? 'Bấm kết thúc nghỉ trước khi đi tiếp.' : 'Đã đến tất cả điểm.' });
        // This moves the simulated vehicle; check-in remains a separate action.
        route.currentLocation = { type: 'Point', coordinates: [...target.location.coordinates], updatedAt: now, speedKmh: 0 };
      } else return res.status(400).json({ message: 'Thao tác mô phỏng không hợp lệ.' });
    }
    await route.save();
    const io = req.app?.get('io');
    if (io && route.currentLocation?.coordinates?.length === 2) io.to(`trip_${route._id}`).emit('route:location_changed', {
      tripId: String(route._id), longitude: route.currentLocation.coordinates[0], latitude: route.currentLocation.coordinates[1],
      timestamp: route.currentLocation.updatedAt, speedKmh: 0, simulated: true
    });
    res.json({ success: true, data: route });
  } catch (error) { next(error); }
};
