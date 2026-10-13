const { pool } = require('../config/db');
const jwt = require('jsonwebtoken');
const { successResponse, errorResponse } = require('../utils/responseHandler');
const bcrypt = require('bcrypt');

const adminLogin = async (req, res) => {
  try {
    const { email, password } = req.body;
    if (email === 'admin@cityride.com' && password === 'admin123') {
      const token = jwt.sign({ id: 9999, role: 'ADMIN' }, process.env.JWT_SECRET, { expiresIn: '7d' });
      return successResponse(res, 200, 'Admin login successful', { token });
    }
    return errorResponse(res, 401, 'Invalid admin credentials');
  } catch (error) {
    console.error(error);
    return errorResponse(res, 500, 'Login failed');
  }
};

const getDashboardStats = async (req, res) => {
  try {
    const [userCount] = await pool.execute("SELECT COUNT(*) as count FROM users");
    const [driverCount] = await pool.execute('SELECT COUNT(*) as count FROM drivers');
    const [rideCount] = await pool.execute('SELECT COUNT(*) as count FROM rides');
    return successResponse(res, 200, 'Stats fetched', {
      totalUsers: userCount[0].count,
      totalDrivers: driverCount[0].count,
      totalRides: rideCount[0].count
    });
  } catch (error) {
    console.error(error);
    return errorResponse(res, 500, 'Failed to fetch stats');
  }
};

const getAllUsers = async (req, res) => {
  try {
    const [users] = await pool.execute(
      "SELECT id, name, phone, email, emergency_contact, nominee_details, status, created_at FROM users ORDER BY created_at DESC"
    );
    return successResponse(res, 200, 'Users fetched', users);
  } catch (error) {
    console.error(error);
    return errorResponse(res, 500, 'Failed to fetch users');
  }
};

const getAllDrivers = async (req, res) => {
  try {
    const [drivers] = await pool.execute(
      `SELECT d.id, d.name, d.phone, d.kyc_status, d.is_online, d.rating, d.created_at,
       v.registration_number, v.make, v.model, vt.name as vehicle_type 
       FROM drivers d 
       LEFT JOIN vehicles v ON v.driver_id = d.id
       LEFT JOIN vehicle_types vt ON v.vehicle_type_id = vt.id
       ORDER BY d.created_at DESC`
    );
    return successResponse(res, 200, 'Drivers fetched', drivers);
  } catch (error) {
    console.error(error);
    return errorResponse(res, 500, 'Failed to fetch drivers');
  }
};

const getDriverDetails = async (req, res) => {
  try {
    const { id } = req.params;
    const [drivers] = await pool.execute(
      `SELECT d.*, v.registration_number, v.make, v.model, v.color,
       v.rc_photo, v.photo_front, v.photo_back, v.photo_left, v.photo_right, vt.name as vehicle_type
       FROM drivers d
       LEFT JOIN vehicles v ON v.driver_id = d.id
       LEFT JOIN vehicle_types vt ON v.vehicle_type_id = vt.id
       WHERE d.id = ?`,
      [id]
    );

    if (drivers.length === 0) return errorResponse(res, 404, 'Driver not found');
    return successResponse(res, 200, 'Driver details fetched', drivers[0]);
  } catch (error) {
    console.error(error);
    return errorResponse(res, 500, 'Failed to fetch driver details');
  }
};

const approveDriver = async (req, res) => {
  try {
    const { id } = req.params;
    await pool.execute('UPDATE drivers SET kyc_status = "APPROVED", rejection_reason = NULL WHERE id = ?', [id]);
    return successResponse(res, 200, 'Driver approved successfully');
  } catch (error) {
    console.error(error);
    return errorResponse(res, 500, 'Failed to approve driver');
  }
};

const rejectDriver = async (req, res) => {
  try {
    const { id } = req.params;
    const { reason } = req.body;
    await pool.execute('UPDATE drivers SET kyc_status = "REJECTED", rejection_reason = ? WHERE id = ?', [reason || 'Your application was rejected. Please try again.', id]);
    return successResponse(res, 200, 'Driver rejected');
  } catch (error) {
    console.error(error);
    return errorResponse(res, 500, 'Failed to reject driver');
  }
};

