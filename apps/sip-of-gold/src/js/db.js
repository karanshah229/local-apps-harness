/* ==========================================================================
   KAMDHENU JEWELS INVESTMENT PLANNING - DATABASE MODULE (v11 Bulletproof Schema)
   Stores SIP pools, metal types, contacts directory, and ledgers.
   Guarantees 5 Demo SIP Pools (SIP 1 to SIP 5) with 50 Indian Members.
   ========================================================================== */

class SipDB {
  constructor() {
    this.storageKey = 'kamdhenu_jewels_state_v11';
  }

  async init() {
    let state = this.loadState();
    if (!state || !state.sips || state.sips.length < 5) {
      console.log('Initializing Kamdhenu Jewels Database (v11 with 5 Demo SIPs)...');
      state = this.generateDemoData();
      this.saveState(state);
    }

    state.theme = 'light';

    if (!state.templates || state.templates.length === 0) {
      state.templates = this.getDefaultTemplates();
    }

    if (!state.contacts || state.contacts.length === 0) {
      state.contacts = [];
    }

    this.syncContactsDirectory(state);
    this.saveState(state);
    return state;
  }

  loadState() {
    try {
      const raw = localStorage.getItem(this.storageKey);
      return raw ? JSON.parse(raw) : null;
    } catch (e) {
      console.error('Error reading localStorage', e);
      return null;
    }
  }

  saveState(state) {
    try {
      localStorage.setItem(this.storageKey, JSON.stringify(state));
    } catch (e) {
      console.error('Error saving localStorage', e);
    }
  }

  getDefaultTemplates() {
    return [
      {
        id: 'tmpl-standard',
        title: 'Standard Monthly Dues Notice',
        category: 'Reminder',
        content: `🌟 *Kamdhenu Jewels Investment Planning - Monthly Notice* 🌟\n\nDear *{memberName}*,\nYour monthly installment for *{sipName}* (Month {monthNum}/10) is due.\n\n📋 *Payment Details:*\n• Metal/Gold Type: {metalType}\n• Weight Share: {grams}g @ ₹{goldRate}/g\n• Gold Share Amount: ₹{goldShare}\n• Service Charge: ₹{serviceFee}\n\n💳 *Total Amount Payable: ₹{totalDue}*\n\n⏰ *Grace Period:* Please pay within {graceDays} days (Due: {dueDate}) to avoid a ₹{lateFeeAmount} late fee penalty.\n\nRef Contact: {referencePerson}\nThank you for investing with Kamdhenu Jewels! ✨`
      },
      {
        id: 'tmpl-grace-warning',
        title: 'Grace Window Expiring Warning',
        category: 'Urgent Warning',
        content: `⏳ *Kamdhenu Jewels - URGENT: Grace Window Expiring* ⌛\n\nDear *{memberName}*,\nYour payment window for *{sipName}* (Month {monthNum}/10) is expiring today.\n\n💳 *Current Dues: ₹{totalDue}* (Gold: ₹{goldShare} + Fee: ₹{serviceFee})\n\n⚠️ If unpaid today, a *₹{lateFeeAmount} Late Penalty* will be automatically applied and your eligibility for the Lucky Winner Draw will be paused.\n\nPlease clear your dues immediately!`
      },
      {
        id: 'tmpl-late-notice',
        title: 'Late Fee Applied Penalty Notice',
        category: 'Overdue Penalty',
        content: `🚨 *Kamdhenu Jewels - Late Payment Penalty Applied* 🚨\n\nDear *{memberName}*,\nYour payment for *{sipName}* (Month {monthNum}/10) is overdue by *{daysLate} day(s)*.\n\n📋 *Updated Breakdown:*\n• Gold Share (₹{goldRate}/g): ₹{goldShare}\n• Service Charge: ₹{serviceFee}\n• *Late Fee Penalty: ₹{lateFee}*\n\n💳 *Total Amount Due: ₹{totalDue}*\n\nPlease complete payment immediately to resume Lucky Draw eligibility.`
      },
      {
        id: 'tmpl-winner-celebration',
        title: 'Lucky Winner Draw Celebration',
        category: 'Winner Notice',
        content: `👑 *CONGRATULATIONS! LUCKY DRAW WINNER!* 👑\n\nDear *{memberName}*,\nWoohoo! You have been selected as the *Lucky Winner* for *{sipName}* (Month {monthNum}/10)!\n\n🏆 *Gold Prize:* {goldGramPrize}g {metalType} (Value: ₹{prizeValue})\n\nPlease visit our branch to collect your prize item!\nThank you for being a valued member of Kamdhenu Jewels Investment Planning! 🌟`
      }
    ];
  }

