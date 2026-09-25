const ComplianceDoc = require('../models/ComplianceDoc');
const Order = require('../models/Order');
const { logAudit } = require('../utils/auditLogger');

// Standard Required Document Types for International Racehorse Transport
const REQUIRED_DOC_TYPES = [
  'COGGINS_TEST',
  'EQUINE_INFLUENZA_VACCINE',
  'EXPORT_HEALTH_PERMIT',
  'IMPORT_CUSTOMS_PERMIT'
];

exports.getComplianceDocuments = async (req, res, next) => {
  try {
    const query = {};
    if (req.query.status) query.status = req.query.status;
    if (req.query.orderId) query.orderId = req.query.orderId;
    const documents = await ComplianceDoc.find(query)
      .populate({ path: 'orderId', select: 'bookingCode origin destination status requestedDepartureDate customerId', populate: { path: 'customerId', select: 'fullName email phone' } })
      .populate('horseId', 'name microchipId feiPassportNumber')
      .populate('verifiedBy', 'fullName')
      .sort({ updatedAt: -1 });
    res.json({ success: true, count: documents.length, data: documents });
  } catch (error) { next(error); }
};

// @desc    Get compliance checklist & document status for an order
// @route   GET /api/v1/compliance/checklist/:orderId
// @access  Private (compliance:review / compliance:upload)
exports.getComplianceChecklist = async (req, res, next) => {
  try {
    const { orderId } = req.params;
    const order = await Order.findById(orderId).populate('horseIds', 'name microchipId feiPassportNumber');

    if (!order) {
      return res.status(404).json({
        success: false,
        message: 'Order not found'
      });
    }

    let existingDocs = await ComplianceDoc.find({ orderId });

    // Initialize missing checklist entries in PENDING_UPLOAD state with fileUrl = null
    if (existingDocs.length === 0) {
      const docsToCreate = [];
      for (const horse of order.horseIds) {
        for (const docType of REQUIRED_DOC_TYPES) {
          docsToCreate.push({
            orderId: order._id,
            horseId: horse._id,
            documentType: docType,
            countryCode: order.destination.countryCode,
            fileUrl: null, // Nullable in PENDING_UPLOAD
            status: 'PENDING_UPLOAD'
          });
        }
      }
      existingDocs = await ComplianceDoc.insertMany(docsToCreate);
    }

    const allApproved = existingDocs.every(d => d.status === 'APPROVED');

    res.json({
      success: true,
      isClearedForTransport: allApproved,
      count: existingDocs.length,
      data: existingDocs
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Upload compliance document scan
// @route   POST /api/v1/compliance/upload
// @access  Private (compliance:upload)
exports.uploadComplianceDoc = async (req, res, next) => {
  try {
    const { orderId, horseId, documentType, countryCode, fileUrl, expiresAt } = req.body;

    if (!orderId || !documentType || !countryCode || !fileUrl) {
      return res.status(400).json({
        success: false,
        message: 'Please provide orderId, documentType, countryCode, and fileUrl'
      });
    }

    const order = await Order.findById(orderId);
    if (!order) {
      return res.status(404).json({
        success: false,
        message: 'Order not found'
      });
    }

    let doc = await ComplianceDoc.findOne({ orderId, horseId, documentType });

    if (doc) {
      doc.fileUrl = fileUrl;
      doc.countryCode = countryCode.toUpperCase();
      doc.status = 'PENDING_REVIEW';
      if (expiresAt) doc.expiresAt = expiresAt;
      await doc.save();
    } else {
      doc = await ComplianceDoc.create({
        orderId,
        horseId,
        documentType,
        countryCode: countryCode.toUpperCase(),
        fileUrl,
        expiresAt,
        status: 'PENDING_REVIEW'
      });
    }

    // Documents only start after the booking has passed deposit and approval.
    if (order.status === 'APPROVED') {
      order.status = 'DOCS_PROCESSING';
      await order.save();
    }

    await logAudit({
      actorId: req.user._id,
      action: 'COMPLIANCE_UPLOAD',
      resource: 'ComplianceDoc',
      resourceId: doc._id.toString(),
      result: 'SUCCESS',
      ipAddress: req.ip,
      userAgent: req.get('User-Agent')
    });

    res.status(200).json({
      success: true,
      message: 'Compliance document uploaded and set to PENDING_REVIEW',
      data: doc
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Review and approve/reject compliance document
// @route   PATCH /api/v1/compliance/:id/verify
// @access  Private (compliance:review)
exports.reviewComplianceDoc = async (req, res, next) => {
  try {
    const { status, rejectionReason } = req.body;

    if (!['APPROVED', 'REJECTED'].includes(status)) {
      return res.status(400).json({
        success: false,
        message: 'Status must be APPROVED or REJECTED'
      });
    }

    let doc = await ComplianceDoc.findById(req.params.id);
    if (!doc) {
      return res.status(404).json({
        success: false,
        message: 'Compliance document not found'
      });
    }

    if (doc.status !== 'PENDING_REVIEW') {
      return res.status(400).json({
        success: false,
        errorCode: 'INVALID_STATE_TRANSITION',
        message: `Cannot review document in status '${doc.status}'. Must be 'PENDING_REVIEW'`
      });
    }

    if (status === 'REJECTED' && !rejectionReason) {
      return res.status(400).json({
        success: false,
        message: 'Rejection reason is required when rejecting a document'
      });
    }

    doc.status = status;
    doc.verifiedBy = req.user._id;
    if (rejectionReason) doc.rejectionReason = rejectionReason;
    await doc.save();

    // Check if all compliance docs for this order are APPROVED
    const orderDocs = await ComplianceDoc.find({ orderId: doc.orderId });
    const allApproved = orderDocs.length > 0 && orderDocs.every(d => d.status === 'APPROVED');

    let orderCleared = false;
    if (allApproved) {
      const order = await Order.findById(doc.orderId);
      if (order && order.status === 'DOCS_PROCESSING') {
        order.status = 'CLEARED_FOR_TRANSPORT';
        await order.save();
        orderCleared = true;
      }
    }

    await logAudit({
      actorId: req.user._id,
      action: `COMPLIANCE_${status}`,
      resource: 'ComplianceDoc',
      resourceId: doc._id.toString(),
      result: 'SUCCESS',
      metadata: { orderCleared },
      ipAddress: req.ip,
      userAgent: req.get('User-Agent')
    });

    res.json({
      success: true,
      message: `Document reviewed: ${status}`,
      orderClearedForTransport: orderCleared,
      data: doc
    });
  } catch (error) {
    next(error);
  }
};
