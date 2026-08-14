import React from 'react';
import { X, Scale, Maximize, Edit2, ShieldCheck, Tag } from 'lucide-react';

export default function ItemDetailModal({ item, onClose, onEdit }) {
  if (!item) return null;

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" style={{ maxWidth: '750px' }} onClick={e => e.stopPropagation()}>
        
        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
          <div>
            <span className="badge badge-cyan" style={{ marginBottom: '0.4rem' }}>{item.item_code}</span>
            <h2 style={{ fontSize: '1.5rem', color: '#fff' }}>{item.name}</h2>
          </div>
          <button className="btn btn-secondary btn-sm" onClick={onClose}><X size={18} /></button>
        </div>

        {/* Layout Grid */}
        <div style={{ display: 'grid', gridTemplateColumns: '280px 1fr', gap: '1.5rem' }}>
          
          {/* Photo */}
          <div style={{ background: '#020617', borderRadius: '12px', overflow: 'hidden', height: '280px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <img
              src={item.image_path || '/sample_goldbar.svg'}
              alt={item.name}
              style={{ width: '100%', height: '100%', objectFit: 'contain' }}
              onError={(e) => { e.target.onerror = null; e.target.src = '/sample_goldbar.svg'; }}
            />
          </div>

          {/* Details */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            
            <div style={{ background: 'rgba(255, 255, 255, 0.03)', padding: '1rem', borderRadius: '10px' }}>
              <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>Category & Subcategory</div>
              <div style={{ color: '#fff', fontWeight: '600', fontSize: '1rem' }}>
                {item.category_name} &gt; {item.subcategory_name || 'General'}
              </div>
            </div>

            <div className="form-grid" style={{ gridTemplateColumns: '1fr 1fr' }}>
              <div style={{ background: 'rgba(255, 255, 255, 0.03)', padding: '0.85rem', borderRadius: '8px' }}>
                <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Weight</div>
                <div style={{ color: 'var(--primary)', fontWeight: '700', fontSize: '1.1rem' }}>
                  {item.weight} {item.weight_unit}
                </div>
              </div>

              <div style={{ background: 'rgba(255, 255, 255, 0.03)', padding: '0.85rem', borderRadius: '8px' }}>
                <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Purity Grade</div>
                <div style={{ color: 'var(--gold)', fontWeight: '700', fontSize: '1.1rem' }}>
                  {item.purity}
                </div>
              </div>

              <div style={{ background: 'rgba(255, 255, 255, 0.03)', padding: '0.85rem', borderRadius: '8px' }}>
                <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Dimensions (L×W×H)</div>
                <div style={{ color: '#fff', fontWeight: '600' }}>
                  {item.length || 0}×{item.width || 0}×{item.height || 0} {item.dimension_unit}
                </div>
              </div>

              <div style={{ background: 'rgba(255, 255, 255, 0.03)', padding: '0.85rem', borderRadius: '8px' }}>
                <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Quantity Available</div>
                <div style={{ color: 'var(--emerald)', fontWeight: '700', fontSize: '1.1rem' }}>
                  {item.quantity} pcs
                </div>
              </div>
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between', background: 'rgba(251, 191, 36, 0.1)', padding: '0.85rem 1rem', borderRadius: '8px', border: '1px solid rgba(251, 191, 36, 0.25)' }}>
              <div>
                <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Purchase Cost: </span>
                <strong>₹{Number(item.purchase_price).toLocaleString()}</strong>
              </div>
              <div>
                <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Selling Retail: </span>
                <strong style={{ color: 'var(--gold)', fontSize: '1.1rem' }}>₹{Number(item.selling_price).toLocaleString()}</strong>
              </div>
            </div>

          </div>
        </div>

        {/* Custom Attributes Section */}
        {Object.keys(item.extra_attributes || {}).length > 0 && (
          <div style={{ marginTop: '1.5rem', background: 'rgba(56, 189, 248, 0.05)', padding: '1rem', borderRadius: '10px', border: '1px solid rgba(56, 189, 248, 0.2)' }}>
            <h4 style={{ fontSize: '0.9rem', color: 'var(--primary)', marginBottom: '0.65rem', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
              <Tag size={16} /> Category Specific Attributes
            </h4>
            <div className="form-grid" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))' }}>
              {Object.entries(item.extra_attributes).map(([k, v], idx) => (
                <div key={idx} style={{ background: 'rgba(0, 0, 0, 0.3)', padding: '0.5rem 0.75rem', borderRadius: '6px' }}>
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{k}</div>
                  <div style={{ fontSize: '0.9rem', color: '#fff', fontWeight: '500' }}>{String(v)}</div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Notes */}
        {item.notes && (
          <div style={{ marginTop: '1rem', color: 'var(--text-muted)', fontSize: '0.85rem', background: 'rgba(255,255,255,0.02)', padding: '0.75rem', borderRadius: '8px' }}>
            <strong style={{ color: '#fff' }}>Notes: </strong>{item.notes}
          </div>
        )}

        {/* Action Buttons */}
        <div style={{ marginTop: '1.5rem', display: 'flex', justifyContent: 'flex-end', gap: '0.75rem' }}>
          <button className="btn btn-secondary" onClick={onClose}>Close</button>
          <button className="btn btn-primary" onClick={() => { onClose(); onEdit(item); }}>
            <Edit2 size={16} /> Edit Details
          </button>
        </div>

      </div>
    </div>
  );
}
