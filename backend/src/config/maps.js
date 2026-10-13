require('dotenv').config();

const GOOGLE_MAPS_SERVER_API_KEY = process.env.GOOGLE_MAPS_SERVER_API_KEY;

if (!GOOGLE_MAPS_SERVER_API_KEY) {
  console.warn('WARNING: GOOGLE_MAPS_SERVER_API_KEY is missing from environment variables.');
}

module.exports = {
  GOOGLE_MAPS_SERVER_API_KEY,
};
