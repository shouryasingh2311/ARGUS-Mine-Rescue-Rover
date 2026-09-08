/**
 * @file hud-heatmap.js
 * @description Tactical Blueprint Map, Thermal Heat-Zones & Multi-Gas Dispersion Clouds (CH4, CO, CO2).
 * Features: SECTOR A1 blueprint layout, dynamic radial gas plumes, thermal gradient legend, survivor pings.
 */

import { CONFIG } from './config.js';

export class HUDHeatmap {
  constructor(canvasId) {
    this.canvas = document.getElementById(canvasId);
    this.ctx = this.canvas ? this.canvas.getContext('2d') : null;
    this.animFrameId = null;

    this.simTime = 0;

    // Rover tactical position and breadcrumbs in Sector A1
    this.roverPos = { x: 0.42, y: 0.58 };
    this.roverPath = [
      { x: 0.22, y: 0.82 },
      { x: 0.28, y: 0.74 },
      { x: 0.35, y: 0.65 },
      { x: 0.42, y: 0.58 },
    ];

    // Thermal Hot-Zones (Trapped victims or combustion pockets)
    this.thermalHotspots = [
      { x: 0.72, y: 0.34, baseTemp: 37.5, radius: 45, label: 'SURVIVOR #1' },
      { x: 0.84, y: 0.28, baseTemp: 36.8, radius: 35, label: 'SURVIVOR #2' },
      { x: 0.25, y: 0.38, baseTemp: 37.2, radius: 38, label: 'SURVIVOR #3' },
      { x: 0.65, y: 0.75, baseTemp: 36.9, radius: 32, label: 'SURVIVOR #4' },
    ];

    this.isIdle = true;

    // Cached telemetry readings
    this.telemetry = {
      ch4_pct: null,
      co_ppm: null,
      co2_ppm: null,
      temp: null,
    };
  }

  /**
   * Initializes canvas resolution and animation loop.
   */
  init() {
    this.resize();
    window.addEventListener('resize', () => this.resize());
    this.startLoop();
  }

  /**
   * Puts heatmap into clean standby.
   */
  setIdle() {
    this.isIdle = true;
  }

  /**
   * Adjusts for device pixel ratio.
   */
  resize() {
    if (!this.canvas) return;
    const rect = this.canvas.parentElement.getBoundingClientRect();
    const dpr = window.devicePixelRatio || 1;
    this.canvas.width = rect.width * dpr;
    this.canvas.height = rect.height * dpr;
    this.canvas.style.width = `${rect.width}px`;
    this.canvas.style.height = `${rect.height}px`;
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
    this.telemetry = {
      ch4_pct: data.ch4_pct ?? this.telemetry.ch4_pct,
      co_ppm: data.co_ppm ?? this.telemetry.co_ppm,
      co2_ppm: data.co2_ppm ?? this.telemetry.co2_ppm,
      temp: data.temp ?? this.telemetry.temp,
    };

    // Update rover position slightly along path
    const t = Date.now() * 0.0003;
    this.roverPos.x = 0.42 + Math.sin(t) * 0.05;
    this.roverPos.y = 0.58 + Math.cos(t * 1.2) * 0.04;
  }

  /**
   * Starts requestAnimationFrame render loop.
   */
  /**
   * Starts requestAnimationFrame render loop (throttled when idle to prevent GPU lag).
   */
  startLoop() {
    let lastRender = 0;
    const loop = (timestamp) => {
      const interval = this.isIdle ? 150 : 33; // 6 FPS when idle, 30 FPS when active
      if (timestamp - lastRender >= interval) {
        lastRender = timestamp;
        this.render();
      }
      this.animFrameId = requestAnimationFrame(loop);
    };
    this.animFrameId = requestAnimationFrame(loop);
  }

  /**
   * Primary frame renderer.
   */
  render() {
    if (!this.ctx || !this.canvas) return;
    const w = this.canvas.width;
    const h = this.canvas.height;
    if (w === 0 || h === 0) return;

    this.simTime += 0.03;
    const ctx = this.ctx;
    const dpr = window.devicePixelRatio || 1;

    // 1. Dark Blueprint Grid Background
    ctx.fillStyle = '#0B0F14';
    ctx.fillRect(0, 0, w, h);
    this.renderBlueprintGrid(w, h, dpr);

    // 2. Structural Walls & Debris Zones (Sector A1 - Collapsed Wing)
    this.renderStructuralFloorplan(w, h, dpr);

    if (this.isIdle) {
      // Clean Standby Overlay: No fake gas clouds or movements
      ctx.save();
      ctx.fillStyle = 'rgba(112, 126, 148, 0.4)';
      ctx.font = `${Math.floor(11 * dpr)}px 'JetBrains Mono', monospace`;
      ctx.textAlign = 'center';
      ctx.fillText('[STANDBY] SECTOR A1 BLUEPRINT // AWAITING SENSOR STREAM', w / 2, h / 2);
      ctx.restore();
      return;
    }

    // 3. Dynamic Gas Dispersion Clouds (CH4, CO, CO2)
    this.renderGasDispersions(w, h, dpr);

    // 4. Thermal Hotspots (Orange / White Glow)
    this.renderThermalZones(w, h, dpr);

    // 5. Rover Position & Breadcrumb Trail
    this.renderRoverTracking(w, h, dpr);

    // 6. Thermal Gradient Scale Bar (Cold to Hot)
    this.renderThermalScaleBar(w, h, dpr);

    // 7. HUD Top Stats
    this.renderHUDStats(w, h, dpr);
  }

