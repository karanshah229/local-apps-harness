import React, { useState } from 'react';
import { Search, Filter, Plus, Grid, List, Edit2, Trash2, Eye, ShieldCheck, Scale, Maximize2 } from 'lucide-react';

export default function StockLibrary({ items, categories, onAddNew, onEdit, onDelete, onViewDetail, onFilterChange, currentFilters }) {
  const [viewMode, setViewMode] = useState('grid'); // 'grid' | 'table'

  return (
    <div>
      {/* Top Controls Bar */}
      <div className="glass-panel" style={{ padding: '1.25rem', marginBottom: '1.5rem' }}>
        <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between' }}>
          
          {/* Search Box */}
          <div style={{ position: 'relative', flex: '1', minWidth: '260px' }}>
            <Search size={18} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
            <input
              type="text"
              className="form-control"
              placeholder="Search by code, item name, notes, or certificate..."
              style={{ paddingLeft: '2.5rem', width: '100%' }}
              value={currentFilters.search || ''}
              onChange={(e) => onFilterChange({ ...currentFilters, search: e.target.value })}
            />
          </div>

          {/* Filter Dropdowns */}
          <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap', alignItems: 'center' }}>
            
            {/* Category Filter */}
            <select
              className="form-control"
              style={{ width: '170px' }}
              value={currentFilters.category_id || ''}
              onChange={(e) => onFilterChange({ ...currentFilters, category_id: e.target.value })}
            >
              <option value="">All Categories</option>
              {categories.map(cat => (
                <option key={cat.id} value={cat.id}>{cat.name}</option>
              ))}
            </select>

            {/* Purity Filter */}
            <select
              className="form-control"
              style={{ width: '160px' }}
              value={currentFilters.purity || ''}
              onChange={(e) => onFilterChange({ ...currentFilters, purity: e.target.value })}
            >
              <option value="">All Purities</option>
              <option value="24K (99.9%)">24K (99.9%)</option>
              <option value="22K (91.6%)">22K (91.6%)</option>
              <option value="18K (75.0%)">18K (75.0%)</option>
              <option value="925 Sterling Silver">925 Silver</option>
            </select>

            {/* Sort Dropdown */}
            <select
              className="form-control"
              style={{ width: '160px' }}
              value={currentFilters.sort || ''}
              onChange={(e) => onFilterChange({ ...currentFilters, sort: e.target.value })}
            >
              <option value="">Newest First</option>
              <option value="weight_desc">Highest Weight</option>
              <option value="price_desc">Highest Price</option>
              <option value="name_asc">Name (A-Z)</option>
            </select>

            {/* View Mode Toggle */}
            <div style={{ display: 'flex', background: 'rgba(15, 23, 42, 0.8)', padding: '3px', borderRadius: '8px', border: '1px solid var(--border-color)' }}>
              <button
                className={`btn btn-sm ${viewMode === 'grid' ? 'btn-primary' : ''}`}
                style={{ padding: '0.4rem 0.6rem', background: viewMode === 'grid' ? undefined : 'transparent' }}
                onClick={() => setViewMode('grid')}
                title="Grid View"
              >
                <Grid size={16} />
              </button>
              <button
                className={`btn btn-sm ${viewMode === 'table' ? 'btn-primary' : ''}`}
                style={{ padding: '0.4rem 0.6rem', background: viewMode === 'table' ? undefined : 'transparent' }}
                onClick={() => setViewMode('table')}
                title="Table View"
              >
                <List size={16} />
              </button>
            </div>

            {/* Add New Stock Button */}
            <button className="btn btn-gold" onClick={onAddNew}>
              <Plus size={16} /> Add Stock Item
            </button>
          </div>

        </div>
      </div>

      {/* Item List Display */}
      {items.length === 0 ? (
        <div className="glass-panel" style={{ padding: '4rem', textAlign: 'center', color: 'var(--text-muted)' }}>
          <Scale size={48} style={{ marginBottom: '1rem', color: 'var(--primary)', opacity: 0.7 }} />
          <h3 style={{ fontSize: '1.25rem', color: '#fff', marginBottom: '0.5rem' }}>No Stock Items Found</h3>
          <p style={{ marginBottom: '1.5rem' }}>Try clearing your search query or add a new stock item to your inventory.</p>
          <button className="btn btn-gold" onClick={onAddNew}><Plus size={16} /> Add Stock Item</button>
        </div>
      ) : (
        <>
          {viewMode === 'grid' ? (
            <div className="grid-3">
              {items.map(item => (
                <div key={item.id} className="glass-panel stock-card">
                  <div className="stock-img-container">
                    <img
                      src={item.image_path || '/sample_goldbar.svg'}
                      alt={item.name}
                      className="stock-img"
                      onError={(e) => { e.target.onerror = null; e.target.src = '/sample_goldbar.svg'; }}
                    />
                    <div style={{ position: 'absolute', top: '10px', left: '10px' }}>
                      <span className="badge badge-gold">{item.purity || 'N/A'}</span>
                    </div>
                    <div style={{ position: 'absolute', top: '10px', right: '10px' }}>
                      <span className="badge badge-cyan">{item.item_code}</span>
                    </div>
                  </div>

                  <div className="stock-card-body">
                    <h3 className="stock-title">{item.name}</h3>
                    <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: '0.5rem' }}>
                      {item.category_name} • {item.subcategory_name || 'Standard'}
                    </p>

                    <div className="stock-specs">
                      <div className="spec-item">
                        Weight: <strong>{item.weight} {item.weight_unit}</strong>
                      </div>
                      <div className="spec-item">
                        Qty: <strong>{item.quantity}</strong>
                      </div>
                      <div className="spec-item" style={{ gridColumn: 'span 2' }}>
                        Selling Price: <strong style={{ color: 'var(--gold)' }}>₹{Number(item.selling_price).toLocaleString()}</strong>
                      </div>
                    </div>

                    {/* Extra Attributes Preview */}
                    {Object.keys(item.extra_attributes || {}).length > 0 && (
                      <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)', marginBottom: '0.75rem', background: 'rgba(255,255,255,0.03)', padding: '0.4rem 0.6rem', borderRadius: '6px' }}>
                        {Object.entries(item.extra_attributes).slice(0, 2).map(([k, v], idx) => (
                          <div key={idx}><strong>{k}:</strong> {String(v)}</div>
                        ))}
                      </div>
                    )}

                    <div style={{ marginTop: 'auto', display: 'flex', gap: '0.5rem', paddingTop: '0.75rem', borderTop: '1px solid var(--border-color)' }}>
                      <button className="btn btn-secondary btn-sm" style={{ flex: 1 }} onClick={() => onViewDetail(item)}>
                        <Eye size={14} /> View
                      </button>
                      <button className="btn btn-secondary btn-sm" onClick={() => onEdit(item)}>
                        <Edit2 size={14} />
                      </button>
                      <button className="btn btn-danger btn-sm" onClick={() => onDelete(item.id)}>
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="glass-panel" style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.9rem' }}>
                <thead>
                  <tr style={{ borderBottom: '1px solid var(--border-color)', color: 'var(--text-muted)' }}>
                    <th style={{ padding: '1rem' }}>Photo</th>
                    <th style={{ padding: '1rem' }}>Code</th>
                    <th style={{ padding: '1rem' }}>Item Name</th>
                    <th style={{ padding: '1rem' }}>Category</th>
                    <th style={{ padding: '1rem' }}>Weight</th>
                    <th style={{ padding: '1rem' }}>Purity</th>
                    <th style={{ padding: '1rem' }}>Selling Price</th>
                    <th style={{ padding: '1rem', textAlign: 'right' }}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {items.map(item => (
                    <tr key={item.id} style={{ borderBottom: '1px solid var(--border-color)' }}>
                      <td style={{ padding: '0.75rem 1rem' }}>
                        <img
                          src={item.image_path || '/sample_goldbar.svg'}
                          alt={item.name}
                          style={{ width: '42px', height: '42px', borderRadius: '8px', objectFit: 'cover', background: '#000' }}
                          onError={(e) => { e.target.onerror = null; e.target.src = '/sample_goldbar.svg'; }}
                        />
                      </td>
                      <td style={{ padding: '0.75rem 1rem', fontFamily: 'monospace', color: 'var(--primary)' }}>{item.item_code}</td>
                      <td style={{ padding: '0.75rem 1rem', fontWeight: '600', color: '#fff' }}>{item.name}</td>
                      <td style={{ padding: '0.75rem 1rem', color: 'var(--text-muted)' }}>{item.category_name}</td>
                      <td style={{ padding: '0.75rem 1rem' }}>{item.weight} {item.weight_unit}</td>
                      <td style={{ padding: '0.75rem 1rem' }}>
                        <span className="badge badge-gold">{item.purity}</span>
                      </td>
                      <td style={{ padding: '0.75rem 1rem', fontWeight: '600', color: 'var(--gold)' }}>₹{Number(item.selling_price).toLocaleString()}</td>
                      <td style={{ padding: '0.75rem 1rem', textAlign: 'right' }}>
                        <div style={{ display: 'inline-flex', gap: '0.4rem' }}>
                          <button className="btn btn-secondary btn-sm" onClick={() => onViewDetail(item)}><Eye size={14}/></button>
                          <button className="btn btn-secondary btn-sm" onClick={() => onEdit(item)}><Edit2 size={14}/></button>
                          <button className="btn btn-danger btn-sm" onClick={() => onDelete(item.id)}><Trash2 size={14}/></button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </>
      )}
    </div>
  );
}
