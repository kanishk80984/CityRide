const express = require('express');
const { getUserPayments, depositToWallet, withdrawFromWallet, getWalletBalance } = require('../controllers/paymentController');
const { protect } = require('../middleware/authMiddleware');

const router = express.Router();

router.get('/', protect, getUserPayments);
router.post('/deposit', protect, depositToWallet);
router.post('/withdraw', protect, withdrawFromWallet);
router.get('/balance', protect, getWalletBalance);

module.exports = router;
