const { pool } = require('../config/db');

exports.createDriverSubscription = async (driverId, planId, externalConn = null) => {
  const connection = externalConn || await pool.getConnection();
  try {
    if (!externalConn) await connection.beginTransaction();

    // 1. Validate Driver
    const [drivers] = await connection.execute('SELECT id FROM drivers WHERE id = ?', [driverId]);
    if (drivers.length === 0) throw new Error('Driver not found');

    // 2. Validate Plan
    const [plans] = await connection.execute('SELECT * FROM subscription_plans WHERE id = ? AND status = "ACTIVE"', [planId]);
    if (plans.length === 0) throw new Error('Active subscription plan not found');
    const plan = plans[0];

    // 3. Check for existing active subscription
    const [activeSubs] = await connection.execute('SELECT id FROM driver_subscriptions WHERE driver_id = ? AND status = "ACTIVE"', [driverId]);
    if (activeSubs.length > 0) throw new Error('Driver already has an active subscription');

    // 4. Set dates
    const startsAt = new Date();
    const expiresAt = new Date(startsAt.getTime() + plan.validity_days * 24 * 60 * 60 * 1000);

    // 5. Create Subscription
    const [result] = await connection.execute(`
      INSERT INTO driver_subscriptions (
        driver_id, plan_id, status, starts_at, expires_at,
        free_short_rides_total, free_short_rides_remaining,
        free_long_rides_total, free_long_rides_remaining,
        free_one_way_rides_total, free_one_way_rides_remaining,
        free_two_way_rides_total, free_two_way_rides_remaining
      ) VALUES (?, ?, 'ACTIVE', ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `, [
      driverId, planId, startsAt, expiresAt,
      plan.free_short_rides, plan.free_short_rides,
      plan.free_long_rides, plan.free_long_rides,
      plan.free_one_way_rides, plan.free_one_way_rides,
      plan.free_two_way_rides, plan.free_two_way_rides
    ]);

    if (!externalConn) await connection.commit();
    return { success: true, subscriptionId: result.insertId };
  } catch (error) {
    if (!externalConn && connection) await connection.rollback();
    throw error;
  } finally {
    if (!externalConn && connection) connection.release();
  }
};

exports.activateFreeTrial = async (driverId) => {
  let connection;
  try {
    connection = await pool.getConnection();
    await connection.beginTransaction();

    // 1. Validate Driver
    const [drivers] = await connection.execute('SELECT id FROM drivers WHERE id = ?', [driverId]);
    if (drivers.length === 0) throw new Error('Driver not found');

    // 2. Check for any existing subscription (trial or paid)
    const [existingSubs] = await connection.execute('SELECT id FROM driver_subscriptions WHERE driver_id = ?', [driverId]);
    if (existingSubs.length > 0) throw new Error('Driver has already used a subscription or free trial');

    // 3. Load Free Trial Config
    const [settingsRows] = await connection.execute('SELECT * FROM global_settings');
    const settings = {};
    settingsRows.forEach(r => { settings[r.setting_key] = r.setting_value; });

    if (settings.free_trial_enabled !== 'true') throw new Error('Free trial is not enabled globally');

    const durationDays = parseInt(settings.free_trial_duration_days || '7');
    const freeShort = parseInt(settings.free_trial_short_rides || '0');
    const freeLong = parseInt(settings.free_trial_long_rides || '0');
    const freeOneWay = parseInt(settings.free_trial_one_way_rides || '0');
    const freeTwoWay = parseInt(settings.free_trial_two_way_rides || '0');

    // 4. Set dates
    const startsAt = new Date();
    const expiresAt = new Date(startsAt.getTime() + durationDays * 24 * 60 * 60 * 1000);

    // 5. Create Subscription
    const [result] = await connection.execute(`
      INSERT INTO driver_subscriptions (
        driver_id, plan_id, status, starts_at, expires_at,
        free_short_rides_total, free_short_rides_remaining,
        free_long_rides_total, free_long_rides_remaining,
        free_one_way_rides_total, free_one_way_rides_remaining,
        free_two_way_rides_total, free_two_way_rides_remaining
      ) VALUES (?, NULL, 'ACTIVE', ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `, [
      driverId, startsAt, expiresAt,
      freeShort, freeShort,
      freeLong, freeLong,
      freeOneWay, freeOneWay,
      freeTwoWay, freeTwoWay
    ]);

    await connection.commit();
    return { success: true, subscriptionId: result.insertId };
  } catch (error) {
    if (connection) await connection.rollback();
    throw error;
  } finally {
    if (connection) connection.release();
  }
};
