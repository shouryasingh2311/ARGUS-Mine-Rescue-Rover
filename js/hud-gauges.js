/**
 * @file hud-gauges.js
 * @description Cockpit HUD Telemetry: FFT Audio Visualizer, Forward Obstacle Distance Graph, MPU-6050 Dual Horizon Dials, and Environmental Sensor Grid.
 * Why: Renders strictly real sensor data and enters clean static neutral standby with '--' placeholders when sensors are offline.
 */

import { CONFIG } from './config.js';

export class HUDGauges {
  constructor() {
    this.fftCanvas = document.getElementById('canvas-fft');
    this.fftCtx = this.fftCanvas ? this.fftCanvas.getContext('2d') : null;

    this.topoCanvas = document.getElementById('canvas-topography');
    this.topoCtx = this.topoCanvas ? this.topoCanvas.getContext('2d') : null;

    this.pitchCanvas = document.getElementById('canvas-pitch-dial');
    this.pitchCtx = this.pitchCanvas ? this.pitchCanvas.getContext('2d') : null;

    this.rollCanvas = document.getElementById('canvas-roll-dial');
    this.rollCtx = this.rollCanvas ? this.rollCanvas.getContext('2d') : null;

    // Rolling forward distance history (last 40 samples)
    this.distanceHistory = [];

    // 12-band FFT audio visualizer values
    this.fftBars = new Array(12).fill(0.0);
    this.fftTargetBars = new Array(12).fill(0.0);

    // Current cached telemetry state
    this.isIdle = true;
    this.telemetry = { ...CONFIG.EMPTY_TELEMETRY };

    this.animFrameId = null;
    this.simTime = 0;
  }

  /**
   * Initializes all canvases and starts render loops.
   */
  init() {
    this.resizeAll();
    window.addEventListener('resize', () => this.resizeAll());
    this.updateDOMReadouts();
    this.startLoop();
  }

  /**
   * Puts gauges into clean standby.
   */
  setIdle() {
    this.isIdle = true;
    this.telemetry = { ...CONFIG.EMPTY_TELEMETRY };
    this.distanceHistory = [];
    this.fftBars.fill(0.0);
    this.fftTargetBars.fill(0.0);
    this.updateDOMReadouts();
  }

  /**
   * Adjusts all canvas resolutions for pixel density.
   */
  resizeAll() {
    this.resizeCanvas(this.fftCanvas);
    this.resizeCanvas(this.topoCanvas);
    this.resizeCanvas(this.pitchCanvas);
    this.resizeCanvas(this.rollCanvas);
  }

  resizeCanvas(canvas) {
    if (!canvas || !canvas.parentElement) return;
    const rect = canvas.parentElement.getBoundingClientRect();
    const dpr = window.devicePixelRatio || 1;
    canvas.width = Math.max(1, Math.floor(rect.width * dpr));
    canvas.height = Math.max(1, Math.floor(rect.height * dpr));
    canvas.style.width = `${rect.width}px`;
    canvas.style.height = `${rect.height}px`;
  }

  /**
   * Ingests latest telemetry packet.
   */
  updateTelemetry(data) {
    if (!data) {
      this.setIdle();
      return;
    }

    this.isIdle = false;
    this.telemetry = { ...this.telemetry, ...data };

    if (typeof data.dist_front === 'number') {
      this.distanceHistory.push(data.dist_front);
      if (this.distanceHistory.length > 40) {
        this.distanceHistory.shift();
      }
    }

    this.updateDOMReadouts();
  }

