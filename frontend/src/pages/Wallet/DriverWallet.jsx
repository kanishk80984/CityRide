import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import adminConfigApi from '../../services/adminConfigApi';
import { Plus, X, AlertCircle, CheckCircle, Wallet, History, Users } from 'lucide-react';
import '../Subscriptions/SubscriptionPlans.css'; // Reuse CSS for modal/toasts

export default function DriverWallet() {
  const [wallets, setWallets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  
  // Modal state
  const [formData, setFormData] = useState({
    driver_id: '',
    type: 'CREDIT',
    amount: '',
    notes: ''
  });
  const [saving, setSaving] = useState(false);
  const [modalError, setModalError] = useState('');
  
  const [toast, setToast] = useState(null);
  const navigate = useNavigate();

  useEffect(() => {
    fetchWallets();
  }, []);

  const fetchWallets = async () => {
    try {
      setLoading(true);
      const res = await adminConfigApi.getDriverWallets();
      setWallets(res.data || []);
    } catch (err) {
      showToast('error', 'Unable to load wallets.');
    } finally {
      setLoading(false);
    }
  };

  const showToast = (type, message) => {
    setToast({ type, message });
    setTimeout(() => setToast(null), 3000);
  };

  const openModal = () => {
    setFormData({
      driver_id: wallets.length > 0 ? wallets[0].driver_id : '',
      type: 'CREDIT',
      amount: '',
      notes: ''
    });
    setModalError('');
    setModalOpen(true);
  };

  const closeModal = () => {
    if (saving) return;
    setModalOpen(false);
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setModalError('');

    if (!formData.driver_id) return setModalError('Driver is required');
    if (!formData.type) return setModalError('Adjustment Type is required');
    if (Number(formData.amount) <= 0 || formData.amount === '') return setModalError('Amount must be greater than 0');
    if (!formData.notes.trim()) return setModalError('Reason is required');

    try {
      setSaving(true);
      const payload = {
        driver_id: Number(formData.driver_id),
        type: formData.type,
        amount: Number(formData.amount),
        notes: formData.notes.trim()
      };

      await adminConfigApi.adjustDriverWallet(payload);
      closeModal();
      showToast('success', 'Wallet adjusted successfully.');
      fetchWallets();
      
      // Navigate to transactions after 1.5s to show the result
      setTimeout(() => navigate('/wallet/transactions'), 1500);
    } catch (err) {
      setModalError(err.message || 'Unable to adjust wallet. Please check the details and try again.');
    } finally {
      setSaving(false);
    }
  };

  // Calculations for summary cards
  const totalBalance = wallets.reduce((acc, w) => acc + Number(w.balance), 0);
  const positiveWallets = wallets.filter(w => Number(w.balance) > 0).length;
  const negativeWallets = wallets.filter(w => Number(w.balance) < 0).length;
  const zeroWallets = wallets.filter(w => Number(w.balance) === 0).length;

  // Selected wallet preview
  const selectedWallet = wallets.find(w => w.driver_id === Number(formData.driver_id));
  const currentBalance = selectedWallet ? Number(selectedWallet.balance) : 0;
  const adjustmentAmount = Number(formData.amount) || 0;
  const newBalance = formData.type === 'CREDIT' ? currentBalance + adjustmentAmount : currentBalance - adjustmentAmount;

  if (loading && wallets.length === 0) {
    return (
      <div className="page-container animate-fade-in">
        <h2 style={{ marginBottom: '0.5rem', color: 'var(--text-main)' }}>Driver Wallet</h2>
        <p style={{ color: 'var(--text-muted)', marginBottom: '2rem' }}>Manage driver wallet balances and manual wallet adjustments.</p>
        <div className="card" style={{ padding: '2rem', textAlign: 'center', color: 'var(--text-muted)' }}>
          Loading wallets...
        </div>
      </div>
    );
  }

  return (
    <div className="page-container animate-fade-in">
      {toast && (
        <div className={'toast-notification ' + toast.type}>
          {toast.type === 'success' ? <CheckCircle size={20} /> : <AlertCircle size={20} />}
          <span>{toast.message}</span>
        </div>
      )}

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
        <div>
          <h2 style={{ marginBottom: '0.25rem', color: 'var(--text-main)' }}>Driver Wallet</h2>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>Manage driver wallet balances and manual wallet adjustments.</p>
        </div>
        <button className="btn btn-primary" onClick={openModal}>
          <Plus size={18} />
          Adjust Wallet
        </button>
      </div>

      <div className="summary-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem', marginBottom: '2rem' }}>
        <div className="card summary-card" style={{ borderLeftColor: totalBalance >= 0 ? 'var(--success)' : 'var(--danger)' }}>
          <h4>Total Wallet Balance</h4>
          <div className="value" style={{ color: totalBalance >= 0 ? 'var(--success)' : 'var(--danger)' }}>
            {totalBalance >= 0 ? '+' : '-'}₹{Math.abs(totalBalance).toFixed(2)}
          </div>
        </div>
        <div className="card summary-card" style={{ borderLeftColor: 'var(--success)' }}>
          <h4>Positive Balances</h4>
          <div className="value text-success">{positiveWallets}</div>
        </div>
        <div className="card summary-card" style={{ borderLeftColor: 'var(--danger)' }}>
          <h4>Negative Balances</h4>
          <div className="value" style={{ color: 'var(--danger)' }}>{negativeWallets}</div>
        </div>
        <div className="card summary-card" style={{ borderLeftColor: 'var(--text-muted)' }}>
          <h4>Zero Balance</h4>
          <div className="value text-muted">{zeroWallets}</div>
        </div>
      </div>

      <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
        {wallets.length === 0 ? (
          <div className="empty-state">
            <div className="empty-icon"><Wallet size={48} /></div>
            <h3>No Driver Wallets Found</h3>
            <p>Driver wallets will appear here when wallet accounts are created.</p>
            <button className="btn btn-primary" onClick={openModal} style={{ marginTop: '1rem' }}>Adjust Wallet</button>
          </div>
        ) : (
          <div className="table-responsive">
            <table className="admin-table custom-table">
              <thead>
                <tr>
                  <th>Driver</th>
                  <th>Driver ID</th>
                  <th>Current Balance</th>
                  <th>Status</th>
                  <th>Last Transaction</th>
                </tr>
              </thead>
              <tbody>
                {wallets.map(w => {
                  const bal = Number(w.balance);
                  let balColor = 'var(--text-main)';
                  if (bal > 0) balColor = 'var(--success)';
                  if (bal < 0) balColor = 'var(--danger)';

                  return (
                    <tr key={w.id}>
                      <td style={{ fontWeight: 600 }}>{w.driver_name}</td>
                      <td style={{ color: 'var(--text-muted)' }}>#{w.driver_id}</td>
                      <td style={{ fontWeight: 700, color: balColor }}>
                        {bal > 0 ? '+' : ''}₹{bal.toFixed(2)}
                      </td>
                      <td>
                        <span className={'status-badge ' + w.status.toLowerCase()}>
                          {w.status}
                        </span>
                      </td>
                      <td style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>
                        {w.last_transaction_date ? new Date(w.last_transaction_date).toLocaleString() : 'No transactions'}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Adjust Wallet Modal */}
      {modalOpen && (
        <div className="modal-overlay" onClick={closeModal}>
          <div className="modal-content animate-fade-in" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h3>Adjust Driver Wallet</h3>
              <button className="close-btn" onClick={closeModal} disabled={saving}><X size={20} /></button>
            </div>
            
            <div className="modal-body">
              {modalError && (
                <div className="modal-error">
                  <AlertCircle size={18} />
                  <span>{modalError}</span>
                </div>
              )}

              {wallets.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '2rem 1rem', color: 'var(--text-muted)' }}>
                  <Users size={32} style={{ marginBottom: '1rem', opacity: 0.5 }} />
                  <h4>No driver wallets are available.</h4>
                  <p style={{ fontSize: '0.9rem', marginTop: '0.5rem' }}>A driver wallet must exist before it can be adjusted.</p>
                </div>
              ) : (
                <form id="wallet-form" onSubmit={handleSubmit}>
                  <div className="input-group">
                    <label>Driver <span className="req">*</span></label>
                    <select name="driver_id" className="input-control" value={formData.driver_id} onChange={handleInputChange} required>
                      <option value="" disabled>Select a driver</option>
                      {wallets.map(w => (
                        <option key={w.id} value={w.driver_id}>{w.driver_name} (ID: #{w.driver_id})</option>
                      ))}
                    </select>
                  </div>

                  <div className="form-row">
                    <div className="input-group">
                      <label>Adjustment Type <span className="req">*</span></label>
                      <select name="type" className="input-control" value={formData.type} onChange={handleInputChange}>
                        <option value="CREDIT">Credit (+)</option>
                        <option value="DEBIT">Debit (-)</option>
                      </select>
                    </div>
                    <div className="input-group">
                      <label>Amount (₹) <span className="req">*</span></label>
                      <input type="number" name="amount" className="input-control" min="1" step="0.01" value={formData.amount} onChange={handleInputChange} required />
                    </div>
                  </div>

                  <div className="input-group">
                    <label>Reason <span className="req">*</span></label>
                    <textarea name="notes" className="input-control" rows="2" value={formData.notes} onChange={handleInputChange} placeholder="e.g. Promotional credit, manual correction..." required />
                  </div>

                  {formData.driver_id && (
                    <div style={{ backgroundColor: '#f8fafc', padding: '1rem', borderRadius: '8px', border: '1px solid var(--border)', marginTop: '1.5rem' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem', fontSize: '0.9rem' }}>
                        <span style={{ color: 'var(--text-muted)' }}>Current Balance</span>
                        <span style={{ fontWeight: 600 }}>₹{currentBalance.toFixed(2)}</span>
                      </div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem', fontSize: '0.9rem' }}>
                        <span style={{ color: 'var(--text-muted)' }}>Adjustment</span>
                        <span style={{ fontWeight: 600, color: formData.type === 'CREDIT' ? 'var(--success)' : 'var(--danger)' }}>
                          {formData.type === 'CREDIT' ? '+' : '-'}₹{adjustmentAmount.toFixed(2)}
                        </span>
                      </div>
                      <div style={{ height: '1px', backgroundColor: 'var(--border)', margin: '0.5rem 0' }} />
                      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '1.05rem' }}>
                        <span style={{ fontWeight: 600 }}>New Balance Preview</span>
                        <span style={{ fontWeight: 700, color: newBalance >= 0 ? (newBalance > 0 ? 'var(--success)' : 'var(--text-main)') : 'var(--danger)' }}>
                          {newBalance > 0 ? '+' : ''}₹{newBalance.toFixed(2)}
                        </span>
                      </div>
                    </div>
                  )}
                </form>
              )}
            </div>
            
            <div className="modal-footer">
              <button className="btn btn-outline" onClick={closeModal} disabled={saving}>Cancel</button>
              {wallets.length > 0 && (
                <button form="wallet-form" type="submit" className="btn btn-primary" disabled={saving}>
                  {saving ? 'Adjusting...' : 'Adjust Wallet'}
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}