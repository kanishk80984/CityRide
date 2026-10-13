import React, { useState, useEffect } from 'react';
import { getApiUrl, resolveImageUrl } from '../../services/apiClient';
import axios from 'axios';
import { Plus, Trash2, Edit2, PlayCircle, PauseCircle } from 'lucide-react';
import ReactCrop, { centerCrop, makeAspectCrop } from 'react-image-crop';
import 'react-image-crop/dist/ReactCrop.css';
import './Advertisements.css';

const Advertisements = () => {
  const [ads, setAds] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editId, setEditId] = useState(null);
  const [formData, setFormData] = useState({
    title: '',
    duration_seconds: 5,
    display_order: 0,
    is_active: true
  });
  const [imageFile, setImageFile] = useState(null);
  const [imagePreview, setImagePreview] = useState(null);

  // Cropper State
  const [imgSrc, setImgSrc] = useState('');
  const [crop, setCrop] = useState();
  const [completedCrop, setCompletedCrop] = useState(null);
  const imgRef = React.useRef(null);

  const fetchAds = async () => {
    try {
      const res = await axios.get(`${getApiUrl()}/admin/ads`, { headers: { Authorization: `Bearer ${localStorage.getItem('adminToken')}` } });
      if (res.data.success) {
        setAds(res.data.data);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAds();
  }, []);

  const handleInputChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData({
      ...formData,
      [name]: type === 'checkbox' ? checked : value
    });
  };

  const getCroppedImg = (image, crop, fileName) => {
    const canvas = document.createElement('canvas');
    const scaleX = image.naturalWidth / image.width;
    const scaleY = image.naturalHeight / image.height;

    // Target ratio corresponding to the exact flex:1 space in User App (approx 1080x1500)
    const targetWidth = 1095;
    const targetHeight = 630;
    canvas.width = targetWidth;
    canvas.height = targetHeight;

    const ctx = canvas.getContext('2d');

    const cropX = crop.x * scaleX;
    const cropY = crop.y * scaleY;
    const cropWidth = crop.width * scaleX;
    const cropHeight = crop.height * scaleY;

    ctx.drawImage(
      image,
      cropX,
      cropY,
      cropWidth,
      cropHeight,
      0,
      0,
      targetWidth,
      targetHeight
    );

    canvas.toBlob((blob) => {
      setImageFile(blob);
      setImagePreview(URL.createObjectURL(blob));
      setImgSrc('');
    }, 'image/webp', 0.8);
  };

  const onImageLoad = (e) => {
    const { width, height } = e.currentTarget;
    const aspect = 365 / 210;
    
    let cropWidth = width * 0.9;
    let cropHeight = cropWidth / aspect;

    if (cropHeight > height * 0.9) {
      cropHeight = height * 0.9;
      cropWidth = cropHeight * aspect;
    }

    const initialCrop = centerCrop(
      makeAspectCrop(
        {
          unit: 'px',
          width: cropWidth,
          height: cropHeight,
        },
        aspect,
        width,
        height
      ),
      width,
      height
    );

    setCrop(initialCrop);
  };

  const handleFileChange = (e) => {
    if (e.target.files && e.target.files[0]) {
      const reader = new FileReader();
      reader.addEventListener('load', () => setImgSrc(reader.result?.toString() || ''));
      reader.readAsDataURL(e.target.files[0]);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!editId && !imageFile) {
      alert('Please select an image first.');
      return;
    }

    const submitData = new FormData();
    submitData.append('title', formData.title);
    submitData.append('duration_seconds', formData.duration_seconds);
    submitData.append('display_order', formData.display_order);
    submitData.append('is_active', formData.is_active);

    if (imageFile) {
      submitData.append('image', imageFile, 'ad.webp');
    }

    try {
      const config = {
        headers: {
          Authorization: `Bearer ${localStorage.getItem('adminToken')}`,
          'Content-Type': 'multipart/form-data'
        }
      };

      if (editId) {
        await axios.put(`${getApiUrl()}/admin/ads/${editId}`, submitData, config);
      } else {
        await axios.post(`${getApiUrl()}/admin/ads`, submitData, config);
      }
      setShowModal(false);
      resetForm();
      fetchAds();
    } catch (err) {
      console.error(err);
      alert('Failed to save advertisement');
    }
  };

  const handleDelete = async (id) => {
    if (window.confirm('Are you sure you want to delete this ad?')) {
      try {
        await axios.delete(`${getApiUrl()}/admin/ads/${id}`, {
          headers: {
            Authorization: `Bearer ${localStorage.getItem('adminToken')}`
          }
        });
        fetchAds();
      } catch (err) {
        console.error(err);
        alert('Failed to delete ad');
      }
    }
  };

  const openEditModal = (ad) => {
    setEditId(ad.id);
    setFormData({
      title: ad.title,
      duration_seconds: ad.duration_seconds,
      display_order: ad.display_order,
      is_active: ad.is_active === 1 || ad.is_active === true
    });
    setImagePreview(resolveImageUrl(ad.image_url));
    setImageFile(null);
    setShowModal(true);
  };

  const resetForm = () => {
    setEditId(null);
    setFormData({
      title: '',
      duration_seconds: 5,
      display_order: 0,
      is_active: true
    });
    setImageFile(null);
    setImagePreview(null);
  };

  const toggleStatus = async (ad) => {
    try {
      const submitData = new FormData();
      submitData.append('title', ad.title);
      submitData.append('duration_seconds', ad.duration_seconds);
      submitData.append('display_order', ad.display_order);
      submitData.append('is_active', !(ad.is_active === 1 || ad.is_active === true));

      await axios.put(`${getApiUrl()}/admin/ads/${ad.id}`, submitData);
      fetchAds();
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <div className="ads-container">
      <div className="header-section">
        <h2>Advertisement Management</h2>
        <button
          className="add-btn"
          onClick={() => {
            resetForm();
            setShowModal(true);
          }}
        >
          <Plus size={20} />
          <span>Add Advertisement</span>
        </button>
      </div>

      {loading ? (
        <div className="loading">Loading...</div>
      ) : (
        <div className="ads-grid">
          {ads.map((ad) => (
            <div key={ad.id} className={`ad-card ${ad.is_active ? '' : 'inactive'}`}>
              <div className="ad-image-container">
                <img src={resolveImageUrl(ad.image_url)} alt={ad.title} className="ad-image" />
                <div className="ad-status-badge" style={{ backgroundColor: ad.is_active ? '#4caf50' : '#f44336' }}>
                  {ad.is_active ? 'Active' : 'Inactive'}
                </div>
              </div>
              <div className="ad-info">
                <h3>{ad.title}</h3>
                <div className="ad-details">
                  <span>Duration: {ad.duration_seconds}s</span>
                  <span>Order: {ad.display_order}</span>
                </div>
              </div>
              <div className="ad-actions">
                <button className="icon-btn edit" onClick={() => openEditModal(ad)}>
                  <Edit2 size={18} />
                </button>
                <button className="icon-btn toggle" onClick={() => toggleStatus(ad)} title={ad.is_active ? "Deactivate" : "Activate"}>
                  {ad.is_active ? <PauseCircle size={18} /> : <PlayCircle size={18} />}
                </button>
                <button className="icon-btn delete" onClick={() => handleDelete(ad.id)}>
                  <Trash2 size={18} />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {showModal && (
        <div className="modal-overlay">
          <div className="modal-content">
            <h3>{editId ? 'Edit Advertisement' : 'Add New Advertisement'}</h3>
            <form onSubmit={handleSubmit}>
              <div className="form-group">
                <label>Title</label>
                <input
                  type="text"
                  name="title"
                  value={formData.title}
                  onChange={handleInputChange}
                  required
                />
              </div>

              <div className="form-group-row">
                <div className="form-group">
                  <label>Duration (Seconds)</label>
                  <input
                    type="number"
                    name="duration_seconds"
                    value={formData.duration_seconds}
                    onChange={handleInputChange}
                    min="1"
                    required
                  />
                </div>
                <div className="form-group">
                  <label>Display Order</label>
                  <input
                    type="number"
                    name="display_order"
                    value={formData.display_order}
                    onChange={handleInputChange}
                    required
                  />
                </div>
              </div>

              <div className="form-group checkbox-group">
                <label>
                  <input
                    type="checkbox"
                    name="is_active"
                    checked={formData.is_active}
                    onChange={handleInputChange}
                  />
                  Active (Visible to users)
                </label>
              </div>

              <div className="form-group">
                <label>Banner Image (Crop will resize to 1080x1500 Mobile Size)</label>
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleFileChange}
                />
                {imagePreview && (
                  <div className="image-preview-container">
                    <img src={imagePreview} alt="Preview" className="image-preview" />
                  </div>
                )}
              </div>

              <div className="modal-actions">
                <button type="button" className="cancel-btn" onClick={() => setShowModal(false)}>
                  Cancel
                </button>
                <button type="submit" className="save-btn">
                  {editId ? 'Update Ad' : 'Save Ad'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* CROP MODAL */}
      {imgSrc && (
        <div className="modal-overlay" style={{ zIndex: 1000 }}>
          <div className="modal-content" style={{ width: '90%', maxWidth: '800px', maxHeight: '90vh', overflowY: 'auto' }}>
            <h3>Crop Advertisement Image</h3>
            <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '20px' }}>
              <style>{`
                .ReactCrop__drag-handle, 
                .ReactCrop__drag-bar, 
                .ReactCrop__drag-elements {
                  display: none !important;
                  pointer-events: none !important;
                }
                /* Optional: ensure the crop box itself doesn't show cursor: nwse-resize etc */
                .ReactCrop__crop-selection {
                  cursor: move !important;
                }
              `}</style>
              <ReactCrop
                crop={crop}
                onChange={(_, percentCrop) => setCrop(percentCrop)}
                onComplete={(c) => setCompletedCrop(c)}
                aspect={365 / 210}
              >
                <img
                  ref={imgRef}
                  src={imgSrc}
                  alt="Crop preview"
                  onLoad={onImageLoad}
                  style={{ maxWidth: '100%', maxHeight: '60vh' }}
                />
              </ReactCrop>
            </div>
            <div className="modal-actions" style={{ marginTop: '20px' }}>
              <button type="button" className="cancel-btn" onClick={() => setImgSrc('')}>
                Cancel
              </button>
              <button
                type="button"
                className="save-btn"
                onClick={() => {
                  if (completedCrop?.width && completedCrop?.height && imgRef.current) {
                    getCroppedImg(imgRef.current, completedCrop, 'cropped.webp');
                  }
                }}
              >
                Apply Crop
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Advertisements;
