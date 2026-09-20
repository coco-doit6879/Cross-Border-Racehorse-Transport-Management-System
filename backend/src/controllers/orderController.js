const Order = require('../models/Order');
const Horse = require('../models/Horse');
const { logAudit } = require('../utils/auditLogger');

/**
 * Auto-generates unique TR-YYYY-XXXX booking code
 */
const generateBookingCode = async () => {
  const year = new Date().getFullYear();
  const count = await Order.countDocuments();
  const sequence = String(count + 1).padStart(4, '0');
  let bookingCode = `TR-${year}-${sequence}`;

  // Ensure absolute uniqueness
  let exists = await Order.findOne({ bookingCode });
  let attempts = 1;
  while (exists) {
    const seqNum = String(count + 1 + attempts).padStart(4, '0');
    bookingCode = `TR-${year}-${seqNum}`;
    exists = await Order.findOne({ bookingCode });
    attempts++;
  }
  return bookingCode;
};

// Allowed State Machine Transitions Map
const ALLOWED_ORDER_TRANSITIONS = {
  'PENDING_APPROVAL': ['APPROVED', 'REJECTED', 'CANCELLED'],
  'APPROVED': ['DOCS_PROCESSING', 'CANCELLED'],
  'DOCS_PROCESSING': ['CLEARED_FOR_TRANSPORT', 'CANCELLED'],
  'CLEARED_FOR_TRANSPORT': ['IN_TRANSIT', 'CANCELLED'],
  'IN_TRANSIT': ['DELIVERING', 'CANCELLED'],
  'DELIVERING': ['COMPLETED', 'CANCELLED'],
  'COMPLETED': [],
  'REJECTED': [],
  'CANCELLED': []
};

