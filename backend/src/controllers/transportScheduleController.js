const TransportSchedule = require('../models/TransportSchedule');
const service = require('../services/transportScheduleService');
const { COUNTRIES, STOPS, TIME_SLOTS, BOOKING_WINDOW_DAYS, MIN_NOTICE_HOURS, CURRENCY, ADD_ONS } = require('../config/transportCatalog');
const { logAudit } = require('../utils/auditLogger');

exports.getCatalog = async (req, res, next) => {
  try {
    const configuration = await service.getConfiguration();
    res.json({ success: true, data: {
      countries: COUNTRIES, stops: STOPS, timeSlots: TIME_SLOTS,
      bookingWindowDays: BOOKING_WINDOW_DAYS, minNoticeHours: MIN_NOTICE_HOURS,
      currency: CURRENCY, addOns: ADD_ONS,
      revision: configuration.revision, rules: configuration.rules,
      departures: service.generateDepartures(configuration)
    } });
  } catch (error) { next(error); }
};

exports.updateSchedule = async (req, res, next) => {
  try {
    if (!Number.isInteger(req.body.revision) || req.body.revision < 0) return res.status(400).json({ success: false, message: 'Phiên bản lịch không hợp lệ.' });
    const rules = service.validateRules(req.body.rules);
    const current = await service.getConfiguration();
    if (current.revision !== req.body.revision) return res.status(409).json({ success: false, message: 'Người khác vừa cập nhật lịch. Vui lòng tải lại.' });
    const saved = await TransportSchedule.findOneAndUpdate({ _id: 'fixed-network', revision: req.body.revision }, {
      $set: { rules, updatedBy: req.user._id }, $inc: { revision: 1 }
    }, { new: true, upsert: req.body.revision === 0, runValidators: true });
    if (!saved) return res.status(409).json({ success: false, message: 'Lịch đã thay đổi. Vui lòng tải lại.' });
    await logAudit({ actorId: req.user._id, action: 'TRANSPORT_SCHEDULE_UPDATE', resource: 'TransportSchedule', resourceId: 'fixed-network', result: 'SUCCESS', metadata: { revision: saved.revision }, ipAddress: req.ip, userAgent: req.get('User-Agent') });
    res.json({ success: true, data: { revision: saved.revision, rules: saved.rules } });
  } catch (error) {
    if (error.code === 11000) return res.status(409).json({ success: false, message: 'Người khác vừa cập nhật lịch. Vui lòng tải lại.' });
    if (error.status) return res.status(error.status).json({ success: false, message: error.message });
    next(error);
  }
};
