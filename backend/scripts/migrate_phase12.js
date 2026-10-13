
const { pool } = require('../src/config/db');

async function migrate() {
  try {
    console.log('Starting Phase 12 migration...');
    // Add tip_amount to rides
    await pool.query('ALTER TABLE rides ADD COLUMN tip_amount DECIMAL(10,2) NOT NULL DEFAULT 0.00;');
    console.log('Added tip_amount to rides table.');
    
    // Insert new global settings
    const settings = [
      ['short_ride_commission_percent', '5'],
      ['short_ride_tip_commission_enabled', 'false'],
      ['short_ride_tip_commission_percent', '0'],
      ['long_ride_commission_percent', '8'],
      ['long_ride_tip_commission_enabled', 'false'],
      ['long_ride_tip_commission_percent', '0']
    ];
    
    for (const [key, val] of settings) {
      await pool.query('INSERT IGNORE INTO global_settings (setting_key, setting_value) VALUES (?, ?)', [key, val]);
    }
    console.log('Added new commission settings.');
    
    // We will keep admin_commission_percentage as deprecated but not remove it yet to avoid breaking other un-updated places immediately, though we will stop using it for rides.
    console.log('Migration completed successfully.');
    process.exit(0);
  } catch (err) {
    if (err.code === 'ER_DUP_FIELDNAME') {
      console.log('tip_amount already exists. Skipping...');
      process.exit(0);
    }
    console.error('Migration failed:', err);
    process.exit(1);
  }
}
migrate();

