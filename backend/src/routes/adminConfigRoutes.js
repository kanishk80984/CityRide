const express = require('express');
const router = express.Router();
const { protect, authorize } = require('../middleware/authMiddleware');
const {
  getPlans,
  createPlan,
  updatePlan,
  updatePlanStatus,
  getGlobalSettings,
  updateGlobalSettings,
  getDriverSubscriptions,
  getWallets,
  getTransactions,
  adjustWallet,
  assignPlanToDriver,
  assignFreeTrialToDriver
} = require('../controllers/adminConfigController');

// All endpoints here require ADMIN or OWNER access
router.use(protect);
router.use(authorize('ADMIN', 'OWNER', 'SUPER_ADMIN')); // Preserving existing role patterns

// Subscription Plans
router.get('/plans', getPlans);
router.post('/plans', createPlan);
router.put('/plans/:id', updatePlan);
router.patch('/plans/:id/status', updatePlanStatus);

// Global Settings (Free Trial, Ride Config, etc.)
router.get('/settings', getGlobalSettings);
router.put('/settings', updateGlobalSettings);

// Driver Subscriptions
router.get('/driver-subscriptions', getDriverSubscriptions);
router.post('/driver-subscriptions', assignPlanToDriver);
router.post('/driver-subscriptions/free-trial', assignFreeTrialToDriver);

// Driver Wallets
router.get('/wallets', getWallets);
router.get('/wallet-transactions', getTransactions);
router.post('/wallets/adjust', adjustWallet);

module.exports = router;