const createDriverByAdmin = async (req, res) => {
  let connection;
  try {
    const { name, phone, email, password, driving_licence, vehicle_type_id, registration_number, make, model, color } = req.body;
    
    if (!name || !phone || !driving_licence || !registration_number) {
      return errorResponse(res, 400, 'Missing required fields');
    }

    const files = req.files || {};
    const getFilePath = (fieldname) => {
      if (files[fieldname] && files[fieldname][0]) {
        return files[fieldname][0].filename;
      }
      return null;
    };

    const licence_photo = getFilePath('licence_photo');
    const rc_photo = getFilePath('rc_photo');
    const photo_front = getFilePath('photo_front');
    const photo_back = getFilePath('photo_back');
    const photo_left = getFilePath('photo_left');
    const photo_right = getFilePath('photo_right');

    connection = await pool.getConnection();
    await connection.beginTransaction();

    const [existingDrivers] = await connection.execute('SELECT id FROM drivers WHERE phone = ?', [phone]);
    let driverId;

    if (existingDrivers.length > 0) {
      driverId = existingDrivers[0].id;
      await connection.execute(
        'UPDATE drivers SET name = ?, email = ?, driving_licence = ?, licence_photo = COALESCE(?, licence_photo), kyc_status = "APPROVED" WHERE id = ?',
        [name, email || null, driving_licence, licence_photo, driverId]
      );
    } else {
      const salt = await bcrypt.genSalt(10);
      const password_hash = await bcrypt.hash(password || '123456', salt);
      const [driverResult] = await connection.execute(
        'INSERT INTO drivers (name, phone, email, password_hash, driving_licence, licence_photo, kyc_status) VALUES (?, ?, ?, ?, ?, ?, "APPROVED")',
        [name, phone, email || `driver_${Date.now()}@cityride.com`, password_hash, driving_licence, licence_photo]
      );
      driverId = driverResult.insertId;
      await connection.execute('INSERT IGNORE INTO driver_wallets (driver_id, balance) VALUES (?, 0)', [driverId]);
    }

    await connection.execute('INSERT IGNORE INTO driver_wallets (driver_id, balance) VALUES (?, 0)', [driverId]); // Just in case it existed but had no wallet

    await connection.execute('DELETE FROM vehicles WHERE driver_id = ?', [driverId]);
    await connection.execute(
      `INSERT INTO vehicles (driver_id, vehicle_type_id, registration_number, make, model, color, rc_photo, photo_front, photo_back, photo_left, photo_right) 
       VALUES (?, ?, ?, ?, ?, ?, COALESCE(?, rc_photo), COALESCE(?, photo_front), COALESCE(?, photo_back), COALESCE(?, photo_left), COALESCE(?, photo_right))`,
      [driverId, vehicle_type_id || 1, registration_number, make || null, model || null, color || null, rc_photo, photo_front, photo_back, photo_left, photo_right]
    );

    await connection.commit();

    return successResponse(res, 201, 'Driver onboarded successfully by Admin', { driverId });
  } catch (error) {
    if (connection) await connection.rollback();
    console.error('Admin Driver Creation Error:', error);
    return errorResponse(res, 500, 'Failed to create driver');
  } finally {
    if (connection) connection.release();
  }
};

const getPopularLocationsAdmin = async (req, res) => {
  try {
    const [rows] = await pool.query('SELECT * FROM popular_locations ORDER BY id DESC');
    res.json({ success: true, data: rows });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: 'Failed to fetch popular locations' });
  }
};

const addPopularLocation = async (req, res) => {
  try {
    const { city, title, address, latitude, longitude } = req.body;
    let image_url = req.body.image_url;

    if (req.file) {
      image_url = `/uploads/${req.file.filename}`;
    }

    const [result] = await pool.query(
      'INSERT INTO popular_locations (city, title, address, latitude, longitude, image_url) VALUES (?, ?, ?, ?, ?, ?)',
      [city, title, address, latitude, longitude, image_url || null]
    );
    res.json({ success: true, message: 'Added successfully', insertId: result.insertId });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: 'Failed to add popular location' });
  }
};

const deletePopularLocation = async (req, res) => {
  try {
    const { id } = req.params;
    const fs = require('fs');
    const path = require('path');
    
    // Fetch image URL before deleting
    const [rows] = await pool.query('SELECT image_url FROM popular_locations WHERE id = ?', [id]);
    
    if (rows.length > 0 && rows[0].image_url) {
      const imageUrl = rows[0].image_url;
      const filename = imageUrl.split('/').pop();
      const filePath = path.join(__dirname, '../../../uploads', filename);
      
      // Delete the file if it exists
      if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath);
      }
    }

    await pool.query('DELETE FROM popular_locations WHERE id = ?', [id]);
    res.json({ success: true, message: 'Deleted successfully' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: 'Failed to delete popular location' });
  }
};

const updatePopularLocation = async (req, res) => {
  try {
    const { id } = req.params;
    const { city, title, address, latitude, longitude } = req.body;
    let image_url = req.body.image_url;

    if (req.file) {
      const fs = require('fs');
      const path = require('path');
      
      // Delete old file if updating image
      const [oldRows] = await pool.query('SELECT image_url FROM popular_locations WHERE id = ?', [id]);
      if (oldRows.length > 0 && oldRows[0].image_url) {
        const oldFilename = oldRows[0].image_url.split('/').pop();
        const oldFilePath = path.join(__dirname, '../../../uploads', oldFilename);
        if (fs.existsSync(oldFilePath)) fs.unlinkSync(oldFilePath);
      }

      image_url = `/uploads/${req.file.filename}`;
      
      await pool.query(
        'UPDATE popular_locations SET city=?, title=?, address=?, latitude=?, longitude=?, image_url=? WHERE id=?',
        [city, title, address, latitude, longitude, image_url, id]
      );
    } else {
      if (image_url === '') {
        const fs = require('fs');
        const path = require('path');
        const [oldRows] = await pool.query('SELECT image_url FROM popular_locations WHERE id = ?', [id]);
        if (oldRows.length > 0 && oldRows[0].image_url) {
          const oldFilename = oldRows[0].image_url.split('/').pop();
          const oldFilePath = path.join(__dirname, '../../../uploads', oldFilename);
          if (fs.existsSync(oldFilePath)) fs.unlinkSync(oldFilePath);
        }
        await pool.query(
          'UPDATE popular_locations SET city=?, title=?, address=?, latitude=?, longitude=?, image_url=NULL WHERE id=?',
          [city, title, address, latitude, longitude, id]
        );
      } else {
        await pool.query(
          'UPDATE popular_locations SET city=?, title=?, address=?, latitude=?, longitude=? WHERE id=?',
          [city, title, address, latitude, longitude, id]
        );
      }
    }
    
    res.json({ success: true, message: 'Updated successfully' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: 'Failed to update popular location' });
  }
};


