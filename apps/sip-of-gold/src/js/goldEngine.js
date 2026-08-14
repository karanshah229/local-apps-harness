/* ==========================================================================
   SIP OF GOLD - GOLD CALCULATOR & GRACE PERIOD ENGINE
   Calculates monthly dues, checks 2-day payment grace windows, and triggers
   automatic late payment fees (₹200).
   ========================================================================== */

class GoldEngine {
  constructor() {
    this.SERVICE_CHARGE = 250; // ₹250 flat service charge per installment
    this.LATE_FEE_AMOUNT = 200; // ₹200 late fee penalty
    this.GRACE_PERIOD_DAYS = 2; // 2 days grace period
  }

  /**
   * Calculate exact installment breakdown for a member
   */
  calculateInstallment(goldRatePerGram, targetGrams = 1.0, isLate = false) {
    const goldShare = goldRatePerGram * targetGrams;
    const serviceFee = this.SERVICE_CHARGE;
    const lateFee = isLate ? this.LATE_FEE_AMOUNT : 0;
    const total = goldShare + serviceFee + lateFee;

    return {
      goldShare: Math.round(goldShare),
      serviceFee: serviceFee,
      lateFee: lateFee,
      total: Math.round(total)
    };
  }

  /**
   * Evaluate installments against payment due date and offset days
   */
  evaluateLateFees(state) {
    const today = new Date();
    // Apply demo simulated offset days if set
    if (state.simulatedDaysOffset) {
      today.setDate(today.getDate() + state.simulatedDaysOffset);
    }

    let updatedCount = 0;

    state.installments.forEach(inst => {
      if (inst.status === 'Pending') {
        const dueDate = new Date(inst.dueDate);
        // Calculate grace expiration date (dueDate + 2 days)
        const graceExpDate = new Date(dueDate);
        graceExpDate.setDate(graceExpDate.getDate() + this.GRACE_PERIOD_DAYS);

        if (today > graceExpDate) {
          inst.status = 'Late';
          inst.lateFee = this.LATE_FEE_AMOUNT;
          inst.totalDue = inst.goldShareAmount + inst.serviceCharge + inst.lateFee;
          updatedCount++;
        }
      }
    });

    if (updatedCount > 0) {
      window.db.saveState(state);
    }

    return updatedCount;
  }

  /**
   * Compute metrics for dashboard and reports
   */
  getOverallMetrics(state) {
    const activeSips = state.sips.filter(s => s.status === 'Active').length;
    
    let totalMembers = 0;
    state.sips.forEach(s => totalMembers += s.members.length);

    let totalCollected = 0;
    let totalGoldGrams = 0;
    let totalServiceFees = 0;
    let totalLateFees = 0;
    let pendingCount = 0;
    let lateCount = 0;

    state.installments.forEach(inst => {
      if (inst.status === 'Paid') {
        totalCollected += inst.totalDue;
        totalGoldGrams += (inst.goldShareAmount / inst.goldRatePerGram);
        totalServiceFees += inst.serviceCharge;
        if (inst.lateFee > 0) {
          totalLateFees += inst.lateFee;
        }
      } else if (inst.status === 'Pending') {
        pendingCount++;
      } else if (inst.status === 'Late') {
        lateCount++;
        totalLateFees += inst.lateFee;
      }
    });

    return {
      activeSips,
      totalMembers,
      totalCollected: Math.round(totalCollected),
      totalGoldGrams: parseFloat(totalGoldGrams.toFixed(2)),
      totalServiceFees: Math.round(totalServiceFees),
      totalLateFees: Math.round(totalLateFees),
      pendingCount,
      lateCount
    };
  }
}

window.goldEngine = new GoldEngine();
