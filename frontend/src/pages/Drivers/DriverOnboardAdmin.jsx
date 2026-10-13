import React, { useState } from 'react';
import { getApiUrl } from '../../services/apiClient';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';

const API_URL = getApiUrl();

const DriverOnboardAdmin = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  
  const [formData, setFormData] = useState({
    name: '',
    phone: '',
    email: '',
    password: '',
    driving_licence: '',
    vehicle_type_id: '1',
    registration_number: '',
    make: '',
    model: '',
    color: ''
  });

  const [files, setFiles] = useState({
    licence_photo: null,
    rc_photo: null,
    photo_front: null,
    photo_back: null,
    photo_left: null,
    photo_right: null
  });

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleFileChange = (e) => {
    setFiles({ ...files, [e.target.name]: e.target.files[0] });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    const submitData = new FormData();
    Object.keys(formData).forEach(key => {
      submitData.append(key, formData[key]);
    });

    Object.keys(files).forEach(key => {
      if (files[key]) {
        submitData.append(key, files[key]);
      }
    });

    try {
      const response = await fetch(`${API_URL}/admin/driver/create`, {
        method: 'POST',
        body: submitData
      });

      const data = await response.json();
      if (data.success) {
        alert('Driver onboarded successfully!');
        navigate('/drivers');
      } else {
        alert('Error: ' + data.message);
      }
    } catch (error) {
      console.error('Error onboarding driver:', error);
      alert('Failed to onboard driver. Please check network.');
    } finally {
      setLoading(false);
    }
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
        <h1 className="page-title" style={{ marginBottom: 0 }}>Onboard New Driver</h1>
      </div>

      <form onSubmit={handleSubmit} className="card" style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
        
        {/* User Details */}
        <section>
          <h2 style={{ fontSize: '1.25rem', marginBottom: '1rem', color: 'var(--text-main)' }}>Personal Information</h2>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '1.5rem' }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
              <label style={{ fontSize: '0.875rem', fontWeight: 500, color: 'var(--text-main)' }}>Name *</label>
              <input type="text" name="name" value={formData.name} onChange={handleChange} required style={inputStyle} />
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
              <label style={{ fontSize: '0.875rem', fontWeight: 500, color: 'var(--text-main)' }}>Phone Number *</label>
              <input type="tel" name="phone" value={formData.phone} onChange={handleChange} required style={inputStyle} />
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
              <label style={{ fontSize: '0.875rem', fontWeight: 500, color: 'var(--text-main)' }}>Email</label>
              <input type="email" name="email" value={formData.email} onChange={handleChange} style={inputStyle} />
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
              <label style={{ fontSize: '0.875rem', fontWeight: 500, color: 'var(--text-main)' }}>Password (for app login)</label>
              <input type="text" name="password" value={formData.password} onChange={handleChange} placeholder="Default: 123456" style={inputStyle} />
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
              <label style={{ fontSize: '0.875rem', fontWeight: 500, color: 'var(--text-main)' }}>Driving Licence Number *</label>
              <input type="text" name="driving_licence" value={formData.driving_licence} onChange={handleChange} required style={inputStyle} />
            </div>
          </div>
        </section>

        <hr style={{ border: 'none', borderTop: '1px solid var(--border)' }} />

        {/* Vehicle Details */}
        <section>
          <h2 style={{ fontSize: '1.25rem', marginBottom: '1rem', color: 'var(--text-main)' }}>Vehicle Information</h2>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '1.5rem' }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
              <label style={{ fontSize: '0.875rem', fontWeight: 500, color: 'var(--text-main)' }}>Vehicle Type ID</label>
              <select name="vehicle_type_id" value={formData.vehicle_type_id} onChange={handleChange} style={inputStyle}>
                <option value="1">Car</option>
                <option value="2">Auto</option>
                <option value="3">Bike</option>
              </select>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
              <label style={{ fontSize: '0.875rem', fontWeight: 500, color: 'var(--text-main)' }}>Registration Number (RC) *</label>
              <input type="text" name="registration_number" value={formData.registration_number} onChange={handleChange} required style={inputStyle} />
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
              <label style={{ fontSize: '0.875rem', fontWeight: 500, color: 'var(--text-main)' }}>Make</label>
              <input type="text" name="make" value={formData.make} onChange={handleChange} placeholder="e.g. Maruti Suzuki" style={inputStyle} />
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
              <label style={{ fontSize: '0.875rem', fontWeight: 500, color: 'var(--text-main)' }}>Model</label>
              <input type="text" name="model" value={formData.model} onChange={handleChange} placeholder="e.g. Swift" style={inputStyle} />
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
              <label style={{ fontSize: '0.875rem', fontWeight: 500, color: 'var(--text-main)' }}>Color</label>
              <input type="text" name="color" value={formData.color} onChange={handleChange} placeholder="e.g. White" style={inputStyle} />
            </div>
          </div>
        </section>

        <hr style={{ border: 'none', borderTop: '1px solid var(--border)' }} />

        {/* File Uploads */}
        <section>
          <h2 style={{ fontSize: '1.25rem', marginBottom: '1rem', color: 'var(--text-main)' }}>Document & Photos</h2>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '1.5rem' }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
              <label style={{ fontSize: '0.875rem', fontWeight: 500, color: 'var(--text-main)' }}>Driving Licence Photo</label>
              <input type="file" name="licence_photo" onChange={handleFileChange} accept="image/*" style={fileInputStyle} />
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
              <label style={{ fontSize: '0.875rem', fontWeight: 500, color: 'var(--text-main)' }}>RC Document Photo</label>
              <input type="file" name="rc_photo" onChange={handleFileChange} accept="image/*" style={fileInputStyle} />
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
              <label style={{ fontSize: '0.875rem', fontWeight: 500, color: 'var(--text-main)' }}>Vehicle Photo - Front</label>
              <input type="file" name="photo_front" onChange={handleFileChange} accept="image/*" style={fileInputStyle} />
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
              <label style={{ fontSize: '0.875rem', fontWeight: 500, color: 'var(--text-main)' }}>Vehicle Photo - Back</label>
              <input type="file" name="photo_back" onChange={handleFileChange} accept="image/*" style={fileInputStyle} />
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
              <label style={{ fontSize: '0.875rem', fontWeight: 500, color: 'var(--text-main)' }}>Vehicle Photo - Left</label>
              <input type="file" name="photo_left" onChange={handleFileChange} accept="image/*" style={fileInputStyle} />
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
              <label style={{ fontSize: '0.875rem', fontWeight: 500, color: 'var(--text-main)' }}>Vehicle Photo - Right</label>
              <input type="file" name="photo_right" onChange={handleFileChange} accept="image/*" style={fileInputStyle} />
            </div>
          </div>
        </section>

        <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '1rem' }}>
          <button 
            type="submit" 
            disabled={loading}
            style={{ backgroundColor: 'var(--primary)', color: 'white', border: 'none', padding: '0.75rem 2rem', borderRadius: '8px', fontWeight: 600, cursor: loading ? 'not-allowed' : 'pointer', fontSize: '1rem' }}
          >
            {loading ? 'Saving...' : 'Submit & Approve Driver'}
          </button>
        </div>

      </form>
    </div>
  );
};

const inputStyle = {
  padding: '0.75rem',
  borderRadius: '8px',
  border: '1px solid var(--border)',
  backgroundColor: 'var(--surface-hover)',
  color: 'var(--text-main)',
  outline: 'none',
  fontSize: '0.875rem'
};

const fileInputStyle = {
  ...inputStyle,
  padding: '0.5rem'
};

export default DriverOnboardAdmin;
