import React, { useState, useEffect } from 'react';
import { getApiUrl } from '../../services/apiClient';
import { Search, CheckCircle, XCircle, Landmark, X, List } from 'lucide-react';

const Withdrawals = () => {
  const [withdrawals, setWithdrawals] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('All');
  
  // Modals state
  const [selectedBank, setSelectedBank] = useState(null);
  const [selectedDriver, setSelectedDriver] = useState(null);
  const [driverStatusFilter, setDriverStatusFilter] = useState('All');

  const fetchWithdrawals = async () => {
    try {
      const token = localStorage.getItem('adminToken');
      const response = await fetch(`${getApiUrl()}/admin/withdrawals`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await response.json();
      if (data.success) {
        setWithdrawals(data.data);
        
        // Update selected driver transactions if modal is open
        if (selectedDriver) {
          const updatedDriverTransactions = data.data.filter(w => w.driver_id === selectedDriver.driver_id);
          setSelectedDriver(prev => ({ ...prev, transactions: updatedDriverTransactions }));
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
      const response = await fetch(`${getApiUrl()}/admin/withdrawals/${id}`, {
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

  // Group by driver
  const groupedWithdrawals = Object.values(
    withdrawals.reduce((acc, w) => {
      if (!acc[w.driver_id]) {
        acc[w.driver_id] = {
          driver_id: w.driver_id,
          driver_name: w.driver_name,
          driver_phone: w.driver_phone,
          account_name: w.account_name,
          account_number: w.account_number,
          ifsc: w.ifsc,
          transactions: [],
          total_withdrawn: 0,
          pending_count: 0
        };
      }
      acc[w.driver_id].transactions.push(w);
      if (w.status === 'Completed') acc[w.driver_id].total_withdrawn += Number(w.amount);
      if (w.status === 'Pending') acc[w.driver_id].pending_count += 1;
      return acc;
    }, {})
  );

  const filteredDrivers = groupedWithdrawals.filter(d => {
    const matchesSearch = d.driver_name.toLowerCase().includes(searchQuery.toLowerCase()) || 
                          d.driver_phone.includes(searchQuery);
    
    // Status filtering logic for the grouped drivers
    let matchesStatus = true;
    if (statusFilter === 'Pending') {
      matchesStatus = d.pending_count > 0; // Show drivers with at least one pending request
    } else if (statusFilter === 'Completed' || statusFilter === 'Canceled') {
      matchesStatus = d.transactions.some(t => t.status === statusFilter);
    }

    return matchesSearch && matchesStatus;
  });

  const driverFilteredTransactions = selectedDriver?.transactions.filter(
    w => driverStatusFilter === 'All' || w.status === driverStatusFilter
  ) || [];

  return (
    <div className="users-container">
      <div className="flex justify-between items-center" style={{ marginBottom: '2rem' }}>
        <h1 className="page-title" style={{ marginBottom: 0 }}>Driver Withdrawals</h1>
        <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
          <div className="search-bar" style={{ display: 'flex', alignItems: 'center', backgroundColor: 'var(--surface)', padding: '0.5rem 1rem', borderRadius: '8px', border: '1px solid var(--border)' }}>
            <Search size={18} color="var(--text-muted)" style={{ marginRight: '0.5rem' }} />
            <input 
              type="text" 
              placeholder="Search driver..." 
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              style={{ background: 'transparent', border: 'none', color: 'var(--text-main)', outline: 'none', width: '150px' }} 
            />
          </div>
          <div style={{ display: 'flex', gap: '0.5rem' }}>
            {['All', 'Pending', 'Completed', 'Canceled'].map(status => (
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
              <th style={{ padding: '1rem', fontWeight: 500, color: 'var(--text-muted)' }}>Driver</th>
              <th style={{ padding: '1rem', fontWeight: 500, color: 'var(--text-muted)' }}>Total Withdrawn</th>
              <th style={{ padding: '1rem', fontWeight: 500, color: 'var(--text-muted)' }}>Pending Requests</th>
              <th style={{ padding: '1rem', fontWeight: 500, color: 'var(--text-muted)' }}>Bank Info</th>
              <th style={{ padding: '1rem', fontWeight: 500, color: 'var(--text-muted)' }}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan="5" style={{ padding: '2rem', textAlign: 'center', color: 'var(--text-muted)' }}>Loading drivers...</td>
              </tr>
            ) : filteredDrivers.length === 0 ? (
              <tr>
                <td colSpan="5" style={{ padding: '2rem', textAlign: 'center', color: 'var(--text-muted)' }}>No drivers found</td>
              </tr>
            ) : (
              filteredDrivers.map((d) => (
                <tr key={d.driver_id} style={{ borderBottom: '1px solid var(--border)' }}>
                  <td style={{ padding: '1rem' }}>
                    <div style={{ fontWeight: '500' }}>{d.driver_name}</div>
                    <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>{d.driver_phone}</div>
                  </td>
                  <td style={{ padding: '1rem', fontWeight: 'bold', color: 'var(--success)' }}>₹{d.total_withdrawn}</td>
                  <td style={{ padding: '1rem' }}>
                    {d.pending_count > 0 ? (
                      <span style={{ background: 'rgba(245, 158, 11, 0.1)', color: 'var(--warning)', padding: '0.25rem 0.75rem', borderRadius: '9999px', fontSize: '0.75rem', fontWeight: 600 }}>
                        {d.pending_count} Pending
                      </span>
                    ) : (
                      <span style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>None</span>
                    )}
                  </td>
                  <td style={{ padding: '1rem' }}>
                    {d.account_number ? (
                      <button 
                        onClick={() => setSelectedBank(d)}
                        style={{ display: 'flex', alignItems: 'center', gap: '0.25rem', background: 'var(--surface-hover)', border: '1px solid var(--border)', padding: '0.25rem 0.5rem', borderRadius: '4px', cursor: 'pointer', color: 'var(--text-main)', fontSize: '0.85rem' }}
                      >
                        <Landmark size={14} /> View Bank
                      </button>
                    ) : (
                      <span style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>No Data</span>
                    )}
                  </td>
                  <td style={{ padding: '1rem' }}>
                    <button 
                      onClick={() => setSelectedDriver(d)}
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

      {/* Transactions Modal */}
      {selectedDriver && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 900 }}>
          <div style={{ backgroundColor: 'var(--surface)', padding: '2rem', borderRadius: '12px', width: '90%', maxWidth: '800px', maxHeight: '80vh', display: 'flex', flexDirection: 'column', border: '1px solid var(--border)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
              <div>
                <h2 style={{ margin: 0 }}>{selectedDriver.driver_name}'s Transactions</h2>
                <div style={{ color: 'var(--text-muted)', fontSize: '0.9rem', marginTop: '0.25rem' }}>{selectedDriver.driver_phone}</div>
              </div>
              <button onClick={() => setSelectedDriver(null)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)' }}>
                <X size={24} />
              </button>
            </div>

            <div style={{ display: 'flex', gap: '1rem', marginBottom: '1.5rem' }}>
              {['All', 'Pending', 'Completed', 'Canceled'].map(status => (
                <button 
                  key={status}
                  onClick={() => setDriverStatusFilter(status)}
                  style={{
                    padding: '0.5rem 1rem',
                    borderRadius: '8px',
                    border: '1px solid var(--border)',
                    backgroundColor: driverStatusFilter === status ? 'var(--primary)' : 'var(--surface)',
                    color: driverStatusFilter === status ? 'white' : 'var(--text-main)',
                    cursor: 'pointer'
                  }}
                >
                  {status}
                </button>
              ))}
            </div>

            <div style={{ overflowY: 'auto', flex: 1, border: '1px solid var(--border)', borderRadius: '8px' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
                <thead style={{ backgroundColor: 'var(--surface-hover)', position: 'sticky', top: 0 }}>
                  <tr>
                    <th style={{ padding: '1rem', fontWeight: 500, color: 'var(--text-muted)' }}>Amount</th>
                    <th style={{ padding: '1rem', fontWeight: 500, color: 'var(--text-muted)' }}>Date</th>
                    <th style={{ padding: '1rem', fontWeight: 500, color: 'var(--text-muted)' }}>Status</th>
                    <th style={{ padding: '1rem', fontWeight: 500, color: 'var(--text-muted)' }}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {driverFilteredTransactions.length === 0 ? (
                    <tr>
                      <td colSpan="4" style={{ padding: '2rem', textAlign: 'center', color: 'var(--text-muted)' }}>No transactions found</td>
                    </tr>
                  ) : (
                    driverFilteredTransactions.map(w => (
                      <tr key={w.id} style={{ borderBottom: '1px solid var(--border)' }}>
                        <td style={{ padding: '1rem', fontWeight: 'bold' }}>₹{w.amount}</td>
                        <td style={{ padding: '1rem', color: 'var(--text-muted)' }}>{w.date}</td>
                        <td style={{ padding: '1rem' }}>
                          <span style={{ 
                            padding: '0.25rem 0.75rem', 
                            borderRadius: '9999px', 
                            fontSize: '0.75rem',
                            fontWeight: 600,
                            backgroundColor: w.status === 'Completed' ? 'rgba(16, 185, 129, 0.1)' : w.status === 'Pending' ? 'rgba(245, 158, 11, 0.1)' : 'rgba(239, 68, 68, 0.1)',
                            color: w.status === 'Completed' ? 'var(--success)' : w.status === 'Pending' ? 'var(--warning)' : 'var(--danger)',
                          }}>
                            {w.status}
                          </span>
                        </td>
                        <td style={{ padding: '1rem' }}>
                          {w.status === 'Pending' ? (
                            <div style={{ display: 'flex', gap: '0.5rem' }}>
                              <button 
                                onClick={() => handleStatusUpdate(w.id, 'Completed')}
                                style={{ background: 'var(--success)', color: 'white', border: 'none', padding: '0.4rem 0.8rem', borderRadius: '4px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.25rem', fontSize: '0.85rem' }}
                              >
                                <CheckCircle size={14} /> Accept
                              </button>
                              <button 
                                onClick={() => handleStatusUpdate(w.id, 'Canceled')}
                                style={{ background: 'var(--danger)', color: 'white', border: 'none', padding: '0.4rem 0.8rem', borderRadius: '4px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.25rem', fontSize: '0.85rem' }}
                              >
                                <XCircle size={14} /> Reject
                              </button>
                            </div>
                          ) : (
                            <span style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>Resolved</span>
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

      {/* Bank Details Modal */}
      {selectedBank && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.6)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
          <div style={{ backgroundColor: 'var(--surface)', padding: '2rem', borderRadius: '12px', width: '90%', maxWidth: '400px', border: '1px solid var(--border)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
              <h2 style={{ margin: 0, display: 'flex', alignItems: 'center', gap: '0.5rem' }}><Landmark size={20} /> Bank Details</h2>
              <button onClick={() => setSelectedBank(null)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)' }}>
                <X size={20} />
              </button>
            </div>
            
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <div>
                <label style={{ display: 'block', color: 'var(--text-muted)', fontSize: '0.85rem', marginBottom: '0.25rem' }}>Driver Name</label>
                <div style={{ fontWeight: 'bold' }}>{selectedBank.driver_name}</div>
              </div>
              <div>
                <label style={{ display: 'block', color: 'var(--text-muted)', fontSize: '0.85rem', marginBottom: '0.25rem' }}>Account Holder Name</label>
                <div style={{ fontWeight: '500' }}>{selectedBank.account_name}</div>
              </div>
              <div>
                <label style={{ display: 'block', color: 'var(--text-muted)', fontSize: '0.85rem', marginBottom: '0.25rem' }}>Account Number</label>
                <div style={{ fontWeight: '500', fontFamily: 'monospace', fontSize: '1rem', letterSpacing: '1px' }}>{selectedBank.account_number}</div>
              </div>
              <div>
                <label style={{ display: 'block', color: 'var(--text-muted)', fontSize: '0.85rem', marginBottom: '0.25rem' }}>IFSC Code</label>
                <div style={{ fontWeight: '500', fontFamily: 'monospace', fontSize: '1rem', letterSpacing: '1px' }}>{selectedBank.ifsc}</div>
              </div>
            </div>

            <button 
              onClick={() => setSelectedBank(null)}
              style={{ width: '100%', marginTop: '2rem', padding: '0.75rem', background: 'var(--primary)', color: 'white', border: 'none', borderRadius: '8px', cursor: 'pointer', fontWeight: 'bold' }}
            >
              Close
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default Withdrawals;
