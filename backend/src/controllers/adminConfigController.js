const { pool } = require('../config/db');

// --- SUBSCRIPTION PLANS ---

exports.getPlans = async (req, res) => {
  try {
    const [rows] = await pool.query('SELECT * FROM subscription_plans ORDER BY id DESC');
    res.json({ success: true, data: rows });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

exports.createPlan = async (req, res) => {
  try {
    const { name, code, description, price, validity_days, free_short_rides, free_long_rides, free_one_way_rides, free_two_way_rides, status } = req.body;
    
    // Validation
    if (free_short_rides < 0 || free_long_rides < 0 || free_one_way_rides < 0 || free_two_way_rides < 0) {
      return res.status(400).json({ success: false, message: 'Ride entitlements must be >= 0' });
    }

    const [result] = await pool.query(`
      INSERT INTO subscription_plans 
      (name, code, description, price, validity_days, free_short_rides, free_long_rides, free_one_way_rides, free_two_way_rides, status) 
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `, [name, code, description, price, validity_days, free_short_rides, free_long_rides, free_one_way_rides || 0, free_two_way_rides || 0, status || 'ACTIVE']);
    res.json({ success: true, message: 'Plan created successfully', data: { id: result.insertId } });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

exports.updatePlan = async (req, res) => {
  try {
    const { id } = req.params;
    const { name, code, description, price, validity_days, free_short_rides, free_long_rides, free_one_way_rides, free_two_way_rides, status } = req.body;
    
    // Validation
    if (free_short_rides < 0 || free_long_rides < 0 || free_one_way_rides < 0 || free_two_way_rides < 0) {
      return res.status(400).json({ success: false, message: 'Ride entitlements must be >= 0' });
    }

    await pool.query(`
      UPDATE subscription_plans 
      SET name = ?, code = ?, description = ?, price = ?, validity_days = ?, free_short_rides = ?, free_long_rides = ?, free_one_way_rides = ?, free_two_way_rides = ?, status = ?
      WHERE id = ?
    `, [name, code, description, price, validity_days, free_short_rides, free_long_rides, free_one_way_rides || 0, free_two_way_rides || 0, status, id]);
    res.json({ success: true, message: 'Plan updated successfully' });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

exports.updatePlanStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;
    await pool.query('UPDATE subscription_plans SET status = ? WHERE id = ?', [status, id]);
    res.json({ success: true, message: 'Status updated' });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// --- GLOBAL SETTINGS (Free Trial, Ride Config, etc) ---

exports.getGlobalSettings = async (req, res) => {
  try {
    const [rows] = await pool.query('SELECT * FROM global_settings');
    const settings = {};
    rows.forEach(r => { settings[r.setting_key] = r.setting_value; });
    res.json({ success: true, data: settings });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

exports.updateGlobalSettings = async (req, res) => {
  try {
    const updates = req.body; // e.g. { free_trial_enabled: 'true', short_ride_max_distance_km: '30' }
    
    // Validate percentages
    const percentKeys = [
      'short_ride_commission_percent',
      'short_ride_tip_commission_percent',
      'long_ride_commission_percent',
      'long_ride_tip_commission_percent'
    ];
    
    for (const key of Object.keys(updates)) {
      if (percentKeys.includes(key)) {
        const val = Number(updates[key]);
        if (isNaN(val) || val < 0 || val > 100 || updates[key] === '' || updates[key] === null || updates[key] === undefined) {
          return res.status(400).json({ success: false, message: 'Invalid value for ' + key + '. Must be a number between 0 and 100.' });
        }
      }
    }

    for (const key of Object.keys(updates)) {
      if (updates[key] === undefined || updates[key] === null) continue;
      const val = String(updates[key]);
      await pool.query(`
        INSERT INTO global_settings (setting_key, setting_value) 
        VALUES (?, ?) 
        ON DUPLICATE KEY UPDATE setting_value = VALUES(setting_value)
      `, [key, val]);
    }
    res.json({ success: true, message: 'Settings updated successfully' });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// --- DRIVER SUBSCRIPTIONS ---

exports.getDriverSubscriptions = async (req, res) => {
  try {
    const query = `
      SELECT ds.*, 
             d.name as driver_name, d.phone as driver_phone, d.email as driver_email, 
             sp.name as catalog_plan_name, sp.code as plan_code,
             w.balance as wallet_balance
      FROM driver_subscriptions ds
      JOIN drivers d ON ds.driver_id = d.id
      LEFT JOIN subscription_plans sp ON ds.plan_id = sp.id
      LEFT JOIN driver_wallets w ON ds.driver_id = w.driver_id
      ORDER BY ds.id DESC
    `;
    const [rows] = await pool.query(query);

    const [globalRows] = await pool.query('SELECT setting_key, setting_value FROM global_settings WHERE setting_key LIKE "%commission%"');
    const settings = {};
    globalRows.forEach(r => settings[r.setting_key] = r.setting_value);

    const formattedData = rows.map(r => {
      const isFreeTrial = r.plan_id === null;
      let status = r.status;
      if (status === 'ACTIVE' && r.expires_at && new Date(r.expires_at) < new Date()) {
        status = 'EXPIRED';
      }

      return {
        driver: {
          id: r.driver_id,
          name: r.driver_name,
          phone: r.driver_phone,
          email: r.driver_email
        },
        subscription: {
          id: r.id,
          plan_id: r.plan_id,
          plan_name: isFreeTrial ? 'Free Trial' : (r.catalog_plan_name || 'Custom Plan'),
          plan_code: r.plan_code || 'N/A',
          type: isFreeTrial ? 'FREE_TRIAL' : 'PAID',
          status: status,
          started_at: r.starts_at || r.start_date, // depends on schema, handle gracefully
          expires_at: r.expires_at || r.expiry_date
        },
        entitlements: {
          short: r.free_short_rides_remaining || 0,
          long: r.free_long_rides_remaining || 0,
          one_way: r.free_one_way_rides_remaining || 0,
          two_way: r.free_two_way_rides_remaining || 0
        },
        wallet: {
          balance: r.wallet_balance || 0
        },
        commission: {
          short_ride_percent: settings.short_ride_commission_percent || 0,
          long_ride_percent: settings.long_ride_commission_percent || 0,
          short_tip_enabled: settings.short_ride_tip_commission_enabled === 'true',
          short_tip_percent: settings.short_ride_tip_commission_percent || 0,
          long_tip_enabled: settings.long_ride_tip_commission_enabled === 'true',
          long_tip_percent: settings.long_ride_tip_commission_percent || 0
        }
      };
    });

    res.json({ success: true, data: formattedData });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// --- DRIVER WALLETS & TRANSACTIONS ---

exports.getWallets = async (req, res) => {
  try {
    const [rows] = await pool.query(`
      SELECT w.*, d.name as driver_name, d.phone as driver_phone 
      FROM driver_wallets w
      JOIN drivers d ON w.driver_id = d.id
      ORDER BY w.balance DESC
    `);
    res.json({ success: true, data: rows });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

exports.getTransactions = async (req, res) => {
  try {
    const [rows] = await pool.query(`
      SELECT t.*, d.name as driver_name 
      FROM wallet_transactions t
      JOIN drivers d ON t.driver_id = d.id
      ORDER BY t.created_at DESC
    `);
    res.json({ success: true, data: rows });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

exports.adjustWallet = async (req, res) => {
  try {
    const { driver_id, amount, type, notes } = req.body;
    if (!driver_id || !amount || !type) {
      return res.status(400).json({ success: false, message: 'Missing required fields' });
    }
    
    const walletService = require('../services/walletService');
    await walletService.adjustWallet(driver_id, type, amount, 'ADJUSTMENT', notes || 'Admin Manual Adjustment');
    
    res.json({ success: true, message: 'Wallet adjusted successfully' });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// --- SUBSCRIPTION ACTIVATION (ADMIN TEST) ---

exports.assignPlanToDriver = async (req, res) => {
  try {
    const { driver_id, plan_id } = req.body;
    if (!driver_id || !plan_id) return res.status(400).json({ success: false, message: 'Missing driver_id or plan_id' });

    const subscriptionService = require('../services/subscriptionService');
    const result = await subscriptionService.createDriverSubscription(driver_id, plan_id);

    try {
      const { updateDriverSocketMeta } = require('../sockets/socketManager');
      await updateDriverSocketMeta(driver_id);
    } catch (e) {
      console.error('Socket update error:', e);
    }

    res.json({ success: true, message: 'Subscription successfully assigned', data: result });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

exports.assignFreeTrialToDriver = async (req, res) => {
  try {
    const { driver_id } = req.body;
    if (!driver_id) return res.status(400).json({ success: false, message: 'Missing driver_id' });

    const subscriptionService = require('../services/subscriptionService');
    const result = await subscriptionService.activateFreeTrial(driver_id);

    try {
      const { updateDriverSocketMeta } = require('../sockets/socketManager');
      await updateDriverSocketMeta(driver_id);
    } catch (e) {
      console.error('Socket update error:', e);
    }

    res.json({ success: true, message: 'Free trial successfully assigned', data: result });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};
