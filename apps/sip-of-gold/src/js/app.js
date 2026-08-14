/* ==========================================================================
   KAMDHENU JEWELS INVESTMENT PLANNING - MAIN CONTROLLER MODULE
   Safe DOM Manipulation, Tab Navigation, Modal Triggers, & WhatsApp Integration.
   ========================================================================== */

class KamdhenuApp {
  constructor() {
    this.state = null;
    this.currentView = 'dashboard';
    this.selectedSipId = null;
    this.theme = 'light';
    this.sortField = 'name';
    this.sortDirection = 'asc';
  }

  async init() {
    this.state = await window.db.init();

    this.theme = this.state.theme || 'light';
    this.applyTheme(this.theme);

    window.goldEngine.evaluateLateFees(this.state);

    if (this.state.sips && this.state.sips.length > 0) {
      this.selectedSipId = this.state.sips[0].id;
    }

    this.bindEvents();
    this.renderCurrentView();

    window.luckyDrawEngine.initCanvas('wheel-canvas');
  }

  // Safe DOM Helpers
  setTxt(id, text) {
    const el = document.getElementById(id);
    if (el) el.textContent = text;
  }

  setHTML(id, html) {
    const el = document.getElementById(id);
    if (el) el.innerHTML = html;
  }

  applyTheme(theme) {
    this.theme = theme;
    document.documentElement.setAttribute('data-theme', theme);
    const themeBtn = document.getElementById('btn-theme-toggle');
    if (themeBtn) {
      themeBtn.innerHTML = theme === 'dark' 
        ? '<i class="fas fa-sun"></i> Light Mode' 
        : '<i class="fas fa-moon"></i> Dark Mode';
    }
  }

  toggleTheme() {
    const nextTheme = this.theme === 'dark' ? 'light' : 'dark';
    this.state.theme = nextTheme;
    window.db.saveState(this.state);
    this.applyTheme(nextTheme);
    window.luckyDrawEngine.drawWheel();
  }

  bindEvents() {
    // Navigation items click
    document.querySelectorAll('.nav-item').forEach(item => {
      item.addEventListener('click', () => {
        const view = item.dataset.view;
        this.switchView(view);
      });
    });

    // Theme Toggle button
    const themeBtn = document.getElementById('btn-theme-toggle');
    if (themeBtn) {
      themeBtn.addEventListener('click', () => this.toggleTheme());
    }

    // Modal Close buttons
    document.querySelectorAll('.modal-close, .modal-cancel').forEach(btn => {
      btn.addEventListener('click', () => {
        document.querySelectorAll('.modal-overlay').forEach(m => m.classList.remove('active'));
      });
    });

    // Contacts Header Click Sorting
    document.querySelectorAll('.sortable-header').forEach(header => {
      header.addEventListener('click', () => {
        const field = header.dataset.sort;
        if (this.sortField === field) {
          this.sortDirection = this.sortDirection === 'asc' ? 'desc' : 'asc';
        } else {
          this.sortField = field;
          this.sortDirection = 'asc';
        }
        this.renderContactsTable();
      });
    });

    // Contact Search input
    const contactSearch = document.getElementById('contact-search-input');
    if (contactSearch) {
      contactSearch.addEventListener('input', () => this.renderContactsTable());
    }

    // Form Create Contact
    const formContact = document.getElementById('form-create-contact');
    if (formContact) {
      formContact.addEventListener('submit', (e) => {
        e.preventDefault();
        this.handleSaveContact();
      });
    }

    // Form Create SIP Pool
    const formSip = document.getElementById('form-create-sip');
    if (formSip) {
      formSip.addEventListener('submit', (e) => {
        e.preventDefault();
        this.handleCreateSip();
      });
    }

    // Group Settings Form
    const formGroupSettings = document.getElementById('form-save-sip-settings');
    if (formGroupSettings) {
      formGroupSettings.addEventListener('submit', (e) => {
        e.preventDefault();
        this.handleSaveGroupSettings();
      });
    }

    const btnGroupSettings = document.getElementById('btn-open-group-settings');
    if (btnGroupSettings) {
      btnGroupSettings.addEventListener('click', () => this.openGroupSettingsModal());
    }

    // Matrix SIP Select
    const matrixSelect = document.getElementById('matrix-sip-select');
    if (matrixSelect) {
      matrixSelect.addEventListener('change', (e) => {
        this.selectedSipId = e.target.value;
        this.renderMatrixView();
      });
    }

    // Spin Wheel Button
    const btnSpin = document.getElementById('btn-spin-wheel');
    if (btnSpin) {
      btnSpin.addEventListener('click', () => this.handleSpinWheel());
    }

    // Include Past Winners Checkbox
    const chkPast = document.getElementById('chk-include-past-winners');
    if (chkPast) {
      chkPast.addEventListener('change', () => this.renderDrawView());
    }

    // Manual Winner Confirmation
    const btnManualWinner = document.getElementById('btn-confirm-manual-winner');
    if (btnManualWinner) {
      btnManualWinner.addEventListener('click', () => this.handleConfirmManualWinner());
    }

    // Draw SIP Select
    const drawSelect = document.getElementById('draw-sip-select');
    if (drawSelect) {
      drawSelect.addEventListener('change', (e) => {
        this.selectedSipId = e.target.value;
        this.renderDrawView();
      });
    }

    // Time Travel +3 Days Button
    const btnTime = document.getElementById('btn-time-travel');
    if (btnTime) {
      btnTime.addEventListener('click', () => this.handleTimeTravel());
    }

    // Reset Demo DB Button
    const btnReset = document.getElementById('btn-reset-demo');
    if (btnReset) {
      btnReset.addEventListener('click', () => this.handleResetDemo());
    }

    // Rate Calculator Inputs Dynamic Listener
    ['calc-rate-input', 'calc-grams-input', 'calc-service-input', 'calc-late-input', 'calc-metal-type'].forEach(id => {
      const el = document.getElementById(id);
      if (el) el.addEventListener('input', () => this.updateRateCalculatorResults());
    });

    // Bulk CSV Import Process Button
    const btnProcessCsv = document.getElementById('btn-process-csv-import');
    if (btnProcessCsv) {
      btnProcessCsv.addEventListener('click', () => this.handleProcessCsvImport());
    }

    // Sample CSV Download
    const btnSampleCsv = document.getElementById('btn-download-sample-csv');
    if (btnSampleCsv) {
      btnSampleCsv.addEventListener('click', () => this.handleDownloadSampleCsv());
    }

    // Template Form
    const formTmpl = document.getElementById('form-save-template');
    if (formTmpl) {
      formTmpl.addEventListener('submit', (e) => {
        e.preventDefault();
        this.handleSaveTemplate();
      });
    }

    // Rate Settings Button
    const btnRateSettings = document.getElementById('btn-open-rate-settings');
    if (btnRateSettings) {
      btnRateSettings.addEventListener('click', () => this.openRateSettingsModal());
    }

    const btnSaveRates = document.getElementById('btn-save-sip-rates');
    if (btnSaveRates) {
      btnSaveRates.addEventListener('click', () => this.handleSaveSipRates());
    }

    // Members Manager Button
    const btnMembersManager = document.getElementById('btn-open-members-manager');
    if (btnMembersManager) {
      btnMembersManager.addEventListener('click', () => this.openMembersManagerModal());
    }

    const btnSaveMembers = document.getElementById('btn-save-members-list');
    if (btnSaveMembers) {
      btnSaveMembers.addEventListener('click', () => this.handleSaveMembersList());
    }

    const btnAddMemberRow = document.getElementById('btn-add-new-member-row');
    if (btnAddMemberRow) {
      btnAddMemberRow.addEventListener('click', () => this.handleAddMemberRow());
    }

    // Delete SIP Button
    const btnDeleteSip = document.getElementById('btn-delete-sip-matrix');
    if (btnDeleteSip) {
      btnDeleteSip.addEventListener('click', () => this.handleDeleteSip());
    }
  }

