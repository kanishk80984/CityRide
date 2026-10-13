import React, { useState, useEffect } from 'react';
import adminConfigApi from '../../services/adminConfigApi';
import { Plus, X, Edit, Power, CheckCircle, AlertCircle, Inbox } from 'lucide-react';
import './SubscriptionPlans.css';

export default function SubscriptionPlans() {
  const [plans, setPlans] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [editingPlan, setEditingPlan] = useState(null);
  
  // Modal state
  const [formData, setFormData] = useState(getInitialForm());
  const [saving, setSaving] = useState(false);
  const [modalError, setModalError] = useState('');
  
  // Toasts
  const [toast, setToast] = useState(null); // { type: 'success' | 'error', message: '' }

  function getInitialForm() {
    return {
      name: '',
      code: '',
      description: '',
      price: '',
      validity_days: '',
      free_short_rides: '',
      free_long_rides: '',
      free_one_way_rides: '',
      free_two_way_rides: '',
      status: 'ACTIVE'
    };
  }

  useEffect(() => {
    fetchPlans();
  }, []);

  const fetchPlans = async () => {
    try {
      setLoading(true);
      const res = await adminConfigApi.getSubscriptionPlans();
      setPlans(res.data || []);
    } catch (err) {
      console.error(err);
      showToast('error', 'Unable to load subscription plans.');
    } finally {
      setLoading(false);
    }
  };

  const showToast = (type, message) => {
    setToast({ type, message });
    setTimeout(() => setToast(null), 3000);
  };

  const openCreateModal = () => {
    setEditingPlan(null);
    setFormData(getInitialForm());
    setModalError('');
    setModalOpen(true);
  };

  const openEditModal = (plan) => {
    setEditingPlan(plan);
    setFormData({
      name: plan.name,
      code: plan.code,
      description: plan.description || '',
      price: plan.price,
      validity_days: plan.validity_days,
      free_short_rides: plan.free_short_rides,
      free_long_rides: plan.free_long_rides,
      free_one_way_rides: plan.free_one_way_rides,
      free_two_way_rides: plan.free_two_way_rides,
      status: plan.status
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
    if (name === 'code') {
      setFormData(prev => ({ ...prev, [name]: value.toUpperCase() }));
    } else {
      setFormData(prev => ({ ...prev, [name]: value }));
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setModalError('');

    // Validation
    if (!formData.name.trim()) return setModalError('Plan Name is required');
    if (!formData.code.trim()) return setModalError('Plan Code is required');
    if (Number(formData.price) < 0 || formData.price === '') return setModalError('Valid Price is required');
    if (Number(formData.validity_days) <= 0 || formData.validity_days === '') return setModalError('Validity must be greater than 0');
    
    // Legacy fields default to 0 if empty
    const freeShort = formData.free_short_rides === '' ? 0 : Number(formData.free_short_rides);
    const freeLong = formData.free_long_rides === '' ? 0 : Number(formData.free_long_rides);
    const freeOneWay = formData.free_one_way_rides === '' ? 0 : Number(formData.free_one_way_rides);
    const freeTwoWay = formData.free_two_way_rides === '' ? 0 : Number(formData.free_two_way_rides);

    if (freeShort < 0) return setModalError('Free Short Rides must be 0 or more');
    if (freeLong < 0) return setModalError('Free Long Rides must be 0 or more');
    if (freeOneWay < 0) return setModalError('Free One Way Rides must be 0 or more');
    if (freeTwoWay < 0) return setModalError('Free Two Way Rides must be 0 or more');

    try {
      setSaving(true);
      const payload = {
        name: formData.name.trim(),
        code: formData.code.trim(),
        description: formData.description.trim(),
        price: Number(formData.price),
        validity_days: Number(formData.validity_days),
        free_short_rides: freeShort,
        free_long_rides: freeLong,
        free_one_way_rides: freeOneWay,
        free_two_way_rides: freeTwoWay,
        status: formData.status
      };

      if (editingPlan) {
        await adminConfigApi.updateSubscriptionPlan(editingPlan.id, payload);
        showToast('success', 'Subscription plan updated successfully.');
      } else {
        await adminConfigApi.createSubscriptionPlan(payload);
        showToast('success', 'Subscription plan created successfully.');
      }
      
      closeModal();
      fetchPlans();
    } catch (err) {
      setModalError(err.message || 'Unable to save subscription plan. Please check the entered details.');
    } finally {
      setSaving(false);
    }
  };

  const toggleStatus = async (plan) => {
    const newStatus = plan.status === 'ACTIVE' ? 'INACTIVE' : 'ACTIVE';
    try {
      await adminConfigApi.updateSubscriptionPlanStatus(plan.id, newStatus);
      showToast('success', 'Plan ' + newStatus.toLowerCase() + ' successfully.');
      fetchPlans();
    } catch (err) {
      showToast('error', 'Failed to update plan status.');
    }
  };

  // Calculations for summary cards
  const activePlans = plans.filter(p => p.status === 'ACTIVE').length;
  const totalFreeEntitlements = plans.reduce((acc, p) => acc + p.free_short_rides + p.free_long_rides, 0);

  if (loading && plans.length === 0) {
    return (
      <div className="page-container animate-fade-in">
        <h2 style={{ marginBottom: '0.5rem', color: 'var(--text-main)' }}>Subscription Plans</h2>
        <p style={{ color: 'var(--text-muted)', marginBottom: '2rem' }}>Manage driver subscription plans and free ride entitlements.</p>
        <div className="card" style={{ padding: '2rem', textAlign: 'center', color: 'var(--text-muted)' }}>
          Loading plans...
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
          <h2 style={{ marginBottom: '0.25rem', color: 'var(--text-main)' }}>Subscription Plans</h2>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>Manage driver subscription plans and free ride entitlements.</p>
        </div>
        <button className="btn btn-primary" onClick={openCreateModal}>
          <Plus size={18} />
          Create Plan
        </button>
      </div>

      <div className="summary-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem', marginBottom: '2rem' }}>
        <div className="card summary-card">
          <h4>Total Plans</h4>
          <div className="value">{plans.length}</div>
        </div>
        <div className="card summary-card">
          <h4>Active Plans</h4>
          <div className="value text-success">{activePlans}</div>
        </div>
        <div className="card summary-card">
          <h4>Inactive Plans</h4>
          <div className="value text-muted">{plans.length - activePlans}</div>
        </div>
        <div className="card summary-card">
          <h4>Total Free Rides (Catalog)</h4>
          <div className="value">{totalFreeEntitlements}</div>
        </div>
      </div>

      <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
        {plans.length === 0 ? (
          <div className="empty-state">
            <div className="empty-icon"><Inbox size={48} /></div>
            <h3>No Subscription Plans Yet</h3>
            <p>Create your first driver subscription plan to get started.</p>
            <button className="btn btn-primary" onClick={openCreateModal} style={{ marginTop: '1rem' }}>Create Plan</button>
          </div>
        ) : (
          <div className="table-responsive">
            <table className="admin-table custom-table">
              <thead>
                <tr>
                  <th>Plan Name & Code</th>
                  <th>Price</th>
                  <th>Validity</th>
                  <th>Free Rides</th>
                  <th>Status</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {plans.map(p => (
                  <tr key={p.id}>
                    <td>
                      <div style={{ fontWeight: 600 }}>{p.name}</div>
                      <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginTop: '2px' }}>{p.code}</div>
                    </td>
                    <td style={{ fontWeight: 500 }}>₹{p.price}</td>
                    <td>{p.validity_days} Days</td>
                    <td>
                      <div style={{ fontSize: '0.85rem' }}>
                        <span style={{ color: 'var(--primary)' }}>{p.free_short_rides} Short</span>
                        {' • '}
                        <span style={{ color: 'var(--warning)' }}>{p.free_long_rides} Long</span>
                        <br/>
                        <span style={{ color: 'var(--info)' }}>{p.free_one_way_rides} One Way</span>
                        {' • '}
                        <span style={{ color: 'var(--success)' }}>{p.free_two_way_rides} Two Way</span>
                      </div>
                    </td>
                    <td>
                      <span className={'status-badge ' + p.status.toLowerCase()}>
                        {p.status}
                      </span>
                    </td>
                    <td>
                      <div style={{ display: 'flex', gap: '0.5rem' }}>
                        <button className="action-btn" onClick={() => openEditModal(p)} title="Edit Plan">
                          <Edit size={16} />
                        </button>
                        <button 
                          className={'action-btn ' + (p.status === 'ACTIVE' ? 'danger' : 'success')}
                          onClick={() => toggleStatus(p)}
                          title={p.status === 'ACTIVE' ? 'Deactivate Plan' : 'Activate Plan'}
                        >
                          <Power size={16} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Modal */}
      {modalOpen && (
        <div className="modal-overlay" onClick={closeModal}>
          <div className="modal-content animate-fade-in" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h3>{editingPlan ? 'Edit Subscription Plan' : 'Create Subscription Plan'}</h3>
              <button className="close-btn" onClick={closeModal} disabled={saving}><X size={20} /></button>
            </div>
            
            <div className="modal-body">
              {modalError && (
                <div className="modal-error">
                  <AlertCircle size={18} />
                  <span>{modalError}</span>
                </div>
              )}

              <form id="plan-form" onSubmit={handleSubmit}>
                <div className="form-row">
                  <div className="input-group">
                    <label>Plan Name <span className="req">*</span></label>
                    <input type="text" name="name" className="input-control" value={formData.name} onChange={handleInputChange} placeholder="e.g. Premium Monthly" />
                  </div>
                  <div className="input-group">
                    <label>Plan Code <span className="req">*</span></label>
                    <input type="text" name="code" className="input-control" value={formData.code} onChange={handleInputChange} placeholder="PREMIUM_MONTHLY" />
                  </div>
                </div>

                <div className="input-group">
                  <label>Description</label>
                  <textarea name="description" className="input-control" rows="2" value={formData.description} onChange={handleInputChange} placeholder="Brief description of benefits..." />
                </div>

                <div className="form-row">
                  <div className="input-group">
                    <label>Price (₹) <span className="req">*</span></label>
                    <input type="number" name="price" className="input-control" min="0" step="0.01" value={formData.price} onChange={handleInputChange} />
                  </div>
                  <div className="input-group">
                    <label>Validity (Days) <span className="req">*</span></label>
                    <input type="number" name="validity_days" className="input-control" min="1" value={formData.validity_days} onChange={handleInputChange} />
                  </div>
                </div>

                <div style={{ marginTop: '1.5rem', marginBottom: '1rem', paddingTop: '1rem', borderTop: '1px solid var(--border)' }}>
                  <h4 style={{ fontSize: '0.95rem', color: 'var(--text-main)', marginBottom: '0.5rem' }}>Legacy Ride Entitlements</h4>
                  <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: '1rem' }}>
                    Note: Paid subscriptions now use the percentage commission model. 
                    These ride-count fields are preserved for Free Trial and legacy plans but do not apply to new Paid Subscriptions.
                  </p>
                </div>

                <div className="form-row">
                  <div className="input-group">
                    <label>Free Short Rides</label>
                    <input type="number" name="free_short_rides" className="input-control" min="0" value={formData.free_short_rides} onChange={handleInputChange} />
                  </div>
                  <div className="input-group">
                    <label>Free Long Rides</label>
                    <input type="number" name="free_long_rides" className="input-control" min="0" value={formData.free_long_rides} onChange={handleInputChange} />
                  </div>
                </div>

                <div className="form-row">
                  <div className="input-group">
                    <label>Free One Way Rides</label>
                    <input type="number" name="free_one_way_rides" className="input-control" min="0" value={formData.free_one_way_rides} onChange={handleInputChange} />
                  </div>
                  <div className="input-group">
                    <label>Free Two Way Rides</label>
                    <input type="number" name="free_two_way_rides" className="input-control" min="0" value={formData.free_two_way_rides} onChange={handleInputChange} />
                  </div>
                </div>

                <div className="input-group" style={{ maxWidth: '200px' }}>
                  <label>Status</label>
                  <select name="status" className="input-control" value={formData.status} onChange={handleInputChange}>
                    <option value="ACTIVE">Active</option>
                    <option value="INACTIVE">Inactive</option>
                  </select>
                </div>
              </form>
            </div>
            
            <div className="modal-footer">
              <button className="btn btn-outline" onClick={closeModal} disabled={saving}>Cancel</button>
              <button form="plan-form" type="submit" className="btn btn-primary" disabled={saving}>
                {saving ? 'Saving...' : editingPlan ? 'Save Changes' : 'Create Plan'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}