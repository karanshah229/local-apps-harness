/* ==========================================================================
   KAMDHENU JEWELS INVESTMENT PLANNING - AUTOMATED MESSAGING ENGINE
   Manages pre-saved message templates, dynamic variable tags, WhatsApp direct links,
   and template library based on Base44 SIP Ledger specs.
   ========================================================================== */

class MessagingEngine {
  constructor() {
    this.brandName = 'Kamdhenu Jewels Investment Planning';
  }

  /**
   * Get default system message templates
   */
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

  /**
   * Replace template tokens with live installment data
   */
  renderTemplate(templateText, member, installment, sip) {
    const goldShare = Math.round(installment.goldShareAmount);
    const serviceFee = installment.serviceCharge;
    const lateFee = installment.lateFee;
    const total = installment.totalDue;
    const goldRate = installment.goldRatePerGram;

    // Calculate days late
    let daysLate = 0;
    if (installment.dueDate) {
      const due = new Date(installment.dueDate);
      const today = new Date();
      const diffTime = today - due;
      daysLate = Math.max(0, Math.floor(diffTime / (1000 * 60 * 60 * 24)));
    }

    return templateText
      .replace(/{memberName}/g, member.name || 'Member')
      .replace(/{sipName}/g, sip ? sip.name : 'SIP Group')
      .replace(/{monthNum}/g, installment.monthNumber || '1')
      .replace(/{metalType}/g, sip ? (sip.metalType || '24K Gold') : '24K Gold')
      .replace(/{grams}/g, sip ? (sip.targetGoldGramsPerInstallment || 1.0) : 1.0)
      .replace(/{goldRate}/g, goldRate || '7250')
      .replace(/{goldShare}/g, goldShare.toLocaleString('en-IN'))
      .replace(/{serviceFee}/g, serviceFee)
      .replace(/{lateFee}/g, lateFee)
      .replace(/{lateFeeAmount}/g, sip ? (sip.lateFeeAmount || 200) : 200)
      .replace(/{graceDays}/g, sip ? (sip.graceDaysThreshold || 2) : 2)
      .replace(/{daysLate}/g, daysLate)
      .replace(/{totalDue}/g, total.toLocaleString('en-IN'))
      .replace(/{dueDate}/g, installment.dueDate || 'Today')
      .replace(/{referencePerson}/g, member.referencePerson || 'N/A')
      .replace(/{goldGramPrize}/g, sip ? sip.targetGoldGramsPerInstallment : '1.0')
      .replace(/{prizeValue}/g, Math.round((sip ? sip.targetGoldGramsPerInstallment : 1.0) * goldRate).toLocaleString('en-IN'));
  }

  /**
   * Create direct WhatsApp Web / App link
   */
  getWhatsAppLink(phone, message) {
    const cleanPhone = phone ? phone.replace(/[^0-9]/g, '') : '';
    const encoded = encodeURIComponent(message);
    return `https://wa.me/${cleanPhone}?text=${encoded}`;
  }
}

window.messagingEngine = new MessagingEngine();
