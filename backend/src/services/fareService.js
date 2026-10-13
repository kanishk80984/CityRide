const { pool } = require('../config/db');

class FareService {
  async calculateFare(vehicleTypeId, distanceKm, tripType, waitingMinutes = 0) {
    // Get vehicle pricing
    const [vehicleRows] = await pool.execute('SELECT * FROM vehicle_types WHERE id = ?', [vehicleTypeId]);
    if (vehicleRows.length === 0) {
      throw new Error('Vehicle type not found');
    }
    const vehicle = vehicleRows[0];
    const baseFare = Number(vehicle.base_fare);
    const perKmRate = Number(vehicle.per_km_rate);

    // Get global settings for waiting charge & distance tiers
    const [settingsRows] = await pool.execute('SELECT setting_key, setting_value FROM global_settings WHERE setting_key IN ("free_waiting_minutes", "waiting_charge_per_minute", "max_waiting_charge", "waiting_charge_enabled", "waiting_time_km_tiers")');
    const settings = {};
    settingsRows.forEach(row => {
      settings[row.setting_key] = row.setting_value;
    });

    // Calculate base ride fare
    const billableDistance = Math.max(0, distanceKm - 1); // Subtract 1km for base fare as per User App logic
    let rideFare = baseFare + (billableDistance * perKmRate);

    if (tripType === 'TWO_WAY') {
      rideFare = rideFare * 2;
    }

    // Helper to calculate free waiting minutes dynamically based on distanceKm
    let freeMinutes = Number(settings['free_waiting_minutes']) || 0;
    if (settings['waiting_time_km_tiers']) {
      try {
        const tiers = typeof settings['waiting_time_km_tiers'] === 'string' 
          ? JSON.parse(settings['waiting_time_km_tiers']) 
          : settings['waiting_time_km_tiers'];
        
        const dist = Number(distanceKm) || 0;
        if (tiers && typeof tiers === 'object') {
          if (dist <= 5 && tiers['1_5'] !== undefined && tiers['1_5'] !== '') {
            freeMinutes = Number(tiers['1_5']);
          } else if (dist <= 10 && tiers['5_10'] !== undefined && tiers['5_10'] !== '') {
            freeMinutes = Number(tiers['5_10']);
          } else if (dist <= 20 && tiers['10_20'] !== undefined && tiers['10_20'] !== '') {
            freeMinutes = Number(tiers['10_20']);
          } else if (dist <= 50 && tiers['20_50'] !== undefined && tiers['20_50'] !== '') {
            freeMinutes = Number(tiers['20_50']);
          } else if (dist <= 100 && tiers['50_100'] !== undefined && tiers['50_100'] !== '') {
            freeMinutes = Number(tiers['50_100']);
          } else if (dist > 100) {
            // 100km+ rule: base 100km waiting time + extra km beyond 100
            const base100 = (tiers['100_base'] !== undefined && tiers['100_base'] !== '') ? Number(tiers['100_base']) : 100;
            freeMinutes = base100 + Math.floor(dist - 100);
          }
        }
      } catch (e) {
        console.error('Error parsing waiting_time_km_tiers:', e);
      }
    }

    // Calculate waiting charge
    let waitingCharge = 0;
    if (settings['waiting_charge_enabled'] === 'true') {
      const chargePerMinute = Number(settings['waiting_charge_per_minute']) || 0;
      const maxWaitingCharge = Number(settings['max_waiting_charge']) || 0;

      const chargeableMinutes = Math.max(0, waitingMinutes - freeMinutes);
      waitingCharge = chargeableMinutes * chargePerMinute;
      
      if (maxWaitingCharge > 0 && waitingCharge > maxWaitingCharge) {
        waitingCharge = maxWaitingCharge;
      }
    }

    const finalFare = Math.round(rideFare + waitingCharge);
    return {
      finalFare,
      waitingCharge: Math.round(waitingCharge),
      baseRideFare: Math.round(rideFare)
    };
  }

  async calculateCommission(finalFare, distanceType, tipAmount = 0) {
    const keys = [
      'short_ride_commission_percent',
      'short_ride_tip_commission_enabled',
      'short_ride_tip_commission_percent',
      'long_ride_commission_percent',
      'long_ride_tip_commission_enabled',
      'long_ride_tip_commission_percent'
    ];
    const [rows] = await pool.execute(`SELECT setting_key, setting_value FROM global_settings WHERE setting_key IN (${keys.map(() => '?').join(',')})`, keys);
    
    const settings = {};
    rows.forEach(r => { settings[r.setting_key] = r.setting_value; });

    let rideCommissionPercent = 0;
    let tipCommissionEnabled = false;
    let tipCommissionPercent = 0;

    if (distanceType === 'SHORT') {
      rideCommissionPercent = Number(settings['short_ride_commission_percent']) || 0;
      tipCommissionEnabled = settings['short_ride_tip_commission_enabled'] === 'true';
      tipCommissionPercent = Number(settings['short_ride_tip_commission_percent']) || 0;
    } else if (distanceType === 'LONG') {
      rideCommissionPercent = Number(settings['long_ride_commission_percent']) || 0;
      tipCommissionEnabled = settings['long_ride_tip_commission_enabled'] === 'true';
      tipCommissionPercent = Number(settings['long_ride_tip_commission_percent']) || 0;
    }

    const rideCommission = (finalFare * rideCommissionPercent) / 100;
    let tipCommission = 0;
    
    if (tipCommissionEnabled && tipAmount > 0) {
      tipCommission = (tipAmount * tipCommissionPercent) / 100;
    }

    return {
      rideCommission: Math.round(rideCommission * 100) / 100,
      tipCommission: Math.round(tipCommission * 100) / 100,
      totalCommission: Math.round((rideCommission + tipCommission) * 100) / 100
    };
  }
}

module.exports = new FareService();
