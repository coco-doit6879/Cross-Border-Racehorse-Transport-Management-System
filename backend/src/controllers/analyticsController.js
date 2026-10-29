const Order = require('../models/Order');
const TransportRoute = require('../models/TransportRoute');
const Incident = require('../models/Incident');
const PaymentTransaction = require('../models/PaymentTransaction');
const { calculateHaversineDistanceKm } = require('../services/geoDistance');
const { logAudit } = require('../utils/auditLogger');

/**
 * Calculates total route distance in kilometers from an array of waypoints
 */
const calculateRouteTotalKm = (waypoints) => {
  if (!waypoints || waypoints.length < 2) return 0;
  let totalKm = 0;
  for (let i = 0; i < waypoints.length - 1; i++) {
    const p1 = waypoints[i].location?.coordinates;
    const p2 = waypoints[i + 1].location?.coordinates;
    if (p1 && p2 && p1.length === 2 && p2.length === 2) {
      // GeoJSON: [longitude, latitude]
      totalKm += calculateHaversineDistanceKm(p1[1], p1[0], p2[1], p2[0]);
    }
  }
  return Number(totalKm.toFixed(2));
};


// @desc    Get system KPI analytics & operational report totals (Includes OTD % and Total Km)
// @route   GET /api/v1/analytics/kpi
// @access  Private (analytics:view)
exports.getKPIAnalytics = async (req, res, next) => {
  try {
    const totalOrders = await Order.countDocuments();
    const completedOrders = await Order.countDocuments({ status: 'COMPLETED' });
    const inTransitOrders = await Order.countDocuments({ status: 'IN_TRANSIT' });
    const pendingOrders = await Order.countDocuments({ status: 'PENDING_APPROVAL' });

    const totalTrips = await TransportRoute.countDocuments();
    const allRoutes = await TransportRoute.find({}, 'waypoints');
    
    // Calculate total Km across all dispatched routes
    let totalKmTraveled = 0;
    allRoutes.forEach(route => {
      totalKmTraveled += calculateRouteTotalKm(route.waypoints);
    });

    const totalIncidents = await Incident.countDocuments();
    const openIncidents = await Incident.countDocuments({ status: { $in: ['OPEN', 'ACKNOWLEDGED', 'IN_PROGRESS'] } });

    // Calculate On-time Delivery Rate (OTD %)
    const otdPercentage = totalOrders > 0 ? ((completedOrders / totalOrders) * 100).toFixed(1) : 100.0;

    // Calculate Emergency Incident Costs
    const emergencyCostAggregation = await Incident.aggregate([
      { $group: { _id: null, totalEmergencyCosts: { $sum: "$emergencyCostAmount" } } }
    ]);

    const totalEmergencyCosts = emergencyCostAggregation.length > 0 ? emergencyCostAggregation[0].totalEmergencyCosts : 0;

    res.json({
      success: true,
      data: {
        orders: {
          total: totalOrders,
          completed: completedOrders,
          inTransit: inTransitOrders,
          pendingApproval: pendingOrders,
          onTimeDeliveryPercentage: Number(otdPercentage)
        },
        trips: {
          total: totalTrips,
          active: await TransportRoute.countDocuments({ status: 'IN_TRANSIT' }),
          totalDistanceKm: Number(totalKmTraveled.toFixed(2))
        },
        incidents: {
          total: totalIncidents,
          open: openIncidents,
          resolved: await Incident.countDocuments({ status: 'RESOLVED' })
        },
        financials: {
          totalEmergencyCosts
        }
      }
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Export B2B Billing Reconciliation Report Data
// @route   GET /api/v1/analytics/b2b-reconciliation
// @access  Private (analytics:view)
exports.getB2BBillingReconciliation = async (req, res, next) => {
  try {
    const { startDate, endDate, customerId, status } = req.query;
    let query = {};

    if (customerId) query.customerId = customerId;
    if (status) query.status = status;
    if (startDate || endDate) {
      query.createdAt = {};
      if (startDate) query.createdAt.$gte = new Date(startDate);
      if (endDate) query.createdAt.$lte = new Date(endDate);
    }

    const orders = await Order.find(query)
      .populate('customerId', 'fullName email phone username')
      .populate('horseIds', 'name microchipId feiPassportNumber')
      .sort({ createdAt: -1 });

    const reconciliationItems = [];
    let grandTotalKm = 0;
    let grandTotalEmergencyCosts = 0;

    for (const order of orders) {
      const route = await TransportRoute.findOne({ orderId: order._id });
      const incidents = route ? await Incident.find({ tripId: route._id }) : [];
      
      const routeKm = route ? calculateRouteTotalKm(route.waypoints) : 0;
      const emergencyCosts = incidents.reduce((sum, inc) => sum + (inc.emergencyCostAmount || 0), 0);

      grandTotalKm += routeKm;
      grandTotalEmergencyCosts += emergencyCosts;

      reconciliationItems.push({
        bookingCode: order.bookingCode,
        orderId: order._id,
        customer: order.customerId ? {
          id: order.customerId._id,
          fullName: order.customerId.fullName,
          email: order.customerId.email,
          phone: order.customerId.phone
        } : null,
        route: {
          originAddress: order.origin.address,
          originCountry: order.origin.countryCode,
          destinationAddress: order.destination.address,
          destinationCountry: order.destination.countryCode
        },
        orderStatus: order.status,
        tripStatus: route ? route.status : 'NOT_DISPATCHED',
        vehiclePlateNumber: route ? route.vehiclePlateNumber : null,
        horsesCount: order.horseIds.length,
        totalDistanceKm: routeKm,
        incidentsCount: incidents.length,
        emergencyCostsAmount: emergencyCosts,
        requestedDepartureDate: order.requestedDepartureDate,
        createdAt: order.createdAt,
        completedAt: order.status === 'COMPLETED' ? order.updatedAt : null
      });
    }

    await logAudit({
      actorId: req.user._id,
      action: 'B2B_RECONCILIATION_VIEW',
      resource: 'Analytics',
      resourceId: 'B2B_REPORT',
      result: 'SUCCESS',
      metadata: { totalItems: reconciliationItems.length, grandTotalKm },
      ipAddress: req.ip,
      userAgent: req.get('User-Agent')
    });

    res.json({
      success: true,
      summary: {
        totalBookings: reconciliationItems.length,
        grandTotalDistanceKm: Number(grandTotalKm.toFixed(2)),
        grandTotalEmergencyCosts: grandTotalEmergencyCosts
      },
      data: reconciliationItems
    });
  } catch (error) {
    next(error);
  }
};

exports.getRevenueAnalytics = async (req, res, next) => {
  try {
    const { startDate, endDate, status, purpose } = req.query;

    // Filter transactions
    const txFilter = {};
    if (status) txFilter.status = status;
    if (purpose) txFilter.purpose = purpose;
    if (startDate || endDate) {
      txFilter.createdAt = {};
      if (startDate) txFilter.createdAt.$gte = new Date(startDate);
      if (endDate) txFilter.createdAt.$lte = new Date(endDate);
    }

    const transactions = await PaymentTransaction.find(txFilter)
      .populate('orderId', 'bookingCode origin destination status paymentStatus depositStatus pricing')
      .populate('customerId', 'fullName email phone')
      .sort({ createdAt: -1 })
      .limit(200);

    // Aggregate paid transactions
    const allPaidTx = await PaymentTransaction.find({ status: 'PAID' });
    const totalCollectedVnpay = allPaidTx.reduce((sum, tx) => sum + (Number(tx.amountVnd) || 0), 0);
    const depositCollected = allPaidTx
      .filter((tx) => tx.purpose === 'DEPOSIT')
      .reduce((sum, tx) => sum + (Number(tx.amountVnd) || 0), 0);
    const balanceCollected = allPaidTx
      .filter((tx) => tx.purpose === 'BALANCE')
      .reduce((sum, tx) => sum + (Number(tx.amountVnd) || 0), 0);

    // Aggregate orders financial data
    const orders = await Order.find(
      {},
      'pricing depositAmountVnd depositStatus paymentStatus settlement exceptionRequests status bookingCode customerId createdAt'
    ).populate('customerId', 'fullName email phone');

    let totalContractValue = 0;
    let totalSurcharges = 0;
    let totalReceiptsCashBank = 0;
    let totalRefunded = 0;
    let totalCompensated = 0;

    const orderFinancialList = orders.map((order) => {
      const contractVal = Number(order.pricing?.totalAmountVnd || 0);
      totalContractValue += contractVal;

      const orderSurcharges = (order.settlement?.surcharges || [])
        .filter((s) => s.status === 'APPROVED')
        .reduce((sum, s) => sum + (Number(s.amountVnd) || 0), 0);
      totalSurcharges += orderSurcharges;

      const orderReceipts = (order.settlement?.receipts || []).reduce(
        (sum, r) => sum + (Number(r.amountVnd) || 0),
        0
      );
      totalReceiptsCashBank += orderReceipts;

      const executedExceptions = (order.exceptionRequests || []).filter((e) => e.status === 'EXECUTED');
      const orderRefunds = executedExceptions
        .filter((e) => e.kind === 'REFUND')
        .reduce((sum, e) => sum + (Number(e.amountVnd) || 0), 0);
      const orderCompensations = executedExceptions
        .filter((e) => e.kind === 'COMPENSATION')
        .reduce((sum, e) => sum + (Number(e.amountVnd) || 0), 0);

      totalRefunded += orderRefunds;
      totalCompensated += orderCompensations;

      // Calculate paid so far for this order from paid transactions
      const orderPaidTxs = allPaidTx.filter(
        (tx) => tx.orderId && tx.orderId.toString() === order._id.toString()
      );
      const paidVnpay = orderPaidTxs.reduce((sum, tx) => sum + (Number(tx.amountVnd) || 0), 0);
      const netPaidForOrder = paidVnpay + orderReceipts;
      const outstandingForOrder = Math.max(0, contractVal + orderSurcharges - netPaidForOrder);

      return {
        orderId: order._id,
        bookingCode: order.bookingCode,
        customerName: order.customerId?.fullName || 'Khách vãng lai',
        customerPhone: order.customerId?.phone || 'N/A',
        contractValue: contractVal,
        surcharges: orderSurcharges,
        refunds: orderRefunds + orderCompensations,
        paidVnpay,
        paidReceipts: orderReceipts,
        totalPaid: netPaidForOrder,
        outstanding: outstandingForOrder,
        orderStatus: order.status,
        depositStatus: order.depositStatus,
        paymentStatus: order.paymentStatus,
        createdAt: order.createdAt
      };
    });

    const totalGrossRevenue = totalCollectedVnpay + totalReceiptsCashBank;
    const netRevenue = totalGrossRevenue - totalRefunded - totalCompensated;
    const totalOutstanding = Math.max(0, totalContractValue + totalSurcharges - totalGrossRevenue);

    // Monthly trend (group by YYYY-MM)
    const monthlyMap = new Map();
    allPaidTx.forEach((tx) => {
      let dateObj = tx.createdAt ? new Date(tx.createdAt) : null;
      if (!dateObj || isNaN(dateObj.getTime())) {
        if (typeof tx.payDate === 'string' && tx.payDate.length >= 8) {
          const y = tx.payDate.substring(0, 4);
          const m = tx.payDate.substring(4, 6);
          const d = tx.payDate.substring(6, 8);
          dateObj = new Date(`${y}-${m}-${d}`);
        } else {
          dateObj = new Date();
        }
      }
      const monthKey = !isNaN(dateObj.getTime())
        ? dateObj.toISOString().slice(0, 7)
        : new Date().toISOString().slice(0, 7);

      const cur = monthlyMap.get(monthKey) || { month: monthKey, deposit: 0, balance: 0, total: 0 };
      if (tx.purpose === 'DEPOSIT') cur.deposit += Number(tx.amountVnd || 0);
      else cur.balance += Number(tx.amountVnd || 0);
      cur.total += Number(tx.amountVnd || 0);
      monthlyMap.set(monthKey, cur);
    });

    // Ensure past 6 months are present for smooth bar charting
    const now = new Date();
    for (let i = 5; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const mKey = d.toISOString().slice(0, 7);
      if (!monthlyMap.has(mKey)) {
        monthlyMap.set(mKey, { month: mKey, deposit: 0, balance: 0, total: 0 });
      }
    }

    const monthlyTrend = Array.from(monthlyMap.values()).sort((a, b) => a.month.localeCompare(b.month));

    // Bank breakdown
    const bankMap = new Map();
    allPaidTx.forEach((tx) => {
      const bank = tx.bankCode || 'VNPAY-QR';
      const cur = bankMap.get(bank) || { bank, amount: 0, count: 0 };
      cur.amount += Number(tx.amountVnd || 0);
      cur.count += 1;
      bankMap.set(bank, cur);
    });
    const bankBreakdown = Array.from(bankMap.values()).sort((a, b) => b.amount - a.amount);

    res.json({
      success: true,
      data: {
        summary: {
          totalGrossRevenue,
          netRevenue,
          totalCollectedVnpay,
          depositCollected,
          balanceCollected,
          totalReceiptsCashBank,
          totalSurcharges,
          totalRefunded,
          totalCompensated,
          totalOutstanding,
          totalContractValue,
          paidTransactionsCount: allPaidTx.length,
          totalOrdersCount: orders.length,
          paidOrdersCount: orders.filter((o) => o.paymentStatus === 'PAID').length,
          depositedOrdersCount: orders.filter((o) => o.depositStatus === 'PAID').length
        },
        monthlyTrend,
        bankBreakdown,
        transactions,
        orderFinancials: orderFinancialList.slice(0, 50)
      }
    });
  } catch (error) {
    next(error);
  }
};

