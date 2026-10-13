import React, { useState, useEffect } from 'react';
import { getApiUrl } from '../../services/apiClient';
import { Search, CheckCircle, XCircle, Landmark, X, List } from 'lucide-react';

const UserWithdrawals = () => {
  const [withdrawals, setWithdrawals] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('All');
  
  // Modals state
  const [selectedBank, setSelectedBank] = useState(null);
  const [selectedUser, setSelectedUser] = useState(null);
  const [userStatusFilter, setUserStatusFilter] = useState('All');

  const fetchWithdrawals = async () => {
    try {
      const token = localStorage.getItem('adminToken');
      const response = await fetch(`${getApiUrl()}/admin/user-withdrawals`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await response.json();
      if (data.success) {
        setWithdrawals(data.data);
        
        if (selectedUser) {
          const updatedUserTransactions = data.data.filter(w => w.user_id === selectedUser.user_id);
          setSelectedUser(prev => ({ ...prev, transactions: updatedUserTransactions }));
        }
      }
    } catch (error) {
      console.error('Failed to fetch withdrawals:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchWithdrawals();
  }, []);

  const handleStatusUpdate = async (id, status) => {
    try {
      const token = localStorage.getItem('adminToken');
      const response = await fetch(`${getApiUrl()}/admin/user-withdrawals/${id}`, {
        method: 'PUT',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ status })
      });
      const data = await response.json();
      if (data.success) {
        fetchWithdrawals();
      } else {
        alert(data.message || 'Failed to update status');
      }
    } catch (error) {
      console.error('Error updating status:', error);
    }
  };

  // Group by user
  const groupedWithdrawals = Object.values(
    withdrawals.reduce((acc, w) => {
      if (!acc[w.user_id]) {
        acc[w.user_id] = {
          user_id: w.user_id,
          user_name: w.user_name || 'N/A',
          user_phone: w.user_phone || 'N/A',
          bank_details: w.bank_details || 'N/A',
          transactions: [],
          total_withdrawn: 0,
          pending_count: 0
        };
      }
      acc[w.user_id].transactions.push(w);
      if (w.status === 'COMPLETED') acc[w.user_id].total_withdrawn += Number(w.amount);
      if (w.status === 'PENDING') acc[w.user_id].pending_count += 1;
      return acc;
    }, {})
  );

  const filteredUsers = groupedWithdrawals.filter(u => {
    const matchesSearch = u.user_name.toLowerCase().includes(searchQuery.toLowerCase()) || 
                          u.user_phone.includes(searchQuery);
    
    let matchesStatus = true;
    if (statusFilter === 'Pending') {
      matchesStatus = u.pending_count > 0;
    } else if (statusFilter === 'Completed' || statusFilter === 'Failed') {
      matchesStatus = u.transactions.some(t => t.status.toLowerCase() === statusFilter.toLowerCase());
    }

    return matchesSearch && matchesStatus;
  });

  const userFilteredTransactions = selectedUser?.transactions.filter(
    w => userStatusFilter === 'All' || w.status.toLowerCase() === userStatusFilter.toLowerCase()
  ) || [];

  return (
    <div className="users-container">
      <div className="flex justify-between items-center" style={{ marginBottom: '2rem' }}>
        <h1 className="page-title" style={{ marginBottom: 0 }}>User Withdrawals</h1>
        <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
          <div className="search-bar" style={{ display: 'flex', alignItems: 'center', backgroundColor: 'var(--surface)', padding: '0.5rem 1rem', borderRadius: '8px', border: '1px solid var(--border)' }}>
            <Search size={18} color="var(--text-muted)" style={{ marginRight: '0.5rem' }} />
            <input 
              type="text" 
              placeholder="Search user..." 
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              style={{ background: 'transparent', border: 'none', color: 'var(--text-main)', outline: 'none', width: '150px' }} 
            />
          </div>
          <div style={{ display: 'flex', gap: '0.5rem' }}>
            {['All', 'Pending', 'Completed', 'Failed'].map(status => (
              <button 
                key={status}
                onClick={() => setStatusFilter(status)}
                style={{
                  padding: '0.5rem 1rem',
                  borderRadius: '8px',
                  border: '1px solid var(--border)',
                  backgroundColor: statusFilter === status ? 'var(--primary)' : 'var(--surface)',
                  color: statusFilter === status ? 'white' : 'var(--text-main)',
                  cursor: 'pointer'
                }}
              >
                {status}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
          <thead style={{ backgroundColor: 'var(--surface-hover)', borderBottom: '1px solid var(--border)' }}>
            <tr>
              <th style={{ padding: '1rem', fontWeight: 500, color: 'var(--text-muted)' }}>User</th>
              <th style={{ padding: '1rem', fontWeight: 500, color: 'var(--text-muted)' }}>Total Withdrawn</th>
              <th style={{ padding: '1rem', fontWeight: 500, color: 'var(--text-muted)' }}>Pending Requests</th>
              <th style={{ padding: '1rem', fontWeight: 500, color: 'var(--text-muted)' }}>Bank Info</th>
              <th style={{ padding: '1rem', fontWeight: 500, color: 'var(--text-muted)' }}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan="5" style={{ padding: '2rem', textAlign: 'center', color: 'var(--text-muted)' }}>Loading users...</td>
              </tr>
            ) : filteredUsers.length === 0 ? (
              <tr>
                <td colSpan="5" style={{ padding: '2rem', textAlign: 'center', color: 'var(--text-muted)' }}>No users found</td>
              </tr>
            ) : (
              filteredUsers.map((u) => (
                <tr key={u.user_id} style={{ borderBottom: '1px solid var(--border)' }}>
                  <td style={{ padding: '1rem' }}>
                    <div style={{ fontWeight: '500' }}>{u.user_name}</div>
                    <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>{u.user_phone}</div>
                  </td>
                  <td style={{ padding: '1rem', fontWeight: 'bold', color: 'var(--success)' }}>₹{u.total_withdrawn}</td>
                  <td style={{ padding: '1rem' }}>
                    {u.pending_count > 0 ? (
                      <span style={{ background: 'rgba(245, 158, 11, 0.1)', color: 'var(--warning)', padding: '0.25rem 0.75rem', borderRadius: '9999px', fontSize: '0.75rem', fontWeight: 600 }}>
                        {u.pending_count} Pending
                      </span>
                    ) : (
                      <span style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>None</span>
                    )}
                  </td>
                  <td style={{ padding: '1rem' }}>
                    <button 
                      onClick={() => setSelectedBank(u)}
                      style={{ display: 'flex', alignItems: 'center', gap: '0.25rem', background: 'var(--surface-hover)', border: '1px solid var(--border)', padding: '0.25rem 0.5rem', borderRadius: '4px', cursor: 'pointer', color: 'var(--text-main)', fontSize: '0.85rem' }}
                    >
                      <Landmark size={14} /> View Bank
                    </button>
                  </td>
                  <td style={{ padding: '1rem' }}>
                    <button 
                      onClick={() => setSelectedUser(u)}
                      style={{ display: 'flex', alignItems: 'center', gap: '0.25rem', background: 'var(--primary)', color: 'white', border: 'none', padding: '0.5rem 1rem', borderRadius: '4px', cursor: 'pointer', fontSize: '0.85rem' }}
                    >
                      <List size={16} /> View Transactions
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Bank Details Modal */}
      {selectedBank && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
          <div className="card" style={{ width: '100%', maxWidth: '400px', margin: '1rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
              <h3 style={{ fontSize: '1.25rem', fontWeight: 'bold' }}>Bank Details</h3>
              <button onClick={() => setSelectedBank(null)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)' }}>
                <X size={20} />
              </button>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <div>
                <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginBottom: '0.25rem' }}>Bank Details Provided by User</div>
                <div style={{ fontWeight: '500' }}>{selectedBank.bank_details}</div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Transactions Modal */}
      {selectedUser && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
          <div className="card" style={{ width: '100%', maxWidth: '800px', margin: '1rem', maxHeight: '90vh', display: 'flex', flexDirection: 'column', padding: 0 }}>
            
            <div style={{ padding: '1.5rem', borderBottom: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <h3 style={{ fontSize: '1.25rem', fontWeight: 'bold' }}>Transactions - {selectedUser.user_name}</h3>
                <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginTop: '0.25rem' }}>{selectedUser.user_phone}</div>
              </div>
              <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
                <div style={{ display: 'flex', gap: '0.5rem' }}>
                  {['All', 'Pending', 'Completed', 'Failed'].map(status => (
                    <button 
                      key={status}
                      onClick={() => setUserStatusFilter(status)}
                      style={{
                        padding: '0.25rem 0.75rem',
                        borderRadius: '4px',
                        border: '1px solid var(--border)',
                        backgroundColor: userStatusFilter === status ? 'var(--primary)' : 'var(--surface)',
                        color: userStatusFilter === status ? 'white' : 'var(--text-main)',
                        cursor: 'pointer',
                        fontSize: '0.85rem'
                      }}
                    >
                      {status}
                    </button>
                  ))}
                </div>
                <button onClick={() => setSelectedUser(null)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)' }}>
                  <X size={24} />
                </button>
              </div>
            </div>

            <div style={{ overflowY: 'auto', padding: '1.5rem' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
                <thead>
                  <tr>
                    <th style={{ padding: '0.75rem', borderBottom: '1px solid var(--border)', color: 'var(--text-muted)', fontWeight: 500 }}>Date</th>
                    <th style={{ padding: '0.75rem', borderBottom: '1px solid var(--border)', color: 'var(--text-muted)', fontWeight: 500 }}>Amount</th>
                    <th style={{ padding: '0.75rem', borderBottom: '1px solid var(--border)', color: 'var(--text-muted)', fontWeight: 500 }}>Status</th>
                    <th style={{ padding: '0.75rem', borderBottom: '1px solid var(--border)', color: 'var(--text-muted)', fontWeight: 500 }}>Action</th>
                  </tr>
                </thead>
                <tbody>
                  {userFilteredTransactions.length === 0 ? (
                    <tr>
                      <td colSpan="4" style={{ padding: '2rem', textAlign: 'center', color: 'var(--text-muted)' }}>No transactions found</td>
                    </tr>
                  ) : (
                    userFilteredTransactions.map(t => (
                      <tr key={t.id} style={{ borderBottom: '1px solid var(--border)' }}>
                        <td style={{ padding: '0.75rem', fontSize: '0.85rem' }}>
                          {new Date(t.created_at).toLocaleString()}
                        </td>
                        <td style={{ padding: '0.75rem', fontWeight: 'bold' }}>₹{t.amount}</td>
                        <td style={{ padding: '0.75rem' }}>
                          <span style={{ 
                            background: t.status === 'COMPLETED' ? 'rgba(34, 197, 94, 0.1)' : t.status === 'FAILED' ? 'rgba(239, 68, 68, 0.1)' : 'rgba(245, 158, 11, 0.1)', 
                            color: t.status === 'COMPLETED' ? 'var(--success)' : t.status === 'FAILED' ? 'var(--danger)' : 'var(--warning)', 
                            padding: '0.25rem 0.5rem', 
                            borderRadius: '4px', 
                            fontSize: '0.75rem', 
                            fontWeight: 600 
                          }}>
                            {t.status}
                          </span>
                        </td>
                        <td style={{ padding: '0.75rem' }}>
                          {t.status === 'PENDING' && (
                            <div style={{ display: 'flex', gap: '0.5rem' }}>
                              <button 
                                onClick={() => handleStatusUpdate(t.id, 'COMPLETED')}
                                style={{ background: 'var(--success)', color: 'white', border: 'none', padding: '0.25rem 0.5rem', borderRadius: '4px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.25rem', fontSize: '0.75rem' }}
                              >
                                <CheckCircle size={14} /> Approve
                              </button>
                              <button 
                                onClick={() => handleStatusUpdate(t.id, 'FAILED')}
                                style={{ background: 'var(--danger)', color: 'white', border: 'none', padding: '0.25rem 0.5rem', borderRadius: '4px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.25rem', fontSize: '0.75rem' }}
                              >
                                <XCircle size={14} /> Reject
                              </button>
                            </div>
                          )}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default UserWithdrawals;
