import React, { useState, useEffect, useMemo } from 'react';
import adminConfigApi from '../../services/adminConfigApi';
import { History, List, ArrowDownLeft, ArrowUpRight, Filter } from 'lucide-react';
import '../Subscriptions/SubscriptionPlans.css';

export default function WalletTransactions() {
  const [txs, setTxs] = useState([]);
  const [loading, setLoading] = useState(true);
  
  // Client-side filters
  const [typeFilter, setTypeFilter] = useState('ALL'); // ALL, CREDIT, DEBIT
  const [driverFilter, setDriverFilter] = useState('');

  useEffect(() => {
    fetchTransactions();
  }, []);

  const fetchTransactions = async () => {
    try {
      setLoading(true);
      const res = await adminConfigApi.getWalletTransactions();
      setTxs(res.data || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  // Memoized values
  const totalCredits = useMemo(() => txs.filter(t => t.type === 'CREDIT').reduce((acc, t) => acc + Number(t.amount), 0), [txs]);
  const totalDebits = useMemo(() => txs.filter(t => t.type === 'DEBIT').reduce((acc, t) => acc + Number(t.amount), 0), [txs]);
  
  const filteredTxs = useMemo(() => {
    return txs.filter(t => {
      const matchType = typeFilter === 'ALL' || t.type === typeFilter;
      const matchDriver = driverFilter === '' || t.driver_name.toLowerCase().includes(driverFilter.toLowerCase());
      return matchType && matchDriver;
    });
  }, [txs, typeFilter, driverFilter]);

  if (loading && txs.length === 0) {
    return (
      <div className="page-container animate-fade-in">
        <h2 style={{ marginBottom: '0.5rem', color: 'var(--text-main)' }}>Wallet Transactions</h2>
        <p style={{ color: 'var(--text-muted)', marginBottom: '2rem' }}>View driver wallet credits, debits, and adjustment history.</p>
        <div className="card" style={{ padding: '2rem', textAlign: 'center', color: 'var(--text-muted)' }}>
          Loading transactions...
        </div>
      </div>
    );
  }

  return (
    <div className="page-container animate-fade-in">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
        <div>
          <h2 style={{ marginBottom: '0.25rem', color: 'var(--text-main)' }}>Wallet Transactions</h2>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>View driver wallet credits, debits, and adjustment history.</p>
        </div>
      </div>

      <div className="summary-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem', marginBottom: '2rem' }}>
        <div className="card summary-card">
          <h4>Transactions Count</h4>
          <div className="value">{txs.length}</div>
        </div>
        <div className="card summary-card" style={{ borderLeftColor: 'var(--success)' }}>
          <h4>Total Credits</h4>
          <div className="value" style={{ color: 'var(--success)' }}>+₹{totalCredits.toFixed(2)}</div>
        </div>
        <div className="card summary-card" style={{ borderLeftColor: 'var(--danger)' }}>
          <h4>Total Debits</h4>
          <div className="value" style={{ color: 'var(--danger)' }}>-₹{totalDebits.toFixed(2)}</div>
        </div>
      </div>

      <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
        
        {/* Filters */}
        {txs.length > 0 && (
          <div style={{ padding: '1rem 1.5rem', borderBottom: '1px solid var(--border)', display: 'flex', gap: '1rem', alignItems: 'center', flexWrap: 'wrap', backgroundColor: '#f8fafc' }}>
            <Filter size={18} color="var(--text-muted)" />
            <span style={{ fontSize: '0.9rem', fontWeight: 500, color: 'var(--text-muted)' }}>Filters:</span>
            
            <select className="input-control" style={{ padding: '0.5rem', minWidth: '150px' }} value={typeFilter} onChange={e => setTypeFilter(e.target.value)}>
              <option value="ALL">All Types</option>
              <option value="CREDIT">Credits Only</option>
              <option value="DEBIT">Debits Only</option>
            </select>
            
            <input 
              type="text" 
              className="input-control" 
              style={{ padding: '0.5rem', minWidth: '200px' }}
              placeholder="Search driver name..." 
              value={driverFilter}
              onChange={e => setDriverFilter(e.target.value)}
            />
          </div>
        )}

        {txs.length === 0 ? (
          <div className="empty-state">
            <div className="empty-icon"><History size={48} /></div>
            <h3>No Wallet Transactions Found</h3>
            <p>Wallet activity will appear here after credits or debits occur.</p>
          </div>
        ) : filteredTxs.length === 0 ? (
          <div className="empty-state" style={{ padding: '3rem' }}>
            <List size={32} color="var(--text-muted)" style={{ marginBottom: '1rem' }} />
            <h4>No matching transactions</h4>
            <p style={{ fontSize: '0.9rem', color: 'var(--text-muted)' }}>Try adjusting your filters.</p>
          </div>
        ) : (
          <div className="table-responsive">
            <table className="admin-table custom-table">
              <thead>
                <tr>
                  <th>Date</th>
                  <th>Driver</th>
                  <th>Transaction Type</th>
                  <th>Amount</th>
                  <th>Balance Impact</th>
                  <th>Reason</th>
                </tr>
              </thead>
              <tbody>
                {filteredTxs.map(t => {
                  const isCredit = t.type === 'CREDIT';
                  return (
                    <tr key={t.id}>
                      <td style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>
                        {new Date(t.created_at).toLocaleString()}
                      </td>
                      <td style={{ fontWeight: 600 }}>{t.driver_name}</td>
                      <td>
                        <span style={{ 
                          display: 'inline-flex', 
                          alignItems: 'center', 
                          gap: '0.25rem',
                          backgroundColor: isCredit ? 'rgba(16, 185, 129, 0.1)' : 'rgba(239, 68, 68, 0.1)',
                          color: isCredit ? 'var(--success)' : 'var(--danger)',
                          padding: '0.25rem 0.5rem',
                          borderRadius: '4px',
                          fontSize: '0.75rem',
                          fontWeight: 600
                        }}>
                          {isCredit ? <ArrowDownLeft size={14} /> : <ArrowUpRight size={14} />}
                          {t.type}
                        </span>
                      </td>
                      <td style={{ fontWeight: 700 }}>₹{t.amount}</td>
                      <td>
                        <div style={{ fontSize: '0.8rem' }}>
                          <span style={{ color: 'var(--text-muted)' }}>Prev: </span> 
                          ₹{t.previous_balance} 
                          {' → '}
                          <span style={{ color: 'var(--text-main)', fontWeight: 600 }}>₹{t.new_balance}</span>
                        </div>
                      </td>
                      <td>
                        <div style={{ fontSize: '0.85rem', maxWidth: '250px' }}>
                          {t.notes || t.category || '-'}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}