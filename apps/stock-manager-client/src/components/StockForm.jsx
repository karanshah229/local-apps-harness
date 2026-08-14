import React, { useState, useEffect } from 'react';
import { Camera, Save, ArrowLeft, Upload, CheckCircle2, AlertCircle } from 'lucide-react';
import CameraCaptureModal from './CameraCaptureModal';

export default function StockForm({ categories, initialData, onSave, onCancel }) {
  const isEdit = !!initialData?.id;

  const [formData, setFormData] = useState({
    item_code: '',
    name: '',
    category_id: '',
    subcategory_id: '',
    weight: 0,
    weight_unit: 'g',
    purity: '22K (91.6%)',
    length: 0,
    width: 0,
    height: 0,
    dimension_unit: 'mm',
    quantity: 1,
    purchase_price: 0,
    selling_price: 0,
    notes: '',
    image_path: '',
    extra_attributes: {}
  });

  const [showCameraModal, setShowCameraModal] = useState(false);
  const [photoPreview, setPhotoPreview] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [message, setMessage] = useState({ type: '', text: '' });

  useEffect(() => {
    if (initialData) {
      setFormData({
        ...initialData,
        extra_attributes: initialData.extra_attributes || {}
      });
      if (initialData.image_path) {
        setPhotoPreview(initialData.image_path);
      }
    } else {
      // Auto-generate code for new items
      const autoCode = `SKU-${Date.now().toString().slice(-6)}`;
      setFormData(prev => ({ ...prev, item_code: autoCode }));
    }
  }, [initialData]);

  // Derive selected category and subcategory directly from props and form data to prevent re-render flicker
  const selectedCategory = categories.find(c => String(c.id) === String(formData.category_id)) || null;
  const selectedSubcategory = selectedCategory?.subcategories?.find(s => String(s.id) === String(formData.subcategory_id)) || null;

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleCustomFieldChange = (fieldName, value) => {
    setFormData(prev => ({
      ...prev,
      extra_attributes: {
        ...prev.extra_attributes,
        [fieldName]: value
      }
    }));
  };

  const handlePhotoCaptured = async (capturedDataUrl) => {
    setPhotoPreview(capturedDataUrl);
    try {
      // Upload image to backend API
      const res = await fetch('/api/upload', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ base64Image: capturedDataUrl })
      });
      const data = await res.json();
      if (data.url) {
        setFormData(prev => ({ ...prev, image_path: data.url }));
        setMessage({ type: 'success', text: 'Photo attached successfully!' });
      }
    } catch (err) {
      console.error('Failed to upload photo:', err);
      // Fallback: Store data URL directly
      setFormData(prev => ({ ...prev, image_path: capturedDataUrl }));
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.name) {
      setMessage({ type: 'error', text: 'Please fill in the Item Name.' });
      return;
    }

    setIsSubmitting(true);
    setMessage({ type: '', text: '' });

    try {
      const url = isEdit ? `/api/items/${formData.id}` : '/api/items';
      const method = isEdit ? 'PUT' : 'POST';

      const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData)
      });

      const result = await response.json();
      if (response.ok) {
        setMessage({ type: 'success', text: isEdit ? 'Item updated successfully!' : 'New stock item created!' });
        setTimeout(() => {
          onSave();
        }, 800);
      } else {
        setMessage({ type: 'error', text: result.error || 'Failed to save item.' });
      }
    } catch (err) {
      setMessage({ type: 'error', text: 'Network error saving item.' });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="glass-panel" style={{ padding: '2rem' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
        <div>
          <button className="btn btn-secondary btn-sm" onClick={onCancel} style={{ marginBottom: '0.5rem' }}>
            <ArrowLeft size={14} /> Back to Library
          </button>
          <h2 style={{ fontSize: '1.6rem', color: '#fff' }}>
            {isEdit ? 'Edit Stock Item' : 'Add New Stock Item'}
          </h2>
        </div>
      </div>

      {message.text && (
        <div style={{
          padding: '0.85rem 1rem',
          borderRadius: '10px',
          marginBottom: '1.5rem',
          display: 'flex',
          alignItems: 'center',
          gap: '0.5rem',
          fontSize: '0.9rem',
          background: message.type === 'success' ? 'rgba(16, 185, 129, 0.15)' : 'rgba(244, 63, 94, 0.15)',
          border: `1px solid ${message.type === 'success' ? 'rgba(16, 185, 129, 0.3)' : 'rgba(244, 63, 94, 0.3)'}`,
          color: message.type === 'success' ? 'var(--emerald)' : 'var(--rose)'
        }}>
          {message.type === 'success' ? <CheckCircle2 size={18} /> : <AlertCircle size={18} />}
          {message.text}
        </div>
      )}

      <form onSubmit={handleSubmit}>
        {/* Section 1: Photo & Basic Details */}
        <div style={{ display: 'grid', gridTemplateColumns: '260px 1fr', gap: '2rem', marginBottom: '2rem' }}>
          
          {/* Photo Box */}
          <div>
            <label className="form-label" style={{ marginBottom: '0.5rem', display: 'block' }}>Stock Item Photo</label>
            <div style={{
              width: '100%',
              height: '240px',
              borderRadius: '14px',
              border: '2px dashed var(--border-color)',
              background: '#020617',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              position: 'relative',
              overflow: 'hidden'
            }}>
              {photoPreview ? (
                <img src={photoPreview} alt="Preview" style={{ width: '100%', height: '100%', objectFit: 'contain' }} />
              ) : (
                <div style={{ textAlign: 'center', padding: '1rem', color: 'var(--text-muted)' }}>
                  <Camera size={36} style={{ marginBottom: '0.5rem', color: 'var(--primary)' }} />
                  <p style={{ fontSize: '0.85rem' }}>No photo attached</p>
                </div>
              )}
            </div>
            <button
              type="button"
              className="btn btn-gold"
              onClick={() => setShowCameraModal(true)}
              style={{ width: '100%', marginTop: '0.85rem' }}
            >
              <Camera size={16} /> {photoPreview ? 'Change Photo' : 'Capture / Upload Photo'}
            </button>
          </div>

          {/* Core Spec Fields */}
          <div>
            <div className="form-grid">
              <div className="form-group">
                <label className="form-label">Item Code / SKU *</label>
                <input
                  type="text"
                  name="item_code"
                  className="form-control"
                  value={formData.item_code}
                  onChange={handleChange}
                  required
                />
              </div>

              <div className="form-group">
                <label className="form-label">Item Name *</label>
                <input
                  type="text"
                  name="name"
                  className="form-control"
                  placeholder="e.g. Royal 22K Gold Temple Necklace"
                  value={formData.name}
                  onChange={handleChange}
                  required
                />
              </div>
            </div>

            <div className="form-grid">
              <div className="form-group">
                <label className="form-label">Category</label>
                <select
                  name="category_id"
                  className="form-control"
                  value={formData.category_id}
                  onChange={(e) => {
                    handleChange(e);
                    setFormData(prev => ({ ...prev, subcategory_id: '' }));
                  }}
                >
                  <option value="">Select Category...</option>
                  {categories.map(cat => (
                    <option key={cat.id} value={cat.id}>{cat.name}</option>
                  ))}
                </select>
              </div>

              <div className="form-group">
                <label className="form-label">Subcategory</label>
                <select
                  name="subcategory_id"
                  className="form-control"
                  value={formData.subcategory_id}
                  onChange={handleChange}
                  disabled={!selectedCategory}
                >
                  <option value="">Select Subcategory...</option>
                  {selectedCategory?.subcategories.map(sub => (
                    <option key={sub.id} value={sub.id}>{sub.name}</option>
                  ))}
                </select>
              </div>
            </div>

            <div className="form-grid">
              <div className="form-group">
                <label className="form-label">Weight</label>
                <div style={{ display: 'flex', gap: '0.5rem' }}>
                  <input
                    type="number"
                    step="0.01"
                    name="weight"
                    className="form-control"
                    value={formData.weight}
                    onChange={handleChange}
                  />
                  <select
                    name="weight_unit"
                    className="form-control"
                    style={{ width: '80px' }}
                    value={formData.weight_unit}
                    onChange={handleChange}
                  >
                    <option value="g">g</option>
                    <option value="kg">kg</option>
                    <option value="ct">ct</option>
                    <option value="oz">oz</option>
                  </select>
                </div>
              </div>

              <div className="form-group">
                <label className="form-label">Purity Grade</label>
                <select
                  name="purity"
                  className="form-control"
                  value={formData.purity}
                  onChange={handleChange}
                >
                  <option value="24K (99.9%)">24K (99.9% Fine Gold)</option>
                  <option value="22K (91.6%)">22K (91.6% Hallmark)</option>
                  <option value="18K (75.0%)">18K (75.0% Ornaments)</option>
                  <option value="14K (58.5%)">14K (58.5%)</option>
                  <option value="925 Sterling Silver">925 Sterling Silver</option>
                  <option value="999 Fine Silver">999 Fine Silver</option>
                  <option value="N/A">N/A / Standard</option>
                </select>
              </div>

              <div className="form-group">
                <label className="form-label">Quantity</label>
                <input
                  type="number"
                  name="quantity"
                  className="form-control"
                  value={formData.quantity}
                  onChange={handleChange}
                  min="1"
                />
              </div>
            </div>

          </div>
        </div>

        {/* Section 2: Dimensions & Financials */}
        <h3 style={{ fontSize: '1.1rem', color: 'var(--primary)', marginBottom: '1rem', borderBottom: '1px solid var(--border-color)', paddingBottom: '0.4rem' }}>
          Dimensions & Financials
        </h3>
        
        <div className="form-grid" style={{ marginBottom: '1.5rem' }}>
          <div className="form-group">
            <label className="form-label">Dimensions (L x W x H)</label>
            <div style={{ display: 'flex', gap: '0.4rem', alignItems: 'center' }}>
              <input type="number" step="0.1" name="length" placeholder="Length" className="form-control" value={formData.length} onChange={handleChange} />
              <span>×</span>
              <input type="number" step="0.1" name="width" placeholder="Width" className="form-control" value={formData.width} onChange={handleChange} />
              <span>×</span>
              <input type="number" step="0.1" name="height" placeholder="Height" className="form-control" value={formData.height} onChange={handleChange} />
              <select name="dimension_unit" className="form-control" style={{ width: '80px' }} value={formData.dimension_unit} onChange={handleChange}>
                <option value="mm">mm</option>
                <option value="cm">cm</option>
                <option value="in">in</option>
              </select>
            </div>
          </div>

          <div className="form-group">
            <label className="form-label">Cost / Purchase Price (₹)</label>
            <input type="number" step="0.01" name="purchase_price" className="form-control" value={formData.purchase_price} onChange={handleChange} />
          </div>

          <div className="form-group">
            <label className="form-label">Retail / Selling Price (₹)</label>
            <input type="number" step="0.01" name="selling_price" className="form-control" value={formData.selling_price} onChange={handleChange} />
          </div>
        </div>

        {/* Section 3: Dynamic Category Specific Fields */}
        {selectedSubcategory && selectedSubcategory.custom_fields.length > 0 && (
          <div style={{ marginBottom: '1.5rem', background: 'rgba(56, 189, 248, 0.05)', padding: '1.25rem', borderRadius: '12px', border: '1px solid rgba(56, 189, 248, 0.2)' }}>
            <h3 style={{ fontSize: '1rem', color: 'var(--gold)', marginBottom: '0.85rem' }}>
              Specific Attributes for {selectedSubcategory.name}
            </h3>
            <div className="form-grid">
              {selectedSubcategory.custom_fields.map((field, idx) => (
                <div key={idx} className="form-group">
                  <label className="form-label">
                    {field.name} {field.required && '*'}
                  </label>
                  {field.type === 'select' ? (
                    <select
                      className="form-control"
                      value={formData.extra_attributes[field.name] || ''}
                      onChange={(e) => handleCustomFieldChange(field.name, e.target.value)}
                    >
                      <option value="">Select option...</option>
                      {field.options?.map((opt, oIdx) => (
                        <option key={oIdx} value={opt}>{opt}</option>
                      ))}
                    </select>
                  ) : (
                    <input
                      type={field.type || 'text'}
                      className="form-control"
                      placeholder={field.placeholder || ''}
                      value={formData.extra_attributes[field.name] || ''}
                      onChange={(e) => handleCustomFieldChange(field.name, e.target.value)}
                    />
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Section 4: Notes */}
        <div className="form-group" style={{ marginBottom: '2rem' }}>
          <label className="form-label">Item Notes / Description</label>
          <textarea
            name="notes"
            rows="3"
            className="form-control"
            placeholder="Enter hallmark details, certification serials, or craftsmanship notes..."
            value={formData.notes}
            onChange={handleChange}
          />
        </div>

        {/* Buttons */}
        <div style={{ display: 'flex', gap: '1rem', justifyContent: 'flex-end' }}>
          <button type="button" className="btn btn-secondary" onClick={onCancel}>
            Cancel
          </button>
          <button type="submit" className="btn btn-primary" disabled={isSubmitting}>
            <Save size={16} /> {isSubmitting ? 'Saving Item...' : isEdit ? 'Update Item' : 'Save Item to Stock'}
          </button>
        </div>
      </form>

      {/* Camera Capture Modal */}
      <CameraCaptureModal
        isOpen={showCameraModal}
        onClose={() => setShowCameraModal(false)}
        onCapture={handlePhotoCaptured}
      />
    </div>
  );
}