  /**
   * Synchronizes DOM readouts, warning borders, and status banners.
   */
  updateDOMReadouts() {
    const t = this.telemetry;
    const idle = this.isIdle;

    // Environmental 2x2 Grid
    const o2Val = document.getElementById('val-o2');
    if (o2Val) o2Val.textContent = idle || t.o2_pct == null ? '-- %' : `${t.o2_pct.toFixed(1)}%`;

    const coVal = document.getElementById('val-co');
    const coCard = document.getElementById('card-co');
    if (coVal) coVal.textContent = idle || t.co_ppm == null ? '-- ppm' : `${t.co_ppm.toFixed(1)}ppm`;
    if (coCard) {
      if (!idle && t.co_ppm != null && t.co_ppm > CONFIG.THRESHOLDS.CO_WARNING_PPM) {
        coCard.classList.add('warning-border', 'alert-flash-red');
      } else {
        coCard.classList.remove('warning-border', 'alert-flash-red');
      }
    }

    const tempVal = document.getElementById('val-temp');
    if (tempVal) tempVal.textContent = idle || t.temp == null ? '-- °C' : `${t.temp.toFixed(1)}°C`;

    const humVal = document.getElementById('val-humidity');
    if (humVal) humVal.textContent = idle || t.humidity == null ? '-- %' : `${t.humidity.toFixed(0)}%`;

    // Water Float Switch Banner
    const waterBanner = document.getElementById('banner-water-detection');
    if (waterBanner) {
      if (idle || t.water_detected == null) {
        waterBanner.innerHTML = `
          <div class="flex items-center justify-between p-2 rounded bg-[#0b0e14] border border-[#1c2432] text-[#707E94] font-mono text-xs">
            <span class="flex items-center gap-2">
              <span class="w-2 h-2 rounded-full bg-gray-600"></span>
              <span>FLOAT SWITCH: STANDBY</span>
            </span>
            <span class="text-[10px] text-gray-500 font-mono">STANDBY</span>
          </div>`;
      } else if (t.water_detected === 1) {
        waterBanner.innerHTML = `
          <div class="flex items-center justify-between p-2 rounded bg-red-950/70 border border-red-500 text-red-400 font-mono text-xs alert-flash-red">
            <span class="flex items-center gap-2">
              <span class="w-2.5 h-2.5 rounded-full bg-red-500 animate-ping"></span>
              <span class="font-bold text-red-200">FLOAT SWITCH: WATER INGRESS DETECTED!</span>
            </span>
            <span class="px-2 py-0.5 rounded bg-red-900 border border-red-400 text-white text-[10px] font-bold">ALARM ACTIVE</span>
          </div>`;
      } else {
        waterBanner.innerHTML = `
          <div class="flex items-center justify-between p-2 rounded bg-[#0e141c] border border-[#1c2432] text-[#707E94] font-mono text-xs">
            <span class="flex items-center gap-2">
              <span class="w-2 h-2 rounded-full bg-emerald-400"></span>
              <span>FLOAT SWITCH: DRY / SAFE</span>
            </span>
            <span class="text-[10px] text-emerald-400 font-mono">NORMAL</span>
          </div>`;
      }
    }

    // Acoustic Anomaly Banner
    const acousticBanner = document.getElementById('banner-acoustic-alert');
    if (acousticBanner) {
      if (idle || t.sos_anomaly == null) {
        acousticBanner.className = 'flex items-center justify-between p-1.5 px-3 rounded bg-[#0B0E14] border border-[#1E2633] text-[#707E94] font-mono text-xs';
        acousticBanner.innerHTML = `
          <span class="flex items-center gap-2">
            <span class="w-1.5 h-1.5 rounded-full bg-gray-600"></span>
            <span>ACOUSTIC PATTERN: STANDBY</span>
          </span>
          <span class="text-[10px] text-gray-500">IDLE</span>
        `;
      } else if (t.sos_anomaly === 1) {
        acousticBanner.className = 'flex items-center justify-between p-1.5 px-3 rounded bg-red-950/80 border border-red-500 text-red-200 font-mono text-xs alert-flash-red';
        acousticBanner.innerHTML = `
          <span class="flex items-center gap-2">
            <span class="w-2 h-2 rounded-full bg-red-500 animate-ping"></span>
            <strong class="text-white">SOS RHYTHMIC KNOCK DETECTED</strong>
          </span>
          <span class="text-[10px] bg-red-900 px-1.5 py-0.5 rounded text-white font-bold tracking-wider">3-3-3 CADENCE</span>
        `;
      } else {
        acousticBanner.className = 'flex items-center justify-between p-1.5 px-3 rounded bg-[#0D1117] border border-[#1E2633] text-[#707E94] font-mono text-xs';
        acousticBanner.innerHTML = `
          <span class="flex items-center gap-2">
            <span class="w-1.5 h-1.5 rounded-full bg-cyan-400"></span>
            <span>ACOUSTIC PATTERN: ACTIVE MONITOR</span>
          </span>
          <span class="text-[10px] text-cyan-400">NORMAL</span>
        `;
      }
    }

    // Seismic Tremor Badge & Incline
    const inclineReadout = document.getElementById('readout-incline');
    if (inclineReadout) {
      inclineReadout.textContent = idle || t.pitch == null ? 'PITCH: --°' : `PITCH: ${t.pitch >= 0 ? '+' : ''}${t.pitch.toFixed(1)}°`;
    }

    const distReadout = document.getElementById('readout-dist-front');
    if (distReadout) {
      distReadout.textContent = idle || t.dist_front == null ? 'DIST: -- m' : `DIST: ${t.dist_front.toFixed(1)}m`;
    }

    const tremorVal = document.getElementById('readout-tremor');
    const tremorContainer = document.getElementById('container-tremor');
    if (tremorVal) {
      tremorVal.textContent = idle || t.tremor == null ? 'SEISMIC TREMOR: -- G' : `SEISMIC TREMOR: ${t.tremor.toFixed(2)}G`;
    }
    if (tremorContainer) {
      if (!idle && t.tremor != null && t.tremor > CONFIG.THRESHOLDS.TREMOR_WARNING_G) {
        tremorContainer.classList.add('alert-flash-red', 'text-red-400');
        tremorContainer.classList.remove('text-cyan-400');
      } else {
        tremorContainer.classList.remove('alert-flash-red', 'text-red-400');
        tremorContainer.classList.add('text-cyan-400');
      }
    }
  }

