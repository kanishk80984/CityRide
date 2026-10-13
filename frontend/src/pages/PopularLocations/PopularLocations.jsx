import React, { useState, useEffect } from 'react';
import { getApiUrl, resolveImageUrl } from '../../services/apiClient';
import axios from 'axios';
import { Plus, Trash2, MapPin, Edit2 } from 'lucide-react';
import './PopularLocations.css';

const PopularLocations = () => {
  const [locations, setLocations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editId, setEditId] = useState(null);
  const [formData, setFormData] = useState({
    city: '',
    title: '',
    address: '',
    latitude: '',
    longitude: ''
  });
  const [imageFile, setImageFile] = useState(null);
  const [imagePreview, setImagePreview] = useState(null);
  const [cities, setCities] = useState([]);

  const fetchLocationsAndCities = async () => {
    try {
      const token = localStorage.getItem('adminToken');
      const [locRes, cityRes] = await Promise.all([
        axios.get(`${getApiUrl()}/admin/popular-locations`, { headers: { Authorization: `Bearer ${token}` } }),
        axios.get(`${getApiUrl()}/admin/cities`, { headers: { Authorization: `Bearer ${token}` } })
      ]);
      if (locRes.data.success) {
        setLocations(locRes.data.data);
      }
      if (cityRes.data.success) {
        setCities(cityRes.data.data);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLocationsAndCities();
  }, []);

  const handleInputChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const processImage = (file) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        
        // 1:1 Center Crop Calculation
        const size = Math.min(img.width, img.height);
        const startX = (img.width - size) / 2;
        const startY = (img.height - size) / 2;
        
        // Scale down to 400x400 to keep the file size very small (under 20kb)
        const targetSize = 400; 
        canvas.width = targetSize;
        canvas.height = targetSize;
        
        const ctx = canvas.getContext('2d');
        ctx.drawImage(img, startX, startY, size, size, 0, 0, targetSize, targetSize);
        
        // Convert canvas to WebP format with 0.7 quality
        canvas.toBlob((blob) => {
          setImageFile(blob);
          setImagePreview(URL.createObjectURL(blob));
        }, 'image/webp', 0.7);
      };
      img.src = e.target.result;
    };
    reader.readAsDataURL(file);
  };

  const handleFileChange = (e) => {
    if (e.target.files && e.target.files[0]) {
      processImage(e.target.files[0]);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!editId && !imageFile) {
      alert('Please select an image first.');
      return;
    }

    const submitData = new FormData();
    submitData.append('city', formData.city);
    submitData.append('title', formData.title);
    submitData.append('address', formData.address);
    submitData.append('latitude', formData.latitude);
    submitData.append('longitude', formData.longitude);
    
    if (imageFile) {
      submitData.append('image', imageFile, 'popular_location.webp'); // Matches upload.single('image')
    } else if (editId) {
      submitData.append('image_url', imagePreview || ''); // Send existing URL if not changed, or empty string to clear
    }

    try {
      let res;
      if (editId) {
        res = await axios.put(`${getApiUrl()}/admin/popular-locations/${editId}`, submitData, {
          headers: { 'Content-Type': 'multipart/form-data', Authorization: `Bearer ${localStorage.getItem('adminToken')}` }
        });
      } else {
        res = await axios.post(`${getApiUrl()}/admin/popular-locations`, submitData, {
          headers: { 'Content-Type': 'multipart/form-data', Authorization: `Bearer ${localStorage.getItem('adminToken')}` }
        });
      }
      
      if (res.data.success) {
        setShowModal(false);
        setEditId(null);
        setFormData({ city: '', title: '', address: '', latitude: '', longitude: '' });
        setImageFile(null);
        setImagePreview(null);
        fetchLocationsAndCities();
      }
    } catch (err) {
      console.error(err);
      alert('Failed to save location');
    }
  };

  const handleEdit = (loc) => {
    setEditId(loc.id);
    setFormData({
      city: loc.city,
      title: loc.title,
      address: loc.address,
      latitude: loc.latitude,
      longitude: loc.longitude
    });
    setImagePreview(resolveImageUrl(loc.image_url));
    setImageFile(null);
    setShowModal(true);
  };

  const handleDelete = async (id) => {
    if (window.confirm('Are you sure you want to delete this popular location?')) {
      try {
        const token = localStorage.getItem('adminToken');
        const res = await axios.delete(`${getApiUrl()}/admin/popular-locations/${id}`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        if (res.data.success) {
          fetchLocationsAndCities();
        }
      } catch (err) {
        console.error(err);
        alert('Failed to delete');
      }
    }
  };

  if (loading) return <div className="loading">Loading popular locations...</div>;

  return (
    <div className="popular-locations-container">
      <div className="page-header">
        <div>
          <h1 className="page-title">Popular Locations</h1>
          <p className="page-subtitle">Manage dynamic destinations for users</p>
        </div>
        <button className="primary-btn" onClick={() => {
          setEditId(null);
          setFormData({ city: '', title: '', address: '', latitude: '', longitude: '' });
          setImageFile(null);
          setImagePreview(null);
          setShowModal(true);
        }}>
          <Plus size={20} /> Add Location
        </button>
      </div>

      <div className="locations-grid">
        {locations.map((loc) => (
          <div key={loc.id} className="location-card">
            <img src={resolveImageUrl(loc.image_url)} alt={loc.title} className="location-image" />
            <div className="location-details">
              <h3 className="location-title">{loc.title}</h3>
              <p className="location-address"><MapPin size={12}/> {loc.address}</p>
              <div className="location-meta">
                <span className="city-badge">{loc.city}</span>
                <span className="coords">{Number(loc.latitude).toFixed(4)}, {Number(loc.longitude).toFixed(4)}</span>
              </div>
              <div className="card-actions" style={{ display: 'flex', gap: '8px', marginTop: '10px' }}>
                <button className="edit-btn" style={{ flex: 1, padding: '8px', background: '#eff6ff', color: '#3b82f6', border: 'none', borderRadius: '6px', cursor: 'pointer', display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '6px', fontWeight: '500' }} onClick={() => handleEdit(loc)}>
                  <Edit2 size={16} /> Edit
                </button>
                <button className="delete-btn" style={{ flex: 1 }} onClick={() => handleDelete(loc.id)}>
                  <Trash2 size={16} /> Delete
                </button>
              </div>
            </div>
          </div>
        ))}
        {locations.length === 0 && (
          <div className="no-data">No popular locations found. Add one to get started!</div>
        )}
      </div>

      {showModal && (
        <div className="modal-overlay">
          <div className="modal-content">
            <h2>{editId ? 'Edit Popular Location' : 'Add Popular Location'}</h2>
            <form onSubmit={handleSubmit} className="location-form">
              <div className="form-group">
                <label>City / District</label>
                <select name="city" required value={formData.city} onChange={handleInputChange}>
                  <option value="" disabled>Select a City</option>
                  {cities.map((city) => (
                    <option key={city} value={city}>{city}</option>
                  ))}
                </select>
              </div>
              <div className="form-group">
                <label>Title</label>
                <input type="text" name="title" required value={formData.title} onChange={handleInputChange} placeholder="e.g. ERODE BUS STAND" />
              </div>
              <div className="form-group">
                <label>Address</label>
                <input type="text" name="address" required value={formData.address} onChange={handleInputChange} placeholder="e.g. Thiruvalluvar Salai" />
              </div>
              <div className="form-row">
                <div className="form-group">
                  <label>Latitude</label>
                  <input type="number" step="any" name="latitude" required value={formData.latitude} onChange={handleInputChange} placeholder="11.3411" />
                </div>
                <div className="form-group">
                  <label>Longitude</label>
                  <input type="number" step="any" name="longitude" required value={formData.longitude} onChange={handleInputChange} placeholder="77.7172" />
                </div>
              </div>
              <div className="form-group">
                <label>Location Image</label>
                <input type="file" accept="image/*" onChange={handleFileChange} />
                {imagePreview && (
                  <div style={{ marginTop: '10px', position: 'relative', display: 'inline-block' }}>
                    <img src={imagePreview} alt="Preview" style={{ width: '100px', height: '100px', objectFit: 'cover', borderRadius: '8px' }} />
                    <button type="button" onClick={() => {
                      setImagePreview(null);
                      setImageFile(null);
                    }} style={{ position: 'absolute', top: '-8px', right: '-8px', background: '#dc2626', color: 'white', border: 'none', borderRadius: '50%', width: '24px', height: '24px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '14px', fontWeight: 'bold' }}>&times;</button>
                    <p style={{ fontSize: '12px', color: '#666', marginTop: '4px' }}>Automatically cropped 1:1 & optimized to WebP</p>
                  </div>
                )}
              </div>
              
              <div className="modal-actions">
                <button type="button" className="cancel-btn" onClick={() => {
                  setShowModal(false);
                  setEditId(null);
                  setImageFile(null);
                  setImagePreview(null);
                  setFormData({ city: '', title: '', address: '', latitude: '', longitude: '' });
                }}>Cancel</button>
                <button type="submit" className="save-btn">{editId ? 'Update Location' : 'Save Location'}</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default PopularLocations;
