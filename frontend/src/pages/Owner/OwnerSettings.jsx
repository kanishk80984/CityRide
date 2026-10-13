import React, { useState, useEffect } from 'react';
import { getApiUrl } from '../../services/apiClient';
import '../Dashboard/Dashboard.css';

const OwnerSettings = () => {
  const [formData, setFormData] = useState({ client_id: '', client_secret: '', phone_number: '' });
  const [hasSecret, setHasSecret] = useState(false);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState({ text: '', type: '' });
  const [showSecret, setShowSecret] = useState(false);

  useEffect(() => {
    fetchSettings();
  }, []);

  const fetchSettings = async () => {
    try {
      const token = localStorage.getItem('ownerToken');
      const res = await fetch(`${getApiUrl()}/owner/settings`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await res.json();
      if (data.success) {
        setFormData({
          client_id: data.data.client_id,
          phone_number: data.data.phone_number,
          client_secret: '' // clear secret
        });
        setHasSecret(data.data.has_secret);
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleSave = async (e) => {
    e.preventDefault();
    setLoading(true);
    setMessage({ text: '', type: '' });

    try {
      const token = localStorage.getItem('ownerToken');
      const res = await fetch(`${getApiUrl()}/owner/settings`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(formData)
      });
      const data = await res.json();
      if (data.success) {
        setMessage({ text: 'Settings updated successfully', type: 'success' });
        fetchSettings(); // re-fetch to update has_secret state
      } else {
        setMessage({ text: data.message || 'Update failed', type: 'error' });
      }
    } catch (err) {
      setMessage({ text: err.message, type: 'error' });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="dashboard-container animate-fade-in">
      <div className="dashboard-header">
        <h1>Owner Settings</h1>
        <p>Manage your client credentials for driver integration</p>
      </div>

      <div style={{ background: '#fff', padding: '2rem', borderRadius: '12px', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.1)' }}>
        <h2 style={{ marginBottom: '1.5rem', color: '#1e293b' }}>CLIENT CREDENTIALS</h2>
        
        {message.text && (
          <div style={{
            padding: '1rem', 
            marginBottom: '1rem', 
            borderRadius: '8px', 
            backgroundColor: message.type === 'success' ? '#dcfce7' : '#fee2e2',
            color: message.type === 'success' ? '#166534' : '#991b1b'
          }}>
            {message.text}
          </div>
        )}

        <form onSubmit={handleSave} style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem', maxWidth: '500px' }}>
          <div>
            <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '500', color: '#475569' }}>Client ID</label>
            <input 
              type="text" 
              required
              value={formData.client_id}
              onChange={(e) => setFormData({...formData, client_id: e.target.value})}
              style={{ width: '100%', padding: '0.75rem', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '1rem' }}
              placeholder="e.g. EAGLE-OWNER-001"
            />
          </div>

          <div>
            <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '500', color: '#475569' }}>Client Secret</label>
            <div style={{ display: 'flex', position: 'relative' }}>
              <input 
                type={showSecret ? "text" : "password"}
                required={!hasSecret}
                value={formData.client_secret}
                onChange={(e) => setFormData({...formData, client_secret: e.target.value})}
                style={{ width: '100%', padding: '0.75rem', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '1rem' }}
                placeholder={hasSecret ? "•••••••••••••• (Leave blank to keep current)" : "Enter a strong secret"}
              />
              <button 
                type="button" 
                onClick={() => setShowSecret(!showSecret)}
                style={{ position: 'absolute', right: '10px', top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: '#64748b' }}
              >
                {showSecret ? 'Hide' : 'Show'}
              </button>
            </div>
            {hasSecret && !formData.client_secret && (
              <small style={{ color: '#64748b', display: 'block', marginTop: '0.25rem' }}>A secret is securely stored. Enter a new one only if you want to change it.</small>
            )}
          </div>

          <div>
            <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '500', color: '#475569' }}>Owner Phone Number</label>
            <input 
              type="text" 
              required
              value={formData.phone_number}
              onChange={(e) => setFormData({...formData, phone_number: e.target.value})}
              style={{ width: '100%', padding: '0.75rem', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '1rem' }}
              placeholder="+91XXXXXXXXXX"
            />
          </div>

          <button 
            type="submit" 
            disabled={loading}
            style={{ 
              padding: '0.75rem 1.5rem', 
              backgroundColor: '#4f46e5', 
              color: '#fff', 
              border: 'none', 
              borderRadius: '8px', 
              fontSize: '1rem', 
              fontWeight: '600',
              cursor: loading ? 'not-allowed' : 'pointer',
              opacity: loading ? 0.7 : 1,
              marginTop: '1rem'
            }}
          >
            {loading ? 'Saving...' : (hasSecret ? 'Update Credentials' : 'Save Credentials')}
          </button>
        </form>
      </div>
    </div>
  );
};

export default OwnerSettings;
