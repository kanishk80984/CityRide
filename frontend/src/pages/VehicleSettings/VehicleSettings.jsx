import React, { useState, useEffect } from 'react';
import { getApiUrl } from '../../services/apiClient';
import { Save } from 'lucide-react';
import axios from 'axios';
import './VehicleSettings.css';

const API_URL = getApiUrl(); // Or your deployed URL

const VehicleSettings = () => {
  const [pricing, setPricing] = useState({
    auto: { baseAmount: 30, perKm: 12 },
    car: { baseAmount: 50, perKm: 15 },
    bike: { baseAmount: 20, perKm: 8 },
    parcel: { baseAmount: 40, perKm: 10 }
  });

  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetchVehicles();
  }, []);

  const fetchVehicles = async () => {
    try {
      const token = localStorage.getItem('adminToken');
      const res = await axios.get(`${API_URL}/vehicle-types`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.data.success) {
        const vehicles = res.data.data;
        const newPricing = { ...pricing };
        vehicles.forEach(v => {
          const name = v.name.toLowerCase();
          if (newPricing[name]) {
            newPricing[name].baseAmount = v.base_fare;
            newPricing[name].perKm = v.per_km_rate;
          }
        });
        setPricing(newPricing);
      }
    } catch (err) {
      console.error('Failed to load vehicles', err);
    }
  };

  const handleSave = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      const payload = Object.keys(pricing).map(key => ({
        name: key.charAt(0).toUpperCase() + key.slice(1),
        base_fare: pricing[key].baseAmount,
        per_km_rate: pricing[key].perKm
      }));
      const token = localStorage.getItem('adminToken');
      await axios.put(`${API_URL}/vehicle-types`, { vehicles: payload }, {
        headers: { Authorization: `Bearer ${token}` }
      });
      alert('Settings saved successfully!');
    } catch (err) {
      alert('Failed to save settings.');
    } finally {
      setSaving(false);
    }
  };

  const handleInputChange = (vehicle, field, value) => {
    setPricing({
      ...pricing,
      [vehicle]: {
        ...pricing[vehicle],
        [field]: value
      }
    });
  };

  const PricingCard = ({ vehicleType, title }) => {
    return (
      <div className="pricing-card">
        <div className="pricing-header">
          <h3>{title}</h3>
          <div className={`vehicle-badge badge-${vehicleType}`}>Active</div>
        </div>
        
        <div className="pricing-body">
          <div className="input-group">
            <label>Base Amount (₹)</label>
            <input 
              type="number" 
              className="input-control" 
              value={pricing[vehicleType].baseAmount}
              onChange={(e) => handleInputChange(vehicleType, 'baseAmount', e.target.value)}
            />
            <span className="help-text">Initial charge on ride start</span>
          </div>
          
          <div className="input-group">
            <label>Amount per Km (₹)</label>
            <input 
              type="number" 
              className="input-control" 
              value={pricing[vehicleType].perKm}
              onChange={(e) => handleInputChange(vehicleType, 'perKm', e.target.value)}
            />
            <span className="help-text">Charge for every kilometer traveled</span>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="settings-container">
      <div className="settings-header">
        <div>
          <h1 className="page-title" style={{ marginBottom: '0.5rem' }}>Vehicle Pricing Settings</h1>
          <p style={{ color: 'var(--text-muted)' }}>Configure base fares and per-distance rates for each vehicle category.</p>
        </div>
        <button className="btn btn-primary" onClick={handleSave} disabled={saving}>
          <Save size={18} />
          <span>{saving ? 'Saving...' : 'Save Changes'}</span>
        </button>
      </div>

      <div className="pricing-grid">
        <PricingCard vehicleType="auto" title="Auto Rickshaw" />
        <PricingCard vehicleType="car" title="Car (Sedan/Mini)" />
        <PricingCard vehicleType="bike" title="Bike Taxi" />
        <PricingCard vehicleType="parcel" title="Parcel Service" />
      </div>
    </div>
  );
};

export default VehicleSettings;
