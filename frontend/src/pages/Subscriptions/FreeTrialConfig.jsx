import React, { useState, useEffect } from 'react';
import adminConfigApi from '../../services/adminConfigApi';
import { Save, Info, AlertCircle } from 'lucide-react';

export default function FreeTrialConfig() {
  const [settings, setSettings] = useState({
    free_trial_enabled: 'false',
    free_trial_duration_days: '7',
    free_trial_short_rides: '5',
    free_trial_long_rides: '2',
    free_trial_one_way_rides: '5',
    free_trial_two_way_rides: '2'
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
      // Merge with default state so inputs are controlled even if backend lacks keys
      setSettings(prev => ({ ...prev, ...(res.data || {}) }));
    } catch (err) {
      setError('Unable to load free trial settings. Please try again.');
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
      await adminConfigApi.updateGlobalSettings({
        free_trial_enabled: settings.free_trial_enabled,
        free_trial_duration_days: settings.free_trial_duration_days,
        free_trial_short_rides: settings.free_trial_short_rides,
        free_trial_long_rides: settings.free_trial_long_rides,
        free_trial_one_way_rides: settings.free_trial_one_way_rides,
        free_trial_two_way_rides: settings.free_trial_two_way_rides
      });
      setSuccess(true);
      setTimeout(() => setSuccess(false), 3000); // Hide success toast after 3s
    } catch (err) {
      setError(err.message || 'Failed to save settings.');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="page-container animate-fade-in">
        <h2 style={{ marginBottom: '0.5rem', color: 'var(--text-main)' }}>Free Trial</h2>
        <p style={{ color: 'var(--text-muted)', marginBottom: '2rem' }}>Configure the free trial entitlement available to eligible drivers.</p>
        <div className="card" style={{ padding: '2rem', textAlign: 'center', color: 'var(--text-muted)' }}>
          Loading settings...
        </div>
      </div>
    );
  }

  return (
    <div className="page-container animate-fade-in">
      <h2 style={{ marginBottom: '0.5rem', color: 'var(--text-main)' }}>Free Trial</h2>
      <p style={{ color: 'var(--text-muted)', marginBottom: '2rem' }}>Configure the free trial entitlement available to eligible drivers.</p>

      {error && (
        <div className="card" style={{ backgroundColor: 'rgba(239, 68, 68, 0.1)', borderColor: 'var(--danger)', color: 'var(--danger)', marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <AlertCircle size={20} />
          {error}
        </div>
      )}

      {success && (
        <div className="card" style={{ backgroundColor: 'rgba(16, 185, 129, 0.1)', borderColor: 'var(--success)', color: 'var(--success)', marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <Save size={20} />
          Settings saved successfully!
        </div>
      )}

      <div className="card" style={{ maxWidth: '800px' }}>
        <form onSubmit={handleSave}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem', paddingBottom: '1rem', borderBottom: '1px solid var(--border)' }}>
            <div>
              <h3 style={{ fontSize: '1.1rem', marginBottom: '0.25rem' }}>Free Trial Status</h3>
              <p style={{ fontSize: '0.875rem', color: 'var(--text-muted)' }}>Enable or disable the free trial program for new drivers.</p>
            </div>
            <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer' }}>
              <input 
                type="checkbox" 
                checked={settings.free_trial_enabled === 'true'} 
                onChange={(e) => setSettings({...settings, free_trial_enabled: e.target.checked ? 'true' : 'false'})}
                style={{ width: '1.25rem', height: '1.25rem', accentColor: 'var(--primary)' }}
              />
              <span style={{ fontWeight: 600, color: settings.free_trial_enabled === 'true' ? 'var(--primary)' : 'var(--text-muted)' }}>
                {settings.free_trial_enabled === 'true' ? 'ON' : 'OFF'}
              </span>
            </label>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1.5rem', marginBottom: '2rem' }}>
            <div className="input-group">
              <label>Trial Duration (Days)</label>
              <input 
                type="number" 
                min="0"
                className="input-control" 
                value={settings.free_trial_duration_days}
                onChange={(e) => setSettings({...settings, free_trial_duration_days: e.target.value})}
                required
              />
            </div>
            
            <div className="input-group">
              <label>Free Short Rides</label>
              <input 
                type="number" 
                min="0"
                className="input-control" 
                value={settings.free_trial_short_rides}
                onChange={(e) => setSettings({...settings, free_trial_short_rides: e.target.value})}
                required
              />
            </div>

            <div className="input-group">
              <label>Free Long Rides</label>
              <input 
                type="number" 
                min="0"
                className="input-control" 
                value={settings.free_trial_long_rides}
                onChange={(e) => setSettings({...settings, free_trial_long_rides: e.target.value})}
                required
              />
            </div>


          </div>

          <div style={{ backgroundColor: 'var(--bg-color)', padding: '1rem', borderRadius: '8px', display: 'flex', gap: '1rem', alignItems: 'flex-start', marginBottom: '2rem' }}>
            <Info size={20} color="var(--primary)" style={{ flexShrink: 0, marginTop: '2px' }} />
            <div>
              <h4 style={{ fontSize: '0.9rem', marginBottom: '0.25rem' }}>Free Trial Entitlements</h4>
              <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>
                Short rides and long rides are tracked separately. Using a long ride must not consume a short ride entitlement. 
                These entitlements apply only once per driver when they first sign up.
              </p>
            </div>
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
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
    </div>
  );
}