const { pool } = require('../config/db');

class WalletService {
  async ensureDriverWallet(driverId, connection = null) {
    const db = connection || pool;
    await db.query('INSERT IGNORE INTO driver_wallets (driver_id, balance) VALUES (?, 0)', [driverId]);
    return this.getDriverWallet(driverId, db);
  }

  async getDriverWallet(driverId, connection = null) {
    const db = connection || pool;
    const [rows] = await db.query('SELECT * FROM driver_wallets WHERE driver_id = ?', [driverId]);
    return rows[0] || null;
  }

  async adjustWallet(driverId, type, amount, category, notes, reference = null, rideId = null, subscriptionId = null, strict = false, externalConn = null) {
    const conn = externalConn || await pool.getConnection();
    try {
      if (!externalConn) await conn.query('START TRANSACTION');

      await this.ensureDriverWallet(driverId, conn);

      // Lock the row for update
      const [walletRows] = await conn.query('SELECT balance FROM driver_wallets WHERE driver_id = ? FOR UPDATE', [driverId]);
      const prevBalance = Number(walletRows[0].balance);
      const adjAmount = Number(amount);

      if (type === 'DEBIT' && prevBalance < adjAmount) {
         if (strict) {
           throw new Error('Insufficient wallet balance.');
         }
         // Otherwise, allow negative balance for manual admin adjustments
      }

      const newBalance = type === 'CREDIT' ? prevBalance + adjAmount : prevBalance - adjAmount;

      await conn.query('UPDATE driver_wallets SET balance = ? WHERE driver_id = ?', [newBalance, driverId]);

      await conn.query(`
        INSERT INTO wallet_transactions 
        (driver_id, type, category, amount, previous_balance, new_balance, notes, reference, ride_id, subscription_id)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `, [driverId, type, category, amount, prevBalance, newBalance, notes, reference, rideId, subscriptionId]);

      if (!externalConn) await conn.query('COMMIT');
      return { success: true, newBalance };
    } catch (err) {
      if (!externalConn) await conn.query('ROLLBACK');
      throw err;
    } finally {
      if (!externalConn) conn.release();
    }
  }

  async creditDriverWallet(driverId, amount, category, notes, metadata = {}) {
    return this.adjustWallet(driverId, 'CREDIT', amount, category, notes, metadata.reference, metadata.rideId, metadata.subscriptionId, false, metadata.connection);
  }

  async debitDriverWallet(driverId, amount, category, notes, metadata = {}) {
    return this.adjustWallet(driverId, 'DEBIT', amount, category, notes, metadata.reference, metadata.rideId, metadata.subscriptionId, metadata.strict, metadata.connection);
  }
}

module.exports = new WalletService();