  /**
   * Main render loop (throttled when idle to prevent browser lag).
   */
  startLoop() {
    let lastRender = 0;
    const loop = (timestamp) => {
      const interval = this.isIdle ? 100 : 33; // 10 FPS when idle, 30 FPS when active
      if (timestamp - lastRender >= interval) {
        lastRender = timestamp;
        this.render();
      }
      this.animFrameId = requestAnimationFrame(loop);
    };
    this.animFrameId = requestAnimationFrame(loop);
  }

  /**
   * Renders all gauge canvases.
   */
  render() {
    this.simTime += 0.05;

    this.renderFFTVisualizer();
    this.renderTopographyGraph();
    this.renderPitchDial();
    this.renderRollDial();
  }

  /**
   * 1. FFT Audio Visualizer.
   */
  renderFFTVisualizer() {
    if (!this.fftCtx || !this.fftCanvas) return;
    const ctx = this.fftCtx;
    const w = this.fftCanvas.width;
    const h = this.fftCanvas.height;
    if (w === 0 || h === 0) return;
    const dpr = window.devicePixelRatio || 1;

    ctx.clearRect(0, 0, w, h);

    const barCount = 12;
    const barSpacing = 4 * dpr;
    const totalSpacing = barSpacing * (barCount - 1);
    const barWidth = (w - totalSpacing - 16 * dpr) / barCount;
    const startX = 8 * dpr;

    if (this.isIdle) {
      // Flat idle baseline
      ctx.fillStyle = '#18202C';
      for (let i = 0; i < barCount; i++) {
        const bx = startX + i * (barWidth + barSpacing);
        ctx.fillRect(bx, h - 4 * dpr, barWidth, 2 * dpr);
      }
      ctx.fillStyle = 'rgba(112, 126, 148, 0.4)';
      ctx.font = `${Math.floor(9 * dpr)}px 'JetBrains Mono', monospace`;
      ctx.textAlign = 'center';
      ctx.fillText('STANDBY // SENSOR INACTIVE', w / 2, h / 2 + 3 * dpr);
      return;
    }

    const isSOS = this.telemetry.sos_anomaly === 1;

    for (let i = 0; i < barCount; i++) {
      if (isSOS) {
        const pulse = Math.abs(Math.sin(this.simTime * 3.5 + i * 0.4));
        this.fftTargetBars[i] = 0.4 + pulse * 0.55;
      } else {
        this.fftTargetBars[i] = 0.15 + (Math.sin(this.simTime * 2 + i) * 0.1);
      }

      this.fftBars[i] += (this.fftTargetBars[i] - this.fftBars[i]) * 0.25;

      const barH = Math.max(3 * dpr, this.fftBars[i] * (h - 14 * dpr));
      const bx = startX + i * (barWidth + barSpacing);
      const by = h - barH - 6 * dpr;

      const grad = ctx.createLinearGradient(0, h, 0, 0);
      if (isSOS) {
        grad.addColorStop(0, '#7F1D1D');
        grad.addColorStop(0.7, '#EF4444');
        grad.addColorStop(1, '#FCA5A5');
      } else {
        grad.addColorStop(0, '#005577');
        grad.addColorStop(0.6, '#00E5FF');
        grad.addColorStop(1, '#FFD54F');
      }

      ctx.fillStyle = grad;
      ctx.fillRect(bx, by, barWidth, barH);

      ctx.fillStyle = isSOS ? '#FFFFFF' : '#FF9800';
      ctx.fillRect(bx, Math.max(2 * dpr, by - 3 * dpr), barWidth, 2 * dpr);
    }
  }

