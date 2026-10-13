import React, { useState, useEffect } from 'react';
import { getApiUrl, getUploadsUrl } from '../../services/apiClient';
import { useParams, useNavigate } from 'react-router-dom';
import { 
  ArrowLeft, CheckCircle, XCircle, Eye, User, Phone, 
  CreditCard, FileText, ExternalLink, X, ShieldCheck, Car
} from 'lucide-react';

const API_URL = getApiUrl();
const UPLOADS_URL = getUploadsUrl();

const DriverReview = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [driver, setDriver] = useState(null);
  const [loading, setLoading] = useState(true);
  const [rejectReason, setRejectReason] = useState('');
  const [showRejectInput, setShowRejectInput] = useState(false);
  const [previewImage, setPreviewImage] = useState(null); // { url, title }

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
    if (!window.confirm('Are you sure you want to approve this driver?')) return;
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
        alert('Driver Application Rejected');
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
    if (filename.startsWith('http://') || filename.startsWith('https://')) return filename;
    const clean = filename.startsWith('/uploads/') ? filename.replace('/uploads/', '') : filename.replace(/^\/+/, '');
    return `${UPLOADS_URL}/${clean}`;
  };

  const renderPhotoCard = (filename, label, subtext = '') => {
    const url = getImageUrl(filename);

    return (
      <div 
        style={{ 
          display: 'flex', 
          flexDirection: 'column', 
          flex: '1 1 260px',
          maxWidth: '360px',
          backgroundColor: 'var(--surface-hover)', 
          borderRadius: '12px', 
          border: '1px solid var(--border)',
          overflow: 'hidden',
          boxShadow: '0 1px 3px rgba(0,0,0,0.05)'
        }}
      >
        <div style={{ padding: '0.85rem 1rem', borderBottom: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <div style={{ fontWeight: 600, fontSize: '0.95rem', color: 'var(--text-main)' }}>{label}</div>
            {subtext ? <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)', marginTop: '2px' }}>{subtext}</div> : null}
          </div>
          {url && (
            <button 
              onClick={() => setPreviewImage({ url, title: label })}
              style={{ background: 'transparent', border: 'none', cursor: 'pointer', color: 'var(--primary)', padding: '4px' }}
              title="View full size"
            >
              <Eye size={18} />
            </button>
          )}
        </div>

        {url ? (
          <div 
            onClick={() => setPreviewImage({ url, title: label })}
            style={{ 
              height: '210px', 
              backgroundColor: '#0a0a0a', 
              cursor: 'pointer', 
              display: 'flex', 
              alignItems: 'center', 
              justifyContent: 'center',
              position: 'relative',
              overflow: 'hidden'
            }}
          >
            <img 
              src={url} 
              alt={label} 
              style={{ width: '100%', height: '100%', objectFit: 'contain' }} 
            />
            <div 
              style={{ 
                position: 'absolute', 
                bottom: 8, 
                right: 8, 
                backgroundColor: 'rgba(0,0,0,0.7)', 
                color: '#fff', 
                fontSize: '0.75rem', 
                padding: '3px 8px', 
                borderRadius: '6px',
                display: 'flex',
                alignItems: 'center',
                gap: '4px'
              }}
            >
              <Eye size={12} /> Click to enlarge
            </div>
          </div>
        ) : (
          <div style={{ height: '210px', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', color: 'var(--text-muted)', gap: '0.5rem', backgroundColor: 'var(--surface-hover)' }}>
            <FileText size={32} opacity={0.3} />
            <span style={{ fontSize: '0.85rem' }}>No photo uploaded</span>
          </div>
        )}
      </div>
    );
  };

  const profileImageUrl = getImageUrl(driver.profile_photo || driver.profile_image);

  return (
    <div style={{ paddingBottom: '4rem' }}>
      {/* Top Breadcrumb & Nav */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '1.5rem' }}>
        <button 
          onClick={() => navigate('/drivers')}
          style={{ background: 'transparent', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', color: 'var(--text-muted)' }}
        >
          <ArrowLeft size={24} />
        </button>
        <div>
          <h1 className="page-title" style={{ marginBottom: 0 }}>Driver Application Review</h1>
          <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>Driver ID: #{driver.id}</div>
        </div>

        <span style={{ 
          marginLeft: 'auto',
          padding: '0.5rem 1.25rem', 
          borderRadius: '9999px', 
          fontSize: '0.9rem',
          fontWeight: 700,
          backgroundColor: driver.kyc_status === 'APPROVED' ? 'rgba(16, 185, 129, 0.15)' : driver.kyc_status === 'PENDING' ? 'rgba(245, 158, 11, 0.15)' : 'rgba(239, 68, 68, 0.15)',
          color: driver.kyc_status === 'APPROVED' ? 'var(--success)' : driver.kyc_status === 'PENDING' ? 'var(--warning)' : 'var(--danger)'
        }}>
          KYC: {driver.kyc_status}
        </span>
      </div>

      {/* Driver Profile Summary Card */}
      <div className="card" style={{ marginBottom: '2rem', display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: '2rem' }}>
        {/* Profile Avatar */}
        <div style={{ position: 'relative' }}>
          {profileImageUrl ? (
            <div 
              onClick={() => setPreviewImage({ url: profileImageUrl, title: `${driver.name} - Profile Photo` })}
              style={{ cursor: 'pointer' }}
            >
              <img 
                src={profileImageUrl} 
                alt={driver.name}
                style={{ 
                  width: '96px', 
                  height: '96px', 
                  borderRadius: '50%', 
                  objectFit: 'cover', 
                  border: '3px solid var(--primary)',
                  boxShadow: '0 4px 10px rgba(0,0,0,0.1)'
                }}
              />
            </div>
          ) : (
            <div style={{ width: '96px', height: '96px', borderRadius: '50%', backgroundColor: 'var(--surface-hover)', display: 'flex', alignItems: 'center', justifyContent: 'center', border: '3px solid var(--border)' }}>
              <User size={48} color="var(--text-muted)" />
            </div>
          )}
        </div>

        {/* Basic Driver Info */}
        <div style={{ flex: 1, minWidth: '220px' }}>
          <h2 style={{ fontSize: '1.4rem', fontWeight: 700, color: 'var(--text-main)', marginBottom: '0.25rem' }}>
            {driver.name}
          </h2>
          <div style={{ fontSize: '0.9rem', color: 'var(--text-muted)', marginBottom: '0.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <Phone size={15} /> {driver.phone}
          </div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.75rem', marginTop: '0.75rem' }}>
            <div style={{ backgroundColor: 'var(--surface-hover)', padding: '0.35rem 0.75rem', borderRadius: '8px', fontSize: '0.8rem', border: '1px solid var(--border)' }}>
              <strong>Applied:</strong> {new Date(driver.created_at).toLocaleDateString()}
            </div>
            <div style={{ backgroundColor: 'var(--surface-hover)', padding: '0.35rem 0.75rem', borderRadius: '8px', fontSize: '0.8rem', border: '1px solid var(--border)' }}>
              <strong>Vehicle:</strong> {driver.vehicle_type || 'N/A'} ({driver.registration_number || 'N/A'})
            </div>
          </div>
        </div>

        {/* Quick Decision Action in Banner */}
        {driver.kyc_status !== 'APPROVED' && !showRejectInput && (
          <div style={{ display: 'flex', gap: '0.75rem', marginLeft: 'auto' }}>
            <button 
              onClick={handleApprove}
              style={{ backgroundColor: 'var(--success)', color: 'white', border: 'none', padding: '0.75rem 1.25rem', borderRadius: '8px', fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.5rem' }}
            >
              <CheckCircle size={18} /> Approve
            </button>
            <button 
              onClick={() => setShowRejectInput(true)}
              style={{ backgroundColor: 'var(--danger)', color: 'white', border: 'none', padding: '0.75rem 1.25rem', borderRadius: '8px', fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.5rem' }}
            >
              <XCircle size={18} /> Reject
            </button>
          </div>
        )}
      </div>

      {/* KYC & Identity Numbers Card */}
      <div className="card" style={{ marginBottom: '2rem' }}>
        <h2 style={{ fontSize: '1.25rem', marginBottom: '1.25rem', color: 'var(--text-main)', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <ShieldCheck size={22} color="var(--primary)" /> Identity & Government ID Details
        </h2>
        
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '1.5rem' }}>
          <div style={{ backgroundColor: 'var(--surface-hover)', padding: '1rem', borderRadius: '10px', border: '1px solid var(--border)' }}>
            <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: '0.35rem' }}>Aadhaar Card Number</div>
            <div style={{ fontWeight: 700, fontSize: '1.15rem', color: 'var(--text-main)', letterSpacing: '0.05em' }}>
              {driver.aadhar_number || 'N/A'}
            </div>
          </div>

          <div style={{ backgroundColor: 'var(--surface-hover)', padding: '1rem', borderRadius: '10px', border: '1px solid var(--border)' }}>
            <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: '0.35rem' }}>PAN Card Number</div>
            <div style={{ fontWeight: 700, fontSize: '1.15rem', color: 'var(--text-main)', letterSpacing: '0.05em' }}>
              {driver.pan_number || 'N/A'}
            </div>
          </div>

          <div style={{ backgroundColor: 'var(--surface-hover)', padding: '1rem', borderRadius: '10px', border: '1px solid var(--border)' }}>
            <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: '0.35rem' }}>Driving Licence Number</div>
            <div style={{ fontWeight: 700, fontSize: '1.15rem', color: 'var(--text-main)', letterSpacing: '0.05em' }}>
              {driver.driving_licence || 'N/A'}
            </div>
          </div>
        </div>
      </div>

      {/* Identity & Personal Verification Photos */}
      <div className="card" style={{ marginBottom: '2rem' }}>
        <h2 style={{ fontSize: '1.25rem', marginBottom: '0.5rem', color: 'var(--text-main)', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <CreditCard size={22} color="var(--primary)" /> Driver Profile & Government Documents Photos
        </h2>
        <div style={{ fontSize: '0.875rem', color: 'var(--text-muted)', marginBottom: '1.5rem' }}>
          Verify the photos submitted by the driver against identity records.
        </div>

        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '1.5rem' }}>
          {renderPhotoCard(
            driver.profile_photo || driver.profile_image, 
            'Driver Profile Photo', 
            'Live portrait / selfie'
          )}
          {renderPhotoCard(
            driver.aadhar_photo, 
            'Aadhaar Card Photo', 
            `Aadhaar No: ${driver.aadhar_number || 'N/A'}`
          )}
          {renderPhotoCard(
            driver.pan_photo, 
            'PAN Card Photo', 
            `PAN No: ${driver.pan_number || 'N/A'}`
          )}
          {renderPhotoCard(
            driver.licence_photo, 
            'Driving Licence Photo', 
            `Licence No: ${driver.driving_licence || 'N/A'}`
          )}
        </div>
      </div>

      {/* Vehicle Information */}
      <div className="card" style={{ marginBottom: '2rem' }}>
        <h2 style={{ fontSize: '1.25rem', marginBottom: '1.25rem', color: 'var(--text-main)', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <Car size={22} color="var(--primary)" /> Vehicle Details & Registration
        </h2>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1.5rem', marginBottom: '1.5rem' }}>
          <div>
            <div style={{ fontSize: '0.875rem', color: 'var(--text-muted)', marginBottom: '0.25rem' }}>Vehicle Type</div>
            <div style={{ fontWeight: 600 }}>{driver.vehicle_type || 'N/A'}</div>
          </div>
          <div>
            <div style={{ fontSize: '0.875rem', color: 'var(--text-muted)', marginBottom: '0.25rem' }}>Registration Number</div>
            <div style={{ fontWeight: 600, fontFamily: 'monospace', fontSize: '1.05rem' }}>{driver.registration_number || 'N/A'}</div>
          </div>
          <div>
            <div style={{ fontSize: '0.875rem', color: 'var(--text-muted)', marginBottom: '0.25rem' }}>Brand & Model</div>
            <div style={{ fontWeight: 600 }}>{driver.make} {driver.model}</div>
          </div>
          <div>
            <div style={{ fontSize: '0.875rem', color: 'var(--text-muted)', marginBottom: '0.25rem' }}>Vehicle Color</div>
            <div style={{ fontWeight: 600 }}>{driver.color || 'N/A'}</div>
          </div>
        </div>

        <h3 style={{ fontSize: '1rem', fontWeight: 600, color: 'var(--text-main)', marginBottom: '1rem' }}>
          Vehicle Documents & View Photos
        </h3>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '1.5rem' }}>
          {renderPhotoCard(driver.rc_photo, 'RC Document', 'Registration Certificate')}
          {renderPhotoCard(driver.photo_front, 'Vehicle Front View', 'Number plate clear view')}
          {renderPhotoCard(driver.photo_back, 'Vehicle Back View', 'Rear side view')}
          {renderPhotoCard(driver.photo_left, 'Vehicle Left View', 'Left side angle')}
          {renderPhotoCard(driver.photo_right, 'Vehicle Right View', 'Right side angle')}
        </div>
      </div>

      {/* Approval / Rejection Box */}
      {driver.kyc_status !== 'APPROVED' && (
        <div className="card" style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          <h2 style={{ fontSize: '1.25rem', color: 'var(--text-main)' }}>Verification Decision</h2>
          
          {showRejectInput ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <label style={{ fontSize: '0.9rem', fontWeight: 600, color: 'var(--text-main)' }}>
                Rejection Reason (will be shown to the driver in the app):
              </label>
              <textarea 
                placeholder="Specify what document or detail is incorrect or unclear..."
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

      {/* Lightbox Modal for Large Image Inspection */}
      {previewImage && (
        <div 
          onClick={() => setPreviewImage(null)}
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: 'rgba(0,0,0,0.85)',
            zIndex: 9999,
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '2rem'
          }}
        >
          <div 
            onClick={(e) => e.stopPropagation()}
            style={{
              maxWidth: '90vw',
              maxHeight: '90vh',
              display: 'flex',
              flexDirection: 'column',
              backgroundColor: '#18181b',
              borderRadius: '12px',
              overflow: 'hidden',
              boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.5)'
            }}
          >
            <div style={{ padding: '0.75rem 1.25rem', backgroundColor: '#27272a', display: 'flex', justifyContent: 'space-between', alignItems: 'center', color: '#fff' }}>
              <span style={{ fontWeight: 600 }}>{previewImage.title}</span>
              <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
                <a 
                  href={previewImage.url} 
                  target="_blank" 
                  rel="noreferrer"
                  style={{ color: '#60a5fa', display: 'flex', alignItems: 'center', gap: '4px', fontSize: '0.85rem', textDecoration: 'none' }}
                >
                  <ExternalLink size={16} /> Open original
                </a>
                <button 
                  onClick={() => setPreviewImage(null)}
                  style={{ background: 'transparent', border: 'none', color: '#fff', cursor: 'pointer', display: 'flex' }}
                >
                  <X size={20} />
                </button>
              </div>
            </div>
            <div style={{ padding: '1rem', display: 'flex', alignItems: 'center', justifyContent: 'center', maxHeight: '80vh', overflow: 'auto' }}>
              <img 
                src={previewImage.url} 
                alt={previewImage.title} 
                style={{ maxWidth: '100%', maxHeight: '75vh', objectFit: 'contain', borderRadius: '4px' }} 
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default DriverReview;
