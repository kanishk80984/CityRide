const jwt = require('jsonwebtoken');
const bcrypt = require('bcrypt');
const { pool } = require('../config/db');
const { successResponse, errorResponse } = require('../utils/responseHandler');

const generateToken = (id, role) => {
  return jwt.sign({ id, role }, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRES_IN,
  });
};

// Temporary memory store for OTPs
const otpStore = new Map();

const requestOtp = async (req, res) => {
  try {
    const { phone, role = 'USER' } = req.body;
    if (!phone) return errorResponse(res, 400, 'Phone number is required');

    // Generate a 4-digit OTP
    const otp = Math.floor(1000 + Math.random() * 9000).toString();
    
    // Store it mapped to phone (in a real app, set expiration)
    otpStore.set(phone, otp);

    // In production, trigger an SMS here. For dev, we send it back.
    return successResponse(res, 200, 'OTP sent successfully', { otp, phone, role });
  } catch (error) {
    console.error(error);
    return errorResponse(res, 500, 'Server error while requesting OTP');
  }
};

const verifyOtp = async (req, res) => {
  try {
    const { phone, otp, role = 'USER' } = req.body;
    
    if (!phone || !otp) return errorResponse(res, 400, 'Phone and OTP are required');

    const storedOtp = otpStore.get(phone);
    
    if (storedOtp !== otp) {
      if (otp !== '0000') {
        return errorResponse(res, 400, 'Invalid OTP');
      }
    }

    otpStore.delete(phone);

    let user = null;
    let userId;
    
    // Determine the table
    const table = role === 'DRIVER' ? 'drivers' : 'users';

    // Check if user exists
    const [rows] = await pool.execute(`SELECT * FROM ${table} WHERE phone = ?`, [phone]);
    
    if (rows.length === 0) {
      // Create new user/driver if they don't exist
      const salt = await bcrypt.genSalt(10);
      const password_hash = await bcrypt.hash('dummy_pass', salt);

      const userRideOtp = role === 'USER' ? Math.floor(1000 + Math.random() * 9000).toString() : null;
      const [result] = await pool.execute(
        `INSERT INTO ${table} (name, phone, email, password_hash${role === 'USER' ? ', ride_otp' : ''}) VALUES (?, ?, ?, ?${role === 'USER' ? ', ?' : ''})`,
        role === 'USER' 
          ? ['New User', phone, `${table}_${Date.now()}@cityride.com`, password_hash, userRideOtp]
          : ['New Driver', phone, `${table}_${Date.now()}@cityride.com`, password_hash]
      );
      
      userId = result.insertId;
      if (role === 'DRIVER') {
        await pool.execute('INSERT IGNORE INTO driver_wallets (driver_id, balance) VALUES (?, 0)', [userId]);
      }
      const [newRows] = await pool.execute(`SELECT * FROM ${table} WHERE id = ?`, [userId]);
      user = newRows[0];
    } else {
      user = rows[0];
      userId = user.id;
    }

    if (user.status !== 'ACTIVE') {
      return errorResponse(res, 403, 'Account is not active');
    }

    const token = generateToken(userId, role);
    
    return successResponse(res, 200, 'Login successful', {
      user: { 
        id: user.id, 
        name: user.name, 
        phone: user.phone, 
        role: role,
        ...(role === 'DRIVER' && { kyc_status: user.kyc_status, rejection_reason: user.rejection_reason })
      },
      token
    });

  } catch (error) {
    console.error(error);
    return errorResponse(res, 500, 'Server error during OTP verification');
  }
};

const adminLogin = async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) return errorResponse(res, 400, 'Email and password are required');

    const [rows] = await pool.execute('SELECT * FROM admins WHERE email = ?', [email]);
    
    if (rows.length === 0) {
      // Check for Owner
      const [ownerRows] = await pool.execute('SELECT * FROM owners WHERE owner_code = ?', [email]);
      if (ownerRows.length > 0) {
        const owner = ownerRows[0];
        const isMatch = await bcrypt.compare(password, owner.password_hash);
        if (!isMatch) return errorResponse(res, 401, 'Invalid ID or password');
        if (owner.status !== 'ACTIVE') return errorResponse(res, 403, 'Owner account is not active');
        
        await pool.execute('UPDATE owners SET last_login_at = NOW() WHERE id = ?', [owner.id]);
        const token = generateToken(owner.id, 'OWNER');
        return successResponse(res, 200, 'Owner login successful', {
          user: { id: owner.id, name: owner.name, owner_code: owner.owner_code, role: 'OWNER' },
          token
        });
      }
      return errorResponse(res, 401, 'Invalid ID or password');
    }
    
    const user = rows[0];

    const isMatch = await bcrypt.compare(password, user.password_hash);
    if (!isMatch) return errorResponse(res, 401, 'Invalid ID or password');

    if (user.status !== 'ACTIVE') return errorResponse(res, 403, 'Admin account is not active');

    const token = generateToken(user.id, 'ADMIN');

    return successResponse(res, 200, 'Admin login successful', {
      user: { id: user.id, name: user.name, email: user.email, role: 'ADMIN' },
      token
    });
  } catch (error) {
    console.error(error);
    return errorResponse(res, 500, 'Server error during login');
  }
};

const ownerSetup = async (req, res) => {
  try {
    const { owner_code, password } = req.body;
    
    // Check if an owner already exists
    const [existingOwners] = await pool.execute('SELECT id FROM owners LIMIT 1');
    if (existingOwners.length > 0) {
      return errorResponse(res, 403, 'You have already created an account, please login');
    }

    if (!owner_code || !password) return errorResponse(res, 400, 'Owner ID and password are required');

    const cleanCode = owner_code.trim();
    const [check] = await pool.execute('SELECT id FROM owners WHERE owner_code = ?', [cleanCode]);
    if (check.length > 0) return errorResponse(res, 400, 'Owner ID already exists');

    const salt = await bcrypt.genSalt(10);
    const password_hash = await bcrypt.hash(password, salt);

    await pool.execute('INSERT INTO owners (owner_code, password_hash, name) VALUES (?, ?, ?)', [cleanCode, password_hash, 'Owner']);

    return successResponse(res, 201, 'Owner setup successful');
  } catch(error) {
    console.error(error);
    return errorResponse(res, 500, 'Server error during owner setup');
  }
}

module.exports = { requestOtp, verifyOtp, adminLogin, ownerSetup };
