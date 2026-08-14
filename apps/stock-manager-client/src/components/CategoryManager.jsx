import React, { useState } from 'react';
import { Layers, Plus, Trash2, CheckCircle2, AlertCircle, Settings, Tag } from 'lucide-react';

export default function CategoryManager({ categories, onRefresh }) {
  const [newCatName, setNewCatName] = useState('');
  const [newCatDesc, setNewCatDesc] = useState('');

  const [selectedCatId, setSelectedCatId] = useState('');
  const [newSubName, setNewSubName] = useState('');
  const [newSubDesc, setNewSubDesc] = useState('');

  // Custom fields builder state for subcategory
  const [customFields, setCustomFields] = useState([
    { name: '', type: 'text', placeholder: '', options: [], required: false }
  ]);

  const [message, setMessage] = useState({ type: '', text: '' });

  const handleAddCategory = async (e) => {
    e.preventDefault();
    if (!newCatName) return;

    try {
      const res = await fetch('/api/categories', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: newCatName, description: newCatDesc })
      });
      if (res.ok) {
        setNewCatName('');
        setNewCatDesc('');
        setMessage({ type: 'success', text: 'Category created successfully!' });
        onRefresh();
      }
    } catch (err) {
      setMessage({ type: 'error', text: 'Failed to create category.' });
    }
  };

  const handleAddFieldRow = () => {
    setCustomFields(prev => [...prev, { name: '', type: 'text', placeholder: '', options: [], required: false }]);
  };

  const handleRemoveFieldRow = (index) => {
    setCustomFields(prev => prev.filter((_, idx) => idx !== index));
  };

  const handleFieldChange = (index, prop, value) => {
    setCustomFields(prev => {
      const updated = [...prev];
      if (prop === 'options') {
        updated[index][prop] = value.split(',').map(s => s.trim());
      } else {
        updated[index][prop] = value;
      }
      return updated;
    });
  };

  const handleAddSubcategory = async (e) => {
    e.preventDefault();
    if (!selectedCatId || !newSubName) {
      setMessage({ type: 'error', text: 'Please select a parent category and subcategory name.' });
      return;
    }

    const validFields = customFields.filter(f => f.name.trim() !== '');

    try {
      const res = await fetch('/api/subcategories', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          category_id: parseInt(selectedCatId),
          name: newSubName,
          description: newSubDesc,
          custom_fields: validFields
        })
      });
      if (res.ok) {
        setNewSubName('');
        setNewSubDesc('');
        setCustomFields([{ name: '', type: 'text', placeholder: '', options: [], required: false }]);
        setMessage({ type: 'success', text: 'Subcategory with custom attributes created!' });
        onRefresh();
      }
    } catch (err) {
      setMessage({ type: 'error', text: 'Failed to create subcategory.' });
    }
  };

  const handleDeleteCategory = async (id) => {
    if (!window.confirm('Delete this category? Subcategories under it will also be deleted.')) return;
    try {
      await fetch(`/api/categories/${id}`, { method: 'DELETE' });
      onRefresh();
    } catch (err) {
      console.error(err);
    }
  };

  const handleDeleteSubcategory = async (id) => {
    if (!window.confirm('Delete this subcategory?')) return;
    try {
      await fetch(`/api/subcategories/${id}`, { method: 'DELETE' });
      onRefresh();
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
      
      {message.text && (
        <div style={{
          padding: '0.85rem 1rem',
          borderRadius: '10px',
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

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '2rem' }}>
        
        {/* Form 1: Create Main Category */}
        <div className="glass-panel" style={{ padding: '1.75rem' }}>
          <h2 style={{ fontSize: '1.2rem', color: '#fff', marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <Layers size={20} style={{ color: 'var(--primary)' }} />
            Create Main Category
          </h2>
          <form onSubmit={handleAddCategory}>
            <div className="form-group">
              <label className="form-label">Category Name *</label>
              <input
                type="text"
                className="form-control"
                placeholder="e.g. Gemstones & Pearls"
                value={newCatName}
                onChange={(e) => setNewCatName(e.target.value)}
                required
              />
            </div>
            <div className="form-group">
              <label className="form-label">Description</label>
              <input
                type="text"
                className="form-control"
                placeholder="Short description of this category"
                value={newCatDesc}
                onChange={(e) => setNewCatDesc(e.target.value)}
              />
            </div>
            <button type="submit" className="btn btn-primary" style={{ width: '100%', marginTop: '0.5rem' }}>
              <Plus size={16} /> Add Category
            </button>
          </form>
        </div>

        {/* Form 2: Create Subcategory + Custom Schema Fields */}
        <div className="glass-panel" style={{ padding: '1.75rem' }}>
          <h2 style={{ fontSize: '1.2rem', color: '#fff', marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <Tag size={20} style={{ color: 'var(--gold)' }} />
            Create Subcategory & Custom Attributes
          </h2>
          <form onSubmit={handleAddSubcategory}>
            <div className="form-group">
              <label className="form-label">Parent Category *</label>
              <select
                className="form-control"
                value={selectedCatId}
                onChange={(e) => setSelectedCatId(e.target.value)}
                required
              >
                <option value="">Select Parent Category...</option>
                {categories.map(cat => (
                  <option key={cat.id} value={cat.id}>{cat.name}</option>
                ))}
              </select>
            </div>

            <div className="form-group">
              <label className="form-label">Subcategory Name *</label>
              <input
                type="text"
                className="form-control"
                placeholder="e.g. Loose Diamonds, Solitaires"
                value={newSubName}
                onChange={(e) => setNewSubName(e.target.value)}
                required
              />
            </div>

            {/* Custom Field Definition List */}
            <div style={{ marginTop: '1rem', marginBottom: '1rem' }}>
              <label className="form-label" style={{ marginBottom: '0.5rem', display: 'block', color: 'var(--gold)' }}>
                Category-Specific Custom Fields
              </label>
              
              {customFields.map((field, idx) => (
                <div key={idx} style={{ background: 'rgba(0, 0, 0, 0.3)', padding: '0.75rem', borderRadius: '8px', marginBottom: '0.5rem', border: '1px solid var(--border-color)' }}>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 100px 30px', gap: '0.5rem', alignItems: 'center' }}>
                    <input
                      type="text"
                      className="form-control"
                      placeholder="Field Name (e.g. Cut Grade)"
                      value={field.name}
                      onChange={(e) => handleFieldChange(idx, 'name', e.target.value)}
                    />
                    <select
                      className="form-control"
                      value={field.type}
                      onChange={(e) => handleFieldChange(idx, 'type', e.target.value)}
                    >
                      <option value="text">Text</option>
                      <option value="number">Number</option>
                      <option value="select">Dropdown</option>
                    </select>
                    <button type="button" className="btn btn-danger btn-sm" onClick={() => handleRemoveFieldRow(idx)}>
                      <Trash2 size={14} />
                    </button>
                  </div>
                  {field.type === 'select' && (
                    <input
                      type="text"
                      className="form-control"
                      placeholder="Options separated by comma (e.g. VVS1, VVS2, VS1)"
                      style={{ marginTop: '0.4rem', fontSize: '0.8rem' }}
                      value={field.options.join(', ')}
                      onChange={(e) => handleFieldChange(idx, 'options', e.target.value)}
                    />
                  )}
                </div>
              ))}

              <button type="button" className="btn btn-secondary btn-sm" onClick={handleAddFieldRow} style={{ marginTop: '0.4rem' }}>
                <Plus size={14} /> Add Another Attribute Field
              </button>
            </div>

            <button type="submit" className="btn btn-gold" style={{ width: '100%' }}>
              <Plus size={16} /> Save Subcategory & Fields
            </button>
          </form>
        </div>

      </div>

      {/* Existing Categories & Subcategories Hierarchy List */}
      <div className="glass-panel" style={{ padding: '1.75rem' }}>
        <h2 style={{ fontSize: '1.3rem', color: '#fff', marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <Settings size={20} style={{ color: 'var(--primary)' }} />
          Active Category Hierarchy & Schemas
        </h2>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
          {categories.map(cat => (
            <div key={cat.id} style={{ background: 'rgba(15, 23, 42, 0.6)', padding: '1.25rem', borderRadius: '12px', border: '1px solid var(--border-color)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
                <div>
                  <h3 style={{ fontSize: '1.1rem', color: 'var(--primary)', fontWeight: '700' }}>{cat.name}</h3>
                  {cat.description && <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>{cat.description}</p>}
                </div>
                <button className="btn btn-danger btn-sm" onClick={() => handleDeleteCategory(cat.id)}>
                  <Trash2 size={14} /> Delete Category
                </button>
              </div>

              {/* Subcategory Pills */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', marginTop: '0.5rem' }}>
                {cat.subcategories.length === 0 ? (
                  <p style={{ fontSize: '0.82rem', color: 'var(--text-dim)', italic: 'true' }}>No subcategories created yet.</p>
                ) : (
                  cat.subcategories.map(sub => (
                    <div key={sub.id} style={{ background: 'rgba(0, 0, 0, 0.25)', padding: '0.65rem 0.85rem', borderRadius: '8px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <div>
                        <span style={{ fontWeight: '600', color: '#fff', fontSize: '0.9rem' }}>{sub.name}</span>
                        
                        {/* Render schema badge list */}
                        {sub.custom_fields && sub.custom_fields.length > 0 && (
                          <div style={{ display: 'flex', gap: '0.4rem', marginTop: '0.25rem', flexWrap: 'wrap' }}>
                            {sub.custom_fields.map((field, fIdx) => (
                              <span key={fIdx} className="badge badge-gold" style={{ fontSize: '0.7rem' }}>
                                {field.name} ({field.type})
                              </span>
                            ))}
                          </div>
                        )}
                      </div>
                      <button className="btn btn-secondary btn-sm" onClick={() => handleDeleteSubcategory(sub.id)}>
                        <Trash2 size={12} />
                      </button>
                    </div>
                  ))
                )}
              </div>
            </div>
          ))}
        </div>
      </div>

    </div>
  );
}