  switchView(viewName) {
    this.currentView = viewName;

    document.querySelectorAll('.nav-item').forEach(el => {
      el.classList.toggle('active', el.dataset.view === viewName);
    });

    document.querySelectorAll('.view-section').forEach(sec => {
      sec.classList.toggle('active', sec.id === `view-${viewName}`);
    });

    const titles = {
      dashboard: 'Dashboard Overview',
      contacts: 'Contacts Corner & Directory',
      sips: '10-Member SIP Pools & Metal Rates',
      matrix: 'Monthly Installment & Metal Rate Matrix',
      templates: 'Message Templates Corner',
      draw: 'Monthly Lucky Winner Draw',
      reports: 'Ledgers & Financial Reports'
    };
    this.setTxt('page-title', titles[viewName] || 'Kamdhenu Jewels');

    this.renderCurrentView();
  }

  renderCurrentView() {
    if (!this.state) return;

    switch (this.currentView) {
      case 'dashboard':
        this.renderDashboardView();
        break;
      case 'contacts':
        this.renderContactsTable();
        break;
      case 'sips':
        this.renderSipsGrid();
        break;
      case 'matrix':
        this.renderMatrixView();
        break;
      case 'templates':
        this.renderTemplatesView();
        break;
      case 'draw':
        this.renderDrawView();
        break;
      case 'reports':
        window.reportsEngine.renderReports(this.state);
        break;
    }
  }

  renderDashboardView() {
    this.renderDashboardMetrics();
    this.renderDashboardActionList();
  }

  renderDashboardMetrics() {
    const activeSips = this.state.sips ? this.state.sips.length : 0;
    let totalCollected = 0;
    let totalGrams = 0;
    let totalService = 0;
    let totalLate = 0;

    if (this.state.installments) {
      this.state.installments.forEach(inst => {
        if (inst.status === 'Paid') {
          totalCollected += inst.totalDue;
          totalGrams += (inst.goldShareAmount / (inst.goldRatePerGram || 1));
          totalService += inst.serviceCharge;
          if (inst.lateFee) totalLate += inst.lateFee;
        }
      });
    }

    this.setTxt('metric-active-sips', activeSips);
    this.setTxt('metric-total-collected', `₹${totalCollected.toLocaleString('en-IN')}`);
    this.setTxt('metric-gold-grams', `${totalGrams.toFixed(1)} g`);
    this.setTxt('metric-service-fees', `₹${totalService.toLocaleString('en-IN')}`);
    this.setTxt('metric-late-fees', `₹${totalLate.toLocaleString('en-IN')}`);
    this.setTxt('metric-total-members', this.state.contacts ? this.state.contacts.length : 0);
  }

  renderDashboardActionList() {
    const listContainer = document.getElementById('dashboard-action-list');
    if (!listContainer) return;

    let pendingInsts = (this.state.installments || []).filter(i => i.status === 'Pending' || i.status === 'Late');
    pendingInsts.sort((a, b) => new Date(a.dueDate) - new Date(b.dueDate));

    if (pendingInsts.length === 0) {
      listContainer.innerHTML = `
        <div style="text-align:center; padding:2rem; color:var(--text-muted);">
          <i class="fas fa-check-circle" style="font-size:2.5rem; color:var(--status-paid); margin-bottom:0.75rem;"></i>
          <p>All monthly installments are fully clear! No pending dues.</p>
        </div>
      `;
      return;
    }

    let html = '<div style="display:flex; flex-direction:column; gap:0.75rem;">';
    pendingInsts.slice(0, 7).forEach(inst => {
      const sip = (this.state.sips || []).find(s => s.id === inst.sipId);
      const isLate = inst.status === 'Late';
      const badgeClass = isLate ? 'badge-late' : 'badge-pending';
      const sipName = sip ? sip.name : 'SIP Group';

      html += `
        <div style="display:flex; align-items:center; justify-content:space-between; padding:0.85rem 1rem; border-radius:var(--radius-sm); border:1px solid var(--border-subtle); background-color:var(--bg-card-hover);">
          <div>
            <div style="font-weight:600; color:var(--text-main); font-size:0.92rem;">${inst.memberName}</div>
            <div style="font-size:0.78rem; color:var(--text-dim);">${sipName} • Month ${inst.monthNumber} • Due: ${inst.dueDate}</div>
          </div>
          <div style="display:flex; align-items:center; gap:0.75rem;">
            <span class="badge ${badgeClass}">${isLate ? 'Late Penalty' : 'Pending'}</span>
            <strong style="color:var(--text-main); font-size:0.95rem;">₹${inst.totalDue.toLocaleString('en-IN')}</strong>
            <button class="btn btn-sm btn-gold-outline" onclick="app.openPaymentModal('${inst.id}')">
              Collect Dues
            </button>
            <button class="btn btn-sm btn-secondary" onclick="app.openMessagingModal('${inst.id}')" title="Send WhatsApp Dues Reminder">
              <i class="fab fa-whatsapp" style="color:#25D366;"></i> WhatsApp
            </button>
          </div>
        </div>
      `;
    });
    html += '</div>';
    listContainer.innerHTML = html;
  }

