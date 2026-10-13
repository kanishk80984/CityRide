import React, { useState, useEffect } from 'react';
import { getApiUrl } from '../../services/apiClient';
import { Search, Eye } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

const Drivers = () => {
  const [driversData, setDriversData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('All');
  const navigate = useNavigate();

  useEffect(() => {
    const fetchDrivers = async () => {
      try {
        const response = await fetch(`${getApiUrl()}/admin/drivers`, { headers: { Authorization: `Bearer ${localStorage.getItem('adminToken')}` }, headers: { Authorization: `Bearer ${localStorage.getItem('adminToken')}` } });
        const data = await response.json();
        if (data.success) {
          setDriversData(data.data);
        }
      } catch (error) {
        console.error('Failed to fetch drivers:', error);
      } finally {
        setLoading(false);
      }
    };
    
    fetchDrivers();
  }, []);

  return (
    <div className="drivers-container">
      <div className="header-actions" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
        <h1 className="page-title" style={{ marginBottom: 0 }}>Drivers Management</h1>
        <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
          <div className="search-bar" style={{ display: 'flex', alignItems: 'center', backgroundColor: 'var(--surface)', padding: '0.5rem 1rem', borderRadius: '8px', border: '1px solid var(--border)' }}>
            <Search size={18} color="var(--text-muted)" style={{ marginRight: '0.5rem' }} />
            <input type="text" placeholder="Search drivers..." style={{ background: 'transparent', border: 'none', color: 'var(--text-main)', outline: 'none' }} />
          </div>
          <button 
            onClick={() => navigate('/drivers/new')}
            style={{ backgroundColor: 'var(--primary)', color: '#fff', border: 'none', padding: '0.5rem 1rem', borderRadius: '8px', fontWeight: 600, cursor: 'pointer' }}
          >
            + Add Driver
          </button>
        </div>
      </div>

      <div style={{ display: 'flex', gap: '1rem', marginBottom: '1.5rem', borderBottom: '1px solid var(--border)' }}>
        {['All', 'PENDING', 'APPROVED', 'REJECTED'].map(tab => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            style={{
              background: 'none',
              border: 'none',
              padding: '0.75rem 1.5rem',
              cursor: 'pointer',
              fontWeight: 600,
              color: activeTab === tab ? 'var(--primary)' : 'var(--text-muted)',
              borderBottom: activeTab === tab ? '3px solid var(--primary)' : '3px solid transparent',
            }}
          >
            {tab === 'All' ? 'All Drivers' : tab.charAt(0) + tab.slice(1).toLowerCase()}
          </button>
        ))}
      </div>

      <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
          <thead style={{ backgroundColor: 'var(--surface-hover)', borderBottom: '1px solid var(--border)' }}>
            <tr>
              <th style={{ padding: '1rem', fontWeight: 500, color: 'var(--text-muted)' }}>Name</th>
              <th style={{ padding: '1rem', fontWeight: 500, color: 'var(--text-muted)' }}>Phone</th>
              <th style={{ padding: '1rem', fontWeight: 500, color: 'var(--text-muted)' }}>Vehicle Type</th>
              <th style={{ padding: '1rem', fontWeight: 500, color: 'var(--text-muted)' }}>License Plate</th>
              <th style={{ padding: '1rem', fontWeight: 500, color: 'var(--text-muted)' }}>KYC Status</th>
              <th style={{ padding: '1rem', fontWeight: 500, color: 'var(--text-muted)' }}>Status</th>
              <th style={{ padding: '1rem', fontWeight: 500, color: 'var(--text-muted)' }}>Rating</th>
              <th style={{ padding: '1rem', fontWeight: 500, color: 'var(--text-muted)' }}>Action</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan="8" style={{ padding: '2rem', textAlign: 'center', color: 'var(--text-muted)' }}>Loading drivers...</td>
              </tr>
            ) : driversData.filter(d => activeTab === 'All' || d.kyc_status === activeTab).length === 0 ? (
              <tr>
                <td colSpan="8" style={{ padding: '2rem', textAlign: 'center', color: 'var(--text-muted)' }}>No drivers found in this category</td>
              </tr>
            ) : (
              driversData
                .filter(driver => activeTab === 'All' || driver.kyc_status === activeTab)
                .map((driver) => {
                const status = driver.is_online ? 'Online' : 'Offline';
                return (
                  <tr key={driver.id} style={{ borderBottom: '1px solid var(--border)' }}>
                    <td style={{ padding: '1rem' }}>{driver.name}</td>
                    <td style={{ padding: '1rem', color: 'var(--text-muted)' }}>{driver.phone}</td>
                    <td style={{ padding: '1rem', color: 'var(--text-muted)' }}>{driver.vehicle_type || '-'}</td>
                    <td style={{ padding: '1rem', fontFamily: 'monospace' }}>{driver.registration_number || '-'}</td>
                    <td style={{ padding: '1rem' }}>
                      <span style={{ 
                        padding: '0.25rem 0.75rem', 
                        borderRadius: '9999px', 
                        fontSize: '0.75rem',
                        fontWeight: 600,
                        backgroundColor: driver.kyc_status === 'APPROVED' ? 'rgba(16, 185, 129, 0.1)' : driver.kyc_status === 'PENDING' ? 'rgba(245, 158, 11, 0.1)' : 'rgba(239, 68, 68, 0.1)',
                        color: driver.kyc_status === 'APPROVED' ? 'var(--success)' : driver.kyc_status === 'PENDING' ? 'var(--warning)' : 'var(--danger)'
                      }}>
                        {driver.kyc_status}
                      </span>
                    </td>
                    <td style={{ padding: '1rem' }}>
                      <span style={{ 
                        padding: '0.25rem 0.75rem', 
                        borderRadius: '9999px', 
                        fontSize: '0.75rem',
                        fontWeight: 600,
                        backgroundColor: status === 'Online' ? 'rgba(16, 185, 129, 0.1)' : 'rgba(148, 163, 184, 0.1)',
                        color: status === 'Online' ? 'var(--success)' : 'var(--text-muted)'
                      }}>
                        {status}
                      </span>
                    </td>
                    <td style={{ padding: '1rem', color: 'var(--warning)' }}>★ {driver.rating}</td>
                    <td style={{ padding: '1rem' }}>
                      <button 
                        onClick={() => navigate(`/drivers/review/${driver.id}`)}
                        style={{ background: 'transparent', border: '1px solid var(--primary)', color: 'var(--primary)', padding: '0.25rem 0.75rem', borderRadius: '4px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.25rem' }}
                      >
                        <Eye size={16} /> Review
                      </button>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default Drivers;