  /**
   * Architectural CAD blueprint grid pattern.
   */
  renderBlueprintGrid(w, h, dpr) {
    const ctx = this.ctx;
    const step = 28 * dpr;

    ctx.save();
    ctx.strokeStyle = 'rgba(0, 229, 255, 0.05)';
    ctx.lineWidth = 1;

    for (let x = 0; x < w; x += step) {
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, h);
      ctx.stroke();
    }
    for (let y = 0; y < h; y += step) {
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(w, y);
      ctx.stroke();
    }
    ctx.restore();
  }

  /**
   * Structural floorplan of Sector A1 with collapsed walls and rubble blocks.
   */
  renderStructuralFloorplan(w, h, dpr) {
    const ctx = this.ctx;
    ctx.save();

    // Outer boundary walls
    ctx.strokeStyle = '#1F2A38';
    ctx.lineWidth = 2 * dpr;
    ctx.strokeRect(w * 0.06, h * 0.12, w * 0.88, h * 0.8);

    // Internal corridor walls
    ctx.beginPath();
    // Corridor 1
    ctx.moveTo(w * 0.06, h * 0.45);
    ctx.lineTo(w * 0.48, h * 0.45);
    // Corridor 2
    ctx.moveTo(w * 0.58, h * 0.45);
    ctx.lineTo(w * 0.94, h * 0.45);
    // Vertical partition
    ctx.moveTo(w * 0.58, h * 0.12);
    ctx.lineTo(w * 0.58, h * 0.65);
    ctx.stroke();

    // Collapsed Rubble Zone (Hatched polygon)
    ctx.fillStyle = 'rgba(244, 67, 54, 0.06)';
    ctx.strokeStyle = 'rgba(244, 67, 54, 0.35)';
    ctx.lineWidth = 1.5 * dpr;
    ctx.setLineDash([4 * dpr, 4 * dpr]);

    ctx.beginPath();
    ctx.moveTo(w * 0.58, h * 0.45);
    ctx.lineTo(w * 0.88, h * 0.48);
    ctx.lineTo(w * 0.92, h * 0.82);
    ctx.lineTo(w * 0.64, h * 0.86);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();

    // Rubble Label
    ctx.setLineDash([]);
    ctx.fillStyle = 'rgba(244, 67, 54, 0.6)';
    ctx.font = `${Math.floor(9 * dpr)}px 'JetBrains Mono', monospace`;
    ctx.fillText('COLLAPSED SLAB #4', w * 0.66, h * 0.62);

    // Room designations
    ctx.fillStyle = '#4B5563';
    ctx.font = `${Math.floor(10 * dpr)}px 'JetBrains Mono', monospace`;
    ctx.fillText('SUB-BASEMENT B2', w * 0.1, h * 0.22);
    ctx.fillText('VENTILATION SHAFT A', w * 0.62, h * 0.22);
    ctx.fillText('ACCESS TUNNEL 01', w * 0.1, h * 0.72);

    ctx.restore();
  }

  /**
   * Renders dynamic multi-gas dispersion clouds:
   * - Methane (CH4): Yellow cloud radius
   * - Carbon Monoxide (CO): Red/Orange plume
   * - CO2: Cyan ring dispersion wave
   */
  renderGasDispersions(w, h, dpr) {
    const ctx = this.ctx;
    ctx.save();

    // 1. Methane (CH4) Plume - Yellow Cloud near Vent Shaft
    const ch4Level = Math.max(0.2, this.telemetry.ch4_pct);
    const ch4Radius = (45 + ch4Level * 40 + Math.sin(this.simTime * 0.8) * 8) * dpr;
    const ch4X = w * 0.76;
    const ch4Y = h * 0.24;

    const ch4Grad = ctx.createRadialGradient(ch4X, ch4Y, 5 * dpr, ch4X, ch4Y, ch4Radius);
    ch4Grad.addColorStop(0, 'rgba(255, 214, 0, 0.65)');
    ch4Grad.addColorStop(0.5, 'rgba(255, 193, 7, 0.25)');
    ch4Grad.addColorStop(1, 'rgba(255, 193, 7, 0)');
    ctx.fillStyle = ch4Grad;
    ctx.beginPath();
    ctx.arc(ch4X, ch4Y, ch4Radius, 0, Math.PI * 2);
    ctx.fill();

    // CH4 Label
    ctx.fillStyle = '#FFD600';
    ctx.font = `${Math.floor(9 * dpr)}px 'JetBrains Mono', monospace`;
    ctx.fillText(`CH4: ${this.telemetry.ch4_pct.toFixed(1)}%`, ch4X - 25 * dpr, ch4Y - ch4Radius - 4 * dpr);

    // 2. Carbon Monoxide (CO) Dispersion - Red / Deep Orange Plume near Rubble
    const coLevel = this.telemetry.co_ppm;
    const coRadius = (40 + Math.min(80, coLevel * 1.5) + Math.cos(this.simTime * 0.7) * 10) * dpr;
    const coX = w * 0.72;
    const coY = h * 0.68;

    const coGrad = ctx.createRadialGradient(coX, coY, 8 * dpr, coX, coY, coRadius);
    const coIntensity = Math.min(0.8, 0.3 + (coLevel / 80));
    coGrad.addColorStop(0, `rgba(244, 67, 54, ${coIntensity})`);
    coGrad.addColorStop(0.45, `rgba(255, 87, 34, ${coIntensity * 0.5})`);
    coGrad.addColorStop(1, 'rgba(244, 67, 54, 0)');
    ctx.fillStyle = coGrad;
    ctx.beginPath();
    ctx.arc(coX, coY, coRadius, 0, Math.PI * 2);
    ctx.fill();

    // CO Label
    ctx.fillStyle = coLevel > CONFIG.THRESHOLDS.CO_WARNING_PPM ? '#F44336' : '#FF9800';
    ctx.fillText(`CO: ${this.telemetry.co_ppm.toFixed(1)}ppm`, coX - 28 * dpr, coY + coRadius + 12 * dpr);

    // 3. CO2 Ring Dispersion - Cyan Expanding Waves from corridor
    const co2X = w * 0.32;
    const co2Y = h * 0.36;
    const waveProgress = (this.simTime * 18) % (70 * dpr);

    ctx.strokeStyle = `rgba(0, 229, 255, ${Math.max(0, 0.5 - (waveProgress / (70 * dpr)))})`;
    ctx.lineWidth = 1.5 * dpr;
    ctx.beginPath();
    ctx.arc(co2X, co2Y, 15 * dpr + waveProgress, 0, Math.PI * 2);
    ctx.stroke();

    ctx.fillStyle = '#00E5FF';
    ctx.fillText(`CO2: ${Math.round(this.telemetry.co2_ppm)}ppm`, co2X - 30 * dpr, co2Y - 18 * dpr);

    ctx.restore();
  }

  /**
   * Dynamic thermal hotspots (Orange/White core glow).
   */
  renderThermalZones(w, h, dpr) {
    const ctx = this.ctx;
    ctx.save();

    for (const spot of this.thermalHotspots) {
      const sx = spot.x * w;
      const sy = spot.y * h;
      const pulse = Math.sin(this.simTime * 2 + spot.baseTemp) * 4 * dpr;
      const r = (spot.radius + pulse) * dpr;

      // Thermal gradient: White core -> Orange -> Red -> Fade
      const grad = ctx.createRadialGradient(sx, sy, 3 * dpr, sx, sy, r);
      grad.addColorStop(0, 'rgba(255, 255, 255, 0.95)');
      grad.addColorStop(0.3, 'rgba(255, 152, 0, 0.7)');
      grad.addColorStop(0.7, 'rgba(244, 67, 54, 0.3)');
      grad.addColorStop(1, 'rgba(244, 67, 54, 0)');

      ctx.fillStyle = grad;
      ctx.beginPath();
      ctx.arc(sx, sy, r, 0, Math.PI * 2);
      ctx.fill();

      // Survivor Marker Ring
      ctx.strokeStyle = '#00E5FF';
      ctx.lineWidth = 1 * dpr;
      ctx.beginPath();
      ctx.arc(sx, sy, 8 * dpr, 0, Math.PI * 2);
      ctx.stroke();

      // Ping Crosshair
      ctx.beginPath();
      ctx.moveTo(sx - 12 * dpr, sy);
      ctx.lineTo(sx + 12 * dpr, sy);
      ctx.moveTo(sx, sy - 12 * dpr);
      ctx.lineTo(sx, sy + 12 * dpr);
      ctx.stroke();

      // Tag
      ctx.fillStyle = '#E1E7EF';
      ctx.font = `${Math.floor(8 * dpr)}px 'JetBrains Mono', monospace`;
      ctx.fillText(`${spot.label} [${spot.baseTemp}°C]`, sx + 12 * dpr, sy - 4 * dpr);
    }
    ctx.restore();
  }

  /**
   * Renders the Rover's current position, radar ping wave, and breadcrumb path.
   */
  renderRoverTracking(w, h, dpr) {
    const ctx = this.ctx;
    ctx.save();

    // Breadcrumb trail
    ctx.strokeStyle = 'rgba(0, 229, 255, 0.4)';
    ctx.lineWidth = 1.5 * dpr;
    ctx.setLineDash([3 * dpr, 3 * dpr]);
    ctx.beginPath();
    ctx.moveTo(this.roverPath[0].x * w, this.roverPath[0].y * h);
    for (let i = 1; i < this.roverPath.length; i++) {
      ctx.lineTo(this.roverPath[i].x * w, this.roverPath[i].y * h);
    }
    ctx.lineTo(this.roverPos.x * w, this.roverPos.y * h);
    ctx.stroke();
    ctx.setLineDash([]);

    const rx = this.roverPos.x * w;
    const ry = this.roverPos.y * h;

    // Expanding sonar sweep ring around rover
    const sweepR = (this.simTime * 25) % (50 * dpr);
    ctx.strokeStyle = `rgba(0, 230, 118, ${Math.max(0, 0.7 - sweepR / (50 * dpr))})`;
    ctx.lineWidth = 1.5 * dpr;
    ctx.beginPath();
    ctx.arc(rx, ry, sweepR, 0, Math.PI * 2);
    ctx.stroke();

    // Rover marker icon (triangle directional indicator)
    ctx.fillStyle = '#00E676';
    ctx.shadowColor = 'rgba(0, 230, 118, 0.8)';
    ctx.shadowBlur = 8 * dpr;

    ctx.beginPath();
    ctx.arc(rx, ry, 6 * dpr, 0, Math.PI * 2);
    ctx.fill();

    // Label
    ctx.shadowBlur = 0;
    ctx.fillStyle = '#00E676';
    ctx.font = `bold ${Math.floor(9 * dpr)}px 'JetBrains Mono', monospace`;
    ctx.fillText('ALPHA-1 (C2)', rx + 10 * dpr, ry + 3 * dpr);

    ctx.restore();
  }

  /**
   * Tactical color scale bar (COLD -> AMBER -> HOT).
   */
  renderThermalScaleBar(w, h, dpr) {
    const ctx = this.ctx;
    ctx.save();

    const barW = 120 * dpr;
    const barH = 7 * dpr;
    const bx = w - barW - 20 * dpr;
    const by = h - 22 * dpr;

    // Scale gradient
    const grad = ctx.createLinearGradient(bx, 0, bx + barW, 0);
    grad.addColorStop(0, '#00E5FF');   // Cyan cold
    grad.addColorStop(0.5, '#FF9800'); // Amber normal
    grad.addColorStop(1, '#F44336');   // Red hot

    ctx.fillStyle = grad;
    ctx.fillRect(bx, by, barW, barH);
    ctx.strokeStyle = '#2A3547';
    ctx.lineWidth = 1;
    ctx.strokeRect(bx, by, barW, barH);

    // Labels
    ctx.fillStyle = '#707E94';
    ctx.font = `${Math.floor(8 * dpr)}px 'JetBrains Mono', monospace`;
    ctx.fillText('COLD (15°C)', bx, by - 4 * dpr);
    ctx.textAlign = 'right';
    ctx.fillText('HOT (45°C)', bx + barW, by - 4 * dpr);

    ctx.restore();
  }

  /**
   * Top-left tactical map HUD badges: MAX TEMP, SURVIVORS LOCATED.
   */
  renderHUDStats(w, h, dpr) {
    const ctx = this.ctx;
    ctx.save();

    const pad = 16 * dpr;
    ctx.font = `bold ${Math.floor(10 * dpr)}px 'JetBrains Mono', monospace`;

    // Map Zone Header
    ctx.fillStyle = '#00E5FF';
    ctx.fillText('SECTOR A1 - COLLAPSED WING', pad, pad + 8 * dpr);

    // Readout 1: MAX TEMP
    ctx.fillStyle = '#707E94';
    ctx.fillText('MAX TEMP:', pad, pad + 24 * dpr);
    ctx.fillStyle = '#FF9800';
    ctx.fillText('37.5°C', pad + 65 * dpr, pad + 24 * dpr);

    // Readout 2: SURVIVORS LOCATED
    ctx.fillStyle = '#707E94';
    ctx.fillText('SURVIVORS:', pad + 130 * dpr, pad + 24 * dpr);
    ctx.fillStyle = '#00E676';
    ctx.fillText('4 LOCATED', pad + 205 * dpr, pad + 24 * dpr);

    ctx.restore();
  }
}
