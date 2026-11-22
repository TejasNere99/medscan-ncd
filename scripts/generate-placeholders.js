import fs from 'fs';

const placeholders = [
  {
    name: '01-patient-dashboard.svg',
    title: 'Patient Health & Vitals Dashboard',
    subtitle: 'Route: /patient/dashboard',
    desc: 'Confirmed biomarkers snapshot, risk gauges, recent lab reports, and assigned care team.',
    replaceText: 'REPLACE WITH: Fullscreen screenshot of Patient Dashboard (1920x1080 PNG)',
    targetPng: '01-patient-dashboard.png'
  },
  {
    name: '02-ocr-upload-review.svg',
    title: 'Human-in-the-Loop OCR Review Modal',
    subtitle: 'Component: ReportUploadModal.jsx',
    desc: 'Extracted biomarkers (Fasting Glucose, Cholesterol, BP) with biological validity tags.',
    replaceText: 'REPLACE WITH: Screenshot of OCR extraction review step with confirmed values',
    targetPng: '02-ocr-upload-review.png'
  },
  {
    name: '04-medicine-reminder-schedule.svg',
    title: 'Smart Medication Schedule & Dose Logs',
    subtitle: 'Route: /patient/medicines',
    desc: 'Today\'s scheduled doses, timing, dosage, and [Taken] / [Missed] interaction buttons.',
    replaceText: 'REPLACE WITH: Screenshot of Patient Medicines Page with today\'s schedule',
    targetPng: '04-medicine-reminder-schedule.png'
  },
  {
    name: '05-doctor-clinical-portal.svg',
    title: 'Clinician Workspace & Trajectory Analytics',
    subtitle: 'Route: /doctor/dashboard & /doctor/patient/:id',
    desc: 'Longitudinal patient trajectory charts, consultation requests, and prescription management.',
    replaceText: 'REPLACE WITH: Screenshot of Doctor Dashboard or Patient Longitudinal Detail',
    targetPng: '05-doctor-clinical-portal.png'
  },
  {
    name: '06-cho-community-catchment.svg',
    title: 'CHO Rural Catchment & Screening Analytics',
    subtitle: 'Route: /cho/dashboard',
    desc: 'Village-level disease screening statistics, high-risk flags, home follow-ups, and referrals.',
    replaceText: 'REPLACE WITH: Screenshot of Community Health Officer Dashboard',
    targetPng: '06-cho-community-catchment.png'
  },
  {
    name: '07-admin-security-resilience-lab.svg',
    title: 'Security & System Resilience Lab',
    subtitle: 'Route: /admin/security-lab',
    desc: 'Database Blackout & Snapshot Restore Engine and AES-256-GCM data breach demonstration.',
    replaceText: 'REPLACE WITH: Screenshot of Admin Security Lab with Blackout/Restore tables',
    targetPng: '07-admin-security-resilience-lab.png'
  },
  {
    name: '08-iot-smart-dispenser-hardware.svg',
    title: 'ESP32 IoT Smart Medicine Dispenser Hardware',
    subtitle: 'Hardware: ESP32 + IR Sensors + OLED + RTC + Buzzer',
    desc: 'Physical smart medicine box prototype communicating over WiFi via POST /api/iot/medicine-status.',
    replaceText: 'REPLACE WITH: Photo of your physical IoT Smart Medicine Dispenser hardware',
    targetPng: '08-iot-smart-dispenser-hardware.png'
  }
];

placeholders.forEach(p => {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1200 675" width="1200" height="675">
  <defs>
    <linearGradient id="bg" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#0b1120"/>
      <stop offset="50%" stop-color="#0f172a"/>
      <stop offset="100%" stop-color="#1e1b4b"/>
    </linearGradient>
  </defs>
  
  <rect width="1200" height="675" fill="url(#bg)" rx="16" stroke="#334155" stroke-width="2"/>
  
  <g opacity="0.08" stroke="#94a3b8" stroke-width="1">
    <line x1="200" y1="0" x2="200" y2="675"/>
    <line x1="400" y1="0" x2="400" y2="675"/>
    <line x1="600" y1="0" x2="600" y2="675"/>
    <line x1="800" y1="0" x2="800" y2="675"/>
    <line x1="1000" y1="0" x2="1000" y2="675"/>
    <line x1="0" y1="150" x2="1200" y2="150"/>
    <line x1="0" y1="350" x2="1200" y2="350"/>
    <line x1="0" y1="520" x2="1200" y2="520"/>
  </g>

  <!-- Top Badge -->
  <rect x="70" y="50" width="310" height="34" rx="17" fill="#1e293b" stroke="#38bdf8" stroke-width="1.5"/>
  <circle cx="90" cy="67" r="6" fill="#38bdf8"/>
  <text x="108" y="73" font-family="Segoe UI, -apple-system, Roboto, sans-serif" font-size="13" font-weight="700" fill="#38bdf8" letter-spacing="1">MEDSCAN-NCD PLATFORM VIEW</text>

  <!-- Title & Subtitle -->
  <text x="70" y="145" font-family="Segoe UI, -apple-system, Roboto, sans-serif" font-size="38" font-weight="800" fill="#ffffff">${p.title}</text>
  <text x="70" y="185" font-family="Segoe UI, -apple-system, Roboto, sans-serif" font-size="18" font-weight="600" fill="#a5b4fc">${p.subtitle}</text>

  <!-- Content Box -->
  <rect x="70" y="225" width="1060" height="290" rx="14" fill="#030712" stroke="#1e293b" stroke-width="2"/>
  <text x="105" y="280" font-family="Segoe UI, -apple-system, Roboto, sans-serif" font-size="20" font-weight="400" fill="#94a3b8">${p.desc}</text>
  
  <rect x="105" y="325" width="990" height="135" rx="10" fill="#111827" stroke="#38bdf8" stroke-width="1.5" stroke-dasharray="6 6"/>
  <text x="600" y="385" font-family="Segoe UI, -apple-system, Roboto, sans-serif" font-size="20" font-weight="700" fill="#38bdf8" text-anchor="middle">📷 ${p.replaceText}</text>
  <text x="600" y="422" font-family="Segoe UI, -apple-system, Roboto, sans-serif" font-size="15" font-weight="500" fill="#cbd5e1" text-anchor="middle">Save your image file to: assets/screenshots/${p.targetPng}</text>

  <!-- Footer Tag -->
  <text x="70" y="585" font-family="Segoe UI, -apple-system, Roboto, sans-serif" font-size="14" font-weight="500" fill="#64748b">Format: PNG or JPG · Optimal Resolution: 1920 × 1080 (16:9 ratio) · High DPI</text>
</svg>`;
  fs.writeFileSync('assets/screenshots/' + p.name, svg);
  console.log('Generated: assets/screenshots/' + p.name);
});