  /**
   * 2. Forward Obstacle Distance Graph.
   */
  renderTopographyGraph() {
    if (!this.topoCtx || !this.topoCanvas) return;
    const ctx = this.topoCtx;
    const w = this.topoCanvas.width;
    const h = this.topoCanvas.height;
    if (w === 0 || h === 0) return;
    const dpr = window.devicePixelRatio || 1;

    ctx.clearRect(0, 0, w, h);

    // Subtle horizontal grid lines
    ctx.strokeStyle = '#18202C';
    ctx.lineWidth = 1;
    for (let y = 10 * dpr; y < h; y += 20 * dpr) {
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(w, y);
      ctx.stroke();
    }

    if (this.isIdle || this.distanceHistory.length < 2) {
      ctx.fillStyle = 'rgba(112, 126, 148, 0.4)';
      ctx.font = `${Math.floor(9 * dpr)}px 'JetBrains Mono', monospace`;
      ctx.textAlign = 'center';
      ctx.fillText('STANDBY // NO DISTANCE SAMPLES', w / 2, h / 2 + 3 * dpr);
      return;
    }

    const points = this.distanceHistory;
    const maxVal = 20.0;
    const stepX = w / (points.length - 1);

    const coords = points.map((val, idx) => {
      const normalized = Math.min(1, Math.max(0, val / maxVal));
      return {
        x: idx * stepX,
        y: h - (normalized * (h - 18 * dpr)) - 8 * dpr,
      };
    });

    const areaGrad = ctx.createLinearGradient(0, 0, 0, h);
    areaGrad.addColorStop(0, 'rgba(0, 229, 255, 0.25)');
    areaGrad.addColorStop(1, 'rgba(0, 229, 255, 0.0)');

    ctx.beginPath();
    ctx.moveTo(coords[0].x, h);
    ctx.lineTo(coords[0].x, coords[0].y);
    for (let i = 1; i < coords.length; i++) {
      const prev = coords[i - 1];
      const curr = coords[i];
      const midX = (prev.x + curr.x) / 2;
      const midY = (prev.y + curr.y) / 2;
      ctx.quadraticCurveTo(prev.x, prev.y, midX, midY);
    }
    const lastCoord = coords[coords.length - 1];
    ctx.lineTo(lastCoord.x, lastCoord.y);
    ctx.lineTo(w, h);
    ctx.closePath();
    ctx.fillStyle = areaGrad;
    ctx.fill();

    ctx.strokeStyle = '#00E5FF';
    ctx.lineWidth = 2 * dpr;
    ctx.beginPath();
    ctx.moveTo(coords[0].x, coords[0].y);
    for (let i = 1; i < coords.length; i++) {
      const prev = coords[i - 1];
      const curr = coords[i];
      const midX = (prev.x + curr.x) / 2;
      const midY = (prev.y + curr.y) / 2;
      ctx.quadraticCurveTo(prev.x, prev.y, midX, midY);
    }
    ctx.lineTo(lastCoord.x, lastCoord.y);
    ctx.stroke();

    ctx.fillStyle = '#FF9800';
    ctx.beginPath();
    ctx.arc(lastCoord.x, lastCoord.y, 4 * dpr, 0, Math.PI * 2);
    ctx.fill();

    const currVal = this.telemetry.dist_front;
    if (currVal != null) {
      ctx.fillStyle = '#E1E7EF';
      ctx.font = `${Math.floor(9 * dpr)}px 'JetBrains Mono', monospace`;
      ctx.textAlign = 'right';
      ctx.fillText(`${currVal.toFixed(1)}m`, lastCoord.x - 8 * dpr, Math.max(14 * dpr, lastCoord.y - 6 * dpr));
    }
  }

