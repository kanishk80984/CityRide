import React, { useState, useEffect } from 'react';
import { getApiUrl, getUploadsUrl } from '../../services/apiClient';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, CheckCircle, XCircle } from 'lucide-react';

const API_URL = getApiUrl();
const UPLOADS_URL = getUploadsUrl();

const DriverReview = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [driver, setDriver] = useState(null);
  const [loading, setLoading] = useState(true);
  const [rejectReason, setRejectReason] = useState('');
  const [showRejectInput, setShowRejectInput] = useState(false);

  useEffect(() => {
    const fetchDriverDetails = async () => {
      try {
        const response = await fetch(`${API_URL}/admin/driver/${id}`, {
          headers: { Authorization: `Bearer ${localStorage.getItem('adminToken')}` }
        });
        const data = await response.json();
        if (data.success) {
          setDriver(data.data);
        }
      } catch (error) {
        console.error('Error fetching driver:', error);
      } finally {
        setLoading(false);
      }
    };
    fetchDriverDetails();
  }, [id]);

  const handleApprove = async () => {
    try {
      const response = await fetch(`${API_URL}/admin/driver/${id}/approve`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${localStorage.getItem('adminToken')}` }
      });
      if (response.ok) {
        alert('Driver Approved Successfully!');
        navigate('/drivers');
      }
    } catch (error) {
      console.error('Error approving:', error);
    }
  };

  const handleReject = async () => {
    if (!rejectReason) {
      alert('Please provide a reason for rejection.');
      return;
    }
    try {
      const response = await fetch(`${API_URL}/admin/driver/${id}/reject`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${localStorage.getItem('adminToken')}` },
        body: JSON.stringify({ reason: rejectReason }),
      });
      if (response.ok) {
        alert('Driver Rejected');
        navigate('/drivers');
      }
    } catch (error) {
      console.error('Error rejecting:', error);
    }
  };

  if (loading) return <div style={{ padding: '2rem' }}>Loading driver details...</div>;
  if (!driver) return <div style={{ padding: '2rem' }}>Driver not found.</div>;

  const getImageUrl = (filename) => {
    if (!filename) return null;
    return `${UPLOADS_URL}/${filename}`;
  };

  const renderPhoto = (filename, label) => {
    const url = getImageUrl(filename);
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', flex: '1 1 300px' }}>
        <span style={{ fontWeight: 600, color: 'var(--text-main)' }}>{label}</span>
        {url ? (
          <div style={{ height: '200px', backgroundColor: 'var(--surface-hover)', borderRadius: '8px', overflow: 'hidden', border: '1px solid var(--border)' }}>
            <img src={url} alt={label} style={{ width: '100%', height: '100%', objectFit: 'contain' }} />
          </div>
        ) : (
          <div style={{ height: '200px', backgroundColor: 'var(--surface-hover)', borderRadius: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-muted)', border: '1px dashed var(--border)' }}>
            No image uploaded
          </div>
        )}
      </div>
    );
  };

  return (
    <div style={{ paddingBottom: '3rem' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '2rem' }}>
        <button 
          onClick={() => navigate('/drivers')}
          style={{ background: 'transparent', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', color: 'var(--text-muted)' }}
        >
          <ArrowLeft size={24} />
        </button>
        <h1 className="page-title" style={{ marginBottom: 0 }}>Review Driver Application</h1>
        
        <span style={{ 
          marginLeft: 'auto',
          padding: '0.5rem 1rem', 
          borderRadius: '9999px', 
          fontSize: '0.875rem',
          fontWeight: 600,
          backgroundColor: driver.kyc_status === 'APPROVED' ? 'rgba(16, 185, 129, 0.1)' : driver.kyc_status === 'PENDING' ? 'rgba(245, 158, 11, 0.1)' : 'rgba(239, 68, 68, 0.1)',
          color: driver.kyc_status === 'APPROVED' ? 'var(--success)' : driver.kyc_status === 'PENDING' ? 'var(--warning)' : 'var(--danger)'
        }}>
          Status: {driver.kyc_status}
        </span>
      </div>

      <div className="card" style={{ marginBottom: '2rem' }}>
        <h2 style={{ fontSize: '1.25rem', marginBottom: '1.5rem', color: 'var(--text-main)' }}>Driver Information</h2>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1.5rem' }}>
          <div>
            <div style={{ fontSize: '0.875rem', color: 'var(--text-muted)', marginBottom: '0.25rem' }}>Name</div>
            <div style={{ fontWeight: 500 }}>{driver.name}</div>
          </div>
          <div>
            <div style={{ fontSize: '0.875rem', color: 'var(--text-muted)', marginBottom: '0.25rem' }}>Phone</div>
            <div style={{ fontWeight: 500 }}>{driver.phone}</div>
          </div>
          <div>
            <div style={{ fontSize: '0.875rem', color: 'var(--text-muted)', marginBottom: '0.25rem' }}>Driving Licence</div>
            <div style={{ fontWeight: 500 }}>{driver.driving_licence || 'N/A'}</div>
          </div>
        </div>
      </div>

      <div className="card" style={{ marginBottom: '2rem' }}>
        <h2 style={{ fontSize: '1.25rem', marginBottom: '1.5rem', color: 'var(--text-main)' }}>Vehicle Information</h2>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1.5rem' }}>
          <div>
            <div style={{ fontSize: '0.875rem', color: 'var(--text-muted)', marginBottom: '0.25rem' }}>Vehicle Type</div>
            <div style={{ fontWeight: 500 }}>{driver.vehicle_type || 'N/A'}</div>
          </div>
          <div>
            <div style={{ fontSize: '0.875rem', color: 'var(--text-muted)', marginBottom: '0.25rem' }}>Registration Number</div>
            <div style={{ fontWeight: 500 }}>{driver.registration_number || 'N/A'}</div>
          </div>
          <div>
            <div style={{ fontSize: '0.875rem', color: 'var(--text-muted)', marginBottom: '0.25rem' }}>Make / Model</div>
            <div style={{ fontWeight: 500 }}>{driver.make} {driver.model}</div>
          </div>
          <div>
            <div style={{ fontSize: '0.875rem', color: 'var(--text-muted)', marginBottom: '0.25rem' }}>Color</div>
            <div style={{ fontWeight: 500 }}>{driver.color || 'N/A'}</div>
          </div>
        </div>
      </div>

      <div className="card" style={{ marginBottom: '2rem' }}>
        <h2 style={{ fontSize: '1.25rem', marginBottom: '1.5rem', color: 'var(--text-main)' }}>Documents & Photos</h2>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '2rem' }}>
          {renderPhoto(driver.licence_photo, 'Driving Licence')}
          {renderPhoto(driver.rc_photo, 'RC Document')}
          {renderPhoto(driver.photo_front, 'Vehicle Front')}
          {renderPhoto(driver.photo_back, 'Vehicle Back')}
          {renderPhoto(driver.photo_left, 'Vehicle Left')}
          {renderPhoto(driver.photo_right, 'Vehicle Right')}
        </div>
      </div>

      {driver.kyc_status !== 'APPROVED' && (
        <div className="card" style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          <h2 style={{ fontSize: '1.25rem', color: 'var(--text-main)' }}>Actions</h2>
          
          {showRejectInput ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <textarea 
                placeholder="Reason for rejection..."
                value={rejectReason}
                onChange={(e) => setRejectReason(e.target.value)}
                style={{ width: '100%', padding: '1rem', borderRadius: '8px', border: '1px solid var(--border)', backgroundColor: 'var(--surface-hover)', minHeight: '100px', resize: 'vertical' }}
              />
              <div style={{ display: 'flex', gap: '1rem' }}>
                <button 
                  onClick={handleReject}
                  style={{ backgroundColor: 'var(--danger)', color: 'white', border: 'none', padding: '0.75rem 1.5rem', borderRadius: '8px', fontWeight: 600, cursor: 'pointer', flex: 1 }}
                >
                  Confirm Reject
                </button>
                <button 
                  onClick={() => setShowRejectInput(false)}
                  style={{ backgroundColor: 'transparent', color: 'var(--text-main)', border: '1px solid var(--border)', padding: '0.75rem 1.5rem', borderRadius: '8px', fontWeight: 600, cursor: 'pointer', flex: 1 }}
                >
                  Cancel
                </button>
              </div>
            </div>
          ) : (
            <div style={{ display: 'flex', gap: '1rem' }}>
              <button 
                onClick={handleApprove}
                style={{ flex: 1, backgroundColor: 'var(--success)', color: 'white', border: 'none', padding: '1rem', borderRadius: '8px', fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem', fontSize: '1rem' }}
              >
                <CheckCircle size={20} /> Approve Application
              </button>
              <button 
                onClick={() => setShowRejectInput(true)}
                style={{ flex: 1, backgroundColor: 'var(--danger)', color: 'white', border: 'none', padding: '1rem', borderRadius: '8px', fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem', fontSize: '1rem' }}
              >
                <XCircle size={20} /> Reject Application
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default DriverReview;
