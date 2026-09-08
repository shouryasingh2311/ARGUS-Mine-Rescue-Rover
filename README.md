<div align="center">

# 🔴 PROJECT ARGUS

### Autonomous Reconnaissance & Ground Underground Sentry

**An AI-Powered Mine Rescue Rover for Zero-Visibility Subterranean Search & Rescue**

[![SIH 2026](https://img.shields.io/badge/Smart%20India%20Hackathon-SIH26039-FF6B00?style=for-the-badge&logo=data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSIyNCIgaGVpZ2h0PSIyNCIgdmlld0JveD0iMCAwIDI0IDI0Ij48cGF0aCBmaWxsPSJ3aGl0ZSIgZD0iTTEyIDJMMiA3bDEwIDUgMTAtNS0xMC01ek0yIDE3bDEwIDUgMTAtNS0xMC01LTEwIDV6TTIgMTJsMTAgNSAxMC01LTEwLTUtMTAgNXoiLz48L3N2Zz4=)](https://www.sih.gov.in/)
[![Jharkhand](https://img.shields.io/badge/Ministry-Government%20of%20Jharkhand-1a73e8?style=for-the-badge)](https://jharkhand.gov.in/)
[![Theme](https://img.shields.io/badge/Theme-Smart%20Automation-00C853?style=for-the-badge)]()
[![Category](https://img.shields.io/badge/Category-Hardware-7C4DFF?style=for-the-badge)]()

---

*"No rescuer should become a casualty. Send the machine first."*

</div>

---

## 🎯 The Problem

**Every year, Indian coal mines kill rescuers who enter blind into toxic atmospheres to save their colleagues.**

In **June 2026, Ramgarh District, Jharkhand** — a lone miner collapsed in an oxygen-depleted coal gallery. Three fellow miners rushed in to help. All three died. **3 out of 4 fatalities were rescuers** who had zero atmospheric intelligence before crossing the threshold.

This is the **Blind Entry Trap:**

```
INCIDENT → UNKNOWN ATMOSPHERE → HUMAN ENTRY → SECONDARY CASUALTY → REPEAT
```

**ARGUS breaks this cycle** by deploying a robotic probe first:

```
INCIDENT → ARGUS DEPLOYED → ATMOSPHERE MAPPED → GO/NO-GO → HUMAN ENTRY (ONLY IF SAFE)
```

---

## 🤖 What Is ARGUS?

ARGUS is a **tracked rover** built for subterranean coal mine reconnaissance. It provides real-time atmospheric and visual intelligence to a surface command post, enabling informed go/no-go decisions before any human rescuer enters.

### Key Capabilities

| Capability | Implementation |
|---|---|
| **Atmospheric Sensing** | CO₂ (NDIR), CO (Electrochemical), CH₄ (Semiconductor), Temp, Humidity |
| **AI Person Detection** | YOLOv8/YOLO11 Nano — detects trapped miners in zero-visibility |
| **Seismic Tremor Detection** | MPU-6050 IMU — detects tunnel collapse vibrations |
| **Flood Detection** | Ultrasonic + float switch — detects rising water levels |
| **SOS Knock Detection** | Acoustic FFT — detects 3-3-3 rhythmic SOS knocking patterns |
| **Spark-Free Comms** | Fiber-optic tether (no electrical ignition risk in methane) |
| **LoRa Failover** | 433 MHz long-range radio backup if tether is severed |
| **Tactical HUD** | Dark industrial C2 dashboard with live gas heatmaps, gauges, and alarms |

---

## 🖥️ Dashboard Preview

The tactical Command & Control (C2) dashboard renders a zero-scroll, military-style HUD:

- **Live YOLO-annotated video feed** with bounding boxes and distance tags
- **Spatial gas dispersion heatmap** (CH₄ / CO / CO₂ plumes on a blueprint floorplan)
- **FFT acoustic visualizer** (turns red on SOS knock detection)
- **Cockpit pitch & roll dials** (MPU-6050 gyroscope)
- **Environmental sensor grid** (O₂%, CO, Temperature, Humidity)
- **Real-time alarm system** (CO threshold, methane LEL, water ingress, tremor)

---

## 🚀 Quick Start

### Prerequisites

- **Node.js** ≥ 18.x
- **Python** ≥ 3.10
- **Git**

### 1. Clone & Install

```bash
git clone https://github.com/shouryasingh2311/ARGUS-Mine-Rescue-Rover.git
cd ARGUS-Mine-Rescue-Rover

# Python environment (for YOLO pipeline)
python -m venv .venv
.venv\Scripts\activate        # Windows
# source .venv/bin/activate   # Linux/macOS
pip install -r requirements.txt
```

### 2. Run (Demo Mode — No Hardware Required)

```bash
# Terminal 1: Start the telemetry server
node server.js

# Terminal 2: Start the fake sensor data simulator
node fake_telemetry.js

# Terminal 3 (optional): Start YOLO vision pipeline
python MINE_RESCUE_PRO.py
```

Open **http://127.0.0.1:8080/** in your browser.

> The fake telemetry simulator cycles through 3 scenarios automatically:
> 1. 🟢 **NORMAL** — Safe baseline readings (~20s)
> 2. 🟡 **WARNING** — Elevated CO, low O₂, tremor spike (~15s)
> 3. 🔴 **SOS** — SOS knock detected + water ingress alarm (~12s)

### 3. Run (Live Hardware — With ESP32)

```bash
# The server auto-bridges to ESP32 at http://192.168.4.1/events
node server.js
python MINE_RESCUE_PRO.py
```

### Windows One-Click

Double-click **`START_ROVER_SYSTEM.bat`** — launches everything automatically.

---

## 📐 Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                        UNDERGROUND                              │
│                                                                  │
│  ┌──────────────────────────────────────────────────────────┐   │
│  │  ARGUS ROVER                                              │   │
│  │                                                            │   │
│  │  ESP32 ◄─── MH-Z19B (CO₂)        ┌──────────┐           │   │
│  │    │    ◄─── ZE07-CO (CO)         │ USB Cam  │           │   │
│  │    │    ◄─── MP-4 (CH₄)           │ 720p30   │           │   │
│  │    │    ◄─── MPU-6050 (IMU)       └────┬─────┘           │   │
│  │    │    ◄─── HC-SR04 (Sonar ×2)        │                 │   │
│  │    │    ◄─── DHT11 (Temp/Hum)          │                 │   │
│  │    │    ◄─── Float Switch              │                 │   │
│  │    │                                    │                 │   │
│  │    │    ──── L298N ──── DC Motors ×2    │                 │   │
│  │    │                                    │                 │   │
│  │    └────────────┬───────────────────────┘                 │   │
│  │                 │                                          │   │
│  └─────────────────┼──────────────────────────────────────────┘   │
│                    │                                              │
│           ┌────────┴────────┐                                    │
│           │  FIBER-OPTIC    │  ← Spark-free (no ignition risk)  │
│           │  TETHER         │  ← 200-500m armored cable         │
│           │  (200+ Mbps)    │                                    │
│           └────────┬────────┘                                    │
│                    │                                              │
│         ┌──────────┴──────────┐                                  │
│         │  LoRa SX1278        │  ← Failover if tether severed   │
│         │  (433 MHz backup)   │                                  │
│         └──────────┬──────────┘                                  │
│                    │                                              │
└────────────────────┼─────────────────────────────────────────────┘
                     │
┌────────────────────┼─────────────────────────────────────────────┐
│                    │        SURFACE C2                            │
│                    ▼                                              │
│  ┌──────────────────────────────────┐                            │
│  │  Node.js Relay Server (:8080)    │                            │
│  │  ├── SSE → Dashboard (HUD)      │                            │
│  │  ├── API → Mobile Controller    │                            │
│  │  └── Bridge → ESP32 telemetry   │                            │
│  └──────────────────────────────────┘                            │
│                    │                                              │
│  ┌──────────────────────────────────┐                            │
│  │  YOLO Inference Engine           │                            │
│  │  (Python + GPU / Hailo NPU)     │                            │
│  │  Detects: person, helmet, vest  │                            │
│  └──────────────────────────────────┘                            │
│                    │                                              │
│  ┌──────────────────────────────────┐                            │
│  │  Tactical HUD Dashboard          │                            │
│  │  (index.html — dark industrial)  │                            │
│  │  Gas heatmap · FFT · Dials ·    │                            │
│  │  YOLO overlay · Alarms          │                            │
│  └──────────────────────────────────┘                            │
└──────────────────────────────────────────────────────────────────┘
```

---

## 🔧 Sensor Suite

| Sensor | Model | Principle | Target | Interface |
|---|---|---|---|---|
| CO₂ | Winsen MH-Z19B | NDIR (Infrared Absorption) | 0–5000 ppm | UART 9600 |
| CO | Winsen ZE07-CO | Electrochemical Fuel Cell | 0–500 ppm | UART 9600 |
| CH₄ | Winsen MP-4 | Semiconductor Metal-Oxide | 300–10,000 ppm | Analog ADC |
| IMU | InvenSense MPU-6050 | MEMS Accelerometer + Gyroscope | ±4g / ±500°/s | I²C 0x68 |
| Distance | HC-SR04 (×2) | Ultrasonic Time-of-Flight | 2–400 cm | GPIO |
| Temp/Humidity | DHT11 | Capacitive/NTC | 0–50°C / 20–90% RH | Single-wire |
| Water Level | Float Switch | Reed Contact | Binary (wet/dry) | GPIO |
| Obstacle | IR Proximity | Reflective Infrared | 2–30 cm | GPIO |

> **Why not MQ-series sensors?** MQ sensors use heated SnO₂ resistive elements that are severely cross-sensitive to humidity (85–99% RH in mines), lack gas selectivity, and ship without factory calibration. ARGUS uses principle-specific, factory-calibrated sensors immune to humidity interference. See [§3.1 of the Technical Specification](TECHNICAL_SPECIFICATION.md#31-why-mq-series-resistive-sensors-are-rejected) for detailed physics.

---

## 💰 Cost Comparison

| Platform | Cost |
|---|---|
| **ARGUS Prototype** | **₹9,190** (~$110) |
| **ARGUS Production** | **₹28,550** (~$340) |
| DRDO Daksh ROV | ₹15–25 Lakh |
| Imported Mine Robots | ₹35–50 Lakh |

**ARGUS costs < 2% of industrial alternatives**, enabling deployment at every local colliery depot instead of one centralized expensive unit.

---

## 📁 Repository Structure

```
Rover/
├── index.html                  # Tactical C2 HUD Dashboard
├── controller.html             # Mobile Override Controller
├── server.js                   # Node.js telemetry relay (SSE + REST API)
├── fake_telemetry.js           # Demo simulator (no ESP32 needed)
├── MINE_RESCUE.py              # Minimal YOLO inference
├── MINE_RESCUE_PRO.py          # Production GPU YOLO pipeline
├── best.pt                     # Custom YOLOv8n model weights
├── START_ROVER_SYSTEM.bat      # Windows one-click launcher
├── STOP_ROVER_SYSTEM.bat       # Windows one-click shutdown
├── run.bat                     # Quick-launch alias
├── css/styles.css              # HUD stylesheet
├── js/                         # Frontend modules
│   ├── app.js                  #   App controller
│   ├── config.js               #   Thresholds & constants
│   ├── telemetry-engine.js     #   SSE telemetry client
│   ├── hud-camera.js           #   Camera feed + YOLO overlay
│   ├── hud-gauges.js           #   Gauges, dials, FFT
│   ├── hud-heatmap.js          #   Gas heatmap + blueprint
│   ├── audio-fx.js             #   Alarm sounds
│   └── controller.js           #   Mobile joystick
├── requirements.txt            # Python dependencies
├── README.md                   # ← You are here
└── TECHNICAL_SPECIFICATION.md  # Full engineering specification
```

---

## 📖 Documentation

| Document | Description |
|---|---|
| [**TECHNICAL_SPECIFICATION.md**](TECHNICAL_SPECIFICATION.md) | 📐 Complete engineering specification — sensor physics, electrical schematics, pinout matrix, FMEA, BOM, comms architecture, build guide, and academic references |
| [**README.md**](README.md) | 🚀 Project overview and quick start guide (this file) |

---

## 🛡️ Safety Philosophy

ARGUS is designed as a **forward-deployed, expendable reconnaissance asset**:

- The rover is **not a replacement** for human rescuers — it is a sacrificial probe
- Unit cost is engineered low enough that **losing a rover** to a collapse or explosion is an acceptable trade-off against a human life
- The fiber-optic tether is **intrinsically spark-free** — zero ignition risk in methane atmospheres
- All hazard thresholds follow **OSHA PEL**, **DGMS Regulation 182**, and **IS 5572:2009** standards

---

## 📚 Key References

1. Ray, S. K. et al. (2015). "Review of preventive measures for coal mine explosions." *Int. J. Mining Science and Technology*, 25(3). [ScienceDirect](https://doi.org/10.1016/j.ijmst.2015.03.024)
2. Wang, Y. et al. (2017). "MSRBOT-based rescue robot for coal mines." *Sensors*, 17(11). [PMC5677175](https://www.ncbi.nlm.nih.gov/pmc/articles/PMC5677175/)
3. DGMS. *Coal Mines Regulations, 2017.* Government of India.
4. Luo, J. et al. (2026). "Advances in Underground Mine Rescue Robotics." *Frontiers in Robotics and AI*, 13.
5. The Avenue Mail. (June 2026). Ramgarh coal mine tragedy report.

---

## 👥 Team

**Smart India Hackathon 2026 — Problem Statement SIH26039**  
Government of Jharkhand · Smart Automation · Hardware

---

## 📄 License

This project is developed for the Smart India Hackathon 2026. All rights reserved by the contributing team.

---

<div align="center">

**PROJECT ARGUS** · Autonomous Reconnaissance & Ground Underground Sentry

*Built to save lives. Engineered to be expendable.*

</div>
