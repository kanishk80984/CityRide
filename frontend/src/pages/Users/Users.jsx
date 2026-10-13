import React, { useState, useEffect } from 'react';
import { getApiUrl } from '../../services/apiClient';
import { Search, X, Eye } from 'lucide-react';

const Users = () => {
  const [usersData, setUsersData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedUser, setSelectedUser] = useState(null);

  useEffect(() => {
    const fetchUsers = async () => {
      try {
        const response = await fetch(`${getApiUrl()}/admin/users`, { headers: { Authorization: `Bearer ${localStorage.getItem('adminToken')}` } });
        const data = await response.json();
        if (data.success) {
          setUsersData(data.data);
        }
      } catch (error) {
        console.error('Failed to fetch users:', error);
      } finally {
        setLoading(false);
      }
    };
    
    fetchUsers();
  }, []);

  const parseEmergencyContacts = (str) => {
    if (!str) return [];
    try {
      const parsed = JSON.parse(str);
      if (Array.isArray(parsed)) return parsed;
    } catch (e) {
      const parts = str.split(',');
      return parts.map((phone, i) => ({ name: '', phone: phone || '' }));
    }
    return [];
  };

  const renderModal = () => {
    if (!selectedUser) return null;
    
    const emergencyContacts = parseEmergencyContacts(selectedUser.emergency_contact);
    let nomineeDetails = null;
    try {
      nomineeDetails = selectedUser.nominee_details ? JSON.parse(selectedUser.nominee_details) : null;
    } catch (e) {
      console.error("Failed to parse nominee details");
    }

    return (
      <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.5)', zIndex: 1000, display: 'flex', justifyContent: 'center', alignItems: 'center', padding: '2rem' }}>
        <div style={{ backgroundColor: 'var(--surface)', padding: '2rem', borderRadius: '12px', width: '100%', maxWidth: '600px', maxHeight: '90vh', overflowY: 'auto', position: 'relative' }}>
          <button onClick={() => setSelectedUser(null)} style={{ position: 'absolute', top: '1rem', right: '1rem', background: 'transparent', border: 'none', cursor: 'pointer', color: 'var(--text-main)' }}>
            <X size={24} />
          </button>
          
          <h2 style={{ marginBottom: '1.5rem', color: 'var(--text-main)' }}>User Details: {selectedUser.name}</h2>
          
          <h3 style={{ borderBottom: '1px solid var(--border)', paddingBottom: '0.5rem', marginBottom: '1rem', color: 'var(--text-main)' }}>Emergency Contacts</h3>
          {emergencyContacts.length > 0 && emergencyContacts.some(c => c.phone) ? (
            emergencyContacts.map((contact, idx) => (
              contact.phone ? (
                <div key={idx} style={{ marginBottom: '0.5rem', padding: '0.5rem', backgroundColor: 'var(--bg-main)', borderRadius: '6px' }}>
                  <div style={{ fontWeight: 'bold', color: 'var(--text-main)' }}>{contact.name || `Contact ${idx + 1}`}</div>
                  <div style={{ color: 'var(--text-muted)' }}>{contact.phone}</div>
                </div>
              ) : null
            ))
          ) : (
            <p style={{ color: 'var(--text-muted)', marginBottom: '1.5rem' }}>No emergency contacts provided.</p>
          )}

          <h3 style={{ borderBottom: '1px solid var(--border)', paddingBottom: '0.5rem', marginTop: '2rem', marginBottom: '1rem', color: 'var(--text-main)' }}>Nominee Details</h3>
          {nomineeDetails ? (
            <div style={{ display: 'grid', gap: '1rem' }}>
              <div><strong style={{color: 'var(--text-main)'}}>Name:</strong> <span style={{color: 'var(--text-muted)'}}>{nomineeDetails.name}</span></div>
              <div><strong style={{color: 'var(--text-main)'}}>Phone:</strong> <span style={{color: 'var(--text-muted)'}}>{nomineeDetails.phone}</span></div>
              <div><strong style={{color: 'var(--text-main)'}}>Address:</strong> <span style={{color: 'var(--text-muted)'}}>{nomineeDetails.address}</span></div>
              <div><strong style={{color: 'var(--text-main)'}}>Aadhar Number:</strong> <span style={{color: 'var(--text-muted)'}}>{nomineeDetails.aadhar_number}</span></div>
              
              <div style={{ display: 'flex', gap: '1rem', marginTop: '1rem' }}>
                {nomineeDetails.aadhar_front_image && (
                  <div style={{ flex: 1 }}>
                    <div style={{ marginBottom: '0.5rem', fontWeight: 'bold', color: 'var(--text-main)', textAlign: 'center' }}>Aadhar Front</div>
                    <img src={nomineeDetails.aadhar_front_image} alt="Aadhar Front" style={{ width: '100%', borderRadius: '8px', border: '1px solid var(--border)', objectFit: 'contain', backgroundColor: '#f0f0f0' }} />
                  </div>
                )}
                {nomineeDetails.aadhar_back_image && (
                  <div style={{ flex: 1 }}>
                    <div style={{ marginBottom: '0.5rem', fontWeight: 'bold', color: 'var(--text-main)', textAlign: 'center' }}>Aadhar Back</div>
                    <img src={nomineeDetails.aadhar_back_image} alt="Aadhar Back" style={{ width: '100%', borderRadius: '8px', border: '1px solid var(--border)', objectFit: 'contain', backgroundColor: '#f0f0f0' }} />
                  </div>
                )}
              </div>
            </div>
          ) : (
            <p style={{ color: 'var(--text-muted)' }}>No nominee details provided.</p>
          )}
        </div>
      </div>
    );
  };

  return (
    <div className="users-container">
      <div className="flex justify-between items-center" style={{ marginBottom: '2rem' }}>
        <h1 className="page-title" style={{ marginBottom: 0 }}>Users Management</h1>
        <div className="search-bar" style={{ display: 'flex', alignItems: 'center', backgroundColor: 'var(--surface)', padding: '0.5rem 1rem', borderRadius: '8px', border: '1px solid var(--border)' }}>
          <Search size={18} color="var(--text-muted)" style={{ marginRight: '0.5rem' }} />
          <input type="text" placeholder="Search users..." style={{ background: 'transparent', border: 'none', color: 'var(--text-main)', outline: 'none' }} />
        </div>
      </div>

      <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
          <thead style={{ backgroundColor: 'var(--surface-hover)', borderBottom: '1px solid var(--border)' }}>
            <tr>
              <th style={{ padding: '1rem', fontWeight: 500, color: 'var(--text-muted)' }}>Name</th>
              <th style={{ padding: '1rem', fontWeight: 500, color: 'var(--text-muted)' }}>Email</th>
              <th style={{ padding: '1rem', fontWeight: 500, color: 'var(--text-muted)' }}>Phone</th>
              <th style={{ padding: '1rem', fontWeight: 500, color: 'var(--text-muted)' }}>Status</th>
              <th style={{ padding: '1rem', fontWeight: 500, color: 'var(--text-muted)' }}>Joined Date</th>
              <th style={{ padding: '1rem', fontWeight: 500, color: 'var(--text-muted)', textAlign: 'center' }}>User Details</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan="6" style={{ padding: '2rem', textAlign: 'center', color: 'var(--text-muted)' }}>Loading users...</td>
              </tr>
            ) : usersData.length === 0 ? (
              <tr>
                <td colSpan="6" style={{ padding: '2rem', textAlign: 'center', color: 'var(--text-muted)' }}>No users found</td>
              </tr>
            ) : (
              usersData.map((user) => (
                <tr key={user.id} style={{ borderBottom: '1px solid var(--border)' }}>
                  <td style={{ padding: '1rem' }}>{user.name}</td>
                  <td style={{ padding: '1rem', color: 'var(--text-muted)' }}>{user.email || 'N/A'}</td>
                  <td style={{ padding: '1rem', color: 'var(--text-muted)' }}>{user.phone}</td>
                  <td style={{ padding: '1rem' }}>
                    <span style={{ 
                      padding: '0.25rem 0.75rem', 
                      borderRadius: '9999px', 
                      fontSize: '0.75rem',
                      fontWeight: 600,
                      backgroundColor: user.status === 'ACTIVE' ? 'rgba(16, 185, 129, 0.1)' : 'rgba(239, 68, 68, 0.1)',
                      color: user.status === 'ACTIVE' ? 'var(--success)' : 'var(--danger)',
                      textTransform: 'capitalize'
                    }}>
                      {user.status.toLowerCase()}
                    </span>
                  </td>
                  <td style={{ padding: '1rem', color: 'var(--text-muted)' }}>{new Date(user.created_at).toLocaleDateString()}</td>
                  <td style={{ padding: '1rem', textAlign: 'center' }}>
                    <button 
                      onClick={() => setSelectedUser(user)}
                      style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '0.5rem',
                        padding: '0.5rem 1rem',
                        backgroundColor: 'var(--primary)',
                        color: 'var(--bg-main)',
                        border: 'none',
                        borderRadius: '6px',
                        cursor: 'pointer',
                        fontWeight: '600',
                        fontSize: '0.875rem'
                      }}
                    >
                      <Eye size={16} /> View
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
      
      {renderModal()}
    </div>
  );
};

export default Users;