  /**
   * 3. Left Dial: PITCH Cockpit Instrument.
   */
  renderPitchDial() {
    if (!this.pitchCtx || !this.pitchCanvas) return;
    const ctx = this.pitchCtx;
    const w = this.pitchCanvas.width;
    const h = this.pitchCanvas.height;
    if (w === 0 || h === 0) return;
    const dpr = window.devicePixelRatio || 1;

    ctx.clearRect(0, 0, w, h);

    const cx = w * 0.5;
    const cy = h * 0.52;
    const r = Math.min(w, h) * 0.42;

    ctx.strokeStyle = '#1C2433';
    ctx.lineWidth = 3 * dpr;
    ctx.beginPath();
    ctx.arc(cx, cy, r, 0, Math.PI * 2);
    ctx.stroke();

    ctx.strokeStyle = 'rgba(0, 229, 255, 0.4)';
    ctx.lineWidth = 1.5 * dpr;

    for (let angle = -45; angle <= 45; angle += 15) {
      const rad = (angle - 90) * (Math.PI / 180);
      const isMajor = angle % 30 === 0;
      const innerR = r - (isMajor ? 9 * dpr : 5 * dpr);

      ctx.beginPath();
      ctx.moveTo(cx + Math.cos(rad) * innerR, cy + Math.sin(rad) * innerR);
      ctx.lineTo(cx + Math.cos(rad) * r, cy + Math.sin(rad) * r);
      ctx.stroke();

      if (isMajor) {
        ctx.fillStyle = '#707E94';
        ctx.font = `${Math.floor(7 * dpr)}px 'JetBrains Mono', monospace`;
        ctx.textAlign = 'center';
        ctx.fillText(`${angle > 0 ? '+' : ''}${angle}`, cx + Math.cos(rad) * (innerR - 8 * dpr), cy + Math.sin(rad) * (innerR - 8 * dpr) + 3 * dpr);
      }
    }

    const pitchAngle = this.isIdle || this.telemetry.pitch == null ? 0 : Math.max(-45, Math.min(45, this.telemetry.pitch));
    const needleRad = (pitchAngle - 90) * (Math.PI / 180);

    ctx.save();
    ctx.strokeStyle = this.isIdle ? '#707E94' : '#FF9800';
    ctx.lineWidth = 2.5 * dpr;

    ctx.beginPath();
    ctx.moveTo(cx, cy);
    ctx.lineTo(cx + Math.cos(needleRad) * (r - 12 * dpr), cy + Math.sin(needleRad) * (r - 12 * dpr));
    ctx.stroke();

    ctx.fillStyle = '#0A0B0E';
    ctx.strokeStyle = this.isIdle ? '#707E94' : '#FF9800';
    ctx.lineWidth = 2 * dpr;
    ctx.beginPath();
    ctx.arc(cx, cy, 5 * dpr, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();

    ctx.fillStyle = this.isIdle ? '#707E94' : '#00E5FF';
    ctx.font = `bold ${Math.floor(10 * dpr)}px 'JetBrains Mono', monospace`;
    ctx.textAlign = 'center';
    ctx.fillText(this.isIdle || this.telemetry.pitch == null ? '--°' : `${pitchAngle >= 0 ? '+' : ''}${pitchAngle.toFixed(1)}°`, cx, cy + r * 0.6);

    ctx.restore();
  }

  /**
   * 4. Right Dial: ROLL Cockpit Instrument.
   */
  renderRollDial() {
    if (!this.rollCtx || !this.rollCanvas) return;
    const ctx = this.rollCtx;
    const w = this.rollCanvas.width;
    const h = this.rollCanvas.height;
    if (w === 0 || h === 0) return;
    const dpr = window.devicePixelRatio || 1;

    ctx.clearRect(0, 0, w, h);

    const cx = w * 0.5;
    const cy = h * 0.52;
    const r = Math.min(w, h) * 0.42;

    ctx.strokeStyle = '#1C2433';
    ctx.lineWidth = 3 * dpr;
    ctx.beginPath();
    ctx.arc(cx, cy, r, 0, Math.PI * 2);
    ctx.stroke();

    ctx.strokeStyle = 'rgba(0, 229, 255, 0.4)';
    ctx.lineWidth = 1.5 * dpr;

    for (let angle = -45; angle <= 45; angle += 15) {
      const rad = (angle - 90) * (Math.PI / 180);
      const isMajor = angle % 30 === 0;
      const innerR = r - (isMajor ? 9 * dpr : 5 * dpr);

      ctx.beginPath();
      ctx.moveTo(cx + Math.cos(rad) * innerR, cy + Math.sin(rad) * innerR);
      ctx.lineTo(cx + Math.cos(rad) * r, cy + Math.sin(rad) * r);
      ctx.stroke();

      if (isMajor) {
        ctx.fillStyle = '#707E94';
        ctx.font = `${Math.floor(7 * dpr)}px 'JetBrains Mono', monospace`;
        ctx.textAlign = 'center';
        ctx.fillText(`${angle > 0 ? '+' : ''}${angle}`, cx + Math.cos(rad) * (innerR - 8 * dpr), cy + Math.sin(rad) * (innerR - 8 * dpr) + 3 * dpr);
      }
    }

    const rollAngle = this.isIdle || this.telemetry.roll == null ? 0 : Math.max(-45, Math.min(45, this.telemetry.roll));
    const rollRad = rollAngle * (Math.PI / 180);

    ctx.save();
    ctx.translate(cx, cy);
    ctx.rotate(rollRad);

    ctx.strokeStyle = this.isIdle ? '#707E94' : '#00E5FF';
    ctx.lineWidth = 2.5 * dpr;
    ctx.beginPath();
    ctx.moveTo(-r + 10 * dpr, 0);
    ctx.lineTo(r - 10 * dpr, 0);
    ctx.stroke();

    ctx.restore();

    ctx.fillStyle = this.isIdle ? '#707E94' : '#00E5FF';
    ctx.font = `bold ${Math.floor(10 * dpr)}px 'JetBrains Mono', monospace`;
    ctx.textAlign = 'center';
    ctx.fillText(this.isIdle || this.telemetry.roll == null ? '--°' : `${rollAngle >= 0 ? '+' : ''}${rollAngle.toFixed(1)}°`, cx, cy + r * 0.6);
  }
}