  syncContactsDirectory(state) {
    if (!state.contacts) state.contacts = [];
    let nextIdNum = 1001 + state.contacts.length;

    state.sips.forEach(sip => {
      if (!sip.metalType) sip.metalType = '24K Gold';
      if (!sip.graceDaysThreshold) sip.graceDaysThreshold = 2;
      if (!sip.lateFeeAmount) sip.lateFeeAmount = 200;

      sip.members.forEach(mem => {
        let contact = state.contacts.find(c => (mem.phone && c.phone === mem.phone) || (mem.memberId && c.memberId === mem.memberId));
        if (!contact) {
          const uniqueId = mem.memberId || `MEM-${nextIdNum++}`;
          contact = {
            memberId: uniqueId,
            name: mem.name,
            phone: mem.phone,
            photo: mem.photo || `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(mem.name)}`,
            email: mem.email || `${mem.name.toLowerCase().replace(/\s+/g, '')}@example.com`,
            address: mem.address || 'Main Branch',
            referencePerson: mem.referencePerson || 'Self Registered',
            createdAt: new Date().toISOString().split('T')[0]
          };
          state.contacts.push(contact);
        }
        mem.memberId = contact.memberId;
        mem.photo = contact.photo;
        mem.address = contact.address;
        mem.referencePerson = contact.referencePerson;
      });
    });
  }

