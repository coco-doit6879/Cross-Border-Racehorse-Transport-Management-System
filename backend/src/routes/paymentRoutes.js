const express = require('express');
const controller = require('../controllers/paymentController');
const { protect } = require('../middlewares/authMiddleware');

const router = express.Router();

router.get('/vnpay/ipn', controller.vnpayIpn);
router.get('/vnpay/return', controller.vnpayReturn);
router.get('/:txnRef', protect, controller.getPayment);

module.exports = router;
