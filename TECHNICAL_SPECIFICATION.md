# PROJECT ARGUS — Master Technical Specification

### Autonomous Reconnaissance & Ground Underground Sentry

> **Revision:** 1.0.0 &nbsp;|&nbsp; **Date:** 2026-09-09 &nbsp;|&nbsp; **Classification:** OPEN — Smart India Hackathon Submission  
> **Problem Statement ID:** SIH26039 &nbsp;|&nbsp; **Ministry:** Government of Jharkhand  
> **Theme:** Smart Automation &nbsp;|&nbsp; **Category:** Hardware

---

## Table of Contents

1. [Executive Summary & Problem Grounding](#1-executive-summary--problem-grounding)
2. [Mechanical Design, Locomotion & IP65 Hardening](#2-mechanical-design-locomotion--ip65-hardening)
3. [Sensor Suite Specifications & Physics of Sensing](#3-sensor-suite-specifications--physics-of-sensing)
4. [Electrical Architecture & Schematic Pinout Matrix](#4-electrical-architecture--schematic-pinout-matrix)
5. [Dual-Layer Intrinsic Communications Pipeline](#5-dual-layer-intrinsic-communications-pipeline)
6. [Surface Command & Control (C2) & AI Vision Pipeline](#6-surface-command--control-c2--ai-vision-pipeline)
7. [Two-Tier Bill of Materials & Unit Economics](#7-two-tier-bill-of-materials--unit-economics)
8. [Failure Modes & Effects Analysis (FMEA)](#8-failure-modes--effects-analysis-fmea)
9. [Build & Reproduction Guide](#9-build--reproduction-guide)
10. [Academic & Institutional References](#10-academic--institutional-references)

---

## 1. Executive Summary & Problem Grounding

### 1.1 Problem Statement (Verbatim — SIH26039)

> Hazardous subterranean underground coal mine exploration, toxic gas leaks, tunnel collapses, zero-visibility search & rescue, and rescuer casualty prevention.

India's coal mining industry — the backbone of its energy sector — operates some of the most geologically unstable and atmospherically lethal subterranean environments on earth. When an incident occurs underground — be it a gas leak, a roof collapse, or a fire — the first-response protocol has remained essentially unchanged for decades: human rescuers physically enter the unknown void, equipped with nothing more than portable gas detectors and cap lamps, to locate trapped miners. This protocol routinely converts a single-casualty incident into a multi-casualty tragedy.

### 1.2 Real-World Incident Case Study: The Ramgarh Mine Tragedy (June 2026)

On **June 2026**, at an underground coal mine in **Ramgarh District, Jharkhand**, a lone miner collapsed inside a partially exhausted gallery. What followed is the textbook manifestation of the **"Blind Entry Trap"**:

- **1 primary casualty:** A miner lost consciousness due to oxygen displacement by accumulated Carbon Dioxide (CO₂) and Carbon Monoxide (CO) in a sealed-off, poorly ventilated gallery.
- **3 secondary rescuer fatalities:** Three fellow miners entered the same gallery in immediate succession to retrieve their collapsed colleague. They had **no prior atmospheric intelligence** — no knowledge of the O₂ concentration, CO levels, or CH₄ presence. Each rescuer succumbed within minutes to the same oxygen-depleted, toxic gas pocket.
- **Total fatalities: 4.** Three of four deaths were entirely preventable had the rescue team possessed remote atmospheric reconnaissance capability before human entry.

*Source: The Avenue Mail, Ramgarh District Correspondent Report, June 2026.*

### 1.3 The Blind Entry Trap — Engineering the Elimination

The Blind Entry Trap is defined as the cascading failure mode where:

```
INCIDENT → UNKNOWN ATMOSPHERE → HUMAN ENTRY → SECONDARY CASUALTY → REPEAT
```

**ARGUS eliminates this trap** by inserting a robotic reconnaissance layer between the incident and human entry:

```
INCIDENT → ARGUS DEPLOYED → ATMOSPHERE MAPPED → GO/NO-GO DECISION → HUMAN ENTRY (ONLY IF SAFE)
```

The rover provides **quantitative atmospheric intelligence** (CO, CO₂, CH₄, O₂ displacement inference, temperature, humidity) and **visual reconnaissance** (live camera + AI person detection) to the surface command post **before any human rescuer crosses the threshold.**

### 1.4 Target End Users

| User Class | Operational Context |
|---|---|
| **Colliery Pit-Head Rescue Squads** | Immediate first-response at the mine site. ARGUS deployed from the pithead within minutes of an incident alarm. |
| **DGMS Inspection Officers** | Directorate General of Mines Safety officers conducting post-incident atmospheric surveys and compliance audits. |
| **NDRF / SDRF Disaster Recovery Units** | National/State Disaster Response Force teams deployed for major underground disasters (fires, explosions, multi-level collapses). |

### 1.5 Operational Doctrine

ARGUS is designed as a **forward-deployed, expendable reconnaissance asset** — not a replacement for human rescuers, but a sacrificial probe that gathers intelligence so that human rescuers do not become additional casualties. The unit cost is engineered to be low enough (< ₹30,000 for production units) that losing a rover to a collapse or explosion is an acceptable operational trade-off against a human life.

---

## 2. Mechanical Design, Locomotion & IP65 Hardening

### 2.1 Continuous Rubber Track Locomotion

ARGUS employs a **dual continuous rubber track drivetrain** rather than wheeled locomotion. This design decision is driven by the physics of the underground mine operating surface:

#### 2.1.1 Ground Pressure Advantage

Ground pressure is the critical parameter determining whether a vehicle can traverse soft, waterlogged coal slurry without sinking:

$$P_{ground} = \frac{m \cdot g}{A_{contact}}$$

Where:
- $m$ = vehicle mass ≈ 3.5 kg
- $g$ = gravitational acceleration = 9.81 m/s²
- $A_{contact}$ = total ground contact area of both tracks

For ARGUS tracks (each 180mm × 35mm contact patch × 2 tracks):

$$A_{contact} = 2 \times (0.180 \times 0.035) = 0.0126 \text{ m}^2$$

$$P_{ground} = \frac{3.5 \times 9.81}{0.0126} \approx 2724 \text{ Pa} \approx 0.027 \text{ bar}$$

This ground pressure (~2.7 kPa) is an order of magnitude lower than a comparable wheeled robot (~25–40 kPa), ensuring traversal over waterlogged coal slurry, loose debris, and wet rock without sinking or wheel spin.

#### 2.1.2 Tractive Shear Force on Loose Coal Media

The maximum tractive force available before track slippage on loose wet coal:

$$F_{traction} = \mu \cdot m \cdot g$$

Where $\mu$ (coefficient of friction, rubber track on wet coal aggregate) ≈ 0.45–0.65:

$$F_{traction} = 0.55 \times 3.5 \times 9.81 \approx 18.9 \text{ N}$$

This exceeds the drag forces encountered on 15–20° inclines typical of coal gallery ramps.

#### 2.1.3 Differential Skid-Steering Kinematics

ARGUS uses **differential skid-steering** — varying the speed and direction of the left and right tracks independently to achieve all motion primitives:

| Motion Primitive | Left Track | Right Track | Result |
|---|---|---|---|
| Forward | +V | +V | Straight forward |
| Reverse | −V | −V | Straight reverse |
| Pivot Left (Zero-Radius) | −V | +V | 360° CW rotation in-place |
| Pivot Right (Zero-Radius) | +V | −V | 360° CCW rotation in-place |
| Arc Left | +0.5V | +V | Gradual left curve |
| Arc Right | +V | +0.5V | Gradual right curve |

The **zero-radius pivot** capability (rotating on the spot) is critical in narrow mine galleries where three-point turns are geometrically impossible. Track-width separation of ~200mm permits a turning circle of effectively 0mm diameter.

### 2.2 Ingress Protection — IP65 Standard

ARGUS is hardened to **IP65** (Ingress Protection per IEC 60529):
- **IP6x (Dust-Tight):** Complete protection against ingress of dust — critical in coal mines where airborne coal particulate is omnipresent.
- **IPx5 (Water Jet Protected):** Protection against low-pressure water jets from any direction — protecting against flooded gallery water splashes, dripping ceilings, and hose-down decontamination.

#### 2.2.1 Core Enclosure

| Component | Specification |
|---|---|
| **Shell Material** | High-impact ABS / Polycarbonate blend, 3mm wall thickness |
| **Sealing Method** | Perimeter industrial rubber O-ring compression gasket (Shore A 70 durometer, 3mm cross-section) seated in a CNC-machined groove on the enclosure flange |
| **Fastening** | M3 × 12mm stainless steel socket-head cap screws at 40mm pitch around perimeter, compressing the gasket to 70–80% of free cross-section for optimal seal |

#### 2.2.2 Hermetic Wiring Pass-Throughs

All external wiring (motor leads, sensor cables, antenna coax) exits the sealed enclosure through **threaded PG cable glands** with elastomeric compression rings:

| Gland Size | Cable OD Range | Application |
|---|---|---|
| **PG7** | 3.0–6.5 mm | Sensor signal cables (I2C, UART), LoRa antenna coax |
| **PG9** | 4.0–8.0 mm | USB camera cable, fiber-optic tether |
| **PG11** | 5.0–10.0 mm | Motor power leads (12V DC, 2A per channel) |

Each gland is torqued to manufacturer specification, compressing the internal rubber collar around the cable jacket to achieve a gas-tight and water-tight seal.

#### 2.2.3 Sensor Chamber — ePTFE Breathable Membrane

The gas sensor compartment presents a unique sealing challenge: the sensors **must** be exposed to the ambient mine atmosphere to measure gas concentrations, yet **must not** admit liquid water, coal dust, or mud that would foul the sensing elements.

**Solution:** An **expanded polytetrafluoroethylene (ePTFE / Gore-Tex®)** membrane is installed over the sensor chamber air intake port.

| Property | Specification |
|---|---|
| **Material** | ePTFE (expanded PTFE), hydrophobic + oleophobic |
| **Pore Size** | 0.1–0.5 μm — permits free diffusion of gas molecules (CO, CO₂, CH₄ kinetic diameters: 0.33–0.38 nm) while blocking liquid water droplets and particulates |
| **Water Entry Pressure** | > 1.0 bar — water cannot penetrate the membrane under pressures encountered during splashing or brief submersion |
| **Airflow Rate** | > 5 L/min @ 70 Pa differential — ensures gas sensor response time is not degraded by membrane resistance |

This architecture allows the **Winsen MH-Z19B**, **ZE07-CO**, and **MP-4** sensors to breathe ambient mine atmosphere while remaining protected from physical contamination.

#### 2.2.4 Board-Level Protection — Conformal Coating

All printed circuit boards (ESP32 DevKit, motor driver, sensor breakout boards) receive a post-assembly application of **moisture-resistant silicone conformal coating** (MIL-I-46058C Type SR equivalent):

- **Purpose:** Prevents condensation-induced micro-shorts, inhibits dendritic copper growth between traces caused by humidity, and provides a secondary barrier against coal dust infiltration to exposed solder joints.
- **Application Method:** Aerosol spray, 50–75 μm dry film thickness, covering all components except connectors and deliberate ventilation points.
- **Operating Temperature Range:** −40°C to +200°C — well within the mine operating envelope.

---

## 3. Sensor Suite Specifications & Physics of Sensing

### 3.1 Why MQ-Series Resistive Sensors Are Rejected

Hobbyist-grade broad-spectrum metal-oxide semiconductor (MOS) sensors such as the **MQ-2, MQ-7, MQ-9, and MQ-135** are explicitly **rejected** for ARGUS despite their low cost. The rejection is grounded in sensor physics:

| Deficiency | Technical Explanation |
|---|---|
| **Humidity Cross-Sensitivity** | MOS sensors measure resistance change caused by reducing gas adsorption on a heated SnO₂ surface. Water vapor (H₂O) is itself a reducing agent that modulates SnO₂ conductivity, causing a **systematic positive bias** in gas readings proportional to ambient humidity. Underground coal mines routinely operate at 85–99% RH, rendering MOS readings unreliable by 30–150% of true value. |
| **Poor Gas Selectivity** | A single MQ-series sensor responds to dozens of reducing gases (CO, CH₄, H₂, ethanol, LPG, smoke) with overlapping sensitivity curves. Discriminating between CO at 50 ppm and CH₄ at 1.0% is not possible from a single resistance reading without multi-sensor array decomposition and calibration matrices that are impractical for field deployment. |
| **Thermal Drift** | The heated filament (consuming 150–800 mW continuously) causes self-heating drift over time, requiring periodic recalibration that is infeasible in an autonomous rover. |
| **No Factory Calibration** | MQ sensors ship without individual factory calibration certificates. Each unit requires manual baseline calibration in known gas concentrations — a laboratory procedure unavailable at a mine site. |

ARGUS instead uses **principle-specific, factory-calibrated sensors** where each sensor employs a distinct physical measurement principle that is inherently immune to humidity cross-talk.

### 3.2 Optical CO₂ — Winsen MH-Z19B (NDIR)

| Parameter | Specification |
|---|---|
| **Sensing Principle** | Non-Dispersive Infrared Absorption (NDIR) |
| **Target Gas** | Carbon Dioxide (CO₂) |
| **Measurement Range** | 0–5000 ppm |
| **Accuracy** | ±(50 ppm + 3% of reading) |
| **Resolution** | 1 ppm |
| **Response Time (T₉₀)** | < 120 seconds |
| **Interface** | UART (TTL 3.3V), 9600 baud, 8N1 |
| **Operating Voltage** | 4.9–5.1 VDC |
| **Operating Current** | < 60 mA average |
| **Calibration** | Factory-calibrated; supports ABC (Automatic Baseline Correction) for long-term drift compensation |

**Physics of NDIR Sensing:**

The MH-Z19B contains a miniature optical bench with an infrared LED emitter and a thermopile IR detector, separated by a gas diffusion chamber. CO₂ molecules absorb infrared radiation strongly at the **4.26 μm wavelength** (asymmetric stretching vibrational mode). The detector measures the attenuation of the 4.26 μm band relative to a reference band, and this attenuation is proportional to CO₂ concentration via the **Beer-Lambert Law:**

$$I = I_0 \cdot e^{-\alpha \cdot c \cdot l}$$

Where:
- $I$ = transmitted intensity at detector
- $I_0$ = incident intensity (no gas)
- $\alpha$ = molar absorption coefficient of CO₂ at 4.26 μm
- $c$ = gas concentration (ppm)
- $l$ = optical path length (cm)

This principle is **inherently immune to humidity** because H₂O does not absorb at 4.26 μm (water's IR absorption bands are at 2.7 μm and 6.3 μm), eliminating the cross-sensitivity that cripples MOS sensors.

### 3.3 Electrochemical CO — Winsen ZE07-CO

| Parameter | Specification |
|---|---|
| **Sensing Principle** | Fuel-cell electrochemical oxidation |
| **Target Gas** | Carbon Monoxide (CO) |
| **Measurement Range** | 0–500 ppm |
| **Resolution** | 0.1 ppm |
| **Response Time (T₉₀)** | < 15 seconds |
| **Interface** | UART (TTL 3.3V), 9600 baud, 8N1; also provides analog DAC voltage output (0.4–2.0V proportional) |
| **Operating Voltage** | 3.3–5.0 VDC |
| **Operating Current** | < 12 mA |
| **Calibration** | Individual factory calibration with traceable calibration gas |
| **Cross-Sensitivity** | H₂: < 5% of reading; H₂S: < 2% of reading; humidity: negligible due to hydrophobic membrane |

**Physics of Electrochemical Sensing:**

The ZE07-CO contains a three-electrode electrochemical cell (working, counter, reference) filled with a liquid electrolyte. CO molecules diffusing through a gas-permeable membrane reach the working electrode, where they undergo **catalytic electrochemical oxidation:**

$$CO + H_2O \rightarrow CO_2 + 2H^+ + 2e^-$$

The liberated electrons generate a current proportional to the CO concentration (Faraday's Law of Electrolysis). This current is amplified by an onboard ASIC and converted to a digital UART reading. Because the reaction is specific to CO oxidation, the sensor exhibits minimal cross-sensitivity to other mine gases.

### 3.4 Catalytic / Semiconductor Methane — Winsen MP-4

| Parameter | Specification |
|---|---|
| **Sensing Principle** | Semiconductor metal-oxide with methane-specific doping |
| **Target Gas** | Methane (CH₄) — Lower Explosive Limit (LEL) monitoring |
| **Measurement Range** | 300–10,000 ppm (0.03%–1.0% by volume) |
| **Interface** | Analog voltage output (conditioned via voltage divider to ESP32 ADC, 12-bit) |
| **Operating Voltage** | 5.0 VDC (heater circuit) |
| **Heater Power** | ≤ 900 mW |
| **Preheat Time** | > 48 hours for stable baseline (continuous operation mode) |

**Operational Safety Context:**

Methane (CH₄) is the primary explosive hazard in coal mines. The Lower Explosive Limit (LEL) for methane-air mixtures is **5.0% by volume** at standard conditions. DGMS regulations mandate evacuation when CH₄ concentration exceeds **1.0% (20% LEL)** in any working gallery. The MP-4 sensor provides the early warning trigger for this threshold.

**ADC Conditioning Circuit:**

The MP-4 analog output is conditioned through a voltage divider and low-pass RC filter before feeding the ESP32 12-bit ADC:

```
MP-4 AOUT ──┬── R1 (10kΩ) ──┬── ESP32 GPIO36 (VP, ADC1_CH0)
             │               │
             └── R_load (4.7kΩ) ── GND
                              │
                              C1 (100nF) ── GND
```

The ADC reading is converted to approximate ppm via a logarithmic calibration curve derived from the MP-4 datasheet sensitivity characteristic:

$$R_s / R_0 = f(C_{CH_4})$$

### 3.5 Inertial Measurement — InvenSense MPU-6050

| Parameter | Specification |
|---|---|
| **Sensing Principle** | MEMS capacitive accelerometer + MEMS vibratory gyroscope |
| **Degrees of Freedom** | 6-axis (3-axis accelerometer + 3-axis gyroscope) |
| **Accelerometer Range** | ±2g / ±4g / ±8g / ±16g (ARGUS default: ±4g) |
| **Gyroscope Range** | ±250 / ±500 / ±1000 / ±2000 °/s (ARGUS default: ±500°/s) |
| **Interface** | I²C, device address 0x68 (AD0 → GND), 400 kHz Fast Mode |
| **Operating Voltage** | 2.375–3.46 VDC (3.3V rail) |
| **Update Rate** | Up to 1 kHz (ARGUS: sampled at 50 Hz, decimated to 10 Hz telemetry) |

**Operational Application:**

The MPU-6050 serves two distinct functions on ARGUS:

1. **Chassis Attitude Monitoring (Pitch & Roll):** Continuous monitoring of the rover's pitch (nose-up/down on inclines) and roll (lateral tilt). A sudden tilt excursion > 35° triggers a **ROLLOVER / CAVE-IN** alarm on the C2 dashboard, indicating either:
   - The rover has physically tipped over on uneven terrain, or
   - The gallery floor/ceiling has shifted (tunnel collapse event).

2. **Seismic Tremor Detection:** The accelerometer Z-axis (vertical) is monitored for high-frequency transients (> 0.3g peak, > 5 Hz). Such signatures indicate:
   - Roof bolt failure and ceiling slab detachment
   - Pillar collapse propagation
   - Distant blasting reverberations

   Tremor detection triggers an immediate `tremor_detected: true` flag in the telemetry stream.

### 3.6 Obstacle & Flood Ranging

#### 3.6.1 Ultrasonic HC-SR04

| Parameter | Specification |
|---|---|
| **Sensing Principle** | Time-of-flight (ToF) acoustic pulse-echo |
| **Frequency** | 40 kHz ultrasonic transducer |
| **Range** | 2 cm – 400 cm |
| **Accuracy** | ±3 mm |
| **Trigger Interface** | Digital GPIO (10 μs pulse on TRIG pin) |
| **Echo Interface** | Digital GPIO (pulse-width proportional to distance) |

**Distance Calculation:**

$$d = \frac{t_{echo} \times v_{sound}}{2}$$

Where $v_{sound}$ ≈ 343 m/s at 20°C (corrected for mine temperature via DHT11/22 reading).

Two HC-SR04 modules are deployed:
- **Forward-facing:** Obstacle clearance ranging (wall, debris, collapsed roof slab detection)
- **Ground-facing (downward):** Floor-level water depth estimation for flood detection

#### 3.6.2 Digital IR Beam-Break Obstacle Sensor

| Parameter | Specification |
|---|---|
| **Type** | Reflective infrared proximity switch (binary output) |
| **Detection Range** | 2–30 cm (adjustable via potentiometer) |
| **Output** | Digital HIGH/LOW (active-low: LOW = obstacle detected) |
| **Purpose** | Near-field bumper obstacle detection for collision avoidance in zero-visibility environments where ultrasonic may scatter off irregular surfaces |

### 3.7 Environmental Baseline — DHT11 (Temperature & Humidity)

| Parameter | Specification |
|---|---|
| **Temperature Range** | 0–50°C, ±2°C accuracy |
| **Humidity Range** | 20–90% RH, ±5% RH accuracy |
| **Interface** | Single-wire digital protocol, GPIO |
| **Purpose** | Ambient temperature for ultrasonic speed-of-sound correction; humidity monitoring for condensation risk assessment; baseline environmental context for C2 dashboard |

---

## 4. Electrical Architecture & Schematic Pinout Matrix

### 4.1 System Power Architecture

```
┌─────────────────────────────────────────────────────────────────────┐
│                    POWER DISTRIBUTION SCHEMATIC                    │
│                                                                     │
│   ┌───────────────┐                                                 │
│   │  3S Li-ion     │                                                │
│   │  Battery Pack  │──── 12.6V (fully charged) ───┬──────────────── │
│   │  (3× 18650)    │                              │                 │
│   │  + 3S BMS      │                              │                 │
│   │  (10A rated)   │                              │                 │
│   └───────────────┘                              │                 │
│                                                   │                 │
│                          ┌────────────────────────┼────────┐       │
│                          │                        │        │       │
│                          ▼                        ▼        │       │
│                  ┌──────────────┐          ┌───────────┐   │       │
│                  │  LM2596 Buck │          │  L298N /   │   │       │
│                  │  Converter   │          │  TB6612FNG │   │       │
│                  │  12V → 5.0V  │          │  H-Bridge  │   │       │
│                  │  @ 3A max    │          │  Motor     │   │       │
│                  └──────┬───────┘          │  Driver    │   │       │
│                         │                  └─────┬─────┘   │       │
│                         │                        │         │       │
│                    ┌────┴────┐              ┌────┴────┐    │       │
│                    │  5V Rail │              │ 12V Rail│    │       │
│                    │ (Logic)  │              │ (Motor) │    │       │
│                    └────┬────┘              └────┬────┘    │       │
│                         │                        │         │       │
│              ┌──────────┼──────────┐        ┌────┴────┐    │       │
│              │          │          │        │ DC Motor│    │       │
│              ▼          ▼          ▼        │ LEFT    │    │       │
│         ┌────────┐ ┌────────┐ ┌────────┐   │ DC Motor│    │       │
│         │ ESP32  │ │MH-Z19B │ │ HC-SR04│   │ RIGHT   │    │       │
│         │DevKit  │ │ (CO₂)  │ │(Ultra.)│   └─────────┘    │       │
│         │3.3V int│ │ 5V req │ │ 5V req │                   │       │
│         └────────┘ └────────┘ └────────┘                   │       │
│                                                             │       │
│   DECOUPLING: 100μF electrolytic + 0.1μF ceramic          │       │
│               on 5V logic rail, close to ESP32 VIN         │       │
└─────────────────────────────────────────────────────────────────────┘
```

### 4.2 Battery Subsystem

| Parameter | Specification |
|---|---|
| **Cell Chemistry** | Lithium-Ion 18650 (INR/ICR) |
| **Configuration** | 3S1P (3 cells in series, 1 parallel) |
| **Nominal Voltage** | 11.1V (3 × 3.7V) |
| **Fully Charged Voltage** | 12.6V (3 × 4.2V) |
| **Cutoff Voltage** | 9.0V (3 × 3.0V) |
| **Capacity** | 2600–3400 mAh (cell-dependent) |
| **BMS Protection** | 3S 10A BMS with over-charge, over-discharge, short-circuit, and over-current protection |
| **Estimated Runtime** | ~90–120 minutes at moderate motor load + sensor polling |

### 4.3 DC-DC Regulation

| Parameter | Specification |
|---|---|
| **Regulator IC** | Texas Instruments LM2596-5.0 (or LM2596-ADJ configured for 5.0V) |
| **Topology** | Synchronous buck (step-down) converter |
| **Input Voltage Range** | 4.5–40 VDC |
| **Output Voltage** | 5.0V ± 4% |
| **Maximum Output Current** | 3.0A continuous |
| **Switching Frequency** | 150 kHz |
| **Efficiency** | ~85% at 12V→5V, 1.5A load |

### 4.4 Motor Driver — L298N / TB6612FNG Dual H-Bridge

| Parameter | L298N | TB6612FNG |
|---|---|---|
| **Motor Channels** | 2 (Dual H-Bridge) | 2 (Dual H-Bridge) |
| **Motor Supply Voltage** | 5–46V | 4.5–13.5V |
| **Per-Channel Current** | 2A continuous, 3A peak | 1.2A continuous, 3.2A peak |
| **Logic Voltage** | 5V | 2.7–5.5V |
| **Control Inputs (per channel)** | IN1, IN2 (direction), ENA (PWM speed) | AIN1, AIN2, PWMA |
| **Voltage Drop** | ~2V (BJT output stage) | ~0.5V (MOSFET output stage) |

### 4.5 Complete ESP32 Pinout Assignment Matrix

| # | Peripheral / Sensor | Sensor Pin | ESP32 GPIO | Voltage Rail | Protocol / Mode |
|---|---|---|---|---|---|
| 1 | **MH-Z19B (CO₂ NDIR)** | TX | **GPIO16** (RX2) | 5V | UART2 RX @ 9600 baud |
| 2 | | RX | **GPIO17** (TX2) | 5V | UART2 TX @ 9600 baud |
| 3 | | Vin | — | 5V | Power |
| 4 | | GND | — | GND | Ground |
| 5 | **ZE07-CO (Electrochemical)** | TX | **GPIO3** (RX0) *or* SoftSerial **GPIO25** | 3.3V | UART / SoftwareSerial @ 9600 baud |
| 6 | | RX | **GPIO1** (TX0) *or* SoftSerial **GPIO26** | 3.3V | UART / SoftwareSerial @ 9600 baud |
| 7 | | Vin | — | 3.3V | Power |
| 8 | | GND | — | GND | Ground |
| 9 | **MP-4 (CH₄ Semiconductor)** | AOUT | **GPIO36** (VP / ADC1_CH0) | 5V (heater) | Analog ADC (12-bit) |
| 10 | | Vin | — | 5V | Power (heater) |
| 11 | | GND | — | GND | Ground |
| 12 | **MPU-6050 (IMU 6-Axis)** | SDA | **GPIO21** | 3.3V | I²C Data (400 kHz) |
| 13 | | SCL | **GPIO22** | 3.3V | I²C Clock (400 kHz) |
| 14 | | AD0 | GND (hardwired) | — | Address select → 0x68 |
| 15 | | VCC | — | 3.3V | Power |
| 16 | | GND | — | GND | Ground |
| 17 | **HC-SR04 #1 (Front Sonar)** | TRIG | **GPIO5** | 5V | Digital Output (10μs pulse) |
| 18 | | ECHO | **GPIO18** (via voltage divider¹) | 5V→3.3V | Digital Input (pulse-width) |
| 19 | **HC-SR04 #2 (Ground Sonar)** | TRIG | **GPIO19** | 5V | Digital Output (10μs pulse) |
| 20 | | ECHO | **GPIO23** (via voltage divider¹) | 5V→3.3V | Digital Input (pulse-width) |
| 21 | **DHT11 (Temp / Humidity)** | DATA | **GPIO4** | 3.3V | Single-wire digital |
| 22 | **IR Obstacle Sensor** | OUT | **GPIO34** (input-only) | 3.3V | Digital Input (active-low) |
| 23 | **L298N Motor A (Left Track)** | IN1 | **GPIO13** | 5V logic | Digital Direction |
| 24 | | IN2 | **GPIO12** | 5V logic | Digital Direction |
| 25 | | ENA | **GPIO14** (PWM CH0) | 5V logic | PWM Speed (5 kHz) |
| 26 | **L298N Motor B (Right Track)** | IN3 | **GPIO27** | 5V logic | Digital Direction |
| 27 | | IN4 | **GPIO33** | 5V logic | Digital Direction |
| 28 | | ENB | **GPIO32** (PWM CH1) | 5V logic | PWM Speed (5 kHz) |
| 29 | **LoRa SX1278 (Failover)** | SCK | **GPIO18²** | 3.3V | SPI Clock |
| 30 | | MISO | **GPIO19²** | 3.3V | SPI MISO |
| 31 | | MOSI | **GPIO23²** | 3.3V | SPI MOSI |
| 32 | | NSS/CS | **GPIO15** | 3.3V | SPI Chip Select |
| 33 | | RST | **GPIO2** | 3.3V | Digital Reset |
| 34 | | DIO0 | **GPIO35** (input-only) | 3.3V | Digital IRQ (RX done) |
| 35 | **Water Level Float Switch** | OUT | **GPIO39** (VN, input-only) | 3.3V | Digital Input (N/O switch) |

> **¹** HC-SR04 ECHO pins output 5V logic. A resistive voltage divider (R1=1kΩ, R2=2kΩ) steps ECHO down to 3.3V to protect ESP32 GPIO inputs rated at 3.3V maximum.

> **² SPI Bus Sharing Note:** When LoRa SX1278 is populated, GPIO18/19/23 are shared with HC-SR04 TRIG/ECHO. In the prototype, only one subsystem (LoRa OR second sonar) is active at a time, multiplexed via firmware. In the production design, the second sonar is relocated to GPIO25/26 (freed by moving ZE07-CO to a dedicated hardware UART).

---

## 5. Dual-Layer Intrinsic Communications Pipeline

### 5.1 Layer 1 (Primary) — Spark-Free Fiber-Optic Tether

#### 5.1.1 ATEX/Methane Safety Rationale

Coal mines contain methane-air mixtures that can reach explosive concentrations (5.0–15.0% CH₄ by volume). Any electrical conductor entering or exiting the mine presents an **ignition risk** — a spark from a damaged cable, a short circuit, or even static discharge along a copper conductor can detonate a methane pocket.

**Fiber-optic cables transmit photons, not electrons.** An optical fiber:
- Carries zero electrical current
- Cannot generate an electrical spark under any failure mode (severing, crushing, bending)
- Is immune to electromagnetic interference from mine electrical equipment
- Cannot act as a lightning conduction path into the mine

This makes fiber-optic the **only intrinsically safe** high-bandwidth communication medium for methane-explosive atmospheres, compliant with ATEX Directive 2014/34/EU Zone 1 requirements.

#### 5.1.2 Tether Specification

| Parameter | Specification |
|---|---|
| **Fiber Type** | Single-mode 9/125 μm or Multi-mode 62.5/125 μm |
| **Connector** | SC/APC or LC/APC (Angled Physical Contact — minimizes back-reflection) |
| **Media Converter** | 10/100 Mbps Ethernet-to-Fiber media converter at each end |
| **Tether Length** | 200–500 meters (mine gallery depth dependent) |
| **Bandwidth** | > 100 Mbps — sufficient for 720p30 MJPEG video + JSON telemetry simultaneously |
| **Jacket** | Armored tight-buffer with Kevlar strength members, rated for drag over rough rock surfaces |

#### 5.1.3 Data Flow Over Fiber

```
ESP32 (UART/WiFi) → Ethernet Bridge → Fiber Media Converter → [FIBER OPTIC CABLE 200-500m]
→ Fiber Media Converter → Ethernet Switch → Surface C2 Laptop (Node.js server + YOLO)
```

### 5.2 Layer 2 (Secondary Failover) — LoRa SX1278

If the fiber-optic tether is **physically severed** (crushed by falling debris, snagged and torn), ARGUS automatically fails over to a low-power, long-range radio link.

| Parameter | Specification |
|---|---|
| **Chipset** | Semtech SX1276/SX1278 |
| **Frequency** | 433 MHz (India ISM band) or 868 MHz |
| **Modulation** | LoRa CSS (Chirp Spread Spectrum) |
| **Spreading Factor** | SF7–SF12 (adaptive based on link quality) |
| **Bandwidth** | 125 kHz / 250 kHz / 500 kHz |
| **Output Power** | +2 dBm to +20 dBm (configurable) |
| **Link Budget** | 157 dB (at SF12, 125 kHz BW) |
| **Subterranean Penetration** | Demonstrated 200–800m through coal/rock strata at SF12 |
| **Interface** | SPI (SCK, MISO, MOSI, NSS, RST, DIO0) |
| **Data Rate** | 0.3–37.5 kbps (SF-dependent) |

**Trade-Off:** LoRa cannot carry live video. It transmits only the **JSON telemetry payload** (< 256 bytes per packet) and **SOS emergency alerts**. This is a deliberate degraded-but-alive fallback — the surface team loses visual feed but retains atmospheric intelligence and rover location pings.

### 5.3 Telemetry Packet Schema

The following JSON payload is transmitted at **10 Hz** (100ms interval) over the primary fiber link, or at **1 Hz** over LoRa failover:

```json
{
  "timestamp": 1757362800000,
  "device_id": "ARGUS-ALPHA-1",
  "seq": 48231,
  "co2_ppm": 1842,
  "co_ppm": 28.4,
  "ch4_raw": 2148,
  "ch4_pct": 0.62,
  "o2_pct": 19.3,
  "temp": 34.6,
  "humidity": 87,
  "pitch": -8.3,
  "roll": 5.7,
  "tremor_g": 0.42,
  "tremor_detected": true,
  "dist_front": 1.2,
  "dist_ground": 8.5,
  "water_detected": false,
  "ir_obstacle": true,
  "sos_anomaly": 0,
  "emergency_status": "WARNING_CO_ELEVATED",
  "battery_v": 11.4,
  "uptime_s": 4823
}
```

| Field | Type | Unit | Description |
|---|---|---|---|
| `timestamp` | uint64 | ms (Unix epoch) | Millisecond-precision timestamp |
| `device_id` | string | — | Rover unit identifier |
| `seq` | uint32 | — | Monotonic sequence number for packet loss detection |
| `co2_ppm` | uint16 | ppm | MH-Z19B CO₂ reading |
| `co_ppm` | float32 | ppm | ZE07-CO reading |
| `ch4_raw` | uint16 | ADC counts | Raw 12-bit ADC reading from MP-4 |
| `ch4_pct` | float32 | % volume | Calibrated CH₄ concentration |
| `o2_pct` | float32 | % | Inferred O₂ (20.9% − displacement from CO₂ + CH₄) |
| `temp` | float32 | °C | DHT11 ambient temperature |
| `humidity` | uint8 | % RH | DHT11 relative humidity |
| `pitch` | float32 | degrees | MPU-6050 pitch angle |
| `roll` | float32 | degrees | MPU-6050 roll angle |
| `tremor_g` | float32 | g | Peak Z-axis acceleration in last 100ms window |
| `tremor_detected` | bool | — | True if tremor_g > 0.3g |
| `dist_front` | float32 | meters | Forward HC-SR04 distance |
| `dist_ground` | float32 | cm | Downward HC-SR04 (flood level) |
| `water_detected` | bool | — | Float switch state |
| `ir_obstacle` | bool | — | IR beam-break state |
| `sos_anomaly` | uint8 | — | 0 = none, 1 = SOS knock pattern detected via acoustic FFT |
| `emergency_status` | string | — | Enum: `NOMINAL`, `WARNING_CO_ELEVATED`, `CRITICAL_CH4_LEL`, `SOS_DETECTED`, `TETHER_SEVERED` |
| `battery_v` | float32 | V | Battery terminal voltage |
| `uptime_s` | uint32 | seconds | Time since boot |

---

## 6. Surface Command & Control (C2) & AI Vision Pipeline

### 6.1 System Architecture

```
┌─────────────────────────────────────────────────────────────────────┐
│                     SURFACE C2 ARCHITECTURE                        │
│                                                                     │
│  ┌──────────────┐     ┌───────────────┐     ┌───────────────────┐  │
│  │  ESP32 Rover  │────▶│  Node.js      │────▶│  Tactical HUD     │  │
│  │  (Telemetry)  │ SSE │  Relay Server │ SSE │  Dashboard        │  │
│  │  POST /api/   │     │  :8080        │     │  (index.html)     │  │
│  │  telemetry    │     │               │     │  Canvas + WebGL   │  │
│  └──────────────┘     └───────┬───────┘     └───────────────────┘  │
│                               │                                     │
│  ┌──────────────┐             │              ┌───────────────────┐  │
│  │  USB Camera   │─── MJPEG ──┤              │  Mobile Override  │  │
│  │  (720p30)     │            │              │  Controller       │  │
│  └──────────────┘             │              │  (controller.html)│  │
│                               ▼              └───────────────────┘  │
│                      ┌─────────────────┐                           │
│                      │  YOLO Inference  │                           │
│                      │  Engine          │                           │
│                      │  (Python GPU)    │                           │
│                      │  Ultralytics     │                           │
│                      │  YOLOv8n/11n     │                           │
│                      └─────────────────┘                           │
└─────────────────────────────────────────────────────────────────────┘
```

### 6.2 Edge AI Vision Pipeline

| Parameter | Prototype (Demo) | Production (Field) |
|---|---|---|
| **Model** | YOLOv8 Nano / YOLO11 Nano (custom-trained `best.pt`) | YOLO11 Nano (INT8 quantized) |
| **Inference Hardware** | Laptop GPU — NVIDIA RTX 4050 (6GB VRAM) | Raspberry Pi 5 (4GB) + Hailo-8L NPU (13 TOPS INT8) |
| **Input Resolution** | 640×640 px | 640×640 px |
| **Inference Latency** | ~8–12 ms/frame (RTX 4050) | ~15–25 ms/frame (Hailo-8L) |
| **Throughput** | 80–120 FPS | 40–65 FPS |
| **Detection Classes** | `person` (trapped miner), `helmet`, `vest` | Same + `body_prone` (collapsed miner) |

### 6.3 Inference Pipeline (MINE_RESCUE_PRO.py)

```python
# Simplified inference loop — actual implementation in MINE_RESCUE_PRO.py
model = YOLO('best.pt')
cap = cv2.VideoCapture(0)  # USB camera

while cap.isOpened():
    ret, frame = cap.read()
    results = model.predict(frame, conf=0.4, device='cuda:0')
    
    # Extract detections → POST to Node.js server
    detections = []
    for box in results[0].boxes:
        detections.append({
            'label': model.names[int(box.cls)],
            'conf': float(box.conf),
            'norm_x': float(box.xywhn[0][0]),
            'norm_y': float(box.xywhn[0][1]),
            'norm_w': float(box.xywhn[0][2]),
            'norm_h': float(box.xywhn[0][3]),
        })
    
    requests.post('http://127.0.0.1:8080/api/detections', json={
        'worker_count': len(detections),
        'detections': detections,
    })
```

### 6.4 Tactical HUD Dashboard

The surface C2 dashboard (`index.html`) is a zero-scroll, single-screen, dark industrial tactical interface rendering:

| Panel | Visualization | Data Source |
|---|---|---|
| **Live Video Feed** | MJPEG stream with YOLO bounding boxes overlaid | USB Camera → Python → MJPEG :8081 |
| **Spatial Gas Heatmap** | Blueprint floorplan with animated CH₄ / CO / CO₂ radial plumes, survivor thermal hotspots, rover breadcrumb trail | `co2_ppm`, `co_ppm`, `ch4_pct` telemetry fields |
| **FFT Acoustic Visualizer** | 12-band animated bar graph; turns red on SOS knock detection | `sos_anomaly` telemetry field |
| **Pitch & Roll Dials** | Dual cockpit-style horizon indicator dials (canvas-rendered) | `pitch`, `roll` from MPU-6050 |
| **Distance Topography** | Rolling 40-sample line graph of forward obstacle distance | `dist_front` history |
| **Environmental Grid** | 2×2 tile grid: O₂%, CO ppm, Temperature, Humidity | Respective sensor readings |
| **Water Ingress Banner** | Alert banner: STANDBY → DRY/SAFE → WATER INGRESS DETECTED! | `water_detected` float switch |
| **Acoustic Alert Banner** | Alert banner: STANDBY → ACTIVE → SOS RHYTHMIC KNOCK DETECTED | `sos_anomaly` field |

### 6.5 Real-Time Hazard Threshold Alarms

| Hazard | Trigger Condition | Alarm Level | C2 Response |
|---|---|---|---|
| **Carbon Monoxide** | CO > 35 ppm | WARNING | CO card border flashes amber; glow effect |
| **Carbon Monoxide** | CO > 50 ppm (OSHA PEL) | CRITICAL | CO card pulses red; audible alarm tone |
| **Methane (CH₄)** | CH₄ > 1.0% volume (20% LEL) | CRITICAL | Full-screen emergency overlay; evacuation recommendation |
| **Oxygen Displacement** | O₂ < 19.5% (inferred) | WARNING | O₂ tile text turns red |
| **Seismic Tremor** | Tremor > 0.3g peak | WARNING | Tremor badge flashes red |
| **Chassis Tilt** | \|Pitch\| or \|Roll\| > 35° | CRITICAL | Dial renders in emergency red; "ROLLOVER" tag |
| **SOS Knock Pattern** | 3-3-3 rhythmic cadence detected | CRITICAL | Acoustic banner goes red; alarm sound plays; "SOS DETECTED" |
| **Water Ingress** | Float switch triggered | WARNING | Water banner flashes red; "WATER INGRESS DETECTED" |
| **Tether Severed** | Primary SSE connection lost for > 5s | WARNING | Status badge: "TETHER SEVERED — FAILOVER TO LoRa" |

---

## 7. Two-Tier Bill of Materials & Unit Economics

### 7.1 Tier 1 — Current Working Prototype BOM

AI inference offloaded to surface laptop; no onboard compute beyond ESP32.

| # | Component | Specification | Qty | Unit Price (₹) | Subtotal (₹) |
|---|---|---|---|---|---|
| 1 | ESP32 DevKit V1 (30-pin) | Espressif WROOM-32, 240 MHz dual-core, 520KB SRAM, WiFi+BLE | 1 | 450 | 450 |
| 2 | USB Webcam | 720p30 UVC-compliant, autofocus | 1 | 600 | 600 |
| 3 | Winsen MH-Z19B (CO₂ NDIR) | 0–5000 ppm, UART, NDIR optical | 1 | 1,800 | 1,800 |
| 4 | Winsen ZE07-CO (Electrochemical) | 0–500 ppm, UART, factory-calibrated | 1 | 1,500 | 1,500 |
| 5 | Winsen MP-4 (CH₄ Semiconductor) | CH₄ LEL monitoring, analog output | 1 | 350 | 350 |
| 6 | MPU-6050 (6-Axis IMU) | I²C, ±4g accel, ±500°/s gyro | 1 | 120 | 120 |
| 7 | HC-SR04 Ultrasonic (×2) | 2–400 cm, 40 kHz ToF | 2 | 60 | 120 |
| 8 | DHT11 Temp / Humidity | 0–50°C, 20–90% RH | 1 | 80 | 80 |
| 9 | IR Obstacle Sensor | Reflective proximity, adjustable range | 1 | 50 | 50 |
| 10 | Float Switch (Water Level) | N/O reed switch, vertical mount | 1 | 60 | 60 |
| 11 | L298N Dual H-Bridge Motor Driver | 2A/ch, 5–46V motor supply | 1 | 180 | 180 |
| 12 | DC Gearbox Motors (×2) | 12V, 200 RPM, 6mm shaft | 2 | 250 | 500 |
| 13 | Tracked Chassis Platform | ABS frame, rubber tracks, idler sprockets | 1 | 1,200 | 1,200 |
| 14 | 3S Li-ion 18650 Battery Pack + BMS | 11.1V, 2600 mAh, 3S 10A BMS | 1 | 800 | 800 |
| 15 | LM2596 DC-DC Buck Converter | 12V→5V, 3A | 1 | 80 | 80 |
| 16 | ABS Enclosure + O-ring Gasket | IP65 rated, 200×120×75 mm | 1 | 350 | 350 |
| 17 | PG Cable Glands (assorted PG7/9/11) | Nylon body, rubber compression seal | 6 | 25 | 150 |
| 18 | ePTFE Breathable Membrane | 25mm diameter disc, 0.2μm pore | 2 | 75 | 150 |
| 19 | Wiring, Connectors, Standoffs, Hardware | JST-XH, DuPont, M3 hardware | 1 (lot) | 400 | 400 |
| 20 | Conformal Coating Spray | Silicone, 200 mL aerosol | 1 | 250 | 250 |
| | | | | **TOTAL** | **₹9,190** |

> **Note:** Surface laptop (RTX 4050) running YOLO inference is assumed to be existing team equipment, not included in rover BOM. Total system cost including a budget laptop (~₹60,000) would be ~₹69,190, still a fraction of industrial alternatives.

### 7.2 Tier 2 — Production Field Unit BOM

Fully self-contained with onboard AI inference and fiber-optic tether.

| # | Component | Specification | Qty | Unit Price (₹) | Subtotal (₹) |
|---|---|---|---|---|---|
| 1–20 | *All Tier 1 components* | *(as above)* | — | — | 9,190 |
| 21 | Raspberry Pi 5 (4GB) | BCM2712, 2.4 GHz quad-core A76, 4GB LPDDR4X | 1 | 5,500 | 5,500 |
| 22 | Hailo-8L NPU HAT | 13 TOPS INT8 inference accelerator, M.2 M-key | 1 | 6,200 | 6,200 |
| 23 | Pi Camera Module 3 (Wide) | 12MP Sony IMX708, 120° FoV, autofocus | 1 | 3,200 | 3,200 |
| 24 | Fiber-Optic Media Converter (×2) | 10/100 Mbps Ethernet ↔ SC/APC single-mode | 2 | 800 | 1,600 |
| 25 | Fiber-Optic Patch Cable (300m spool) | Armored single-mode, SC/APC connectors | 1 | 2,500 | 2,500 |
| 26 | LoRa SX1278 Module | 433 MHz, SPI, +20 dBm | 2 | 180 | 360 |
| | | | | **TOTAL** | **₹28,550** |

### 7.3 Comparative Cost Benchmark

| Platform | Approximate Unit Cost | Origin |
|---|---|---|
| **ARGUS Prototype (Tier 1)** | **₹9,190** (~$110 USD) | This project |
| **ARGUS Production (Tier 2)** | **₹28,550** (~$340 USD) | This project |
| **DRDO Daksh ROV** | ₹15,00,000 – ₹25,00,000 | India (military-grade) |
| **Howe & Howe Thermite RS3** | ₹35,00,000+ | USA (imported) |
| **ExRobotics ExR-1** | ₹50,00,000+ | Netherlands (ATEX Zone 1 certified) |

**Conclusion:** At ₹28,550, ARGUS costs **less than 2%** of the cheapest centralized industrial/military rover. This enables a paradigm shift from a single centralized expensive robot to **decentralized deployment of dozens of ARGUS units** across every local colliery depot, district rescue station, and NDRF cache point, achieving geographical coverage that a single expensive unit can never provide.

---

## 8. Failure Modes & Effects Analysis (FMEA)

| # | Failure Mode | Root Cause | Impact (Severity) | Hardware / Software Redundancy & Mitigation |
|---|---|---|---|---|
| F1 | **CO₂ sensor (MH-Z19B) fails / reads 0** | Sensor IC failure, UART wiring fault, ePTFE membrane blocked | Loss of CO₂ atmospheric data (HIGH) | Software: UART timeout detection → flag `co2_ppm: null` on dashboard with "SENSOR FAULT" overlay. Hardware: ePTFE membrane is field-replaceable (snap-fit mount). Operational: Rover still provides CO, CH₄, and IMU data — partial atmospheric picture available. |
| F2 | **CO sensor (ZE07-CO) reads saturated** | Electrochemical cell exhaustion (typical lifespan: 2 years), physical damage | False high or false zero CO reading (CRITICAL) | Software: Sanity check — if CO reading is exactly 0.0 or exactly 500.0 for > 10 consecutive readings, flag as sensor fault. Hardware: ZE07-CO is a modular plug-in unit, field-replaceable without soldering. |
| F3 | **Motor driver (L298N) burns out** | Stall current exceeding 2A continuous, inadequate heatsinking | Loss of locomotion in one or both tracks (HIGH) | Hardware: TB6612FNG as secondary driver option (lower voltage drop, better thermal characteristics). Firmware: Stall detection via back-EMF monitoring — if PWM is active but encoder feedback (future upgrade) shows zero motion for > 2s, cut motor power to prevent thermal runaway. |
| F4 | **Fiber-optic tether severed** | Falling debris, sharp rock edge, rover exceeding tether length | Loss of high-bandwidth video and primary telemetry link (HIGH) | **Automatic LoRa failover.** Firmware: If SSE connection to Node.js server is lost for > 5 seconds, ESP32 activates SX1278 LoRa module and begins transmitting JSON telemetry at 1 Hz over 433 MHz. Surface LoRa receiver node relays packets to C2 dashboard. |
| F5 | **ESP32 firmware crash / watchdog reset** | Stack overflow, heap fragmentation, UART buffer overrun | Temporary loss of all telemetry (< 5s during reboot) (MEDIUM) | Firmware: ESP32 hardware watchdog timer (WDT) set to 8-second timeout. If main loop hangs, WDT triggers automatic reboot. Boot sequence re-initializes all sensors and reconnects to server within 3–5 seconds. NVS (Non-Volatile Storage) persists last-known-good configuration across reboots. |
| F6 | **Battery depletion mid-mission** | Extended mission duration, high motor current draw on inclines | Rover becomes immobile inside mine (MEDIUM) | Firmware: Battery voltage monitored via ADC voltage divider on battery terminal. When V_batt < 10.0V (3.33V/cell), rover enters **LOW POWER MODE** — motors disabled, telemetry rate reduced to 0.5 Hz, LoRa beacon transmits GPS-equivalent waypoint ping every 30s for physical retrieval by rescue team. |
| F7 | **Water ingress exceeds IP65 rating** | Prolonged submersion (IP65 only protects against water jets, not immersion), gasket degradation | Electrical short-circuit, permanent board damage (CRITICAL) | Hardware: Conformal coating provides secondary moisture barrier. Float switch provides early warning. Firmware: On `water_detected: true`, C2 dashboard recommends immediate rover retrieval. Operational: Rover is designed as expendable — total loss is acceptable vs. human casualty. |
| F8 | **False positive SOS detection** | Acoustic FFT misidentifying mine machinery rhythmic noise as SOS knock | False alarm fatigues rescue team (LOW) | Software: SOS detection algorithm requires **3-3-3 cadence match** (three groups of three knocks with consistent inter-knock and inter-group spacing) sustained for > 5 seconds before triggering alarm. Single rhythmic pulses are filtered out. |
| F9 | **CH₄ sensor (MP-4) preheat not completed** | Rover deployed before 48-hour preheat stabilization | Inaccurate methane readings for first 24–48 hours (MEDIUM) | Operational: Production units maintain MP-4 in continuous powered standby (< 1W) at the depot between missions. Firmware: If uptime < 172,800s (48h) since cold start, CH₄ reading is flagged with "⚠ PREHEAT" warning on dashboard. |
| F10 | **YOLO model produces false negative (missed person)** | Poor lighting, occlusion by debris, person covered in coal dust | Trapped miner not detected despite being in camera FoV (CRITICAL) | Software: Confidence threshold set to 0.4 (aggressive, accepting more false positives to minimize false negatives). Model trained with augmented low-light, occluded, and dust-covered person images. Operational: ARGUS is a **supplementary** tool — human rescue team conducts physical sweep regardless of YOLO output. ARGUS provides "likely locations" to prioritize, not a definitive clear/no-clear determination. |

---

## 9. Build & Reproduction Guide

### 9.1 Repository Structure

```
Rover/
├── index.html                  # Tactical C2 HUD Dashboard
├── controller.html             # Mobile Override Controller (touch joystick)
├── server.js                   # Node.js telemetry relay server (SSE + API)
├── fake_telemetry.js           # Fake data simulator for demos (no ESP32 needed)
├── MINE_RESCUE.py              # Minimal YOLO inference script (standalone)
├── MINE_RESCUE_PRO.py          # Production GPU-accelerated YOLO pipeline
├── best.pt                     # Custom-trained YOLOv8n model weights
├── START_ROVER_SYSTEM.bat      # Windows one-click system launcher
├── STOP_ROVER_SYSTEM.bat       # Windows one-click system shutdown
├── run.bat                     # Quick-launch alias
├── css/
│   └── styles.css              # Tactical HUD stylesheet (CRT scanlines, glassmorphism)
├── js/
│   ├── app.js                  # Main application controller
│   ├── config.js               # Thresholds, endpoints, color tokens
│   ├── telemetry-engine.js     # SSE client + event bus
│   ├── hud-camera.js           # Camera feed + YOLO overlay + synthetic FLIR
│   ├── hud-gauges.js           # FFT, distance graph, pitch/roll dials, env tiles
│   ├── hud-heatmap.js          # Spatial gas dispersion + blueprint + thermal map
│   ├── audio-fx.js             # Alarm tones (WebAudio API)
│   └── controller.js           # Mobile touch joystick controller logic
├── README.md                   # Project overview & quick start
├── TECHNICAL_SPECIFICATION.md  # This document
└── requirements.txt            # Python dependencies
```

### 9.2 Prerequisites

| Requirement | Version | Purpose |
|---|---|---|
| **Node.js** | ≥ 18.x LTS | Runs `server.js` (telemetry relay + static file server) |
| **Python** | ≥ 3.10 | Runs YOLO inference pipeline |
| **NVIDIA CUDA Toolkit** | ≥ 11.8 (optional) | GPU-accelerated YOLO inference (falls back to CPU if unavailable) |
| **Git** | ≥ 2.x | Version control |
| **Arduino IDE / PlatformIO** | ≥ 2.3.x / ≥ 6.x | ESP32 firmware flashing |

### 9.3 Python Environment Setup

```bash
# 1. Clone the repository
git clone https://github.com/shouryasingh2311/ARGUS-Mine-Rescue-Rover.git
cd ARGUS-Mine-Rescue-Rover

# 2. Create Python virtual environment
python -m venv .venv

# 3. Activate virtual environment
# Windows:
.venv\Scripts\activate
# Linux/macOS:
source .venv/bin/activate

# 4. Install dependencies
pip install -r requirements.txt
```

#### `requirements.txt`

```
ultralytics>=8.2.0
opencv-python>=4.9.0
numpy>=1.26.0
requests>=2.31.0
flask>=3.0.0
Pillow>=10.0.0
torch>=2.2.0
torchvision>=0.17.0
```

### 9.4 Running the System (No ESP32 — Demo Mode)

```bash
# Terminal 1: Start the Node.js telemetry server
node server.js
# → Tactical Mission Control Server running on port 8080

# Terminal 2: Start the fake telemetry simulator
node fake_telemetry.js
# → Pumps realistic sensor data through 3 scenarios (NORMAL → WARNING → SOS)

# Terminal 3: Start the YOLO vision pipeline (optional, requires webcam + GPU)
python MINE_RESCUE_PRO.py

# Open browser:
# → Main Dashboard: http://127.0.0.1:8080/
# → Mobile Controller: http://127.0.0.1:8080/controller.html
```

### 9.5 Running the System (With ESP32 — Live Hardware)

```bash
# Terminal 1: Start the Node.js server (auto-bridges to ESP32 at 192.168.4.1)
node server.js

# Terminal 2: Start YOLO pipeline
python MINE_RESCUE_PRO.py

# The server automatically connects to ESP32 AP at http://192.168.4.1/events
# and relays live sensor telemetry to the dashboard.
```

### 9.6 ESP32 Firmware Setup (Arduino IDE)

#### Required Libraries (Install via Arduino Library Manager):

| Library | Author | Purpose |
|---|---|---|
| `WiFi` | Espressif (built-in) | ESP32 WiFi AP/STA mode |
| `ESPAsyncWebServer` | me-no-dev | Async HTTP server + SSE |
| `AsyncTCP` | me-no-dev | TCP backend for async server |
| `Adafruit_MPU6050` | Adafruit | MPU-6050 I²C driver |
| `Adafruit_Unified_Sensor` | Adafruit | Sensor abstraction layer |
| `DHT sensor library` | Adafruit | DHT11/22 single-wire protocol |
| `LoRa` | Sandeep Mistry | SX1276/78 SPI driver |
| `ArduinoJson` | Benoît Blanchon | JSON serialization for telemetry packets |
| `SoftwareSerial` | — (built-in) | Secondary UART for ZE07-CO |

#### Arduino IDE Board Configuration:

| Setting | Value |
|---|---|
| **Board** | `ESP32 Dev Module` |
| **Upload Speed** | 921600 |
| **CPU Frequency** | 240 MHz (WiFi/BT) |
| **Flash Frequency** | 80 MHz |
| **Flash Mode** | QIO |
| **Flash Size** | 4MB (32Mb) |
| **Partition Scheme** | Default 4MB with spiffs |
| **PSRAM** | Disabled |
| **Port** | (Select COM port with ESP32 connected) |

### 9.7 One-Click Windows Launcher

The provided `START_ROVER_SYSTEM.bat` launches all three components (Node.js server, Python YOLO pipeline, and browser) in a single double-click:

```batch
@echo off
:: Launch Node.js server
start "ARGUS-Server" cmd /k "cd /d %~dp0 && node server.js"

:: Wait for server to initialize
timeout /t 3 /nobreak >nul

:: Launch YOLO pipeline
start "ARGUS-Vision" cmd /k "cd /d %~dp0 && python MINE_RESCUE_PRO.py"

:: Open dashboard in default browser
start http://127.0.0.1:8080/

echo [+] ARGUS C2 System launched.
```

---

## 10. Academic & Institutional References

1. **Ray, S. K., Khan, A. M., Mohalik, N. K., Mishra, D., Mandal, S., & Pandey, J. K.** (2015). "Review of preventive and constructive measures for coal mine explosions: An Indian perspective." *International Journal of Mining Science and Technology*, 25(3), 471–481. DOI: [10.1016/j.ijmst.2015.03.024](https://doi.org/10.1016/j.ijmst.2015.03.024) — ScienceDirect.

2. **Wang, Y., Li, J., Lu, S., Yang, H., & Cheng, J.** (2017). "An MSRBOT-based rescue robot system for coal mine applications." *Sensors*, 17(11), 2594. PMC: [PMC5677175](https://www.ncbi.nlm.nih.gov/pmc/articles/PMC5677175/). DOI: [10.3390/s17112594](https://doi.org/10.3390/s17112594) — Fiber-optic tethered mine exploration robot with multi-sensor architecture.

3. **Redmon, J., Divvala, S., Girshick, R., & Farhadi, A.** (2016). "You Only Look Once: Unified, Real-Time Object Detection." *Proceedings of the IEEE Conference on Computer Vision and Pattern Recognition (CVPR)*, pp. 779–788. DOI: [10.1109/CVPR.2016.91](https://doi.org/10.1109/CVPR.2016.91).

4. **Jocher, G., Chaurasia, A., & Qiu, J.** (2023). "Ultralytics YOLO." Version 8.0. Available: [https://github.com/ultralytics/ultralytics](https://github.com/ultralytics/ultralytics).

5. **Directorate General of Mines Safety (DGMS), Government of India.** *Coal Mines Regulations, 2017.* Gazette of India Notification, Ministry of Labour and Employment. Chapter VII: Standards of Ventilation — Regulation 182: Maximum permissible concentration of noxious gases.

6. **Bureau of Indian Standards.** *IS 5572:2009 — Classification of Hazardous Areas for Electrical Installations in Mines.* Aligned with IEC 60079 (Equipment for explosive atmospheres).

7. **The Avenue Mail.** (June 2026). "Four miners killed in Ramgarh coal mine tragedy; three rescuers succumb to toxic gas while attempting rescue." Ramgarh District, Jharkhand, India. [News report — regional correspondent].

8. **Luo, J., Fan, M., Zhao, G., & Zhang, H.** (2026). "Advances in Underground Mine Rescue Robotics: A Comprehensive Review." *Frontiers in Robotics and AI*, 13, Article 1423891. DOI: 10.3389/frobt.2026.1423891.

9. **Semtech Corporation.** (2020). "SX1276/77/78/79 — 137 MHz to 1020 MHz Low Power Long Range Transceiver." Datasheet Rev. 7. — LoRa modulation physical layer specification.

10. **Winsen Electronics Technology Co., Ltd.** (2023). "MH-Z19B NDIR CO₂ Sensor Module — Technical Datasheet." Version 1.4. — NDIR sensing principle, UART command reference, accuracy specifications.

11. **Occupational Safety and Health Administration (OSHA), U.S. Department of Labor.** *Permissible Exposure Limits (PELs) for Carbon Monoxide.* 29 CFR 1910.1000 Table Z-1: CO PEL = 50 ppm (TWA 8-hour).

12. **IEC 60529:2001.** *Degrees of protection provided by enclosures (IP Code).* International Electrotechnical Commission. — IP65 dust-tight and water-jet protection specifications.

---

<div align="center">

**PROJECT ARGUS** — Autonomous Reconnaissance & Ground Underground Sentry  
Smart India Hackathon 2026 — Problem Statement SIH26039  
Government of Jharkhand · Smart Automation · Hardware

*"No rescuer should become a casualty. Send the machine first."*

</div>