  generateDemoData() {
    const today = new Date();
    const curYear = today.getFullYear();
    const curMonth = today.getMonth();

    // 50 Authentic Indian Members Pool
    const indianNames = [
      { name: 'Aarav Sharma', ref: 'Rajesh Sharma', addr: 'MG Road, Mumbai' },
      { name: 'Priya Patel', ref: 'Suresh Patel', addr: 'Ring Road, Ahmedabad' },
      { name: 'Rohan Verma', ref: 'Self Registered', addr: 'Station Road, Jaipur' },
      { name: 'Ananya Gupta', ref: 'Vikas Gupta', addr: 'Civil Lines, Delhi' },
      { name: 'Vikram Singh', ref: 'Self Registered', addr: 'Main Bazaar, Udaipur' },
      { name: 'Sneha Reddy', ref: 'Karan Reddy', addr: 'Park Street, Hyderabad' },
      { name: 'Karan Malhotra', ref: 'Self Registered', addr: 'Mall Road, Shimla' },
      { name: 'Meera Nair', ref: 'Sunil Nair', addr: 'Beach Road, Kochi' },
      { name: 'Aditya Joshi', ref: 'Self Registered', addr: 'Chowk Area, Pune' },
      { name: 'Kavya Desai', ref: 'Amit Desai', addr: 'Satellite, Surat' },

      { name: 'Rajesh Kumar', ref: 'Self Registered', addr: 'Commercial St, Bangalore' },
      { name: 'Neha Sharma', ref: 'Pooja Sharma', addr: 'Brigade Rd, Bangalore' },
      { name: 'Amitabh Sen', ref: 'Self Registered', addr: 'Indiranagar, Bangalore' },
      { name: 'Pooja Bhatt', ref: 'Amitabh Sen', addr: 'Koramangala, Bangalore' },
      { name: 'Siddharth Rao', ref: 'Self Registered', addr: 'Jayanagar, Bangalore' },
      { name: 'Divya Iyer', ref: 'Rao Family', addr: 'Whitefield, Bangalore' },
      { name: 'Tushar Aggarwal', ref: 'Self Registered', addr: 'HSR Layout, Bangalore' },
      { name: 'Simran Kaur', ref: 'Harish Pillai', addr: 'JP Nagar, Bangalore' },
      { name: 'Harish Pillai', ref: 'Self Registered', addr: 'Electronic City, Bangalore' },
      { name: 'Bhavna Kulkarni', ref: 'Self Registered', addr: 'Malleshwaram, Bangalore' },

      { name: 'Rahul Verma', ref: 'Anil Verma', addr: 'Connaught Place, Delhi' },
      { name: 'Anjali Mishra', ref: 'Self Registered', addr: 'Lajpat Nagar, Delhi' },
      { name: 'Suresh Kapoor', ref: 'Deepak Kapoor', addr: 'Rajouri Garden, Delhi' },
      { name: 'Ritu Saxena', ref: 'Self Registered', addr: 'Saket, Delhi' },
      { name: 'Deepak Chawla', ref: 'Sanjay Chawla', addr: 'Karol Bagh, Delhi' },
      { name: 'Sunita Roy', ref: 'Self Registered', addr: 'Salt Lake, Kolkata' },
      { name: 'Varun Mehta', ref: 'Self Registered', addr: 'Ballygunge, Kolkata' },
      { name: 'Pooja Hegde', ref: 'Kiran Hegde', addr: 'New Town, Kolkata' },
      { name: 'Nishant Agrawal', ref: 'Self Registered', addr: 'Alipore, Kolkata' },
      { name: 'Preeti Singhania', ref: 'Vinod Singhania', addr: 'Howrah, Kolkata' },

      { name: 'Manish Tiwari', ref: 'Self Registered', addr: 'Hazratganj, Lucknow' },
      { name: 'Swati Pandey', ref: 'Ramesh Pandey', addr: 'Gomti Nagar, Lucknow' },
      { name: 'Gaurav Bansal', ref: 'Self Registered', addr: 'Aliganj, Lucknow' },
      { name: 'Kritika Shrivastava', ref: 'Alok Shrivastava', addr: 'Mahanagar, Lucknow' },
      { name: 'Alok Nath', ref: 'Self Registered', addr: 'Rajajipuram, Lucknow' },
      { name: 'Shreya Ghosh', ref: 'Self Registered', addr: 'Garia, Kolkata' },
      { name: 'Tarun Saxena', ref: 'Self Registered', addr: 'Noida Sector 18' },
      { name: 'Kavita Pillai', ref: 'Raman Pillai', addr: 'Thiruvananthapuram' },
      { name: 'Nikhil Kulkarni', ref: 'Self Registered', addr: 'Kothrud, Pune' },
      { name: 'Roshni Bajpai', ref: 'Self Registered', addr: 'Viman Nagar, Pune' },

      { name: 'Ashok Merchant', ref: 'Self Registered', addr: 'Marine Drive, Mumbai' },
      { name: 'Dimple Kapadia', ref: 'Rajesh Merchant', addr: 'Juhu, Mumbai' },
      { name: 'Chetan Bhagat', ref: 'Self Registered', addr: 'Bandra West, Mumbai' },
      { name: 'Pankaj Tripathi', ref: 'Self Registered', addr: 'Andheri West, Mumbai' },
      { name: 'Manoj Bajpayee', ref: 'Self Registered', addr: 'Powai, Mumbai' },
      { name: 'Radhika Apte', ref: 'Self Registered', addr: 'Worli, Mumbai' },
      { name: 'Sanjay Mishra', ref: 'Self Registered', addr: 'Thane West, Mumbai' },
      { name: 'Vidya Balan', ref: 'Self Registered', addr: 'Chembur, Mumbai' },
      { name: 'Nawazuddin Siddiqui', ref: 'Self Registered', addr: 'Versova, Mumbai' },
      { name: 'Ratna Pathak', ref: 'Self Registered', addr: 'Colaba, Mumbai' }
    ];

    const contacts = indianNames.map((m, idx) => ({
      memberId: `MEM-${1001 + idx}`,
      name: m.name,
      phone: `+9198${Math.floor(10000000 + Math.random() * 90000000)}`,
      photo: `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(m.name)}`,
      email: `${m.name.toLowerCase().replace(/\s+/g, '')}@example.com`,
      address: m.addr,
      referencePerson: m.ref,
      createdAt: new Date().toISOString().split('T')[0]
    }));

    // 5 Demo SIP Groups
    const sipDefs = [
      { id: 'sip-1', name: 'SIP 1 (Sovereign 24K)', metal: '24K Gold', rate: 7250, grams: 1.0, month: 3 },
      { id: 'sip-2', name: 'SIP 2 (Classic 22K)', metal: '22K Gold', rate: 6850, grams: 1.0, month: 1 },
      { id: 'sip-3', name: 'SIP 3 (Royal 24K 2g)', metal: '24K Gold', rate: 7300, grams: 2.0, month: 4 },
      { id: 'sip-4', name: 'SIP 4 (Silver Savings)', metal: 'Silver', rate: 95, grams: 50.0, month: 2 },
      { id: 'sip-5', name: 'SIP 5 (Mini Sovereign)', metal: '24K Gold', rate: 7280, grams: 0.5, month: 1 }
    ];

    const sips = [];
    const allInstallments = [];
    const allWinners = [];

    sipDefs.forEach((def, sIdx) => {
      const startIdx = sIdx * 10;
      const poolContacts = contacts.slice(startIdx, startIdx + 10);

      const poolMembers = poolContacts.map((c, mIdx) => ({
        id: `mem-${def.id}-${mIdx + 1}`,
        memberId: c.memberId,
        name: c.name,
        phone: c.phone,
        photo: c.photo,
        email: c.email,
        address: c.address,
        referencePerson: c.referencePerson
      }));

      const sipObj = {
        id: def.id,
        name: def.name,
        metalType: def.metal,
        baseGoldRatePerGram: def.rate,
        targetGoldGramsPerInstallment: def.grams,
        graceDaysThreshold: 2,
        lateFeeAmount: 200,
        currentMonth: def.month,
        totalMonths: 10,
        startDate: new Date(curYear, curMonth - def.month + 1, 1).toISOString().split('T')[0],
        members: poolMembers,
        status: 'Active'
      };
      sips.push(sipObj);

      for (let m = 1; m <= 10; m++) {
        const monthGoldRate = def.rate + (m - 1) * 35;
        const goldShare = def.grams * monthGoldRate;
        const serviceCharge = 250;
        const dueDate = new Date(curYear, curMonth - def.month + m, 5).toISOString().split('T')[0];

        poolMembers.forEach((mem, pIdx) => {
          let status = 'Pending';
          let paidDate = null;
          let lateFee = 0;

          if (m < def.month) {
            status = 'Paid';
            paidDate = new Date(curYear, curMonth - def.month + m, 4).toISOString();
          } else if (m === def.month) {
            if (pIdx < 6) {
              status = 'Paid';
              paidDate = new Date().toISOString();
            } else if (pIdx < 8) {
              status = 'Pending';
            } else {
              status = 'Late';
              lateFee = 200;
            }
          }

          allInstallments.push({
            id: `inst-${def.id}-m${m}-${mem.id}`,
            sipId: def.id,
            monthNumber: m,
            memberId: mem.id,
            memberName: mem.name,
            goldRatePerGram: monthGoldRate,
            goldShareAmount: goldShare,
            serviceCharge: serviceCharge,
            lateFee: lateFee,
            totalDue: goldShare + serviceCharge + lateFee,
            dueDate: dueDate,
            status: status,
            paidDate: paidDate,
            receivedWithPenalty: lateFee > 0,
            paymentRef: paidDate ? `TXN${Math.floor(100000 + Math.random() * 900000)}` : null
          });
        });
      }

      if (def.month > 1) {
        for (let wMonth = 1; wMonth < def.month; wMonth++) {
          const winnerMem = poolMembers[(wMonth - 1) % 10];
          allWinners.push({
            id: `win-${def.id}-m${wMonth}`,
            sipId: def.id,
            sipName: def.name,
            monthNumber: wMonth,
            winnerId: winnerMem.id,
            winnerName: winnerMem.name,
            drawDate: new Date(curYear, curMonth - def.month + wMonth, 6).toISOString(),
            goldGramPrize: def.grams,
            prizeValue: Math.round(def.grams * def.rate),
            status: wMonth === 1 ? 'Disbursed' : 'Item Pending',
            itemGiven: wMonth === 1
          });
        }
      }
    });

    return {
      theme: 'light',
      simulatedDaysOffset: 0,
      templates: this.getDefaultTemplates(),
      contacts: contacts,
      sips: sips,
      installments: allInstallments,
      winners: allWinners
    };
  }
}

window.db = new SipDB();
