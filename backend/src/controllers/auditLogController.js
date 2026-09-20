const AuditLog = require('../models/AuditLog');
const { logAudit } = require('../utils/auditLogger');

// @desc    Get system audit logs with filtering & pagination
// @route   GET /api/v1/audit-logs
// @access  Private (audit:view)
exports.getAuditLogs = async (req, res, next) => {
  try {
    const { actorId, action, result, resource, startDate, endDate, page = 1, limit = 50 } = req.query;
    let query = {};

    if (actorId) query.actorId = actorId;
    if (action) query.action = action;
    if (result) query.result = result;
    if (resource) query.resource = resource;

    if (startDate || endDate) {
      query.timestamp = {};
      if (startDate) query.timestamp.$gte = new Date(startDate);
      if (endDate) query.timestamp.$lte = new Date(endDate);
    }

    const pageNum = parseInt(page, 10);
    const limitNum = parseInt(limit, 10);
    const skip = (pageNum - 1) * limitNum;

    const total = await AuditLog.countDocuments(query);
    const logs = await AuditLog.find(query)
      .populate('actorId', 'fullName email role username')
      .sort({ timestamp: -1 })
      .skip(skip)
      .limit(limitNum);

    await logAudit({
      actorId: req.user._id,
      action: 'AUDIT_LOG_VIEW',
      resource: 'AuditLog',
      resourceId: 'SYSTEM_LOGS',
      result: 'SUCCESS',
      metadata: { filter: query, page: pageNum, limit: limitNum },
      ipAddress: req.ip,
      userAgent: req.get('User-Agent')
    });

    res.json({
      success: true,
      count: logs.length,
      total,
      page: pageNum,
      pages: Math.ceil(total / limitNum),
      data: logs
    });
  } catch (error) {
    next(error);
  }
};