  // Contacts Corner Directory View
  renderContactsTable() {
    const tbody = document.getElementById('contacts-table-body');
    if (!tbody) return;

    let contacts = [...(this.state.contacts || [])];
    const searchVal = (document.getElementById('contact-search-input')?.value || '').toLowerCase().trim();

    if (searchVal) {
      contacts = contacts.filter(c => 
        (c.memberId && c.memberId.toLowerCase().includes(searchVal)) ||
        (c.name && c.name.toLowerCase().includes(searchVal)) ||
        (c.phone && c.phone.toLowerCase().includes(searchVal)) ||
        (c.address && c.address.toLowerCase().includes(searchVal)) ||
        (c.referencePerson && c.referencePerson.toLowerCase().includes(searchVal))
      );
    }

    contacts.sort((a, b) => {
      let valA = (a[this.sortField] || '').toString().toLowerCase();
      let valB = (b[this.sortField] || '').toString().toLowerCase();
      if (valA < valB) return this.sortDirection === 'asc' ? -1 : 1;
      if (valA > valB) return this.sortDirection === 'asc' ? 1 : -1;
      return 0;
    });

    if (contacts.length === 0) {
      tbody.innerHTML = `
        <tr>
          <td colspan="7" style="text-align:center; padding:2rem; color:var(--text-muted);">
            No contact profiles found. Click "Create New Contact Profile" to add one!
          </td>
        </tr>
      `;
      return;
    }

    let html = '';
    contacts.forEach(cnt => {
      const enrolledSips = (this.state.sips || []).filter(s => s.members.some(m => m.memberId === cnt.memberId || m.phone === cnt.phone));
      const sipBadges = enrolledSips.length > 0 
        ? enrolledSips.map(s => `<span class="sip-badge" style="margin-right:4px;">${s.name}</span>`).join('')
        : '<span style="color:var(--text-dim); font-size:0.8rem;">Not Enrolled</span>';

      const photoSrc = cnt.photo || `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(cnt.name)}`;

      html += `
        <tr>
          <td>
            <div style="display:flex; align-items:center; gap:0.75rem;">
              <img src="${photoSrc}" style="width:34px; height:34px; border-radius:50%; border:1px solid var(--gold-border); object-fit:cover;">
              <code style="font-weight:700; color:var(--accent-blue);">${cnt.memberId}</code>
            </div>
          </td>
          <td style="font-weight:600; color:var(--text-main);">${cnt.name}</td>
          <td>${cnt.phone}</td>
          <td><span style="color:var(--text-muted);">${cnt.referencePerson || 'Self'}</span></td>
          <td><span style="color:var(--text-muted);">${cnt.address || 'Main Branch'}</span></td>
          <td>${sipBadges}</td>
          <td>
            <div style="display:flex; gap:0.4rem;">
              <button class="btn btn-sm btn-secondary" onclick="app.editContactProfile('${cnt.memberId}')" title="Edit Contact">
                <i class="fas fa-edit"></i>
              </button>
              <button class="btn btn-sm btn-secondary" style="color:var(--status-late);" onclick="app.confirmDeleteContact('${cnt.memberId}', 1)" title="Delete Contact">
                <i class="fas fa-trash-alt"></i>
              </button>
            </div>
          </td>
        </tr>
      `;
    });

    tbody.innerHTML = html;
  }

  openCreateContactModal() {
    this.setTxt('contact-modal-title', 'Create New Contact Profile');
    document.getElementById('cnt-id-hidden').value = '';
    document.getElementById('cnt-name-input').value = '';
    document.getElementById('cnt-phone-input').value = '';
    document.getElementById('cnt-ref-input').value = '';
    document.getElementById('cnt-address-input').value = '';
    document.getElementById('cnt-photo-input').value = '';
    document.getElementById('cnt-email-input').value = '';
    document.getElementById('modal-create-contact').classList.add('active');
  }

  editContactProfile(memberId) {
    const cnt = (this.state.contacts || []).find(c => c.memberId === memberId);
    if (!cnt) return;

    this.setTxt('contact-modal-title', `Edit Contact Profile (${cnt.memberId})`);
    document.getElementById('cnt-id-hidden').value = cnt.memberId;
    document.getElementById('cnt-name-input').value = cnt.name;
    document.getElementById('cnt-phone-input').value = cnt.phone;
    document.getElementById('cnt-ref-input').value = cnt.referencePerson || '';
    document.getElementById('cnt-address-input').value = cnt.address || '';
    document.getElementById('cnt-photo-input').value = cnt.photo || '';
    document.getElementById('cnt-email-input').value = cnt.email || '';
    document.getElementById('modal-create-contact').classList.add('active');
  }

  handleSaveContact() {
    const hiddenId = document.getElementById('cnt-id-hidden').value;
    const name = document.getElementById('cnt-name-input').value.trim();
    const phone = document.getElementById('cnt-phone-input').value.trim();
    const ref = document.getElementById('cnt-ref-input').value.trim();
    const address = document.getElementById('cnt-address-input').value.trim();
    const photo = document.getElementById('cnt-photo-input').value.trim();
    const email = document.getElementById('cnt-email-input').value.trim();

    if (!name || !phone) return;

    if (hiddenId) {
      const cnt = this.state.contacts.find(c => c.memberId === hiddenId);
      if (cnt) {
        cnt.name = name;
        cnt.phone = phone;
        cnt.referencePerson = ref || 'Self';
        cnt.address = address || 'Main Branch';
        cnt.photo = photo || cnt.photo;
        cnt.email = email;

        this.state.sips.forEach(s => {
          s.members.forEach(m => {
            if (m.memberId === hiddenId) {
              m.name = name;
              m.phone = phone;
              m.photo = cnt.photo;
              m.address = cnt.address;
              m.referencePerson = cnt.referencePerson;
            }
          });
        });

        this.state.installments.forEach(i => {
          if (i.memberId === hiddenId) {
            i.memberName = name;
          }
        });
      }
      this.showToast(`Contact profile ${hiddenId} updated successfully!`);
    } else {
      const nextNum = 1001 + this.state.contacts.length;
      const newCnt = {
        memberId: `MEM-${nextNum}`,
        name: name,
        phone: phone,
        photo: photo || `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(name)}`,
        email: email || `${name.toLowerCase().replace(/\s+/g, '')}@example.com`,
        address: address || 'Main Branch',
        referencePerson: ref || 'Self Registered',
        createdAt: new Date().toISOString().split('T')[0]
      };
      this.state.contacts.push(newCnt);
      this.showToast(`New Contact ${newCnt.memberId} created successfully!`);
    }

    window.db.saveState(this.state);
    document.getElementById('modal-create-contact').classList.remove('active');
    this.renderCurrentView();
  }

  confirmDeleteContact(memberId, step) {
    const cnt = this.state.contacts.find(c => c.memberId === memberId);
    if (!cnt) return;

    if (step === 1) {
      if (confirm(`[CONFIRM 1/3] Are you sure you want to delete contact "${cnt.name}" (${cnt.memberId})?`)) {
        this.confirmDeleteContact(memberId, 2);
      }
    } else if (step === 2) {
      if (confirm(`[CONFIRM 2/3] WARNING: Deleting "${cnt.name}" will remove them from directory. Proceed?`)) {
        this.confirmDeleteContact(memberId, 3);
      }
    } else if (step === 3) {
      if (confirm(`[FINAL CONFIRM 3/3] Permanent deletion for "${cnt.name}". Are you absolutely certain?`)) {
        this.state.contacts = this.state.contacts.filter(c => c.memberId !== memberId);
        window.db.saveState(this.state);
        this.showToast(`Contact ${cnt.name} permanently deleted.`);
        this.renderContactsTable();
      }
    }
  }

