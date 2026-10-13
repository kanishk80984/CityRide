import React, { useState, useEffect } from 'react';
import adminConfigApi from '../../services/adminConfigApi';
import { Save, AlertCircle, Info } from 'lucide-react';

export default function RideConfig() {
  const [settings, setSettings] = useState({
    short_ride_max_distance_km: '30',
    waiting_charge_enabled: 'false',
    free_waiting_minutes: '30',
    waiting_charge_per_minute: '5',
    max_waiting_charge: '500',
    waiting_time_km_tiers: JSON.stringify({
      '1_5': 15,
      '5_10': 30,
      '10_20': 45,
      '20_50': 60,
      '50_100': 90,
      '100_base': 100
    }),
    short_ride_commission_percent: '5',
    short_ride_tip_commission_enabled: 'false',
    short_ride_tip_commission_percent: '0',
    long_ride_commission_percent: '8',
    long_ride_tip_commission_enabled: 'false',
    long_ride_tip_commission_percent: '0'
  });
  const [kmTiers, setKmTiers] = useState({
    '1_5': '15',
    '5_10': '30',
    '10_20': '45',
    '20_50': '60',
    '50_100': '90',
    '100_base': '100'
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await adminConfigApi.getGlobalSettings();
      setSettings(prev => ({ ...prev, ...(res.data || {}) }));
      if (res.data?.waiting_time_km_tiers) {
        try {
          const parsed = typeof res.data.waiting_time_km_tiers === 'string'
            ? JSON.parse(res.data.waiting_time_km_tiers)
            : res.data.waiting_time_km_tiers;
          setKmTiers({
            '1_5': String(parsed['1_5'] ?? '15'),
            '5_10': String(parsed['5_10'] ?? '30'),
            '10_20': String(parsed['10_20'] ?? '45'),
            '20_50': String(parsed['20_50'] ?? '60'),
            '50_100': String(parsed['50_100'] ?? '90'),
            '100_base': String(parsed['100_base'] ?? '100'),
          });
        } catch (e) {
          console.error(e);
        }
      }
    } catch (err) {
      setError('Unable to load ride configuration. Please try again.');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async (e) => {
    e.preventDefault();
    setSaving(true);
    setError(null);
    setSuccess(false);

    try {
      // Validate percentages
      const percents = [
        settings.short_ride_commission_percent,
        settings.short_ride_tip_commission_percent,
        settings.long_ride_commission_percent,
        settings.long_ride_tip_commission_percent
      ];
      
      for (const p of percents) {
        const val = Number(p);
        if (isNaN(val) || val < 0 || val > 100 || p === '') {
          throw new Error('All commission percentages must be valid numbers between 0 and 100.');
        }
      }

      const formattedTiers = JSON.stringify({
        '1_5': Number(kmTiers['1_5']) || 0,
        '5_10': Number(kmTiers['5_10']) || 0,
        '10_20': Number(kmTiers['10_20']) || 0,
        '20_50': Number(kmTiers['20_50']) || 0,
        '50_100': Number(kmTiers['50_100']) || 0,
        '100_base': Number(kmTiers['100_base']) || 0,
      });

      await adminConfigApi.updateGlobalSettings({
        short_ride_max_distance_km: settings.short_ride_max_distance_km,
        waiting_charge_enabled: settings.waiting_charge_enabled,
        free_waiting_minutes: settings.free_waiting_minutes,
        waiting_charge_per_minute: settings.waiting_charge_per_minute,
        max_waiting_charge: settings.max_waiting_charge,
        waiting_time_km_tiers: formattedTiers,
        short_ride_commission_percent: settings.short_ride_commission_percent,
        short_ride_tip_commission_enabled: settings.short_ride_tip_commission_enabled,
        short_ride_tip_commission_percent: settings.short_ride_tip_commission_percent,
        long_ride_commission_percent: settings.long_ride_commission_percent,
        long_ride_tip_commission_enabled: settings.long_ride_tip_commission_enabled,
        long_ride_tip_commission_percent: settings.long_ride_tip_commission_percent
      });
      setSuccess(true);
      setTimeout(() => setSuccess(false), 3000);
      
      // Reload from DB to confirm values
      await loadSettings();
    } catch (err) {
      setError(err.message || 'Failed to save configuration.');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="page-container animate-fade-in">
        <h2 style={{ marginBottom: '0.5rem', color: 'var(--text-main)' }}>Ride Configuration</h2>
        <p style={{ color: 'var(--text-muted)', marginBottom: '2rem' }}>Manage system-wide parameters for rides, distances, and waiting charges.</p>
        <div className="card" style={{ padding: '2rem', textAlign: 'center', color: 'var(--text-muted)' }}>
          Loading configuration...
        </div>
      </div>
    );
  }

  return (
    <div className="page-container animate-fade-in">
      <h2 style={{ marginBottom: '0.5rem', color: 'var(--text-main)' }}>Ride Configuration</h2>
      <p style={{ color: 'var(--text-muted)', marginBottom: '2rem' }}>Manage system-wide parameters for rides, distances, and waiting charges.</p>

      {error && (
        <div className="card" style={{ backgroundColor: 'rgba(239, 68, 68, 0.1)', borderColor: 'var(--danger)', color: 'var(--danger)', marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <AlertCircle size={20} />
          {error}
        </div>
      )}

      {success && (
        <div className="card" style={{ backgroundColor: 'rgba(16, 185, 129, 0.1)', borderColor: 'var(--success)', color: 'var(--success)', marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <Save size={20} />
          Configuration saved successfully!
        </div>
      )}

      <form onSubmit={handleSave} style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem', maxWidth: '800px' }}>
        
        {/* SECTION 1: Ride Classification */}
        <div className="card">
          <h3 style={{ fontSize: '1.1rem', marginBottom: '1rem', borderBottom: '1px solid var(--border)', paddingBottom: '0.5rem' }}>Ride Classification</h3>
          <div className="input-group" style={{ maxWidth: '300px' }}>
            <label>Short Ride Maximum Distance (KM)</label>
            <input 
              type="number" 
              min="1"
              className="input-control" 
              value={settings.short_ride_max_distance_km}
              onChange={(e) => setSettings({...settings, short_ride_max_distance_km: e.target.value})}
              required
            />
          </div>
          <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'flex-start', color: 'var(--text-muted)', fontSize: '0.85rem', marginTop: '0.5rem' }}>
            <Info size={16} style={{ flexShrink: 0, marginTop: '2px' }} />
            <p>
              Trips at or below this road-route distance are classified as <strong>Short rides</strong>.<br/>
              Trips above this distance are classified as <strong>Long rides</strong>.
              <br/><br/>
              <em>IMPORTANT: Classification is based on actual road-route distance, not destination city/name.</em>
            </p>
          </div>
        </div>

        {/* SECTION 2: Ride Type Explanation */}
        <div className="card" style={{ backgroundColor: 'var(--bg-color)', border: 'none' }}>
          <h3 style={{ fontSize: '1rem', marginBottom: '0.75rem' }}>Ride Types</h3>
          <div style={{ display: 'flex', gap: '2rem' }}>
            <div>
              <strong>Distance based:</strong>
              <ul style={{ paddingLeft: '1.5rem', fontSize: '0.9rem', color: 'var(--text-muted)', marginTop: '0.25rem' }}>
                <li>Short Ride</li>
                <li>Long Ride</li>
              </ul>
            </div>
            <div>
              <strong>Trip type based:</strong>
              <ul style={{ paddingLeft: '1.5rem', fontSize: '0.9rem', color: 'var(--text-muted)', marginTop: '0.25rem' }}>
                <li>One Way</li>
                <li>Two Way</li>
              </ul>
            </div>
          </div>
          <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginTop: '1rem' }}>
            Note: Short/Long classification and One-Way/Two-Way are separate concepts and are combined in the Fare Configuration matrix.
          </p>
        </div>

        {/* SECTION 3: Waiting Charge */}
        <div className="card">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem', borderBottom: '1px solid var(--border)', paddingBottom: '0.75rem' }}>
            <h3 style={{ fontSize: '1.1rem', margin: 0 }}>Waiting Charge</h3>
            <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer' }}>
              <input 
                type="checkbox" 
                checked={settings.waiting_charge_enabled === 'true'} 
                onChange={(e) => setSettings({...settings, waiting_charge_enabled: e.target.checked ? 'true' : 'false'})}
                style={{ width: '1.25rem', height: '1.25rem', accentColor: 'var(--primary)' }}
              />
              <span style={{ fontWeight: 600, color: settings.waiting_charge_enabled === 'true' ? 'var(--primary)' : 'var(--text-muted)' }}>
                {settings.waiting_charge_enabled === 'true' ? 'ON' : 'OFF'}
              </span>
            </label>
          </div>
          
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1.5rem' }}>
            <div className="input-group">
              <label>Default / Fallback Free Time (Mins)</label>
              <input 
                type="number" 
                min="0"
                className="input-control" 
                value={settings.free_waiting_minutes}
                onChange={(e) => setSettings({...settings, free_waiting_minutes: e.target.value})}
                required
                disabled={settings.waiting_charge_enabled === 'false'}
              />
            </div>
            <div className="input-group">
              <label>Charge After Free Time (₹/Min)</label>
              <input 
                type="number" 
                min="0"
                step="0.1"
                className="input-control" 
                value={settings.waiting_charge_per_minute}
                onChange={(e) => setSettings({...settings, waiting_charge_per_minute: e.target.value})}
                required
                disabled={settings.waiting_charge_enabled === 'false'}
              />
            </div>
            <div className="input-group">
              <label>Maximum Waiting Charge (₹)</label>
              <input 
                type="number" 
                min="0"
                className="input-control" 
                value={settings.max_waiting_charge}
                onChange={(e) => setSettings({...settings, max_waiting_charge: e.target.value})}
                required
                disabled={settings.waiting_charge_enabled === 'false'}
              />
            </div>
          </div>

          {/* KM-Based Free Waiting Time Tiers */}
          <div style={{ marginTop: '2rem', paddingTop: '1.5rem', borderTop: '1px dashed var(--border)' }}>
            <h4 style={{ fontSize: '1rem', marginBottom: '0.4rem', color: 'var(--text-main)', fontWeight: 600 }}>
              Distance (KM) Based Free Waiting Time (Minutes)
            </h4>
            <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginBottom: '1.5rem', lineHeight: 1.5 }}>
              Set free waiting time according to trip distance. For trips over 100km, free time will be 100km base minutes + 1 minute per extra km (e.g. 110km = 100 mins + 10 mins = 110 mins free limit).
            </p>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '1.5rem' }}>
              <div className="input-group">
                <label style={{ fontSize: '0.9rem', marginBottom: '0.4rem', display: 'block', fontWeight: 500 }}>1 km to 5 km</label>
                <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
                  <input
                    type="number"
                    min="0"
                    className="input-control"
                    style={{ paddingRight: '3.5rem', width: '100%' }}
                    value={kmTiers['1_5']}
                    onChange={(e) => setKmTiers({ ...kmTiers, '1_5': e.target.value })}
                    disabled={settings.waiting_charge_enabled === 'false'}
                    placeholder="Mins"
                  />
                  <span style={{ position: 'absolute', right: '12px', fontSize: '0.85rem', color: 'var(--text-muted)', pointerEvents: 'none', fontWeight: 500 }}>Mins</span>
                </div>
              </div>

              <div className="input-group">
                <label style={{ fontSize: '0.9rem', marginBottom: '0.4rem', display: 'block', fontWeight: 500 }}>5 km to 10 km</label>
                <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
                  <input
                    type="number"
                    min="0"
                    className="input-control"
                    style={{ paddingRight: '3.5rem', width: '100%' }}
                    value={kmTiers['5_10']}
                    onChange={(e) => setKmTiers({ ...kmTiers, '5_10': e.target.value })}
                    disabled={settings.waiting_charge_enabled === 'false'}
                    placeholder="Mins"
                  />
                  <span style={{ position: 'absolute', right: '12px', fontSize: '0.85rem', color: 'var(--text-muted)', pointerEvents: 'none', fontWeight: 500 }}>Mins</span>
                </div>
              </div>

              <div className="input-group">
                <label style={{ fontSize: '0.9rem', marginBottom: '0.4rem', display: 'block', fontWeight: 500 }}>10 km to 20 km</label>
                <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
                  <input
                    type="number"
                    min="0"
                    className="input-control"
                    style={{ paddingRight: '3.5rem', width: '100%' }}
                    value={kmTiers['10_20']}
                    onChange={(e) => setKmTiers({ ...kmTiers, '10_20': e.target.value })}
                    disabled={settings.waiting_charge_enabled === 'false'}
                    placeholder="Mins"
                  />
                  <span style={{ position: 'absolute', right: '12px', fontSize: '0.85rem', color: 'var(--text-muted)', pointerEvents: 'none', fontWeight: 500 }}>Mins</span>
                </div>
              </div>

              <div className="input-group">
                <label style={{ fontSize: '0.9rem', marginBottom: '0.4rem', display: 'block', fontWeight: 500 }}>20 km to 50 km</label>
                <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
                  <input
                    type="number"
                    min="0"
                    className="input-control"
                    style={{ paddingRight: '3.5rem', width: '100%' }}
                    value={kmTiers['20_50']}
                    onChange={(e) => setKmTiers({ ...kmTiers, '20_50': e.target.value })}
                    disabled={settings.waiting_charge_enabled === 'false'}
                    placeholder="Mins"
                  />
                  <span style={{ position: 'absolute', right: '12px', fontSize: '0.85rem', color: 'var(--text-muted)', pointerEvents: 'none', fontWeight: 500 }}>Mins</span>
                </div>
              </div>

              <div className="input-group">
                <label style={{ fontSize: '0.9rem', marginBottom: '0.4rem', display: 'block', fontWeight: 500 }}>50 km to 100 km</label>
                <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
                  <input
                    type="number"
                    min="0"
                    className="input-control"
                    style={{ paddingRight: '3.5rem', width: '100%' }}
                    value={kmTiers['50_100']}
                    onChange={(e) => setKmTiers({ ...kmTiers, '50_100': e.target.value })}
                    disabled={settings.waiting_charge_enabled === 'false'}
                    placeholder="Mins"
                  />
                  <span style={{ position: 'absolute', right: '12px', fontSize: '0.85rem', color: 'var(--text-muted)', pointerEvents: 'none', fontWeight: 500 }}>Mins</span>
                </div>
              </div>

              <div className="input-group">
                <label style={{ fontSize: '0.9rem', marginBottom: '0.4rem', display: 'block', fontWeight: 500 }}>100 km Base (100km+)</label>
                <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
                  <input
                    type="number"
                    min="0"
                    className="input-control"
                    style={{ paddingRight: '3.5rem', width: '100%' }}
                    value={kmTiers['100_base']}
                    onChange={(e) => setKmTiers({ ...kmTiers, '100_base': e.target.value })}
                    disabled={settings.waiting_charge_enabled === 'false'}
                    placeholder="Mins"
                  />
                  <span style={{ position: 'absolute', right: '12px', fontSize: '0.85rem', color: 'var(--text-muted)', pointerEvents: 'none', fontWeight: 500 }}>Mins</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* SECTION 4: Driver Commission Configuration */}
        <div className="card">
          <h3 style={{ fontSize: '1.1rem', marginBottom: '1rem', borderBottom: '1px solid var(--border)', paddingBottom: '0.5rem' }}>DRIVER COMMISSION CONFIGURATION</h3>
          <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'flex-start', color: 'var(--text-muted)', fontSize: '0.85rem', marginBottom: '1.5rem' }}>
            <Info size={16} style={{ flexShrink: 0, marginTop: '2px' }} />
            <div>
              <p style={{ marginBottom: '0.5rem' }}>
                Ride commission is based on Short or Long distance type. One Way and Two Way rides do not have separate commission percentages.
              </p>
              <p>
                Tip commission applies only to Paid Subscriptions when enabled. Free Trial rides have no ride commission or tip commission.
              </p>
            </div>
          </div>

          <h4 style={{ fontSize: '1rem', marginBottom: '0.75rem' }}>SHORT RIDES</h4>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1.5rem', marginBottom: '1.5rem', padding: '1rem', backgroundColor: 'rgba(0,0,0,0.02)', borderRadius: '8px' }}>
            <div className="input-group">
              <label>Commission Percentage (%)</label>
              <input 
                type="number" 
                min="0" max="100" step="0.01"
                className="input-control" 
                value={settings.short_ride_commission_percent}
                onChange={(e) => setSettings({...settings, short_ride_commission_percent: e.target.value})}
                required
              />
            </div>
            <div className="input-group">
              <label>Tip Commission (ON/OFF)</label>
              <select 
                className="input-control"
                value={settings.short_ride_tip_commission_enabled}
                onChange={(e) => setSettings({...settings, short_ride_tip_commission_enabled: e.target.value})}
              >
                <option value="true">ON</option>
                <option value="false">OFF</option>
              </select>
            </div>
            <div className="input-group">
              <label>Tip Commission Percentage (%)</label>
              <input 
                type="number" 
                min="0" max="100" step="0.01"
                className="input-control" 
                value={settings.short_ride_tip_commission_percent}
                onChange={(e) => setSettings({...settings, short_ride_tip_commission_percent: e.target.value})}
                required
                disabled={settings.short_ride_tip_commission_enabled === 'false'}
              />
            </div>
          </div>

          <h4 style={{ fontSize: '1rem', marginBottom: '0.75rem' }}>LONG RIDES</h4>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1.5rem', padding: '1rem', backgroundColor: 'rgba(0,0,0,0.02)', borderRadius: '8px' }}>
            <div className="input-group">
              <label>Commission Percentage (%)</label>
              <input 
                type="number" 
                min="0" max="100" step="0.01"
                className="input-control" 
                value={settings.long_ride_commission_percent}
                onChange={(e) => setSettings({...settings, long_ride_commission_percent: e.target.value})}
                required
              />
            </div>
            <div className="input-group">
              <label>Tip Commission (ON/OFF)</label>
              <select 
                className="input-control"
                value={settings.long_ride_tip_commission_enabled}
                onChange={(e) => setSettings({...settings, long_ride_tip_commission_enabled: e.target.value})}
              >
                <option value="true">ON</option>
                <option value="false">OFF</option>
              </select>
            </div>
            <div className="input-group">
              <label>Tip Commission Percentage (%)</label>
              <input 
                type="number" 
                min="0" max="100" step="0.01"
                className="input-control" 
                value={settings.long_ride_tip_commission_percent}
                onChange={(e) => setSettings({...settings, long_ride_tip_commission_percent: e.target.value})}
                required
                disabled={settings.long_ride_tip_commission_enabled === 'false'}
              />
            </div>
          </div>
        </div>

        <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '1rem' }}>
          <button type="submit" className="btn btn-primary" disabled={saving}>
            {saving ? 'Saving...' : (
              <>
                <Save size={18} />
                Save Changes
              </>
            )}
          </button>
        </div>
      </form>
    </div>
  );
}