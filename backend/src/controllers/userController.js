const { pool } = require('../config/db');
const { successResponse, errorResponse } = require('../utils/responseHandler');

const getMe = async (req, res) => {
  try {
    if (!req.user) return errorResponse(res, 404, 'User not found');
    
    let table = 'users';
    if (req.user.role === 'DRIVER') table = 'drivers';
    if (req.user.role === 'ADMIN' || req.user.role === 'SUPER_ADMIN') table = 'admins';

    let query = `SELECT id, name, phone, email, status, created_at FROM ${table} WHERE id = ?`;
    
    if (table !== 'admins') {
      query = `SELECT id, name, phone, email, gender, dob, blood_group, emergency_contact, nominee_details, profile_image, status, created_at FROM ${table} WHERE id = ?`;
    }

    const [rows] = await pool.execute(query, [req.user.id]);

    if (rows.length === 0) return errorResponse(res, 404, 'User not found in DB');

    return successResponse(res, 200, 'User retrieved successfully', { user: rows[0] });
  } catch (error) {
    console.error(error);
    return errorResponse(res, 500, 'Server error');
  }
};

const updateMe = async (req, res) => {
  try {
    const { name, email, gender, dob, blood_group, emergency_contact, nominee_details, profile_image } = req.body;
    
    let table = 'users';
    if (req.user.role === 'DRIVER') table = 'drivers';
    if (req.user.role === 'ADMIN' || req.user.role === 'SUPER_ADMIN') table = 'admins';

    if (table === 'admins') {
      await pool.execute(
        `UPDATE admins SET name = ?, email = ? WHERE id = ?`,
        [name || null, email || null, req.user.id]
      );
    } else {
      await pool.execute(
        `UPDATE ${table} SET name = COALESCE(?, name), email = COALESCE(?, email), gender = COALESCE(?, gender), dob = COALESCE(?, dob), blood_group = COALESCE(?, blood_group), emergency_contact = COALESCE(?, emergency_contact), nominee_details = COALESCE(?, nominee_details), profile_image = COALESCE(?, profile_image) WHERE id = ?`,
        [name !== undefined ? name : null, email !== undefined ? email : null, gender !== undefined ? gender : null, dob !== undefined ? dob : null, blood_group !== undefined ? blood_group : null, emergency_contact !== undefined ? emergency_contact : null, nominee_details !== undefined ? nominee_details : null, profile_image !== undefined ? profile_image : null, req.user.id]
      );
    }

    let query = `SELECT id, name, phone, email, status, created_at FROM ${table} WHERE id = ?`;
    if (table !== 'admins') {
      query = `SELECT id, name, phone, email, gender, dob, emergency_contact, nominee_details, status, created_at FROM ${table} WHERE id = ?`;
    }

    const [rows] = await pool.execute(query, [req.user.id]);

    return successResponse(res, 200, 'Profile updated successfully', { user: rows[0] });
  } catch (error) {
    console.error(error);
    return errorResponse(res, 500, 'Failed to update profile');
  }
};

const deleteMe = async (req, res) => {
  try {
    let table = 'users';
    if (req.user.role === 'DRIVER') table = 'drivers';
    if (req.user.role === 'ADMIN' || req.user.role === 'SUPER_ADMIN') table = 'admins';

    await pool.execute(`DELETE FROM ${table} WHERE id = ?`, [req.user.id]);

    return successResponse(res, 200, 'Account deleted successfully');
  } catch (error) {
    console.error('Delete account error:', error);
    return errorResponse(res, 500, 'Failed to delete account');
  }
};

module.exports = { getMe, updateMe, deleteMe };
