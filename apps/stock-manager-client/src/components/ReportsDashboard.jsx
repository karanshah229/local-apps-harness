import React from 'react';
import { Chart as ChartJS, CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend, ArcElement } from 'chart.js';
import { Bar, Doughnut } from 'react-chartjs-2';
import { DollarSign, Package, Scale, Download, Award, TrendingUp } from 'lucide-react';

ChartJS.register(CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend, ArcElement);

export default function ReportsDashboard({ reportsData, items }) {
  if (!reportsData) {
    return <div className="glass-panel" style={{ padding: '3rem', textAlign: 'center' }}>Loading reports...</div>;
  }

  const { summary, byCategory, byPurity, recentItems } = reportsData;

  // Bar Chart Data (Value by Category)
  const barData = {
    labels: byCategory.map(c => c.category_name || 'Uncategorized'),
    datasets: [
      {
        label: 'Stock Value (₹)',
        data: byCategory.map(c => c.total_value || 0),
        backgroundColor: 'rgba(56, 189, 248, 0.75)',
        borderColor: '#38bdf8',
        borderWidth: 1.5,
        borderRadius: 8,
      }
    ]
  };

  const barOptions = {
    responsive: true,
    plugins: {
      legend: { display: false },
      title: { display: true, text: 'Stock Retail Valuation by Category (₹)', color: '#f3f4f6', font: { size: 14 } }
    },
    scales: {
      x: { ticks: { color: '#9ca3af' }, grid: { color: 'rgba(255,255,255,0.05)' } },
      y: { ticks: { color: '#9ca3af' }, grid: { color: 'rgba(255,255,255,0.05)' } }
    }
  };

  // Doughnut Chart Data (Purity Distribution)
  const doughnutData = {
    labels: byPurity.map(p => p.purity || 'N/A'),
    datasets: [
      {
        data: byPurity.map(p => p.count || 0),
        backgroundColor: [
          '#fbbf24',
          '#38bdf8',
          '#10b981',
          '#a855f7',
          '#f43f5e',
          '#64748b'
        ],
        borderWidth: 0
      }
    ]
  };

  const doughnutOptions = {
    responsive: true,
    plugins: {
      legend: { position: 'right', labels: { color: '#f3f4f6' } },
      title: { display: true, text: 'Inventory Split by Purity Grade', color: '#f3f4f6', font: { size: 14 } }
    }
  };

  // CSV Export Handler
  const handleExportCSV = () => {
    if (!items || items.length === 0) return;

    const headers = [
      'Item Code', 'Item Name', 'Category', 'Subcategory', 'Weight', 'Weight Unit',
      'Purity', 'Quantity', 'Purchase Price', 'Selling Price', 'Notes'
    ];

    const rows = items.map(item => [
      `"${item.item_code}"`,
      `"${item.name.replace(/"/g, '""')}"`,
      `"${item.category_name || ''}"`,
      `"${item.subcategory_name || ''}"`,
      item.weight,
      `"${item.weight_unit}"`,
      `"${item.purity}"`,
      item.quantity,
      item.purchase_price,
      item.selling_price,
      `"${(item.notes || '').replace(/"/g, '""')}"`
    ]);

    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `Stock_Report_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
      
      {/* Action Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h2 style={{ fontSize: '1.5rem', color: '#fff' }}>Analytics & Stock Reports</h2>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>Real-time inventory metrics, purity distribution, and export options.</p>
        </div>
        <button className="btn btn-gold" onClick={handleExportCSV}>
          <Download size={16} /> Export CSV Report
        </button>
      </div>

      {/* Metric Cards Row */}
      <div className="grid-4">
        
        <div className="glass-panel stat-card">
          <div className="stat-icon" style={{ background: 'rgba(56, 189, 248, 0.15)', color: 'var(--primary)' }}>
            <Package size={24} />
          </div>
          <div>
            <div className="stat-val">{summary.total_items}</div>
            <div className="stat-label">Total Unique Items ({summary.total_quantity} pcs)</div>
          </div>
        </div>

        <div className="glass-panel stat-card">
          <div className="stat-icon" style={{ background: 'rgba(251, 191, 36, 0.15)', color: 'var(--gold)' }}>
            <TrendingUp size={24} />
          </div>
          <div>
            <div className="stat-val">₹{Number(summary.total_retail_valuation).toLocaleString()}</div>
            <div className="stat-label">Retail Stock Valuation</div>
          </div>
        </div>

        <div className="glass-panel stat-card">
          <div className="stat-icon" style={{ background: 'rgba(16, 185, 129, 0.15)', color: 'var(--emerald)' }}>
            <Scale size={24} />
          </div>
          <div>
            <div className="stat-val">{summary.total_weight_grams.toFixed(1)} g</div>
            <div className="stat-label">Total Stock Weight</div>
          </div>
        </div>

        <div className="glass-panel stat-card">
          <div className="stat-icon" style={{ background: 'rgba(168, 85, 247, 0.15)', color: '#a855f7' }}>
            <Award size={24} />
          </div>
          <div>
            <div className="stat-val">
              ₹{Number(summary.total_retail_valuation - summary.total_cost_valuation).toLocaleString()}
            </div>
            <div className="stat-label">Est. Potential Margin</div>
          </div>
        </div>

      </div>

      {/* Visual Charts Row */}
      <div style={{ display: 'grid', gridTemplateColumns: '1.4fr 1fr', gap: '1.5rem' }}>
        <div className="glass-panel" style={{ padding: '1.5rem', height: '340px' }}>
          <Bar data={barData} options={barOptions} />
        </div>

        <div className="glass-panel" style={{ padding: '1.5rem', height: '340px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <Doughnut data={doughnutData} options={doughnutOptions} />
        </div>
      </div>

      {/* Recent Items Activity Table */}
      <div className="glass-panel" style={{ padding: '1.5rem' }}>
        <h3 style={{ fontSize: '1.1rem', color: '#fff', marginBottom: '1rem' }}>Recently Added Stock Items</h3>
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.88rem' }}>
            <thead>
              <tr style={{ borderBottom: '1px solid var(--border-color)', color: 'var(--text-muted)', textAlign: 'left' }}>
                <th style={{ padding: '0.65rem 0.85rem' }}>Code</th>
                <th style={{ padding: '0.65rem 0.85rem' }}>Item Name</th>
                <th style={{ padding: '0.65rem 0.85rem' }}>Category</th>
                <th style={{ padding: '0.65rem 0.85rem' }}>Weight</th>
                <th style={{ padding: '0.65rem 0.85rem' }}>Purity</th>
                <th style={{ padding: '0.65rem 0.85rem' }}>Price</th>
              </tr>
            </thead>
            <tbody>
              {recentItems.map(item => (
                <tr key={item.id} style={{ borderBottom: '1px solid var(--border-color)' }}>
                  <td style={{ padding: '0.65rem 0.85rem', fontFamily: 'monospace', color: 'var(--primary)' }}>{item.item_code}</td>
                  <td style={{ padding: '0.65rem 0.85rem', color: '#fff', fontWeight: '500' }}>{item.name}</td>
                  <td style={{ padding: '0.65rem 0.85rem', color: 'var(--text-muted)' }}>{item.category_name}</td>
                  <td style={{ padding: '0.65rem 0.85rem' }}>{item.weight} {item.weight_unit}</td>
                  <td style={{ padding: '0.65rem 0.85rem' }}><span className="badge badge-gold">{item.purity}</span></td>
                  <td style={{ padding: '0.65rem 0.85rem', color: 'var(--gold)', fontWeight: '600' }}>₹{Number(item.selling_price).toLocaleString()}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

    </div>
  );
}
