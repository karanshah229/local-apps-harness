/* ==========================================================================
   SIP OF GOLD - REPORTS & ANALYTICS MODULE
   Generates detailed ledgers, revenue audits, lucky draw payouts,
   and exports CSV reports.
   ========================================================================== */

class ReportsEngine {
  /**
   * Filter payment installments based on criteria
   */
  getFilteredLedger(state, filters = {}) {
    let list = [...state.installments];

    if (filters.sipId && filters.sipId !== 'all') {
      list = list.filter(i => i.sipId === filters.sipId);
    }
    if (filters.status && filters.status !== 'all') {
      list = list.filter(i => i.status === filters.status);
    }
    if (filters.searchTerm) {
      const term = filters.searchTerm.toLowerCase();
      list = list.filter(i => i.memberName.toLowerCase().includes(term));
    }

    return list;
  }

  /**
   * Get revenue breakdown report
   */
  getRevenueSummary(state, sipId = 'all') {
    let installments = state.installments;
    if (sipId !== 'all') {
      installments = installments.filter(i => i.sipId === sipId);
    }

    let goldAccumulated = 0;
    let serviceFeesCollected = 0;
    let lateFeesCollected = 0;
    let totalCollected = 0;

    installments.forEach(inst => {
      if (inst.status === 'Paid') {
        goldAccumulated += (inst.goldShareAmount / inst.goldRatePerGram);
        serviceFeesCollected += inst.serviceCharge;
        lateFeesCollected += inst.lateFee;
        totalCollected += inst.totalDue;
      }
    });

    return {
      goldAccumulated: parseFloat(goldAccumulated.toFixed(2)),
      serviceFeesCollected: Math.round(serviceFeesCollected),
      lateFeesCollected: Math.round(lateFeesCollected),
      totalCollected: Math.round(totalCollected)
    };
  }

  /**
   * Convert array of objects to downloadable CSV
   */
  exportToCSV(filename, rows) {
    if (!rows || !rows.length) return;
    const separator = ',';
    const keys = Object.keys(rows[0]);
    const csvContent =
      keys.join(separator) +
      '\n' +
      rows.map(row => {
        return keys.map(k => {
          let cell = row[k] === null || row[k] === undefined ? '' : row[k];
          cell = cell.toString().replace(/"/g, '""');
          if (cell.search(/("|,|\n)/g) >= 0) {
            cell = `"${cell}"`;
          }
          return cell;
        }).join(separator);
      }).join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    if (link.download !== undefined) {
      const url = URL.createObjectURL(blob);
      link.setAttribute('href', url);
      link.setAttribute('download', filename);
      link.style.visibility = 'hidden';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    }
  }
}

window.reportsEngine = new ReportsEngine();
