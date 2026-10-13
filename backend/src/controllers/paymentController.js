const { pool } = require('../config/db');
const { successResponse, errorResponse } = require('../utils/responseHandler');

const getUserPayments = async (req, res) => {
  try {
    const userId = req.user.id;

    const [deposits] = await pool.query(
      `SELECT id, amount, status, created_at as date, 'deposit' as type, 'Money Added' as description 
       FROM user_deposit_wallet WHERE user_id = ?`,
      [userId]
    );

    const [withdraws] = await pool.query(
      `SELECT id, amount, status, created_at as date, 'withdrawal' as type, 'Wallet Withdrawal' as description 
       FROM user_withdraw_wallet WHERE user_id = ?`,
      [userId]
    );

    const allPayments = [...deposits, ...withdraws].sort((a, b) => new Date(b.date) - new Date(a.date));

    return successResponse(res, 200, 'Payments fetched successfully', allPayments);
  } catch (error) {
    console.error(error);
    return errorResponse(res, 500, 'Failed to fetch payments');
  }
};

const depositToWallet = async (req, res) => {
  const connection = await pool.getConnection();
  try {
    const userId = req.user.id;
    const { amount, transaction_id } = req.body;
    
    if (!amount || amount <= 0) return errorResponse(res, 400, 'Invalid amount');

    await connection.beginTransaction();

    await connection.query(
      `INSERT INTO user_deposit_wallet (user_id, amount, status, transaction_id) VALUES (?, ?, 'COMPLETED', ?)`,
      [userId, amount, transaction_id || '']
    );

    await connection.query(
      `UPDATE users SET wallet_balance = wallet_balance + ? WHERE id = ?`,
      [amount, userId]
    );

    await connection.commit();
    return successResponse(res, 200, 'Amount deposited successfully');
  } catch (error) {
    await connection.rollback();
    console.error(error);
    return errorResponse(res, 500, 'Deposit failed');
  } finally {
    connection.release();
  }
};

const withdrawFromWallet = async (req, res) => {
  const connection = await pool.getConnection();
  try {
    const userId = req.user.id;
    const { amount, bank_details } = req.body;
    
    if (!amount || amount <= 0) return errorResponse(res, 400, 'Invalid amount');

    await connection.beginTransaction();

    const [userRows] = await connection.query(`SELECT wallet_balance FROM users WHERE id = ? FOR UPDATE`, [userId]);
    const currentBalance = parseFloat(userRows[0].wallet_balance || 0);

    if (currentBalance < amount) {
      await connection.rollback();
      return errorResponse(res, 400, 'Insufficient wallet balance');
    }

    await connection.query(
      `INSERT INTO user_withdraw_wallet (user_id, amount, status, bank_details) VALUES (?, ?, 'PENDING', ?)`,
      [userId, amount, bank_details || '']
    );

    await connection.query(
      `UPDATE users SET wallet_balance = wallet_balance - ? WHERE id = ?`,
      [amount, userId]
    );

    await connection.commit();
    return successResponse(res, 200, 'Withdrawal request submitted');
  } catch (error) {
    await connection.rollback();
    console.error(error);
    return errorResponse(res, 500, 'Withdrawal failed');
  } finally {
    connection.release();
  }
};

const getWalletBalance = async (req, res) => {
  try {
    const [rows] = await pool.query(`SELECT wallet_balance FROM users WHERE id = ?`, [req.user.id]);
    return successResponse(res, 200, 'Wallet balance fetched', { balance: rows[0].wallet_balance });
  } catch (error) {
    console.error(error);
    return errorResponse(res, 500, 'Failed to fetch balance');
  }
};

module.exports = { getUserPayments, depositToWallet, withdrawFromWallet, getWalletBalance };
