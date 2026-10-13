const express = require('express');
const router = express.Router();
const { protect, authorize } = require('../middleware/authMiddleware');
const { getOwnerStats, getOwnerDrivers, getOwnerDriverDetails, getOwnerSettings, updateOwnerSettings } = require('../controllers/ownerController');

router.use(protect);
router.use(authorize('OWNER'));

router.get('/dashboard', getOwnerStats);
router.get('/drivers', getOwnerDrivers);
router.get('/drivers/:id', getOwnerDriverDetails);
router.get('/settings', getOwnerSettings);
router.put('/settings', updateOwnerSettings);

module.exports = router;