  // 10-Member SIP Pools Grid View
  renderSipsGrid() {
    const container = document.getElementById('sips-grid-container');
    if (!container) return;

    if (!this.state.sips || this.state.sips.length === 0) {
      container.innerHTML = `
        <div style="grid-column:1/-1; text-align:center; padding:3rem; color:var(--text-muted);">
          <h3>No SIP Pools Found</h3>
          <p>Click "New SIP Pool" above to create your first 10-member group!</p>
        </div>
      `;
      return;
    }

    let html = '';
    this.state.sips.forEach(sip => {
      const metalType = sip.metalType || '24K Gold';
      const targetGrams = sip.targetGoldGramsPerInstallment || 1.0;
      const baseRate = sip.baseGoldRatePerGram || 7250;
      const curMonth = sip.currentMonth || 1;
      const totalMonths = sip.totalMonths || 10;
      const progressPercent = (curMonth / totalMonths) * 100;

      const membersCount = sip.members ? sip.members.length : 0;
      const avatarsHtml = (sip.members || []).slice(0, 5).map(m => {
        const p = m.photo || `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(m.name)}`;
        return `<img src="${p}" class="avatar-circle" title="${m.name}">`;
      }).join('');

      html += `
        <div class="sip-card">
          <div class="sip-card-header">
            <div>
              <span class="sip-badge">${metalType} • ${targetGrams}g/mo</span>
              <h3 style="font-size:1.15rem; font-family:'Cinzel'; margin-top:0.4rem; color:var(--text-main);">${sip.name}</h3>
            </div>
            <button class="btn btn-sm btn-secondary" onclick="app.selectSipAndNavigateMatrix('${sip.id}')" title="Open Dues Matrix">
              <i class="fas fa-table"></i> Matrix
            </button>
          </div>

          <div style="font-size:0.85rem; color:var(--text-muted); margin-bottom:1rem; display:flex; justify-content:space-between;">
            <span>Initial Rate: <strong>₹${baseRate.toLocaleString('en-IN')}/g</strong></span>
            <span>Grace: <strong>${sip.graceDaysThreshold || 2} Days</strong></span>
          </div>

          <div class="progress-bar-container">
            <div class="progress-info">
              <span>Progress Cycle</span>
              <span>Month ${curMonth} of ${totalMonths}</span>
            </div>
            <div class="progress-bar">
              <div class="progress-fill" style="width: ${progressPercent}%;"></div>
            </div>
          </div>

          <div style="display:flex; justify-content:space-between; align-items:center; margin-top:1.25rem; padding-top:0.85rem; border-top:1px solid var(--border-subtle);">
            <div class="member-avatars">
              ${avatarsHtml}
              ${membersCount > 5 ? `<div class="avatar-circle">+${membersCount - 5}</div>` : ''}
            </div>
            <span style="font-size:0.8rem; font-weight:600; color:var(--accent-blue);">${membersCount} Enrolled</span>
          </div>
        </div>
      `;
    });

    container.innerHTML = html;
  }

  selectSipAndNavigateMatrix(sipId) {
    this.selectedSipId = sipId;
    this.switchView('matrix');
  }

  handleCreateSip() {
    const name = document.getElementById('new-sip-name').value.trim();
    const metal = document.getElementById('new-sip-metal').value;
    const rate = parseFloat(document.getElementById('new-sip-rate').value) || 7250;
    const grams = parseFloat(document.getElementById('new-sip-grams').value) || 1.0;
    const grace = parseInt(document.getElementById('new-sip-grace').value) || 2;
    const lateFee = parseFloat(document.getElementById('new-sip-late-fee').value) || 200;

    if (!name) return;

    const newSipId = `sip-${Date.now()}`;
    const curYear = new Date().getFullYear();
    const curMonth = new Date().getMonth();

    const members = [];
    const nextStartNum = 1001 + (this.state.contacts ? this.state.contacts.length : 0);

    for (let i = 1; i <= 10; i++) {
      const memId = `mem-${newSipId}-${i}`;
      const uniqueNum = nextStartNum + i - 1;
      const memName = `Member ${i} (${name.substring(0, 6)})`;
      const memPhone = `+9198${Math.floor(10000000 + Math.random() * 90000000)}`;

      members.push({
        id: memId,
        memberId: `MEM-${uniqueNum}`,
        name: memName,
        phone: memPhone,
        photo: `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(memName)}`,
        email: `member${i}@example.com`,
        address: 'Main Branch',
        referencePerson: 'Self Registered'
      });
    }

    const newSip = {
      id: newSipId,
      name: name,
      metalType: metal,
      baseGoldRatePerGram: rate,
      targetGoldGramsPerInstallment: grams,
      graceDaysThreshold: grace,
      lateFeeAmount: lateFee,
      currentMonth: 1,
      totalMonths: 10,
      startDate: new Date().toISOString().split('T')[0],
      members: members,
      status: 'Active'
    };

    this.state.sips.push(newSip);

    for (let m = 1; m <= 10; m++) {
      const monthGoldRate = rate + (m - 1) * 35;
      const goldShare = grams * monthGoldRate;
      const serviceCharge = 250;
      const dueDate = new Date(curYear, curMonth + m - 1, 10).toISOString().split('T')[0];

      members.forEach((mem, pIdx) => {
        let status = m === 1 ? (pIdx < 4 ? 'Paid' : 'Pending') : 'Pending';
        let paidDate = status === 'Paid' ? new Date().toISOString() : null;

        this.state.installments.push({
          id: `inst-${newSipId}-m${m}-${mem.id}`,
          sipId: newSipId,
          monthNumber: m,
          memberId: mem.id,
          memberName: mem.name,
          goldRatePerGram: monthGoldRate,
          goldShareAmount: goldShare,
          serviceCharge: serviceCharge,
          lateFee: 0,
          totalDue: goldShare + serviceCharge,
          dueDate: dueDate,
          status: status,
          paidDate: paidDate,
          receivedWithPenalty: false,
          paymentRef: paidDate ? `TXN${Math.floor(100000 + Math.random() * 900000)}` : null
        });
      });
    }

    window.db.syncContactsDirectory(this.state);
    window.db.saveState(this.state);

    document.getElementById('modal-new-sip').classList.remove('active');
    this.selectedSipId = newSipId;
    this.showToast(`New SIP Group "${name}" created with 10 members!`);
    this.renderCurrentView();
  }

