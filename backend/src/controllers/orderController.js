const Order = require('../models/Order');

// Helper to auto-generate TR-YYYY-XXXX order code
const generateOrderCode = async () => {
  const year = new Date().getFullYear();
  const count = await Order.countDocuments();
  const sequence = String(count + 1).padStart(4, '0');
  return `TR-${year}-${sequence}`;
};

// @desc    Get all orders (Filtered by Role)
// @route   GET /api/orders
// @access  Private
exports.getOrders = async (req, res, next) => {
  try {
    let query = {};
    if (req.user.role === 'CUSTOMER') {
      query.customerId = req.user.id;
    }
    const orders = await Order.find(query)
      .populate('customerId', 'fullName email phone')
      .populate('horses', 'name microchipId feiPassportNo breed');

    res.json({ success: true, count: orders.length, data: orders });
  } catch (error) {
    next(error);
  }
};

// @desc    Get single order detail
// @route   GET /api/orders/:id
// @access  Private
exports.getOrderById = async (req, res, next) => {
  try {
    const order = await Order.findById(req.params.id)
      .populate('customerId', 'fullName email phone')
      .populate('horses');

    if (!order) {
      return res.status(404).json({ message: 'Order not found' });
    }
    res.json({ success: true, data: order });
  } catch (error) {
    next(error);
  }
};

// @desc    Create new transport request order
// @route   POST /api/orders
// @access  Private (CUSTOMER, LOGISTICS_MANAGER)
exports.createOrder = async (req, res, next) => {
  try {
    const { origin, destination, horses } = req.body;

    const orderCode = await generateOrderCode();

    const order = await Order.create({
      orderCode,
      customerId: req.user.role === 'CUSTOMER' ? req.user.id : (req.body.customerId || req.user.id),
      origin,
      destination,
      horses,
      status: 'PENDING_APPROVAL'
    });

    res.status(201).json({ success: true, data: order });
  } catch (error) {
    next(error);
  }
};

// @desc    Update order status lifecycle
// @route   PATCH /api/orders/:id/status
// @access  Private (LOGISTICS_MANAGER, TRANSPORT_SPECIALIST, ROUTE_COORDINATOR)
exports.updateOrderStatus = async (req, res, next) => {
  try {
    const { status } = req.body;
    let order = await Order.findById(req.params.id);

    if (!order) {
      return res.status(404).json({ message: 'Order not found' });
    }

    order.status = status;
    await order.save();

    res.json({ success: true, message: `Order status updated to ${status}`, data: order });
  } catch (error) {
    next(error);
  }
};

// @desc    Digital Proof of Delivery (POD) Signature submission
// @route   POST /api/orders/:id/pod
// @access  Private (DRIVER_ESCORT, CUSTOMER)
exports.signPOD = async (req, res, next) => {
  try {
    const { signatureImage, recipientName, notes } = req.body;
    let order = await Order.findById(req.params.id);

    if (!order) {
      return res.status(404).json({ message: 'Order not found' });
    }

    order.status = 'COMPLETED';
    await order.save();

    res.json({
      success: true,
      message: 'Digital Proof of Delivery (POD) signed successfully',
      data: order,
      podDetails: { recipientName, notes, timestamp: new Date() }
    });
  } catch (error) {
    next(error);
  }
};