// @desc    Get all orders (Filtered by customer / role)
// @route   GET /api/v1/orders
// @access  Private
exports.getOrders = async (req, res, next) => {
  try {
    let query = {};
    const permissions = req.user.effectivePermissions || [];

    if (!permissions.includes('booking:approve') && req.user.role === 'CUSTOMER') {
      query.customerId = req.user._id;
    } else if (req.query.customerId) {
      query.customerId = req.query.customerId;
    }

    if (req.query.status) {
      query.status = req.query.status;
    }

    const orders = await Order.find(query)
      .populate('customerId', 'fullName email phone username')
      .populate('horseIds', 'name microchipId feiPassportNumber breed weightKg');

    res.json({
      success: true,
      count: orders.length,
      data: orders
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get single order details
// @route   GET /api/v1/orders/:id
// @access  Private
exports.getOrderById = async (req, res, next) => {
  try {
    const order = await Order.findById(req.params.id)
      .populate('customerId', 'fullName email phone username')
      .populate('horseIds');

    if (!order) {
      return res.status(404).json({
        success: false,
        message: 'Order not found'
      });
    }

    const permissions = req.user.effectivePermissions || [];
    if (req.user.role === 'CUSTOMER' && order.customerId._id.toString() !== req.user._id.toString() && !permissions.includes('booking:approve')) {
      await logAudit({
        actorId: req.user._id,
        action: 'ORDER_READ',
        resource: 'Order',
        resourceId: order._id.toString(),
        result: 'DENIED',
        errorMessage: 'Customer attempted to view another customer\'s order',
        ipAddress: req.ip,
        userAgent: req.get('User-Agent')
      });

      return res.status(403).json({
        success: false,
        message: 'Forbidden: You do not have permission to view this order'
      });
    }

    res.json({
      success: true,
      data: order
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Create new transport request (CUSTOMER only)
// @route   POST /api/v1/orders
// @access  Private (booking:create)
exports.createOrder = async (req, res, next) => {
  try {
    const { horseIds, origin, destination, requestedDepartureDate, specialRequirements } = req.body;

    if (!horseIds || !Array.isArray(horseIds) || horseIds.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Please provide at least one horse ID for the transport order'
      });
    }

    if (!origin || !origin.address || !origin.countryCode || !origin.coordinates || origin.coordinates.length !== 2) {
      return res.status(400).json({
        success: false,
        message: 'Please provide valid origin address, countryCode, and GeoJSON coordinates [lng, lat]'
      });
    }

    if (!destination || !destination.address || !destination.countryCode || !destination.coordinates || destination.coordinates.length !== 2) {
      return res.status(400).json({
        success: false,
        message: 'Please provide valid destination address, countryCode, and GeoJSON coordinates [lng, lat]'
      });
    }

    if (!requestedDepartureDate) {
      return res.status(400).json({
        success: false,
        message: 'Please provide a requested departure date'
      });
    }

    // Validate Horse Ownership: Ensure all selected horses belong to the Customer creating the booking
    const ownedHorses = await Horse.find({
      _id: { $in: horseIds },
      ownerId: req.user._id
    });

    if (ownedHorses.length !== horseIds.length) {
      await logAudit({
        actorId: req.user._id,
        action: 'ORDER_CREATE',
        resource: 'Order',
        resourceId: 'N/A',
        result: 'FAILURE',
        errorMessage: 'Customer attempted to book horses not owned by them',
        ipAddress: req.ip,
        userAgent: req.get('User-Agent')
      });

      return res.status(400).json({
        success: false,
        message: 'Validation Error: One or more selected horses do not belong to your account'
      });
    }

    const bookingCode = await generateBookingCode();

    // Initial status is locked to PENDING_APPROVAL
    const order = await Order.create({
      bookingCode,
      customerId: req.user._id,
      horseIds,
      origin: {
        address: origin.address,
        countryCode: origin.countryCode.toUpperCase(),
        coordinates: origin.coordinates // [lng, lat]
      },
      destination: {
        address: destination.address,
        countryCode: destination.countryCode.toUpperCase(),
        coordinates: destination.coordinates // [lng, lat]
      },
      requestedDepartureDate,
      specialRequirements,
      status: 'PENDING_APPROVAL'
    });

    await logAudit({
      actorId: req.user._id,
      action: 'ORDER_CREATE',
      resource: 'Order',
      resourceId: order._id.toString(),
      result: 'SUCCESS',
      ipAddress: req.ip,
      userAgent: req.get('User-Agent')
    });

    res.status(201).json({
      success: true,
      data: order
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Update order status lifecycle (Manager approval / workflow transition)
// @route   PATCH /api/v1/orders/:id/status
// @access  Private (booking:approve or system workflow)
exports.updateOrderStatus = async (req, res, next) => {
  try {
    const { status, rejectionReason } = req.body;

    if (!status) {
      return res.status(400).json({
        success: false,
        message: 'Please provide target status'
      });
    }

    let order = await Order.findById(req.params.id);
    if (!order) {
      return res.status(404).json({
        success: false,
        message: 'Order not found'
      });
    }

    const currentStatus = order.status;
    const allowedNextStatuses = ALLOWED_ORDER_TRANSITIONS[currentStatus] || [];

    // Enforce State Machine Validation
    if (!allowedNextStatuses.includes(status)) {
      await logAudit({
        actorId: req.user._id,
        action: 'ORDER_STATUS_UPDATE',
        resource: 'Order',
        resourceId: order._id.toString(),
        result: 'FAILURE',
        errorMessage: `Invalid state transition from ${currentStatus} to ${status}`,
        ipAddress: req.ip,
        userAgent: req.get('User-Agent')
      });

      return res.status(400).json({
        success: false,
        errorCode: 'INVALID_STATE_TRANSITION',
        message: `Invalid state transition: Cannot change order status from '${currentStatus}' to '${status}'`
      });
    }

    // Require rejectionReason if rejecting order
    if (status === 'REJECTED' && !rejectionReason) {
      return res.status(400).json({
        success: false,
        message: 'Rejection reason is required when rejecting a booking'
      });
    }

    order.status = status;
    if (rejectionReason) {
      order.rejectionReason = rejectionReason;
    }

    await order.save();

    await logAudit({
      actorId: req.user._id,
      action: `ORDER_${status}`,
      resource: 'Order',
      resourceId: order._id.toString(),
      result: 'SUCCESS',
      metadata: { previousStatus: currentStatus, newStatus: status, rejectionReason },
      ipAddress: req.ip,
      userAgent: req.get('User-Agent')
    });

    res.json({
      success: true,
      message: `Order ${order.bookingCode} status updated to ${status}`,
      data: order
    });
  } catch (error) {
    next(error);
  }
};
