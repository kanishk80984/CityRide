import React, { useState, useEffect, useMemo } from 'react';
import adminConfigApi from '../../services/adminConfigApi';
import { Users, Filter, CheckCircle, Clock } from 'lucide-react';
import './SubscriptionPlans.css';

export default function DriverSubscriptions() {
  const [subs, setSubs] = useState([]);
  const [loading, setLoading] = useState(true);
  
  // Client-side filters
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [driverFilter, setDriverFilter] = useState('');

  useEffect(() => {
    fetchSubs();
  }, []);

  const fetchSubs = async () => {
    try {
      setLoading(true);
      const res = await adminConfigApi.getDriverSubscriptions();
      setSubs(res.data || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  // Calculations for summary cards
  const activeSubs = useMemo(() => subs.filter(s => s.subscription?.status === 'ACTIVE').length, [subs]);
  const expiredSubs = useMemo(() => subs.filter(s => s.subscription?.status === 'EXPIRED').length, [subs]);
  const trialSubs = useMemo(() => subs.filter(s => s.subscription?.type === 'FREE_TRIAL').length, [subs]);

  const filteredSubs = useMemo(() => {
    return subs.filter(s => {
      const matchStatus = statusFilter === 'ALL' || s.subscription?.status === statusFilter || (statusFilter === 'FREE_TRIAL' && s.subscription?.type === 'FREE_TRIAL') || (statusFilter === 'PAID' && s.subscription?.type === 'PAID');
      const matchDriver = driverFilter === '' || s.driver?.name.toLowerCase().includes(driverFilter.toLowerCase()) || s.driver?.phone.includes(driverFilter) || (s.driver?.email && s.driver.email.toLowerCase().includes(driverFilter.toLowerCase()));
      return matchStatus && matchDriver;
    });
  }, [subs, statusFilter, driverFilter]);

  if (loading && subs.length === 0) {
    return (
      <div className="page-container animate-fade-in">
        <h2 style={{ marginBottom: '0.5rem', color: 'var(--text-main)' }}>Driver Subscriptions</h2>
        <p style={{ color: 'var(--text-muted)', marginBottom: '2rem' }}>View driver subscription status, validity, and remaining ride entitlements.</p>
        <div className="card" style={{ padding: '2rem', textAlign: 'center', color: 'var(--text-muted)' }}>
          Loading subscriptions...
        </div>
      </div>
    );
  }

  return (
    <div className="page-container animate-fade-in">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
        <div>
          <h2 style={{ marginBottom: '0.25rem', color: 'var(--text-main)' }}>Driver Subscriptions</h2>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>View driver subscription status, validity, and remaining ride entitlements.</p>
        </div>
      </div>

      <div className="summary-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem', marginBottom: '2rem' }}>
        <div className="card summary-card">
          <h4>Total Drivers</h4>
          <div className="value">{subs.length}</div>
        </div>
        <div className="card summary-card" style={{ borderLeftColor: 'var(--success)' }}>
          <h4>Active Subscriptions</h4>
          <div className="value text-success">{activeSubs}</div>
        </div>
        <div className="card summary-card" style={{ borderLeftColor: 'var(--danger)' }}>
          <h4>Expired</h4>
          <div className="value" style={{ color: 'var(--danger)' }}>{expiredSubs}</div>
        </div>
        <div className="card summary-card" style={{ borderLeftColor: 'var(--warning)' }}>
          <h4>Trial Drivers</h4>
          <div className="value" style={{ color: 'var(--warning)' }}>{trialSubs}</div>
        </div>
      </div>

      <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
        
        {/* Filters */}
        {subs.length > 0 && (
          <div style={{ padding: '1rem 1.5rem', borderBottom: '1px solid var(--border)', display: 'flex', gap: '1rem', alignItems: 'center', flexWrap: 'wrap', backgroundColor: '#f8fafc' }}>
            <Filter size={18} color="var(--text-muted)" />
            <span style={{ fontSize: '0.9rem', fontWeight: 500, color: 'var(--text-muted)' }}>Filters:</span>
            
            <select className="input-control" style={{ padding: '0.5rem', minWidth: '150px' }} value={statusFilter} onChange={e => setStatusFilter(e.target.value)}>
              <option value="ALL">All Statuses</option>
              <option value="ACTIVE">Active</option>
              <option value="EXPIRED">Expired</option>
              <option value="INACTIVE">Inactive</option>
              <option value="FREE_TRIAL">Free Trial Only</option>
              <option value="PAID">Paid Only</option>
            </select>
            
            <input 
              type="text" 
              className="input-control" 
              style={{ padding: '0.5rem', minWidth: '200px' }}
              placeholder="Search driver name, phone, email..." 
              value={driverFilter}
              onChange={e => setDriverFilter(e.target.value)}
            />
          </div>
        )}

        {subs.length === 0 ? (
          <div className="empty-state">
            <div className="empty-icon"><Users size={48} /></div>
            <h3>No Driver Subscriptions</h3>
            <p>Driver subscriptions will appear here when drivers activate a plan.</p>
          </div>
        ) : filteredSubs.length === 0 ? (
          <div className="empty-state" style={{ padding: '3rem' }}>
            <Filter size={32} color="var(--text-muted)" style={{ marginBottom: '1rem' }} />
            <h4>No matching subscriptions</h4>
            <p style={{ fontSize: '0.9rem', color: 'var(--text-muted)' }}>Try adjusting your filters.</p>
          </div>
        ) : (
          <div className="table-responsive">
            <table className="admin-table custom-table">
              <thead>
                <tr>
                  <th>DRIVER</th>
                  <th>SUBSCRIPTION</th>
                  <th>STATUS</th>
                  <th>DATES</th>
                  <th>BENEFITS / COMMISSION</th>
                  <th>WALLET</th>
                </tr>
              </thead>
              <tbody>
                {filteredSubs.map(s => {
                  let statusClass = s.subscription.status.toLowerCase();
                  if (s.subscription.status === 'EXPIRED') statusClass = 'inactive';
                  const isFreeTrial = s.subscription.type === 'FREE_TRIAL';
                  
                  return (
                    <tr key={s.subscription.id}>
                      <td>
                        <div style={{ fontWeight: 600 }}>{s.driver.name}</div>
                        <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>{s.driver.phone}</div>
                        {s.driver.email && <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>{s.driver.email}</div>}
                      </td>
                      <td>
                        <div style={{ fontWeight: 600 }}>{s.subscription.plan_name}</div>
                        <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>{isFreeTrial ? 'Free Trial' : 'Paid Subscription'}</div>
                        {!isFreeTrial && s.subscription.plan_code !== 'N/A' && (
                          <div style={{ fontSize: '0.75rem', color: 'var(--primary)', marginTop: '2px' }}>Code: {s.subscription.plan_code}</div>
                        )}
                      </td>
                      <td>
                        <span className={'status-badge ' + statusClass}>
                          {s.subscription.status}
                        </span>
                      </td>
                      <td>
                        <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '0.25rem', marginBottom: '2px' }}>
                            <CheckCircle size={12} color="var(--success)" /> 
                            Started: {s.subscription.started_at ? new Date(s.subscription.started_at).toLocaleDateString() : '-'}
                          </div>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                            <Clock size={12} color={s.subscription.status === 'EXPIRED' ? 'var(--danger)' : 'var(--text-muted)'} /> 
                            Expires: {s.subscription.expires_at ? new Date(s.subscription.expires_at).toLocaleDateString() : '-'}
                          </div>
                        </div>
                      </td>
                      <td>
                        {isFreeTrial ? (
                          <div style={{ fontSize: '0.85rem' }}>
                            <div style={{ marginBottom: '2px' }}>
                              <span style={{ color: 'var(--primary)', fontWeight: 600, display: 'inline-block', width: '20px' }}>{s.entitlements.short}</span> <span style={{ color: 'var(--text-muted)' }}>Short</span>
                              <span style={{ margin: '0 8px', color: '#e2e8f0' }}>|</span>
                              <span style={{ color: 'var(--warning)', fontWeight: 600, display: 'inline-block', width: '20px' }}>{s.entitlements.long}</span> <span style={{ color: 'var(--text-muted)' }}>Long</span>
                            </div>
                            <div>
                              <span style={{ color: 'var(--success)', fontWeight: 600, display: 'inline-block', width: '20px' }}>{s.entitlements.one_way}</span> <span style={{ color: 'var(--text-muted)' }}>One Way</span>
                              <span style={{ margin: '0 8px', color: '#e2e8f0' }}>|</span>
                              <span style={{ color: 'var(--info, #3b82f6)', fontWeight: 600, display: 'inline-block', width: '20px' }}>{s.entitlements.two_way}</span> <span style={{ color: 'var(--text-muted)' }}>Two Way</span>
                            </div>
                          </div>
                        ) : (
                          <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                            <div style={{ marginBottom: '4px' }}><strong>Short Commission:</strong> {s.commission.short_ride_percent}%</div>
                            <div style={{ marginBottom: '4px' }}><strong>Long Commission:</strong> {s.commission.long_ride_percent}%</div>
                            <div><strong>Tip:</strong> Short {s.commission.short_tip_enabled ? s.commission.short_tip_percent + '% (ON)' : 'OFF'} | Long {s.commission.long_tip_enabled ? s.commission.long_tip_percent + '% (ON)' : 'OFF'}</div>
                          </div>
                        )}
                      </td>
                      <td>
                        <div style={{ fontWeight: 600, color: s.wallet.balance >= 0 ? 'var(--success)' : 'var(--danger)' }}>
                          ₹{Number(s.wallet.balance).toFixed(2)}
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