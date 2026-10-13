const express = require('express');
const { 
  onboardDriver, getDriverStatus, getDriverStats, getDriverWallet, 
  getDriverDetailedEarnings, requestWithdrawal, getDriverWithdrawals, 
  getDriverTransactions, saveBankAccount, getBankAccount, updateProfile, 
  updateParcelStatus, getParcelStatus, getDriverSubscription, 
  getSubscriptionPlans, updateRideEntitlements 
} = require('../controllers/driverController');
const { protect } = require('../middleware/authMiddleware');
const { upload } = require('../middleware/uploadMiddleware');

const router = express.Router();

router.post(
  '/onboard',
  upload.fields([
    { name: 'licence_photo', maxCount: 1 },
    { name: 'aadhar_photo', maxCount: 1 },
    { name: 'pan_photo', maxCount: 1 },
    { name: 'driver_photo', maxCount: 1 },
    { name: 'profile_photo', maxCount: 1 },
    { name: 'rc_photo', maxCount: 1 },
    { name: 'photo_front', maxCount: 1 },
    { name: 'photo_back', maxCount: 1 },
    { name: 'photo_left', maxCount: 1 },
    { name: 'photo_right', maxCount: 1 }
  ]),
  onboardDriver
);

router.get('/status/:userId', getDriverStatus);
router.get('/stats', protect, getDriverStats);
router.get('/wallet', protect, getDriverWallet);
router.get('/detailed-earnings', protect, getDriverDetailedEarnings);

router.post('/withdraw', protect, requestWithdrawal);
router.get('/withdrawals', protect, getDriverWithdrawals);
router.get('/transactions', protect, getDriverTransactions);

router.post('/bank-account', protect, saveBankAccount);
router.get('/bank-account', protect, getBankAccount);

router.put('/profile', protect, upload.single('profile_image'), updateProfile);

router.put('/parcel-status', protect, updateParcelStatus);
router.get('/parcel-status', protect, getParcelStatus);

// Subscription and Entitlements routes
router.get('/subscription', protect, getDriverSubscription);
router.get('/subscription-plans', protect, getSubscriptionPlans);
router.put('/ride-entitlements', protect, updateRideEntitlements);

module.exports = router;
