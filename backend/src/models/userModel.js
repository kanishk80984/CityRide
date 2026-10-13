const { pool } = require('../config/db');

const createUser = async (userData) => {
  const { name, phone, email, password_hash, role, ride_otp } = userData;
  const initialOtp = ride_otp || (role === 'USER' ? Math.floor(1000 + Math.random() * 9000).toString() : null);
  const [result] = await pool.execute(
    'INSERT INTO users (name, phone, email, password_hash, role, ride_otp) VALUES (?, ?, ?, ?, ?, ?)',
    [name, phone, email, password_hash, role || 'USER', initialOtp]
  );
  return result.insertId;
};

const findUserByPhone = async (phone) => {
  const [rows] = await pool.execute('SELECT * FROM users WHERE phone = ?', [phone]);
  return rows[0];
};

const findUserById = async (id) => {
  const [rows] = await pool.execute('SELECT * FROM users WHERE id = ?', [id]);
  return rows[0];
};

const findUserByEmail = async (email) => {
  const [rows] = await pool.execute('SELECT * FROM users WHERE email = ?', [email]);
  return rows[0];
};

module.exports = {
  createUser,
  findUserByPhone,
  findUserById,
  findUserByEmail
};
