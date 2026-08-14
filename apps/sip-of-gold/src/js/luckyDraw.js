/* ==========================================================================
   KAMDHENU JEWELS INVESTMENT PLANNING - LUCKY WINNER DRAW ENGINE
   Canvas 2D Wheel of Fortune with bright, high-contrast pie/pizza slices,
   4px white divider lines, and radial member names.
   ========================================================================== */

class LuckyDrawEngine {
  constructor() {
    this.canvas = null;
    this.ctx = null;
    this.eligibleMembers = [];
    this.currentRotation = 0;
    this.isSpinning = false;
    this.loadedImages = {};
    
    // Bright, high-contrast pizza-slice pie sector colors
    this.sliceColors = [
      '#E11D48', // Bright Ruby Red
      '#2563EB', // Bright Royal Blue
      '#D97706', // Bright Amber Gold
      '#16A34A', // Bright Emerald Green
      '#9333EA', // Bright Violet Purple
      '#0D9488', // Bright Teal Cyan
      '#EA580C', // Bright Vivid Orange
      '#4F46E5'  // Bright Indigo Blue
    ];
  }

  initCanvas(canvasId) {
    this.canvas = document.getElementById(canvasId);
    if (this.canvas) {
      this.ctx = this.canvas.getContext('2d');
    }
  }

  setMembers(members) {
    this.eligibleMembers = members;
    this.preloadMemberImages();
    this.drawWheel();
  }

  preloadMemberImages() {
    this.eligibleMembers.forEach(mem => {
      const photoUrl = mem.photo || `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(mem.name)}`;
      if (!this.loadedImages[photoUrl]) {
        const img = new Image();
        img.crossOrigin = 'Anonymous';
        img.src = photoUrl;
        img.onload = () => {
          this.loadedImages[photoUrl] = img;
          this.drawWheel();
        };
      }
    });
  }

  drawWheel() {
    if (!this.ctx || !this.canvas) return;

    const width = this.canvas.width;
    const height = this.canvas.height;
    const centerX = width / 2;
    const centerY = height / 2;
    const radius = width / 2 - 12;

    this.ctx.clearRect(0, 0, width, height);

    if (this.eligibleMembers.length === 0) {
      this.ctx.fillStyle = '#0F172A';
      this.ctx.beginPath();
      this.ctx.arc(centerX, centerY, radius, 0, 2 * Math.PI);
      this.ctx.fill();
      this.ctx.fillStyle = '#FFFFFF';
      this.ctx.font = '600 15px Outfit, sans-serif';
      this.ctx.textAlign = 'center';
      this.ctx.fillText('No Members Available', centerX, centerY);
      return;
    }

    const numSlices = this.eligibleMembers.length;
    const sliceAngle = (2 * Math.PI) / numSlices;

    this.ctx.save();
    this.ctx.translate(centerX, centerY);
    this.ctx.rotate(this.currentRotation);

    // Draw Bright Pizza-Slice Pie Sectors
    for (let i = 0; i < numSlices; i++) {
      const startAngle = i * sliceAngle;
      const endAngle = startAngle + sliceAngle;
      const mem = this.eligibleMembers[i];

      // 1. Draw Slice Polygon
      this.ctx.beginPath();
      this.ctx.moveTo(0, 0);
      this.ctx.arc(0, 0, radius, startAngle, endAngle);
      this.ctx.closePath();

      // Fill slice with bright distinct color
      this.ctx.fillStyle = this.sliceColors[i % this.sliceColors.length];
      this.ctx.fill();
      
      // 2. Thick 4px White Pizza-Slice Divider Border
      this.ctx.strokeStyle = '#FFFFFF';
      this.ctx.lineWidth = 4;
      this.ctx.stroke();

      // 3. Render Member Name Text & Photo along slice centerline
      this.ctx.save();
      const midAngle = startAngle + sliceAngle / 2;
      this.ctx.rotate(midAngle);

      const textRadius = radius - 28;

      // Draw photo avatar near outer rim
      const photoUrl = mem.photo || `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(mem.name)}`;
      const img = this.loadedImages[photoUrl];
      const avatarR = 14;
      const avatarDist = radius - 22;

      if (img && img.complete) {
        this.ctx.save();
        this.ctx.beginPath();
        this.ctx.arc(avatarDist, 0, avatarR, 0, 2 * Math.PI);
        this.ctx.closePath();
        this.ctx.clip();
        this.ctx.drawImage(img, avatarDist - avatarR, -avatarR, avatarR * 2, avatarR * 2);
        this.ctx.restore();

        this.ctx.beginPath();
        this.ctx.arc(avatarDist, 0, avatarR, 0, 2 * Math.PI);
        this.ctx.strokeStyle = '#FFFFFF';
        this.ctx.lineWidth = 2;
        this.ctx.stroke();
      }

      // Draw Member Name inside slice
      this.ctx.textAlign = 'right';
      this.ctx.textBaseline = 'middle';
      this.ctx.fillStyle = '#FFFFFF';
      this.ctx.font = '700 14px Outfit, sans-serif';

      let displayName = mem.name;
      if (displayName.length > 13) {
        displayName = displayName.substring(0, 11) + '..';
      }

      // Shadow for maximum contrast readability
      this.ctx.shadowColor = 'rgba(0, 0, 0, 0.7)';
      this.ctx.shadowBlur = 4;

      this.ctx.fillText(displayName, textRadius - (img ? 20 : 0), 0);

      this.ctx.restore();
    }

    // Outer wheel border ring
    this.ctx.beginPath();
    this.ctx.arc(0, 0, radius, 0, 2 * Math.PI);
    this.ctx.strokeStyle = '#D4AF37';
    this.ctx.lineWidth = 6;
    this.ctx.stroke();

    this.ctx.restore();
  }

  spin(onComplete) {
    if (this.isSpinning || this.eligibleMembers.length === 0) return;

    this.isSpinning = true;
    const numSlices = this.eligibleMembers.length;
    const sliceAngle = (2 * Math.PI) / numSlices;

    const winnerIndex = Math.floor(Math.random() * numSlices);
    const winningMember = this.eligibleMembers[winnerIndex];

    const extraSpins = 6 * 2 * Math.PI;
    const targetSliceCenter = (winnerIndex * sliceAngle) + (sliceAngle / 2);
    const finalRotation = extraSpins + (3 * Math.PI / 2) - targetSliceCenter;

    const duration = 4500;
    const startTime = performance.now();
    const startRotation = this.currentRotation % (2 * Math.PI);

    const animate = (now) => {
      const elapsed = now - startTime;
      const progress = Math.min(elapsed / duration, 1);
      
      const easeOut = 1 - Math.pow(1 - progress, 3);
      this.currentRotation = startRotation + (finalRotation - startRotation) * easeOut;

      this.drawWheel();

      if (progress < 1) {
        requestAnimationFrame(animate);
      } else {
        this.isSpinning = false;
        if (onComplete) {
          onComplete(winningMember);
        }
      }
    };

    requestAnimationFrame(animate);
  }
}

window.luckyDrawEngine = new LuckyDrawEngine();
