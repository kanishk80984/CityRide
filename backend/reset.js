const db = require('./src/config/db');

async function run() {
  let connection;
  try {
    connection = await db.pool.getConnection();
    await connection.beginTransaction();

    const driverId = 5;

    // 1. Get Wallet Balance Before
    const [wallets] = await connection.execute('SELECT balance FROM driver_wallets WHERE driver_id = ?', [driverId]);
    const balanceBefore = wallets.length > 0 ? wallets[0].balance : '0.00';
    console.log('Wallet Balance Before:', balanceBefore);

    // 2. Get Ride History Count Before
    const [rides] = await connection.execute('SELECT COUNT(*) as cnt FROM rides WHERE driver_id = ? AND status = "COMPLETED"', [driverId]);
    const ridesBefore = rides[0].cnt;
    console.log('Completed Rides Before:', ridesBefore);

    // 3. Mark existing subscriptions as EXPIRED (safest approach)
    const [subUpdate] = await connection.execute('UPDATE driver_subscriptions SET status = "EXPIRED" WHERE driver_id = ? AND status = "ACTIVE"', [driverId]);
    console.log('Expired old active subscriptions for driver:', subUpdate.affectedRows);

    // 4. Load Free Trial Config
    const [settingsRows] = await connection.execute('SELECT * FROM global_settings');
    const settings = {};
    settingsRows.forEach(r => { settings[r.setting_key] = r.setting_value; });

    const durationDays = parseInt(settings.free_trial_duration_days || '7');
    const freeShort = parseInt(settings.free_trial_short_rides || '0');
    const freeLong = parseInt(settings.free_trial_long_rides || '0');
    // Force zero for one_way and two_way
    const freeOneWay = 0;
    const freeTwoWay = 0;

    // 5. Insert new Free Trial record
    const startsAt = new Date();
    const expiresAt = new Date(startsAt.getTime() + durationDays * 24 * 60 * 60 * 1000);

    const [insertResult] = await connection.execute(`
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
    console.log('Inserted new Free Trial subscription with ID:', insertResult.insertId);

    // 6. Verify state
    const [newWallet] = await connection.execute('SELECT balance FROM driver_wallets WHERE driver_id = ?', [driverId]);
    console.log('Wallet Balance After:', newWallet[0].balance);

    const [newRides] = await connection.execute('SELECT COUNT(*) as cnt FROM rides WHERE driver_id = ? AND status = "COMPLETED"', [driverId]);
    console.log('Completed Rides After:', newRides[0].cnt);

    const [activeSub] = await connection.execute('SELECT * FROM driver_subscriptions WHERE driver_id = ? AND status = "ACTIVE"', [driverId]);
    console.log('Active Subscription After:', activeSub[0]);

    await connection.commit();
    console.log('Database reset successful.');
  } catch (e) {
    if (connection) await connection.rollback();
    console.error('Error:', e);
  } finally {
    if (connection) connection.release();
    process.exit(0);
  }
}
run();
