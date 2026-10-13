const { pool } = require('../config/db');
const { successResponse, errorResponse } = require('../utils/responseHandler');
const { decrypt } = require('../utils/crypto');
const bcrypt = require('bcrypt');

const TEST_MODE = process.env.OTP_TEST_MODE === 'true';

const generateOtp = () => {
  return Math.floor(100000 + Math.random() * 900000).toString();
};

const sendOtp = async (phone, otp) => {
  if (TEST_MODE) {
    console.log(`[TEST MODE] OTP for ${phone} is ${otp}`);
    return true;
  }
  // TODO: Add real SMS provider logic here
  console.log(`Simulating SMS to ${phone} with OTP ${otp}`);
  return true;
};

const getClientIntegration = async (req, res) => {
  try {
    const driverId = req.user.id;
    const [rows] = await pool.execute(
      `SELECT client_id, status FROM driver_owner_links WHERE driver_id = ? LIMIT 1`,
      [driverId]
    );

    if (rows.length === 0) {
      return successResponse(res, 200, 'Not integrated', { integrated: false });
    }
    
    return successResponse(res, 200, 'Integration details', {
      integrated: true,
      client_id: rows[0].client_id,
      status: rows[0].status
    });
  } catch (error) {
    console.error(error);
    return errorResponse(res, 500, 'Server error');
  }
};

const requestClientVerification = async (req, res) => {
  try {
    const driverId = req.user.id;
    const { client_id, client_secret, purpose = 'LINK' } = req.body;
    
    if (!client_id || !client_secret) {
      return errorResponse(res, 400, 'Client ID and Secret are required');
    }

    // Verify Owner
    const [owners] = await pool.execute('SELECT * FROM owners WHERE client_id = ?', [client_id]);
    if (owners.length === 0) return errorResponse(res, 404, 'Invalid Client Credentials');

    const owner = owners[0];
    if (owner.status !== 'ACTIVE') return errorResponse(res, 403, 'Owner account is not active');
    if (!owner.client_secret_encrypted) return errorResponse(res, 400, 'Owner credentials not fully configured');

    const decryptedSecret = decrypt(owner.client_secret_encrypted);
    if (decryptedSecret !== client_secret) return errorResponse(res, 401, 'Invalid Client Credentials');

    // If LINK, check if already linked
    if (purpose === 'LINK') {
      const [existing] = await pool.execute('SELECT id FROM driver_owner_links WHERE driver_id = ?', [driverId]);
      if (existing.length > 0) return errorResponse(res, 400, 'Existing Owner integration found. Verify the new Owner to replace it (Use UPDATE purpose).');
    }

    // Generate OTP
    const otp = generateOtp();
    const salt = await bcrypt.genSalt(10);
    const otpHash = await bcrypt.hash(otp, salt);
    const expiresAt = new Date(Date.now() + 5 * 60 * 1000); // 5 mins

    // Clear previous pending OTPs for this driver + purpose
    await pool.execute('DELETE FROM owner_client_otps WHERE driver_id = ? AND purpose = ?', [driverId, purpose]);

    await pool.execute(
      `INSERT INTO owner_client_otps (driver_id, owner_id, client_id, purpose, otp_hash, expires_at)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [driverId, owner.id, client_id, purpose, otpHash, expiresAt]
    );

    await sendOtp(owner.phone_number, otp);

    const responsePayload = { message: 'OTP sent to Owner phone.' };
    if (TEST_MODE) {
      responsePayload.devOtp = otp;
    }

    return successResponse(res, 200, 'Verification initiated', responsePayload);
  } catch (error) {
    console.error(error);
    return errorResponse(res, 500, 'Failed to initiate verification');
  }
};

const verifyClientOtp = async (req, res) => {
  try {
    const driverId = req.user.id;
    const { client_id, otp, purpose = 'LINK' } = req.body;

    if (!client_id || !otp) return errorResponse(res, 400, 'Client ID and OTP are required');

    const [otps] = await pool.execute(
      `SELECT * FROM owner_client_otps 
       WHERE driver_id = ? AND client_id = ? AND purpose = ? AND verified_at IS NULL
       ORDER BY created_at DESC LIMIT 1`,
      [driverId, client_id, purpose]
    );

    if (otps.length === 0) return errorResponse(res, 400, 'No active OTP found');
    
    const otpRecord = otps[0];
    
    if (otpRecord.attempt_count >= 5) {
      return errorResponse(res, 403, 'Maximum OTP attempts exceeded. Request a new OTP.');
    }

    if (new Date() > new Date(otpRecord.expires_at)) {
      return errorResponse(res, 400, 'OTP expired');
    }

    const isValid = await bcrypt.compare(otp, otpRecord.otp_hash);
    
    if (!isValid) {
      await pool.execute('UPDATE owner_client_otps SET attempt_count = attempt_count + 1 WHERE id = ?', [otpRecord.id]);
      return errorResponse(res, 400, 'Invalid OTP');
    }

    // OTP Valid
    await pool.execute('UPDATE owner_client_otps SET verified_at = NOW() WHERE id = ?', [otpRecord.id]);

    if (purpose === 'LINK' || purpose === 'UPDATE') {
      // Remove old link
      await pool.execute('DELETE FROM driver_owner_links WHERE driver_id = ?', [driverId]);
      // Create new link
      await pool.execute(
        'INSERT INTO driver_owner_links (driver_id, owner_id, client_id) VALUES (?, ?, ?)',
        [driverId, otpRecord.owner_id, client_id]
      );
    } else if (purpose === 'REMOVE') {
      await pool.execute('DELETE FROM driver_owner_links WHERE driver_id = ? AND client_id = ?', [driverId, client_id]);
    }

    return successResponse(res, 200, 'Verification successful');
  } catch (error) {
    console.error(error);
    return errorResponse(res, 500, 'Failed to verify OTP');
  }
};

const requestRemoveVerification = async (req, res) => {
  try {
    const driverId = req.user.id;
    
    // Get current link
    const [links] = await pool.execute(
      `SELECT dol.client_id, dol.owner_id, o.phone_number 
       FROM driver_owner_links dol
       JOIN owners o ON dol.owner_id = o.id
       WHERE dol.driver_id = ?`,
      [driverId]
    );

    if (links.length === 0) return errorResponse(res, 404, 'No active integration found');

    const link = links[0];
    const otp = generateOtp();
    const salt = await bcrypt.genSalt(10);
    const otpHash = await bcrypt.hash(otp, salt);
    const expiresAt = new Date(Date.now() + 5 * 60 * 1000); // 5 mins

    await pool.execute('DELETE FROM owner_client_otps WHERE driver_id = ? AND purpose = "REMOVE"', [driverId]);

    await pool.execute(
      `INSERT INTO owner_client_otps (driver_id, owner_id, client_id, purpose, otp_hash, expires_at)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [driverId, link.owner_id, link.client_id, 'REMOVE', otpHash, expiresAt]
    );

    await sendOtp(link.phone_number, otp);

    const responsePayload = { message: 'OTP sent to Owner phone.', client_id: link.client_id };
    if (TEST_MODE) {
      responsePayload.devOtp = otp;
    }

    return successResponse(res, 200, 'Removal verification initiated', responsePayload);
  } catch (error) {
    console.error(error);
    return errorResponse(res, 500, 'Failed to initiate removal');
  }
};

module.exports = {
  getClientIntegration,
  requestClientVerification,
  verifyClientOtp,
  requestRemoveVerification
};