const getCities = async (req, res) => {
  try {
    const [rows] = await pool.query('SELECT name FROM cities ORDER BY name ASC');
    res.json({ success: true, data: rows.map(r => r.name) });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: 'Failed to fetch cities' });
  }
};

const getAllWithdrawals = async (req, res) => {
  try {
    const [rows] = await pool.execute(`
      SELECT 
        w.id, w.amount, w.status, DATE_FORMAT(w.created_at, "%d/%m/%Y %h:%i %p") as date, 
        w.driver_id, d.name as driver_name, d.phone as driver_phone,
        b.account_name, b.account_number, b.ifsc
      FROM withdrawal_requests w
      JOIN drivers d ON w.driver_id = d.id
      LEFT JOIN driver_bank_accounts b ON w.driver_id = b.driver_id
      ORDER BY w.created_at DESC
    `);
    return successResponse(res, 200, 'Withdrawals fetched successfully', rows);
  } catch (error) {
    console.error('Admin Fetch Withdrawals Error:', error);
    return errorResponse(res, 500, 'Failed to fetch withdrawals');
  }
};

const updateWithdrawalStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body; // 'Completed' or 'Canceled'

    if (!['Completed', 'Canceled'].includes(status)) {
      return errorResponse(res, 400, 'Invalid status');
    }

    await pool.execute('UPDATE withdrawal_requests SET status = ? WHERE id = ?', [status, id]);

    return successResponse(res, 200, `Withdrawal ${status} successfully`);
  } catch (error) {
    console.error('Update Withdrawal Error:', error);
    return errorResponse(res, 500, 'Failed to update withdrawal status');
  }
};


const getUserWithdrawals = async (req, res) => {
  try {
    const [rows] = await pool.query(`
      SELECT w.*, u.name as user_name, u.phone as user_phone
      FROM user_withdraw_wallet w
      JOIN users u ON w.user_id = u.id
      ORDER BY w.created_at DESC
    `);
    return successResponse(res, 200, 'User withdrawals fetched successfully', rows);
  } catch (error) {
    console.error('Error fetching user withdrawals:', error);
    return errorResponse(res, 500, 'Failed to fetch user withdrawals');
  }
};

const updateUserWithdrawalStatus = async (req, res) => {
  const connection = await pool.getConnection();
  try {
    const { id } = req.params;
    const { status } = req.body; // 'COMPLETED' or 'FAILED'
    
    if (!['COMPLETED', 'FAILED'].includes(status)) {
      return errorResponse(res, 400, 'Invalid status');
    }

    await connection.beginTransaction();

    const [wRows] = await connection.query(`SELECT * FROM user_withdraw_wallet WHERE id = ? FOR UPDATE`, [id]);
    if (wRows.length === 0) {
      await connection.rollback();
      return errorResponse(res, 404, 'Withdrawal not found');
    }

    const withdrawal = wRows[0];
    if (withdrawal.status !== 'PENDING') {
      await connection.rollback();
      return errorResponse(res, 400, 'Withdrawal is already processed');
    }

    await connection.query(`UPDATE user_withdraw_wallet SET status = ? WHERE id = ?`, [status, id]);

    if (status === 'FAILED') {
      await connection.query(`UPDATE users SET wallet_balance = wallet_balance + ? WHERE id = ?`, [withdrawal.amount, withdrawal.user_id]);
    }

    await connection.commit();
    return successResponse(res, 200, 'Status updated successfully');
  } catch (error) {
    await connection.rollback();
    console.error('Error updating status:', error);
    return errorResponse(res, 500, 'Failed to update status');
  } finally {
    connection.release();
  }
};

module.exports = {
  adminLogin,
  getDashboardStats,
  getAllUsers,
  getAllDrivers,
  getDriverDetails,
  approveDriver,
  rejectDriver,
  createDriverByAdmin,
  getPopularLocationsAdmin,
  addPopularLocation,
  updatePopularLocation,
  deletePopularLocation,
  getCities,
  getAllWithdrawals,
  updateWithdrawalStatus,
  getUserWithdrawals,
  updateUserWithdrawalStatus
};