  // Monthly Installment Matrix View
  renderMatrixView() {
    const container = document.getElementById('matrix-table-container');
    const select = document.getElementById('matrix-sip-select');
    if (!container || !select) return;

    if (!this.state.sips || this.state.sips.length === 0) {
      container.innerHTML = `<p style="padding:2rem; text-align:center; color:var(--text-muted);">No active SIP pools to display.</p>`;
      return;
    }

    select.innerHTML = this.state.sips.map(s => `<option value="${s.id}" ${s.id === this.selectedSipId ? 'selected' : ''}>${s.name} (${s.metalType})</option>`).join('');

    const currentSip = this.state.sips.find(s => s.id === this.selectedSipId) || this.state.sips[0];
    this.selectedSipId = currentSip.id;

    let html = `
      <table class="data-table">
        <thead>
          <tr>
            <th>Member ID / Name</th>
            <th>Phone Number</th>
    `;
    for (let m = 1; m <= 10; m++) {
      html += `<th style="text-align:center;">Month ${m}</th>`;
    }
    html += `</tr></thead><tbody>`;

    currentSip.members.forEach(mem => {
      html += `
        <tr>
          <td>
            <div style="display:flex; align-items:center; gap:0.5rem;">
              <img src="${mem.photo || `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(mem.name)}`}" style="width:28px; height:28px; border-radius:50%;">
              <div>
                <strong style="color:var(--text-main); font-size:0.88rem;">${mem.name}</strong>
                <div style="font-size:0.72rem; color:var(--accent-blue);">${mem.memberId}</div>
              </div>
            </div>
          </td>
          <td style="font-size:0.82rem; color:var(--text-muted);">${mem.phone}</td>
      `;

      for (let m = 1; m <= 10; m++) {
        const inst = this.state.installments.find(i => i.sipId === currentSip.id && i.monthNumber === m && i.memberId === mem.id);
        if (inst) {
          const isPaid = inst.status === 'Paid';
          const isLate = inst.status === 'Late';
          const badgeClass = isPaid ? 'badge-paid' : (isLate ? 'badge-late' : 'badge-pending');
          const statusTxt = isPaid ? 'PAID' : (isLate ? 'LATE' : 'DUE');

          html += `
            <td style="text-align:center; padding:0.5rem;">
              <div style="display:flex; flex-direction:column; align-items:center; gap:3px;">
                <button class="badge ${badgeClass}" style="border:none; cursor:pointer; font-size:0.72rem;" onclick="app.openPaymentModal('${inst.id}')">
                  ${statusTxt} ₹${inst.totalDue}
                </button>
                <button class="btn btn-sm btn-secondary" style="padding:1px 5px; font-size:0.65rem;" onclick="app.openMessagingModal('${inst.id}')" title="Send WhatsApp Dues Reminder">
                  <i class="fab fa-whatsapp" style="color:#25D366;"></i> WhatsApp
                </button>
              </div>
            </td>
          `;
        } else {
          html += `<td style="text-align:center; color:var(--text-dim);">-</td>`;
        }
      }

      html += `</tr>`;
    });

