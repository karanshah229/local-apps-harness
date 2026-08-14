import React, { useState, useEffect } from 'react';
import { Package, PlusCircle, Layers, BarChart3, Shield, RefreshCw } from 'lucide-react';
import StockLibrary from './components/StockLibrary';
import StockForm from './components/StockForm';
import CategoryManager from './components/CategoryManager';
import ReportsDashboard from './components/ReportsDashboard';
import ItemDetailModal from './components/ItemDetailModal';

export default function App() {
  const [activeTab, setActiveTab] = useState('library'); // 'library' | 'add' | 'categories' | 'reports'
  
  const [items, setItems] = useState([]);
  const [categories, setCategories] = useState([]);
  const [reportsData, setReportsData] = useState(null);
  const [isLoading, setIsLoading] = useState(true);

  const [editingItem, setEditingItem] = useState(null);
  const [detailItem, setDetailItem] = useState(null);

  const [filters, setFilters] = useState({
    search: '',
    category_id: '',
    subcategory_id: '',
    purity: '',
    sort: ''
  });

  // Fetch all initial data
  useEffect(() => {
    fetchCategories();
    fetchReports();
  }, []);

  // Re-fetch items when filters or activeTab changes
  useEffect(() => {
    fetchItems();
  }, [filters]);

  const fetchItems = async () => {
    try {
      const queryParams = new URLSearchParams();
      if (filters.search) queryParams.append('search', filters.search);
      if (filters.category_id) queryParams.append('category_id', filters.category_id);
      if (filters.purity) queryParams.append('purity', filters.purity);
      if (filters.sort) queryParams.append('sort', filters.sort);

      const res = await fetch(`/api/items?${queryParams.toString()}`);
      if (res.ok) {
        const data = await res.json();
        setItems(data);
      }
    } catch (err) {
      console.error('Failed to fetch items:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const fetchCategories = async () => {
    try {
      const res = await fetch('/api/categories');
      if (res.ok) {
        const data = await res.json();
        setCategories(data);
      }
    } catch (err) {
      console.error('Failed to fetch categories:', err);
    }
  };

  const fetchReports = async () => {
    try {
      const res = await fetch('/api/reports');
      if (res.ok) {
        const data = await res.json();
        setReportsData(data);
      }
    } catch (err) {
      console.error('Failed to fetch reports:', err);
    }
  };

  const handleRefreshAll = () => {
    setIsLoading(true);
    fetchItems();
    fetchCategories();
    fetchReports();
  };

  const handleDeleteItem = async (id) => {
    if (!window.confirm('Are you sure you want to delete this stock item?')) return;
    try {
      const res = await fetch(`/api/items/${id}`, { method: 'DELETE' });
      if (res.ok) {
        handleRefreshAll();
      }
    } catch (err) {
      console.error('Failed to delete item:', err);
    }
  };

  return (
    <div className="app-container">
      
      {/* Sidebar Navigation */}
      <aside className="sidebar">
        <div className="sidebar-logo">
          <div className="icon-box">
            <Shield size={22} />
          </div>
          <span>StockVault</span>
        </div>

        <ul className="nav-list">
          <li
            className={`nav-item ${activeTab === 'library' ? 'active' : ''}`}
            onClick={() => { setActiveTab('library'); setEditingItem(null); }}
          >
            <Package size={18} /> Inventory Library
          </li>
          <li
            className={`nav-item ${activeTab === 'add' ? 'active' : ''}`}
            onClick={() => { setActiveTab('add'); setEditingItem(null); }}
          >
            <PlusCircle size={18} /> Add Stock Item
          </li>
          <li
            className={`nav-item ${activeTab === 'categories' ? 'active' : ''}`}
            onClick={() => setActiveTab('categories')}
          >
            <Layers size={18} /> Categories & Attributes
          </li>
          <li
            className={`nav-item ${activeTab === 'reports' ? 'active' : ''}`}
            onClick={() => { setActiveTab('reports'); fetchReports(); }}
          >
            <BarChart3 size={18} /> Reports & Analytics
          </li>
        </ul>

        {/* System Info Footnote */}
        <div style={{ marginTop: 'auto', padding: '1rem 0.5rem', borderTop: '1px solid var(--border-color)', fontSize: '0.78rem', color: 'var(--text-muted)' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.25rem' }}>
            <span style={{ color: 'var(--emerald)', fontWeight: '600' }}>● SQLite Connected</span>
            <button className="btn btn-secondary btn-sm" onClick={handleRefreshAll} style={{ padding: '0.2rem 0.4rem' }}>
              <RefreshCw size={12} />
            </button>
          </div>
          <div>Stock Vault v1.0.0</div>
        </div>
      </aside>

      {/* Main Workspace Area */}
      <main className="main-content">
        
        {/* Header Bar */}
        <header className="top-header">
          <div className="header-title">
            <h1>
              {activeTab === 'library' && 'Inventory Library'}
              {activeTab === 'add' && (editingItem ? 'Edit Stock Item' : 'New Stock Item')}
              {activeTab === 'categories' && 'Category & Attribute Builder'}
              {activeTab === 'reports' && 'Reports & Stock Analytics'}
            </h1>
            <p>
              {activeTab === 'library' && `Managing ${items.length} total items in active inventory`}
              {activeTab === 'add' && 'Snap or upload photo, select category schema, and store specs.'}
              {activeTab === 'categories' && 'Configure custom attribute schemas specific to each category.'}
              {activeTab === 'reports' && 'Financial valuations, weight distribution, and export functions.'}
            </p>
          </div>

          <div style={{ display: 'flex', gap: '0.75rem' }}>
            <button className="btn btn-gold" onClick={() => { setActiveTab('add'); setEditingItem(null); }}>
              <PlusCircle size={16} /> Quick Add Item
            </button>
          </div>
        </header>

        {/* Dynamic View Rendering */}
        {isLoading ? (
          <div className="glass-panel" style={{ padding: '4rem', textAlign: 'center', color: 'var(--text-muted)' }}>
            Loading inventory database...
          </div>
        ) : (
          <>
            {activeTab === 'library' && (
              <StockLibrary
                items={items}
                categories={categories}
                currentFilters={filters}
                onFilterChange={setFilters}
                onAddNew={() => { setActiveTab('add'); setEditingItem(null); }}
                onEdit={(item) => { setEditingItem(item); setActiveTab('add'); }}
                onDelete={handleDeleteItem}
                onViewDetail={setDetailItem}
              />
            )}

            {activeTab === 'add' && (
              <StockForm
                categories={categories}
                initialData={editingItem}
                onSave={() => { handleRefreshAll(); setActiveTab('library'); setEditingItem(null); }}
                onCancel={() => { setActiveTab('library'); setEditingItem(null); }}
              />
            )}

            {activeTab === 'categories' && (
              <CategoryManager
                categories={categories}
                onRefresh={handleRefreshAll}
              />
            )}

            {activeTab === 'reports' && (
              <ReportsDashboard
                reportsData={reportsData}
                items={items}
              />
            )}
          </>
        )}

      </main>

      {/* Item Detail Lightbox Modal */}
      {detailItem && (
        <ItemDetailModal
          item={detailItem}
          onClose={() => setDetailItem(null)}
          onEdit={(item) => { setEditingItem(item); setActiveTab('add'); }}
        />
      )}

    </div>
  );
}
