const Vehicle = require('../models/Vehicle');
const TransportRoute = require('../models/TransportRoute');
const { logAudit } = require('../utils/auditLogger');

const normalize = (body) => ({
  plateNumber: String(body.plateNumber || '').trim().toUpperCase(),
  name: String(body.name || '').trim(),
  capacityHorses: Number(body.capacityHorses),
  countryCode: String(body.countryCode || '').trim().toUpperCase(),
  registrationExpiresAt: body.registrationExpiresAt,
  inspectionExpiresAt: body.inspectionExpiresAt,
  status: body.status || 'ACTIVE',
  notes: String(body.notes || '').trim()
});

const validate = (data) => {
  if (!data.plateNumber || !data.name || !data.countryCode || !data.registrationExpiresAt || !data.inspectionExpiresAt) return 'Vui lòng nhập đầy đủ thông tin phương tiện.';
  if (!Number.isInteger(data.capacityHorses) || data.capacityHorses < 1 || data.capacityHorses > 12) return 'Sức chứa phải từ 1 đến 12 ngựa.';
  if (!['ACTIVE', 'MAINTENANCE', 'INACTIVE'].includes(data.status)) return 'Trạng thái phương tiện không hợp lệ.';
  return null;
};

exports.getVehicles = async (req, res, next) => {
  try {
    const vehicles = await Vehicle.find(req.query.status ? { status: req.query.status } : {}).sort({ plateNumber: 1 }).lean();
    const activeRoutes = await TransportRoute.find({ status: { $in: ['SCHEDULED', 'IN_TRANSIT', 'INCIDENT_HANDLING', 'DELIVERING'] }, vehicleId: { $ne: null } }).select('vehicleId orderId status').lean();
    const routeByVehicle = new Map(activeRoutes.map((route) => [String(route.vehicleId), route]));
    res.json({ success: true, count: vehicles.length, data: vehicles.map((vehicle) => ({ ...vehicle, activeAssignment: routeByVehicle.get(String(vehicle._id)) || null })) });
  } catch (error) { next(error); }
};

exports.createVehicle = async (req, res, next) => {
  try {
    const data = normalize(req.body); const problem = validate(data);
    if (problem) return res.status(400).json({ success: false, message: problem });
    const vehicle = await Vehicle.create(data);
    await logAudit({ actorId: req.user._id, action: 'VEHICLE_CREATE', resource: 'Vehicle', resourceId: String(vehicle._id), result: 'SUCCESS', ipAddress: req.ip, userAgent: req.get('User-Agent') });
    res.status(201).json({ success: true, data: vehicle });
  } catch (error) {
    if (error.code === 11000) return res.status(409).json({ success: false, message: 'Biển số xe đã tồn tại.' });
    next(error);
  }
};

exports.updateVehicle = async (req, res, next) => {
  try {
    const data = normalize(req.body); const problem = validate(data);
    if (problem) return res.status(400).json({ success: false, message: problem });
    const vehicle = await Vehicle.findById(req.params.id);
    if (!vehicle) return res.status(404).json({ success: false, message: 'Không tìm thấy phương tiện.' });
    if (data.status !== 'ACTIVE') {
      const assigned = await TransportRoute.exists({ vehicleId: vehicle._id, status: { $in: ['SCHEDULED', 'IN_TRANSIT', 'INCIDENT_HANDLING', 'DELIVERING'] } });
      if (assigned) return res.status(409).json({ success: false, message: 'Xe đang được phân công cho một chuyến chưa kết thúc.' });
    }
    Object.assign(vehicle, data); await vehicle.save();
    await logAudit({ actorId: req.user._id, action: 'VEHICLE_UPDATE', resource: 'Vehicle', resourceId: String(vehicle._id), result: 'SUCCESS', ipAddress: req.ip, userAgent: req.get('User-Agent') });
    res.json({ success: true, data: vehicle });
  } catch (error) {
    if (error.code === 11000) return res.status(409).json({ success: false, message: 'Biển số xe đã tồn tại.' });
    next(error);
  }
};