    html += `</tbody></table>`;
    container.innerHTML = html;
  }

  // Payment Collection Modal
  openPaymentModal(installmentId) {
    const inst = this.state.installments.find(i => i.id === installmentId);
    if (!inst) return;

    this.setTxt('pay-member-name', inst.memberName);
    this.setTxt('pay-month-num', inst.monthNumber);
    this.setTxt('pay-gold-rate', `₹${inst.goldRatePerGram.toLocaleString('en-IN')}`);
    this.setTxt('pay-gold-share', `₹${inst.goldShareAmount.toLocaleString('en-IN')}`);
    this.setTxt('pay-service-charge', `₹${inst.serviceCharge.toLocaleString('en-IN')}`);
    this.setTxt('pay-late-fee', `₹${inst.lateFee || 0}`);
    this.setTxt('pay-total-due', `₹${inst.totalDue.toLocaleString('en-IN')}`);

    const penaltyBox = document.getElementById('pay-penalty-waive-box');
    const chkWaive = document.getElementById('chk-waive-penalty');

    if (inst.lateFee > 0 && inst.status !== 'Paid') {
      if (penaltyBox) penaltyBox.style.display = 'block';
      if (chkWaive) chkWaive.checked = false;
    } else {
      if (penaltyBox) penaltyBox.style.display = 'none';
    }

    const btnConfirm = document.getElementById('btn-confirm-payment');
    if (btnConfirm) {
      btnConfirm.onclick = () => this.handleConfirmPayment(inst.id);
    }

    document.getElementById('modal-payment').classList.add('active');
  }

  handleConfirmPayment(installmentId) {
    const inst = this.state.installments.find(i => i.id === installmentId);
    if (!inst) return;

    const chkWaive = document.getElementById('chk-waive-penalty');
    if (chkWaive && chkWaive.checked && inst.lateFee > 0) {
      inst.totalDue -= inst.lateFee;
      inst.lateFee = 0;
      inst.receivedWithPenalty = false;
    }

    inst.status = 'Paid';
    inst.paidDate = new Date().toISOString();
    inst.paymentRef = `TXN${Math.floor(100000 + Math.random() * 900000)}`;

    window.db.saveState(this.state);
    document.getElementById('modal-payment').classList.remove('active');
    this.showToast(`Collected ₹${inst.totalDue} from ${inst.memberName}!`);
    this.renderCurrentView();
  }

  // Rate Calculator Drawer
  openRateCalculatorModal() {
    this.updateRateCalculatorResults();
    document.getElementById('modal-rate-calculator').classList.add('active');
  }

  updateRateCalculatorResults() {
    const rate = parseFloat(document.getElementById('calc-rate-input')?.value) || 7250;
    const grams = parseFloat(document.getElementById('calc-grams-input')?.value) || 1.0;
    const service = parseFloat(document.getElementById('calc-service-input')?.value) || 250;
    const late = parseFloat(document.getElementById('calc-late-input')?.value) || 200;

    const metalPortion = rate * grams;
    const normalDue = metalPortion + service;
    const lateDue = normalDue + late;
    const poolTotal = normalDue * 10;

    this.setTxt('calc-result-metal', `₹${metalPortion.toLocaleString('en-IN')}`);
    this.setTxt('calc-result-normal', `₹${normalDue.toLocaleString('en-IN')}`);
    this.setTxt('calc-result-late', `₹${lateDue.toLocaleString('en-IN')}`);
    this.setTxt('calc-result-pool', `₹${poolTotal.toLocaleString('en-IN')}`);
  }

  // Group Settings Drawer
  openGroupSettingsModal() {
    const sip = this.state.sips.find(s => s.id === this.selectedSipId) || this.state.sips[0];
    if (!sip) return;

    document.getElementById('setting-sip-id').value = sip.id;
    document.getElementById('setting-sip-name').value = sip.name;
    document.getElementById('setting-sip-metal').value = sip.metalType || '24K Gold';
    document.getElementById('setting-sip-grams').value = sip.targetGoldGramsPerInstallment || 1.0;
    document.getElementById('setting-sip-grace').value = sip.graceDaysThreshold || 2;
    document.getElementById('setting-sip-late-fee').value = sip.lateFeeAmount || 200;
    document.getElementById('modal-sip-settings').classList.add('active');
  }

  handleSaveGroupSettings() {
    const sipId = document.getElementById('setting-sip-id').value;
    const sip = this.state.sips.find(s => s.id === sipId);
    if (!sip) return;

    sip.name = document.getElementById('setting-sip-name').value.trim();
    sip.metalType = document.getElementById('setting-sip-metal').value;
    sip.targetGoldGramsPerInstallment = parseFloat(document.getElementById('setting-sip-grams').value) || 1.0;
    sip.graceDaysThreshold = parseInt(document.getElementById('setting-sip-grace').value) || 2;
    sip.lateFeeAmount = parseFloat(document.getElementById('setting-sip-late-fee').value) || 200;

    window.db.saveState(this.state);
    document.getElementById('modal-sip-settings').classList.remove('active');
    this.showToast(`Updated settings for "${sip.name}"!`);
    this.renderCurrentView();
  }

  // Message Templates Corner View
  renderTemplatesView() {
    const container = document.getElementById('templates-grid-container');
    if (!container) return;

    const templates = this.state.templates || [];

    if (templates.length === 0) {
      container.innerHTML = `<p style="grid-column:1/-1; text-align:center; padding:2rem; color:var(--text-muted);">No message templates created.</p>`;
      return;
    }

    let html = '';
    templates.forEach(t => {
      html += `
        <div class="card" style="margin-bottom:0; display:flex; flex-direction:column; justify-space-between;">
          <div>
            <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:0.75rem;">
              <span class="sip-badge">${t.category || 'Reminder'}</span>
              <button class="btn btn-sm btn-secondary" onclick="app.editTemplate('${t.id}')">
                <i class="fas fa-edit"></i> Edit
              </button>
            </div>
            <h4 style="font-size:1.05rem; font-family:'Cinzel'; margin-bottom:0.5rem; color:var(--text-main);">${t.title}</h4>
            <div style="background:var(--bg-card-hover); padding:0.85rem; border-radius:var(--radius-sm); border:1px solid var(--border-subtle); font-size:0.82rem; white-space:pre-wrap; max-height:160px; overflow-y:auto; color:var(--text-main);">
              ${t.content}
            </div>
          </div>
        </div>
      `;
    });

    container.innerHTML = html;
  }

  openNewTemplateModal() {
    document.getElementById('tmpl-id-input').value = '';
    document.getElementById('tmpl-title-input').value = '';
    document.getElementById('tmpl-category-input').value = 'Reminder';
    document.getElementById('tmpl-content-input').value = '';
    document.getElementById('modal-template-editor').classList.add('active');
  }

  editTemplate(tmplId) {
    const tmpl = (this.state.templates || []).find(t => t.id === tmplId);
    if (!tmpl) return;

    document.getElementById('tmpl-id-input').value = tmpl.id;
    document.getElementById('tmpl-title-input').value = tmpl.title;
    document.getElementById('tmpl-category-input').value = tmpl.category || 'Reminder';
    document.getElementById('tmpl-content-input').value = tmpl.content;
    document.getElementById('modal-template-editor').classList.add('active');
  }

  handleSaveTemplate() {
    const hiddenId = document.getElementById('tmpl-id-input').value;
    const title = document.getElementById('tmpl-title-input').value.trim();
    const category = document.getElementById('tmpl-category-input').value;
    const content = document.getElementById('tmpl-content-input').value.trim();

    if (!title || !content) return;

    if (hiddenId) {
      const tmpl = this.state.templates.find(t => t.id === hiddenId);
      if (tmpl) {
        tmpl.title = title;
        tmpl.category = category;
        tmpl.content = content;
      }
    } else {
      this.state.templates.push({
        id: `tmpl-${Date.now()}`,
        title: title,
        category: category,
        content: content
      });
    }

    window.db.saveState(this.state);
    document.getElementById('modal-template-editor').classList.remove('active');
    this.showToast('Message template saved successfully!');
    this.renderTemplatesView();
  }

  // Lucky Winner Draw View
  renderDrawView() {
    const select = document.getElementById('draw-sip-select');
    if (!select) return;

    select.innerHTML = (this.state.sips || []).map(s => `<option value="${s.id}" ${s.id === this.selectedSipId ? 'selected' : ''}>${s.name}</option>`).join('');

    const currentSip = this.state.sips.find(s => s.id === this.selectedSipId) || this.state.sips[0];
    if (!currentSip) return;

    this.selectedSipId = currentSip.id;

    const includePast = document.getElementById('chk-include-past-winners')?.checked || false;
    let eligibleMembers = [...currentSip.members];

    if (!includePast) {
      const pastWinnerIds = (this.state.winners || []).filter(w => w.sipId === currentSip.id).map(w => w.winnerId);
      eligibleMembers = eligibleMembers.filter(m => !pastWinnerIds.includes(m.id));
    }

    this.setTxt('draw-eligible-count', `${eligibleMembers.length} Members Remaining on Wheel`);
    window.luckyDrawEngine.setMembers(eligibleMembers);

    const manualSelect = document.getElementById('draw-manual-winner-select');
    if (manualSelect) {
      manualSelect.innerHTML = eligibleMembers.map(m => `<option value="${m.id}">${m.name} (${m.memberId})</option>`).join('');
    }

    this.renderWinnersHistory();
  }

  handleSpinWheel() {
    window.luckyDrawEngine.spin((winner) => {
      this.recordWinner(winner);
    });
  }

  handleConfirmManualWinner() {
    const winnerId = document.getElementById('draw-manual-winner-select')?.value;
    const currentSip = this.state.sips.find(s => s.id === this.selectedSipId);
    if (!currentSip || !winnerId) return;

    const winner = currentSip.members.find(m => m.id === winnerId);
    if (winner) {
      this.recordWinner(winner);
    }
  }

  recordWinner(winner) {
    const currentSip = this.state.sips.find(s => s.id === this.selectedSipId);
    if (!currentSip) return;

    const targetGrams = currentSip.targetGoldGramsPerInstallment || 1.0;
    const baseRate = currentSip.baseGoldRatePerGram || 7250;

    const newWinner = {
      id: `win-${Date.now()}`,
      sipId: currentSip.id,
      sipName: currentSip.name,
      monthNumber: currentSip.currentMonth || 1,
      winnerId: winner.id,
      winnerName: winner.name,
      drawDate: new Date().toISOString(),
      goldGramPrize: targetGrams,
      prizeValue: Math.round(targetGrams * baseRate),
      status: 'Item Pending',
      itemGiven: false
    };

    if (!this.state.winners) this.state.winners = [];
    this.state.winners.unshift(newWinner);
    window.db.saveState(this.state);

    this.showToast(`🎉 WINNER SELECTED: ${winner.name}! Prize: ${targetGrams}g ${currentSip.metalType}`);
    this.renderDrawView();

    // Auto prompt WhatsApp winner celebration
    this.openWinnerWhatsappModal(newWinner.id);
  }

  renderWinnersHistory() {
    const container = document.getElementById('draw-winners-history');
    if (!container) return;

    const winners = (this.state.winners || []).filter(w => w.sipId === this.selectedSipId);

    if (winners.length === 0) {
      container.innerHTML = `<p style="padding:1.5rem; text-align:center; color:var(--text-muted);">No lucky draw winners recorded yet.</p>`;
      return;
    }

    let html = '<div style="display:flex; flex-direction:column; gap:0.75rem;">';
    winners.forEach(w => {
      const isGiven = w.itemGiven || w.status === 'Disbursed';
      const badgeClass = isGiven ? 'badge-paid' : 'badge-pending';
      const statusTxt = isGiven ? 'ITEM GIVEN' : 'ITEM PENDING';

      html += `
        <div style="display:flex; align-items:center; justify-content:space-between; padding:0.85rem 1rem; border-radius:var(--radius-sm); border:1px solid var(--border-subtle); background-color:var(--bg-card-hover);">
          <div>
            <div style="font-weight:700; color:var(--text-main); font-size:0.95rem;">👑 ${w.winnerName}</div>
            <div style="font-size:0.78rem; color:var(--text-dim);">Month ${w.monthNumber} • ${w.goldGramPrize}g Gold (₹${w.prizeValue.toLocaleString('en-IN')})</div>
          </div>
          <div style="display:flex; align-items:center; gap:0.5rem;">
            <button class="badge ${badgeClass}" style="border:none; cursor:pointer;" onclick="app.toggleWinnerItemGiven('${w.id}')">
              ${statusTxt}
            </button>
            <button class="btn btn-sm btn-secondary" onclick="app.openWinnerWhatsappModal('${w.id}')" title="Send WhatsApp Winner Announcement">
              <i class="fab fa-whatsapp" style="color:#25D366;"></i> Notify Winner
            </button>
          </div>
        </div>
      `;
    });
    html += '</div>';
    container.innerHTML = html;
  }

  toggleWinnerItemGiven(winnerId) {
    const w = (this.state.winners || []).find(win => win.id === winnerId);
    if (!w) return;

    w.itemGiven = !w.itemGiven;
    w.status = w.itemGiven ? 'Disbursed' : 'Item Pending';
    window.db.saveState(this.state);
    this.renderWinnersHistory();
  }

  openMessagingModal(installmentId) {
    const inst = this.state.installments.find(i => i.id === installmentId);
    if (!inst) return;

    const sip = this.state.sips.find(s => s.id === inst.sipId);
    const tmplSelect = document.getElementById('msg-template-select');
    if (tmplSelect) {
      tmplSelect.innerHTML = (this.state.templates || []).map(t => `<option value="${t.id}">${t.title}</option>`).join('');
      tmplSelect.onchange = () => {
        const selectedTmpl = this.state.templates.find(t => t.id === tmplSelect.value);
        if (selectedTmpl) {
          const rendered = window.messagingEngine.renderTemplate(selectedTmpl.content, inst, sip);
          this.setTxt('msg-preview-content', rendered);
        }
      };

      const defaultTmpl = this.state.templates[0];
      if (defaultTmpl) {
        const rendered = window.messagingEngine.renderTemplate(defaultTmpl.content, inst, sip);
        this.setTxt('msg-preview-content', rendered);
      }
    }

    const btnWa = document.getElementById('btn-send-whatsapp');
    if (btnWa) {
      btnWa.onclick = () => {
        const text = document.getElementById('msg-preview-content').textContent;
        const mem = (this.state.contacts || []).find(c => c.memberId === inst.memberId) || { phone: inst.phone };
        const cleanPhone = (mem.phone || '').replace(/[^\d]/g, '');
        window.open(`https://api.whatsapp.com/send?phone=${cleanPhone}&text=${encodeURIComponent(text)}`, '_blank');
      };
    }

    document.getElementById('modal-messaging').classList.add('active');
  }

  openWinnerWhatsappModal(winnerId) {
    const winner = (this.state.winners || []).find(w => w.id === winnerId);
    if (!winner) return;

    const sip = this.state.sips.find(s => s.id === winner.sipId);
    const contact = (this.state.contacts || []).find(c => c.name === winner.winnerName);

    const winnerTmpl = (this.state.templates || []).find(t => t.id === 'tmpl-winner-celebration') || {
      content: `👑 *CONGRATULATIONS! LUCKY DRAW WINNER!* 👑\n\nDear *{memberName}*,\nWoohoo! You have been selected as the *Lucky Winner* for *{sipName}* (Month {monthNum}/10)!\n\n🏆 *Gold Prize:* {goldGramPrize}g {metalType} (Value: ₹{prizeValue})\n\nPlease visit Kamdhenu Jewels to collect your prize item! 🌟`
    };

    let text = winnerTmpl.content
      .replace(/{memberName}/g, winner.winnerName)
      .replace(/{sipName}/g, winner.sipName)
      .replace(/{monthNum}/g, winner.monthNumber)
      .replace(/{goldGramPrize}/g, winner.goldGramPrize)
      .replace(/{metalType}/g, sip ? sip.metalType : '24K Gold')
      .replace(/{prizeValue}/g, winner.prizeValue.toLocaleString('en-IN'));

    this.setTxt('msg-preview-content', text);

    const btnWa = document.getElementById('btn-send-whatsapp');
    if (btnWa) {
      btnWa.onclick = () => {
        const cleanPhone = (contact ? contact.phone : '').replace(/[^\d]/g, '');
        window.open(`https://api.whatsapp.com/send?phone=${cleanPhone}&text=${encodeURIComponent(text)}`, '_blank');
      };
    }

    document.getElementById('modal-messaging').classList.add('active');
  }

  handleTimeTravel() {
    this.state.simulatedDaysOffset = (this.state.simulatedDaysOffset || 0) + 3;
    window.goldEngine.evaluateLateFees(this.state);
    window.db.saveState(this.state);
    this.showToast(`Time traveled +3 days! (Total offset: +${this.state.simulatedDaysOffset} days)`);
    this.renderCurrentView();
  }

  handleResetDemo() {
    if (confirm('Reset Kamdhenu Jewels database back to initial demo state?')) {
      localStorage.removeItem(window.db.storageKey);
      window.location.reload();
    }
  }

  // Bulk CSV Importer
  handleProcessCsvImport() {
    const fileInput = document.getElementById('csv-file-input');
    if (!fileInput || !fileInput.files[0]) {
      alert('Please select a CSV file first!');
      return;
    }

    const file = fileInput.files[0];
    const reader = new FileReader();
    reader.onload = (e) => {
      const text = e.target.result;
      const lines = text.split(/\r?\n/).map(l => l.trim()).filter(l => l);
      if (lines.length < 2) {
        alert('CSV file is empty or missing data rows!');
        return;
      }

      let importedCount = 0;
      for (let i = 1; i < lines.length; i++) {
        const cols = lines[i].split(',').map(c => c.trim().replace(/^"|"$/g, ''));
        if (cols.length >= 6) {
          const sipName = cols[0] || 'Imported SIP';
          const metal = cols[1] || '24K Gold';
          const rate = parseFloat(cols[2]) || 7250;
          const grams = parseFloat(cols[3]) || 1.0;
          const memName = cols[4];
          const memPhone = cols[5];
          const ref = cols[6] || 'Self';
          const addr = cols[7] || 'Main Branch';

          let sip = this.state.sips.find(s => s.name === sipName);
          if (!sip) {
            sip = {
              id: `sip-${Date.now()}-${Math.floor(Math.random()*1000)}`,
              name: sipName,
              metalType: metal,
              baseGoldRatePerGram: rate,
              targetGoldGramsPerInstallment: grams,
              graceDaysThreshold: 2,
              lateFeeAmount: 200,
              currentMonth: 1,
              totalMonths: 10,
              startDate: new Date().toISOString().split('T')[0],
              members: [],
              status: 'Active'
            };
            this.state.sips.push(sip);
          }

          const memId = `mem-${sip.id}-${sip.members.length + 1}`;
          const nextUnique = 1001 + (this.state.contacts ? this.state.contacts.length : 0);

          sip.members.push({
            id: memId,
            memberId: `MEM-${nextUnique}`,
            name: memName,
            phone: memPhone,
            photo: `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(memName)}`,
            address: addr,
            referencePerson: ref
          });
          importedCount++;
        }
      }

      window.db.syncContactsDirectory(this.state);
      window.db.saveState(this.state);
      document.getElementById('modal-csv-import').classList.remove('active');
      this.showToast(`Successfully imported ${importedCount} member records via CSV!`);
      this.renderCurrentView();
    };
    reader.readAsText(file);
  }

  handleDownloadSampleCsv() {
    const csvContent = `SIP_Name, Metal_Type, Gold_Rate, Target_Grams, Member_Name, Phone_Number, Reference_Person, Address\n` +
      `Sovereign 24K Pool #4, 24K Gold, 7250, 1.0, Aarav Sharma, +919876543210, Self, MG Road\n` +
      `Sovereign 24K Pool #4, 24K Gold, 7250, 1.0, Priya Patel, +919876543211, Rajesh Patel, Ring Road\n`;

    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'kamdhenu_sample_sip_import.csv';
    a.click();
    URL.revokeObjectURL(url);
  }

  openRateSettingsModal() {
    const sip = this.state.sips.find(s => s.id === this.selectedSipId) || this.state.sips[0];
    if (!sip) return;

    this.setTxt('rate-sip-title', sip.name);
    document.getElementById('rate-base-gold-input').value = sip.baseGoldRatePerGram || 7250;

    const grid = document.getElementById('rate-installment-inputs-grid');
    if (grid) {
      let html = '';
      for (let m = 1; m <= 10; m++) {
        const inst = this.state.installments.find(i => i.sipId === sip.id && i.monthNumber === m);
        const rateVal = inst ? inst.goldRatePerGram : (sip.baseGoldRatePerGram + (m - 1) * 35);
        html += `
          <div>
            <label class="form-label" style="font-size:0.78rem;">Month ${m} Rate (₹/g):</label>
            <input type="number" class="form-control inst-rate-input" data-month="${m}" value="${rateVal}">
          </div>
        `;
      }
      grid.innerHTML = html;
    }

    document.getElementById('modal-sip-rate-settings').classList.add('active');
  }

  handleSaveSipRates() {
    const sip = this.state.sips.find(s => s.id === this.selectedSipId);
    if (!sip) return;

    const baseRate = parseFloat(document.getElementById('rate-base-gold-input').value) || 7250;
    sip.baseGoldRatePerGram = baseRate;

    document.querySelectorAll('.inst-rate-input').forEach(input => {
      const month = parseInt(input.dataset.month);
      const newRate = parseFloat(input.value) || baseRate;

      this.state.installments.forEach(inst => {
        if (inst.sipId === sip.id && inst.monthNumber === month) {
          inst.goldRatePerGram = newRate;
          inst.goldShareAmount = (sip.targetGoldGramsPerInstallment || 1.0) * newRate;
          inst.totalDue = inst.goldShareAmount + inst.serviceCharge + (inst.lateFee || 0);
        }
      });
    });

    window.db.saveState(this.state);
    document.getElementById('modal-sip-rate-settings').classList.remove('active');
    this.showToast(`Saved gold rates for ${sip.name}!`);
    this.renderMatrixView();
  }

  openMembersManagerModal() {
    const sip = this.state.sips.find(s => s.id === this.selectedSipId) || this.state.sips[0];
    if (!sip) return;

    this.setTxt('members-sip-title', sip.name);

    const select = document.getElementById('quick-add-contact-select');
    if (select) {
      select.innerHTML = '<option value="">-- Pick from Directory --</option>' + 
        (this.state.contacts || []).map(c => `<option value="${c.memberId}">${c.name} (${c.memberId})</option>`).join('');
      select.onchange = (e) => {
        if (e.target.value) {
          const cnt = this.state.contacts.find(c => c.memberId === e.target.value);
          if (cnt) {
            sip.members.push({
              id: `mem-${sip.id}-${Date.now()}`,
              memberId: cnt.memberId,
              name: cnt.name,
              phone: cnt.phone,
              photo: cnt.photo,
              address: cnt.address,
              referencePerson: cnt.referencePerson
            });
            this.renderMembersManagerRows(sip);
          }
        }
      };
    }

    this.renderMembersManagerRows(sip);
    document.getElementById('modal-members-manager').classList.add('active');
  }

  renderMembersManagerRows(sip) {
    const tbody = document.getElementById('members-list-tbody');
    if (!tbody) return;

    let html = '';
    sip.members.forEach((m, idx) => {
      html += `
        <tr>
          <td>${idx + 1}</td>
          <td><code style="color:var(--accent-blue);">${m.memberId || `MEM-${1001 + idx}`}</code></td>
          <td><input type="text" class="form-control mem-row-name" data-id="${m.id}" value="${m.name}"></td>
          <td><input type="text" class="form-control mem-row-phone" data-id="${m.id}" value="${m.phone}"></td>
        </tr>
      `;
    });
    tbody.innerHTML = html;
  }

  handleSaveMembersList() {
    const sip = this.state.sips.find(s => s.id === this.selectedSipId);
    if (!sip) return;

    document.querySelectorAll('.mem-row-name').forEach(input => {
      const id = input.dataset.id;
      const mem = sip.members.find(m => m.id === id);
      if (mem) mem.name = input.value.trim();
    });

    document.querySelectorAll('.mem-row-phone').forEach(input => {
      const id = input.dataset.id;
      const mem = sip.members.find(m => m.id === id);
      if (mem) mem.phone = input.value.trim();
    });

    window.db.syncContactsDirectory(this.state);
    window.db.saveState(this.state);

    document.getElementById('modal-members-manager').classList.remove('active');
    this.showToast(`Saved member list for ${sip.name}!`);
    this.renderMatrixView();
  }

  handleAddMemberRow() {
    const sip = this.state.sips.find(s => s.id === this.selectedSipId);
    if (!sip) return;

    const nextNum = sip.members.length + 1;
    const nextUnique = 1001 + (this.state.contacts ? this.state.contacts.length : 0);

    sip.members.push({
      id: `mem-${sip.id}-${Date.now()}`,
      memberId: `MEM-${nextUnique}`,
      name: `Member ${nextNum}`,
      phone: `+9198${Math.floor(10000000 + Math.random() * 90000000)}`,
      photo: `https://api.dicebear.com/7.x/initials/svg?seed=Member${nextNum}`
    });

    this.renderMembersManagerRows(sip);
  }

  handleDeleteSip() {
    const sip = this.state.sips.find(s => s.id === this.selectedSipId);
    if (!sip) return;

    if (confirm(`Delete entire SIP Pool "${sip.name}"? This will remove all associated matrix ledgers.`)) {
      this.state.sips = this.state.sips.filter(s => s.id !== sip.id);
      this.state.installments = this.state.installments.filter(i => i.sipId !== sip.id);
      this.state.winners = (this.state.winners || []).filter(w => w.sipId !== sip.id);

      window.db.saveState(this.state);
      this.showToast(`Deleted SIP pool "${sip.name}".`);
      this.selectedSipId = this.state.sips.length > 0 ? this.state.sips[0].id : null;
      this.renderCurrentView();
    }
  }

  showToast(message) {
    const container = document.getElementById('toast-container');
    if (!container) return;

    const toast = document.createElement('div');
    toast.className = 'toast';
    toast.innerHTML = `<i class="fas fa-check-circle" style="color:var(--gold-primary);"></i> <span>${message}</span>`;
    container.appendChild(toast);

    setTimeout(() => {
      toast.remove();
    }, 3500);
  }
}

// Global App Initialization
document.addEventListener('DOMContentLoaded', () => {
  window.app = new KamdhenuApp();
  window.app.init();
});
