const fs = require('fs');
const path = require('path');

const outDir = path.join(__dirname, '..', 'assets', 'diagrams');
if (!fs.existsSync(outDir)) {
  fs.mkdirSync(outDir, { recursive: true });
}

// 1. SYSTEM ARCHITECTURE SVG
const sysArchSvg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1150 720" width="100%" height="100%" style="background:#0b132b; font-family:-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;">
  <defs>
    <linearGradient id="clientGrad" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#1e3a8a"/>
      <stop offset="100%" stop-color="#0284c7"/>
    </linearGradient>
    <linearGradient id="gatewayGrad" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#1e293b"/>
      <stop offset="100%" stop-color="#334155"/>
    </linearGradient>
    <linearGradient id="mlGrad" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#701a75"/>
      <stop offset="100%" stop-color="#a855f7"/>
    </linearGradient>
    <linearGradient id="dbGrad" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#064e3b"/>
      <stop offset="100%" stop-color="#10b981"/>
    </linearGradient>
    <linearGradient id="iotGrad" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#7c2d12"/>
      <stop offset="100%" stop-color="#ea580c"/>
    </linearGradient>
    <marker id="arrow" viewBox="0 0 10 10" refX="6" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
      <path d="M 0 1 L 10 5 L 0 9 z" fill="#38bdf8" />
    </marker>
    <marker id="arrow-green" viewBox="0 0 10 10" refX="6" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
      <path d="M 0 1 L 10 5 L 0 9 z" fill="#34d399" />
    </marker>
    <marker id="arrow-purple" viewBox="0 0 10 10" refX="6" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
      <path d="M 0 1 L 10 5 L 0 9 z" fill="#c084fc" />
    </marker>
    <filter id="shadow" x="-5%" y="-5%" width="110%" height="110%">
      <feDropShadow dx="0" dy="4" stdDeviation="6" flood-color="#000000" flood-opacity="0.4"/>
    </filter>
  </defs>

  <!-- Title Banner -->
  <rect x="30" y="20" width="1090" height="50" rx="8" fill="#1e293b" stroke="#334155" stroke-width="1.5" filter="url(#shadow)"/>
  <text x="575" y="52" fill="#38bdf8" font-size="20" font-weight="700" text-anchor="middle" letter-spacing="1">MEDSCAN-NCD: THREE-TIER MICROSERVICES SYSTEM ARCHITECTURE</text>

  <!-- TIER 1: CLIENT TIER (Top Left) -->
  <rect x="30" y="90" width="310" height="420" rx="10" fill="#0f172a" stroke="#0284c7" stroke-width="2" filter="url(#shadow)"/>
  <rect x="30" y="90" width="310" height="40" rx="10" fill="url(#clientGrad)"/>
  <text x="185" y="116" fill="#ffffff" font-size="14" font-weight="700" text-anchor="middle">🖥️ CLIENT TIER (React 18 + Vite)</text>

  <rect x="45" y="145" width="280" height="55" rx="6" fill="#1e293b" stroke="#38bdf8" stroke-width="1"/>
  <text x="55" y="168" fill="#ffffff" font-size="13" font-weight="600">Patient Dashboard Portal</text>
  <text x="55" y="187" fill="#94a3b8" font-size="11">Vitals Snapshot, Reports, AI Cards</text>

  <rect x="45" y="215" width="280" height="55" rx="6" fill="#1e293b" stroke="#38bdf8" stroke-width="1"/>
  <text x="55" y="238" fill="#ffffff" font-size="13" font-weight="600">Doctor Clinical Workspace</text>
  <text x="55" y="257" fill="#94a3b8" font-size="11">Roster, Longitudinal Trajectories, Rx</text>

  <rect x="45" y="285" width="280" height="55" rx="6" fill="#1e293b" stroke="#38bdf8" stroke-width="1"/>
  <text x="55" y="308" fill="#ffffff" font-size="13" font-weight="600">CHO Rural Catchment Portal</text>
  <text x="55" y="327" fill="#94a3b8" font-size="11">Village Screening, Triage &amp; Referrals</text>

  <rect x="45" y="355" width="280" height="55" rx="6" fill="#1e293b" stroke="#38bdf8" stroke-width="1"/>
  <text x="55" y="378" fill="#ffffff" font-size="13" font-weight="600">Admin Security &amp; Resilience Lab</text>
  <text x="55" y="397" fill="#94a3b8" font-size="11">Blackout Simulator &amp; AES-256-GCM</text>

  <rect x="45" y="425" width="280" height="70" rx="6" fill="#1e293b" stroke="#0ea5e9" stroke-width="1"/>
  <text x="55" y="448" fill="#38bdf8" font-size="12" font-weight="600">Client Features:</text>
  <text x="55" y="466" fill="#94a3b8" font-size="11">• Tailwind CSS Design System</text>
  <text x="55" y="482" fill="#94a3b8" font-size="11">• Recharts Time-Series &amp; Lucide Icons</text>

  <!-- TIER 2: API GATEWAY (Middle) -->
  <rect x="380" y="90" width="370" height="600" rx="10" fill="#0f172a" stroke="#64748b" stroke-width="2" filter="url(#shadow)"/>
  <rect x="380" y="90" width="370" height="40" rx="10" fill="url(#gatewayGrad)"/>
  <text x="565" y="116" fill="#ffffff" font-size="14" font-weight="700" text-anchor="middle">⚙️ API GATEWAY (Node.js &amp; Express.js)</text>

  <rect x="400" y="145" width="330" height="50" rx="6" fill="#1e293b" stroke="#475569" stroke-width="1"/>
  <text x="415" y="168" fill="#38bdf8" font-size="13" font-weight="600">JWT Auth &amp; Role-Based Access Control</text>
  <text x="415" y="185" fill="#94a3b8" font-size="11">Bearer Tokens, Refresh Tokens, RBAC Guards</text>

  <rect x="400" y="205" width="330" height="50" rx="6" fill="#1e293b" stroke="#475569" stroke-width="1"/>
  <text x="415" y="228" fill="#38bdf8" font-size="13" font-weight="600">Security &amp; Rate Limiting Layer</text>
  <text x="415" y="245" fill="#94a3b8" font-size="11">Helmet Security Headers, CORS, Rate Limiter</text>

  <rect x="400" y="265" width="330" height="80" rx="6" fill="#1e293b" stroke="#34d399" stroke-width="1"/>
  <text x="415" y="288" fill="#34d399" font-size="13" font-weight="600">Dual-Engine OCR &amp; Document Ingestion</text>
  <text x="415" y="306" fill="#cbd5e1" font-size="11">• pdf-parse (Stream parser for digital PDFs)</text>
  <text x="415" y="322" fill="#cbd5e1" font-size="11">• Tesseract.js (Optical OCR for scanned image reports)</text>
  <text x="415" y="338" fill="#94a3b8" font-size="10">Canonical regex entity matcher &amp; range validation</text>

  <rect x="400" y="355" width="330" height="55" rx="6" fill="#1e293b" stroke="#475569" stroke-width="1"/>
  <text x="415" y="378" fill="#38bdf8" font-size="13" font-weight="600">Clinical Data &amp; Report Controllers</text>
  <text x="415" y="396" fill="#94a3b8" font-size="11">Human-in-the-Loop review &amp; immutable confirm</text>

  <rect x="400" y="420" width="330" height="55" rx="6" fill="#1e293b" stroke="#c084fc" stroke-width="1"/>
  <text x="415" y="443" fill="#c084fc" font-size="13" font-weight="600">ML Prediction Orchestrator</text>
  <text x="415" y="461" fill="#94a3b8" font-size="11">Routes confirmed biomarkers to FastAPI service</text>

  <rect x="400" y="485" width="330" height="55" rx="6" fill="#1e293b" stroke="#f97316" stroke-width="1"/>
  <text x="415" y="508" fill="#f97316" font-size="13" font-weight="600">IoT Telemetry Gateway (/api/iot)</text>
  <text x="415" y="526" fill="#94a3b8" font-size="11">Ingests compartment sensor status &amp; triggers alerts</text>

  <rect x="400" y="550" width="330" height="60" rx="6" fill="#1e293b" stroke="#475569" stroke-width="1"/>
  <text x="415" y="573" fill="#38bdf8" font-size="12" font-weight="600">Security &amp; Resilience Lab Engine:</text>
  <text x="415" y="591" fill="#94a3b8" font-size="11">Blackout Simulation • SHA-256 Snapshot Restore</text>
  <text x="415" y="605" fill="#94a3b8" font-size="11">AES-256-GCM Field Encryption &amp; GHASH Auth Tag</text>

  <rect x="400" y="620" width="330" height="55" rx="6" fill="#1e293b" stroke="#475569" stroke-width="1"/>
  <text x="415" y="643" fill="#ffffff" font-size="12" font-weight="600">Medicine &amp; Adherence Scheduler</text>
  <text x="415" y="661" fill="#94a3b8" font-size="11">Syncs prescription regimens across Web &amp; Hardware</text>

  <!-- TIER 3: PERSISTENCE (Top Right) -->
  <rect x="790" y="90" width="330" height="240" rx="10" fill="#0f172a" stroke="#10b981" stroke-width="2" filter="url(#shadow)"/>
  <rect x="790" y="90" width="330" height="40" rx="10" fill="url(#dbGrad)"/>
  <text x="955" y="116" fill="#ffffff" font-size="14" font-weight="700" text-anchor="middle">💾 PERSISTENCE &amp; STORAGE TIER</text>

  <rect x="805" y="145" width="300" height="75" rx="6" fill="#1e293b" stroke="#10b981" stroke-width="1"/>
  <text x="820" y="168" fill="#34d399" font-size="13" font-weight="600">MongoDB Atlas Cluster (Mongoose)</text>
  <text x="820" y="187" fill="#cbd5e1" font-size="11">Collections: Users, Patients, Reports,</text>
  <text x="820" y="203" fill="#94a3b8" font-size="11">Predictions, Medicines, AdherenceLogs</text>

  <rect x="805" y="235" width="300" height="75" rx="6" fill="#1e293b" stroke="#10b981" stroke-width="1"/>
  <text x="820" y="258" fill="#34d399" font-size="13" font-weight="600">Cloudinary / Local File Storage</text>
  <text x="820" y="277" fill="#cbd5e1" font-size="11">Stores immutable scanned lab reports,</text>
  <text x="820" y="293" fill="#94a3b8" font-size="11">original PDF source files &amp; user avatars</text>

  <!-- TIER 4: AI/ML SERVICE (Middle Right) -->
  <rect x="790" y="350" width="330" height="340" rx="10" fill="#0f172a" stroke="#a855f7" stroke-width="2" filter="url(#shadow)"/>
  <rect x="790" y="350" width="330" height="40" rx="10" fill="url(#mlGrad)"/>
  <text x="955" y="376" fill="#ffffff" font-size="14" font-weight="700" text-anchor="middle">🧠 AI / ML SERVICE (Python &amp; FastAPI)</text>

  <rect x="805" y="405" width="300" height="55" rx="6" fill="#1e293b" stroke="#c084fc" stroke-width="1"/>
  <text x="820" y="428" fill="#ffffff" font-size="12" font-weight="600">Type-2 Diabetes LightGBM Model</text>
  <text x="820" y="446" fill="#cbd5e1" font-size="11">5-Fold Platt Calibrated | Threshold = 0.210</text>

  <rect x="805" y="470" width="300" height="55" rx="6" fill="#1e293b" stroke="#c084fc" stroke-width="1"/>
  <text x="820" y="493" fill="#ffffff" font-size="12" font-weight="600">Framingham 10-Yr CHD Model</text>
  <text x="820" y="511" fill="#cbd5e1" font-size="11">Cardiovascular Risk | Threshold = 0.110</text>

  <rect x="805" y="535" width="300" height="50" rx="6" fill="#1e293b" stroke="#c084fc" stroke-width="1"/>
  <text x="820" y="556" fill="#ffffff" font-size="12" font-weight="600">Hypertension Research Ensemble</text>
  <text x="820" y="572" fill="#cbd5e1" font-size="11">Empirical Boundary (Threshold = 0.331)</text>

  <rect x="805" y="595" width="300" height="80" rx="6" fill="#1e293b" stroke="#e879f9" stroke-width="1"/>
  <text x="820" y="618" fill="#e879f9" font-size="12" font-weight="600">TreeSHAP Explainability Engine</text>
  <text x="820" y="636" fill="#cbd5e1" font-size="11">• Directional Risk Attribution</text>
  <text x="820" y="652" fill="#94a3b8" font-size="11">• Biomarker Risk Drivers vs. Protective Factors</text>

  <!-- TIER 5: IOT HARDWARE (Bottom Left) -->
  <rect x="30" y="530" width="310" height="160" rx="10" fill="#0f172a" stroke="#ea580c" stroke-width="2" filter="url(#shadow)"/>
  <rect x="30" y="530" width="310" height="35" rx="10" fill="url(#iotGrad)"/>
  <text x="185" y="553" fill="#ffffff" font-size="13" font-weight="700" text-anchor="middle">📡 IoT HARDWARE (ESP32 Dispenser)</text>

  <text x="45" y="585" fill="#f97316" font-size="12" font-weight="600">Smart Pill Dispenser Box:</text>
  <text x="45" y="605" fill="#cbd5e1" font-size="11">• ESP32 Microcontroller (Dual Core Wi-Fi)</text>
  <text x="45" y="623" fill="#cbd5e1" font-size="11">• DS3231 Precision Real-Time Clock (RTC)</text>
  <text x="45" y="641" fill="#cbd5e1" font-size="11">• IR Beam Sensors (Compartment Drop Detect)</text>
  <text x="45" y="659" fill="#cbd5e1" font-size="11">• SSD1306 OLED Display &amp; Piezo Alarm</text>
  <text x="45" y="677" fill="#94a3b8" font-size="10">Telemetry POST: /api/iot/medicine-status</text>

  <!-- ARROWS & CONNECTIONS -->
  <!-- Client to Gateway -->
  <line x1="340" y1="230" x2="380" y2="230" stroke="#38bdf8" stroke-width="2.5" marker-end="url(#arrow)"/>
  <text x="360" y="222" fill="#38bdf8" font-size="10" font-weight="600" text-anchor="middle">HTTPS</text>

  <!-- Gateway to DB -->
  <line x1="750" y1="180" x2="790" y2="180" stroke="#34d399" stroke-width="2.5" marker-end="url(#arrow-green)"/>
  <text x="770" y="172" fill="#34d399" font-size="10" font-weight="600" text-anchor="middle">TCP/TLS</text>

  <!-- Gateway to ML -->
  <line x1="750" y1="445" x2="790" y2="445" stroke="#c084fc" stroke-width="2.5" marker-end="url(#arrow-purple)"/>
  <text x="770" y="437" fill="#c084fc" font-size="10" font-weight="600" text-anchor="middle">REST</text>

  <!-- ML Back to Gateway -->
  <line x1="790" y1="465" x2="750" y2="465" stroke="#c084fc" stroke-width="2" stroke-dasharray="4,4" marker-end="url(#arrow-purple)"/>

  <!-- IoT to Gateway -->
  <path d="M 340 600 L 360 600 L 360 515 L 400 515" fill="none" stroke="#f97316" stroke-width="2" marker-end="url(#arrow)"/>
  <text x="375" y="540" fill="#f97316" font-size="10" font-weight="600">WiFi POST</text>
</svg>`;

// 2. OCR FLOWCHART SVG
const ocrSvg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1100 320" width="100%" height="100%" style="background:#0b132b; font-family:-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;">
  <defs>
    <linearGradient id="stepGrad" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#1e293b"/>
      <stop offset="100%" stop-color="#334155"/>
    </linearGradient>
    <marker id="arr" viewBox="0 0 10 10" refX="6" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
      <path d="M 0 1 L 10 5 L 0 9 z" fill="#38bdf8" />
    </marker>
    <filter id="drop" x="-5%" y="-5%" width="110%" height="110%">
      <feDropShadow dx="0" dy="3" stdDeviation="4" flood-color="#000000" flood-opacity="0.5"/>
    </filter>
  </defs>

  <!-- Title -->
  <rect x="20" y="15" width="1060" height="40" rx="6" fill="#1e293b" stroke="#334155" stroke-width="1.5" filter="url(#drop)"/>
  <text x="550" y="41" fill="#38bdf8" font-size="16" font-weight="700" text-anchor="middle" letter-spacing="0.5">DUAL-ENGINE OCR &amp; CLINICAL BIOMARKER EXTRACTION PIPELINE</text>

  <!-- Step 1: Upload -->
  <rect x="20" y="80" width="130" height="90" rx="8" fill="#1e293b" stroke="#0284c7" stroke-width="2" filter="url(#drop)"/>
  <text x="85" y="112" fill="#38bdf8" font-size="13" font-weight="700" text-anchor="middle">📄 Upload</text>
  <text x="85" y="132" fill="#ffffff" font-size="11" text-anchor="middle">Lab Report</text>
  <text x="85" y="150" fill="#94a3b8" font-size="10" text-anchor="middle">PDF, PNG, JPG</text>

  <!-- Arrow 1 to 2 -->
  <line x1="150" y1="125" x2="180" y2="125" stroke="#38bdf8" stroke-width="2" marker-end="url(#arr)"/>

  <!-- Step 2: Classifier -->
  <polygon points="230,80 280,125 230,170 180,125" fill="#1e293b" stroke="#f59e0b" stroke-width="2" filter="url(#drop)"/>
  <text x="230" y="122" fill="#fbbf24" font-size="11" font-weight="700" text-anchor="middle">File Type</text>
  <text x="230" y="136" fill="#fbbf24" font-size="11" font-weight="700" text-anchor="middle">Detector</text>

  <!-- Fork: Digital PDF (Top) & Optical Scan (Bottom) -->
  <path d="M 280 110 L 310 90 L 330 90" fill="none" stroke="#38bdf8" stroke-width="2" marker-end="url(#arr)"/>
  <text x="305" y="82" fill="#38bdf8" font-size="10" font-weight="600">Digital PDF</text>

  <path d="M 280 140 L 310 160 L 330 160" fill="none" stroke="#f43f5e" stroke-width="2" marker-end="url(#arr)"/>
  <text x="305" y="178" fill="#f43f5e" font-size="10" font-weight="600">Scanned Image</text>

  <!-- Engines -->
  <rect x="330" y="65" width="130" height="50" rx="6" fill="#1e293b" stroke="#38bdf8" stroke-width="1.5" filter="url(#drop)"/>
  <text x="395" y="87" fill="#ffffff" font-size="11" font-weight="600" text-anchor="middle">pdf-parse Engine</text>
  <text x="395" y="103" fill="#94a3b8" font-size="9" text-anchor="middle">Direct Stream Parser</text>

  <rect x="330" y="135" width="130" height="50" rx="6" fill="#1e293b" stroke="#f43f5e" stroke-width="1.5" filter="url(#drop)"/>
  <text x="395" y="157" fill="#ffffff" font-size="11" font-weight="600" text-anchor="middle">Tesseract.js Engine</text>
  <text x="395" y="173" fill="#94a3b8" font-size="9" text-anchor="middle">Binarize &amp; Contrast</text>

  <!-- Join to Raw Text -->
  <path d="M 460 90 L 485 90 L 485 125 L 505 125" fill="none" stroke="#38bdf8" stroke-width="2" marker-end="url(#arr)"/>
  <path d="M 460 160 L 485 160 L 485 125 L 505 125" fill="none" stroke="#38bdf8" stroke-width="2"/>

  <!-- Step 3: Raw Text -->
  <rect x="505" y="95" width="105" height="60" rx="6" fill="#1e293b" stroke="#64748b" stroke-width="1.5" filter="url(#drop)"/>
  <text x="557" y="122" fill="#ffffff" font-size="11" font-weight="600" text-anchor="middle">Raw Extracted</text>
  <text x="557" y="138" fill="#38bdf8" font-size="11" font-weight="600" text-anchor="middle">Text Lines</text>

  <!-- Arrow to Step 4 -->
  <line x1="610" y1="125" x2="635" y2="125" stroke="#38bdf8" stroke-width="2" marker-end="url(#arr)"/>

  <!-- Step 4: Medical Regex Matcher -->
  <rect x="635" y="90" width="125" height="70" rx="6" fill="#1e293b" stroke="#a855f7" stroke-width="1.5" filter="url(#drop)"/>
  <text x="697" y="113" fill="#c084fc" font-size="11" font-weight="700" text-anchor="middle">Medical Entity</text>
  <text x="697" y="129" fill="#c084fc" font-size="11" font-weight="700" text-anchor="middle">Matcher</text>
  <text x="697" y="146" fill="#94a3b8" font-size="9" text-anchor="middle">Synonym Dict &amp; Regex</text>

  <!-- Arrow to Step 5 -->
  <line x1="760" y1="125" x2="785" y2="125" stroke="#38bdf8" stroke-width="2" marker-end="url(#arr)"/>

  <!-- Step 5: Unit Normalizer & Range Guard -->
  <rect x="785" y="85" width="135" height="80" rx="6" fill="#1e293b" stroke="#34d399" stroke-width="1.5" filter="url(#drop)"/>
  <text x="852" y="108" fill="#34d399" font-size="11" font-weight="700" text-anchor="middle">Unit Normalizer</text>
  <text x="852" y="125" fill="#34d399" font-size="11" font-weight="700" text-anchor="middle">&amp; Range Guard</text>
  <text x="852" y="143" fill="#cbd5e1" font-size="9" text-anchor="middle">mmol/L ➔ mg/dL</text>
  <text x="852" y="156" fill="#94a3b8" font-size="9" text-anchor="middle">Biological bounds check</text>

  <!-- Arrow to Step 6 -->
  <line x1="920" y1="125" x2="945" y2="125" stroke="#38bdf8" stroke-width="2" marker-end="url(#arr)"/>

  <!-- Step 6: Human Review Modal -->
  <rect x="945" y="85" width="135" height="80" rx="6" fill="#1e293b" stroke="#f59e0b" stroke-width="2" filter="url(#drop)"/>
  <text x="1012" y="108" fill="#fbbf24" font-size="11" font-weight="700" text-anchor="middle">Human-in-Loop</text>
  <text x="1012" y="125" fill="#fbbf24" font-size="11" font-weight="700" text-anchor="middle">Review Modal</text>
  <text x="1012" y="143" fill="#cbd5e1" font-size="9" text-anchor="middle">Inspect, edit, or</text>
  <text x="1012" y="156" fill="#cbd5e1" font-size="9" text-anchor="middle">confirm values</text>

  <!-- Final Arrow Down to Immutable DB -->
  <path d="M 1012 165 L 1012 215 L 590 215" fill="none" stroke="#10b981" stroke-width="2" marker-end="url(#arr)"/>
  <text x="800" y="235" fill="#34d399" font-size="11" font-weight="600" text-anchor="middle">User Confirms ➔ Immutable Database Record</text>

  <!-- DB Destination Box -->
  <rect x="360" y="245" width="460" height="50" rx="8" fill="#064e3b" stroke="#10b981" stroke-width="2" filter="url(#drop)"/>
  <text x="590" y="268" fill="#ffffff" font-size="13" font-weight="700" text-anchor="middle">💾 CONFIRMED IMMUTABLE REPORT (MongoDB Atlas)</text>
  <text x="590" y="284" fill="#a7f3d0" font-size="11" text-anchor="middle">Feeds into Calibrated Machine Learning Inference Microservice</text>
</svg>`;

// 3. SEQUENCE DIAGRAM SVG
const seqSvg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1000 680" width="100%" height="100%" style="background:#0b132b; font-family:-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;">
  <defs>
    <marker id="s-arr" viewBox="0 0 10 10" refX="6" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
      <path d="M 0 1 L 10 5 L 0 9 z" fill="#38bdf8" />
    </marker>
    <marker id="s-arr-back" viewBox="0 0 10 10" refX="6" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
      <path d="M 0 1 L 10 5 L 0 9 z" fill="#94a3b8" />
    </marker>
    <filter id="s-drop" x="-5%" y="-5%" width="110%" height="110%">
      <feDropShadow dx="0" dy="3" stdDeviation="4" flood-color="#000000" flood-opacity="0.4"/>
    </filter>
  </defs>

  <!-- Title -->
  <rect x="30" y="15" width="940" height="40" rx="6" fill="#1e293b" stroke="#334155" stroke-width="1.5" filter="url(#s-drop)"/>
  <text x="500" y="41" fill="#38bdf8" font-size="16" font-weight="700" text-anchor="middle">MEDSCAN-NCD: END-TO-END CLINICAL &amp; TELEMETRY INTERACTION SEQUENCE</text>

  <!-- Actors / Participants Headers -->
  <!-- 1. Patient -->
  <rect x="40" y="75" width="120" height="45" rx="6" fill="#1e3a8a" stroke="#38bdf8" stroke-width="1.5"/>
  <text x="100" y="103" fill="#ffffff" font-size="12" font-weight="700" text-anchor="middle">👤 Patient</text>

  <!-- 2. React UI -->
  <rect x="200" y="75" width="120" height="45" rx="6" fill="#0369a1" stroke="#38bdf8" stroke-width="1.5"/>
  <text x="260" y="103" fill="#ffffff" font-size="12" font-weight="700" text-anchor="middle">💻 React Client</text>

  <!-- 3. Express Gateway -->
  <rect x="360" y="75" width="120" height="45" rx="6" fill="#334155" stroke="#94a3b8" stroke-width="1.5"/>
  <text x="420" y="103" fill="#ffffff" font-size="12" font-weight="700" text-anchor="middle">⚙️ Express API</text>

  <!-- 4. OCR Engine -->
  <rect x="520" y="75" width="120" height="45" rx="6" fill="#14532d" stroke="#22c55e" stroke-width="1.5"/>
  <text x="580" y="103" fill="#ffffff" font-size="12" font-weight="700" text-anchor="middle">📄 OCR Engine</text>

  <!-- 5. FastAPI ML -->
  <rect x="680" y="75" width="120" height="45" rx="6" fill="#581c87" stroke="#a855f7" stroke-width="1.5"/>
  <text x="740" y="103" fill="#ffffff" font-size="12" font-weight="700" text-anchor="middle">🧠 FastAPI ML</text>

  <!-- 6. ESP32 -->
  <rect x="840" y="75" width="120" height="45" rx="6" fill="#7c2d12" stroke="#f97316" stroke-width="1.5"/>
  <text x="900" y="103" fill="#ffffff" font-size="12" font-weight="700" text-anchor="middle">📡 ESP32 Box</text>

  <!-- Vertical Lifelines -->
  <line x1="100" y1="120" x2="100" y2="650" stroke="#334155" stroke-width="1.5" stroke-dasharray="4,4"/>
  <line x1="260" y1="120" x2="260" y2="650" stroke="#334155" stroke-width="1.5" stroke-dasharray="4,4"/>
  <line x1="420" y1="120" x2="420" y2="650" stroke="#334155" stroke-width="1.5" stroke-dasharray="4,4"/>
  <line x1="580" y1="120" x2="580" y2="650" stroke="#334155" stroke-width="1.5" stroke-dasharray="4,4"/>
  <line x1="740" y1="120" x2="740" y2="650" stroke="#334155" stroke-width="1.5" stroke-dasharray="4,4"/>
  <line x1="900" y1="120" x2="900" y2="650" stroke="#334155" stroke-width="1.5" stroke-dasharray="4,4"/>

  <!-- Messages -->
  <!-- 1. Patient -> React -->
  <line x1="100" y1="150" x2="260" y2="150" stroke="#38bdf8" stroke-width="2" marker-end="url(#s-arr)"/>
  <text x="180" y="142" fill="#e2e8f0" font-size="11" text-anchor="middle">1. Uploads Lab Report (PDF/PNG)</text>

  <!-- 2. React -> Gateway -->
  <line x1="260" y1="185" x2="420" y2="185" stroke="#38bdf8" stroke-width="2" marker-end="url(#s-arr)"/>
  <text x="340" y="177" fill="#e2e8f0" font-size="11" text-anchor="middle">2. POST /api/reports (Multer)</text>

  <!-- 3. Gateway -> OCR -->
  <line x1="420" y1="220" x2="580" y2="220" stroke="#38bdf8" stroke-width="2" marker-end="url(#s-arr)"/>
  <text x="500" y="212" fill="#e2e8f0" font-size="11" text-anchor="middle">3. Run Tesseract.js / pdf-parse</text>

  <!-- 4. OCR -> Gateway -->
  <line x1="580" y1="255" x2="420" y2="255" stroke="#94a3b8" stroke-width="1.5" stroke-dasharray="3,3" marker-end="url(#s-arr-back)"/>
  <text x="500" y="247" fill="#94a3b8" font-size="11" text-anchor="middle">4. Extracted Biomarker JSON</text>

  <!-- 5. Gateway -> React -->
  <line x1="420" y1="290" x2="260" y2="290" stroke="#94a3b8" stroke-width="1.5" stroke-dasharray="3,3" marker-end="url(#s-arr-back)"/>
  <text x="340" y="282" fill="#94a3b8" font-size="11" text-anchor="middle">5. Display Review &amp; Edit Modal</text>

  <!-- 6. Patient -> React (Confirm) -->
  <line x1="100" y1="325" x2="260" y2="325" stroke="#38bdf8" stroke-width="2" marker-end="url(#s-arr)"/>
  <text x="180" y="317" fill="#e2e8f0" font-size="11" text-anchor="middle">6. Reviews &amp; Clicks "Confirm"</text>

  <!-- 7. React -> Gateway -->
  <line x1="260" y1="360" x2="420" y2="360" stroke="#38bdf8" stroke-width="2" marker-end="url(#s-arr)"/>
  <text x="340" y="352" fill="#e2e8f0" font-size="11" text-anchor="middle">7. PUT /api/reports/:id/confirm</text>

  <!-- 8. Gateway -> ML -->
  <line x1="420" y1="395" x2="740" y2="395" stroke="#c084fc" stroke-width="2" marker-end="url(#s-arr)"/>
  <text x="580" y="387" fill="#c084fc" font-size="11" font-weight="600" text-anchor="middle">8. POST /predict (Biomarkers ➔ LightGBM &amp; TreeSHAP)</text>

  <!-- 9. ML -> Gateway -->
  <line x1="740" y1="430" x2="420" y2="430" stroke="#c084fc" stroke-width="1.5" stroke-dasharray="3,3" marker-end="url(#s-arr-back)"/>
  <text x="580" y="422" fill="#c084fc" font-size="11" text-anchor="middle">9. Calibrated Probabilities (0.210 cutoff) + SHAP factors</text>

  <!-- 10. Gateway -> React -->
  <line x1="420" y1="465" x2="260" y2="465" stroke="#38bdf8" stroke-width="2" marker-end="url(#s-arr)"/>
  <text x="340" y="457" fill="#e2e8f0" font-size="11" text-anchor="middle">10. Live Disease Risk Cards Rendered</text>

  <!-- Note: Adherence Telemetry -->
  <rect x="220" y="495" width="720" height="35" rx="5" fill="#1e293b" stroke="#f97316" stroke-width="1"/>
  <text x="580" y="518" fill="#fb923c" font-size="11" font-weight="700" text-anchor="middle">MEDICATION ADHERENCE &amp; ESP32 HARDWARE SYNC</text>

  <!-- 11. Prescribe -->
  <line x1="260" y1="550" x2="420" y2="550" stroke="#38bdf8" stroke-width="2" marker-end="url(#s-arr)"/>
  <text x="340" y="542" fill="#e2e8f0" font-size="11" text-anchor="middle">11. Clinician Prescribes Regimen</text>

  <!-- 12. ESP32 Polls / Syncs -->
  <line x1="900" y1="580" x2="420" y2="580" stroke="#f97316" stroke-width="2" marker-end="url(#s-arr)"/>
  <text x="660" y="572" fill="#f97316" font-size="11" text-anchor="middle">12. GET /api/medicines/sync (Poll schedule)</text>

  <!-- 13. IR Sensor Trigger -->
  <line x1="900" y1="615" x2="420" y2="615" stroke="#f97316" stroke-width="2" marker-end="url(#s-arr)"/>
  <text x="660" y="607" fill="#f97316" font-size="11" font-weight="600" text-anchor="middle">13. POST /api/iot/medicine-status (IR Detects Pill Taken)</text>

  <!-- 14. Gateway to React UI update -->
  <line x1="420" y1="645" x2="260" y2="645" stroke="#34d399" stroke-width="2" marker-end="url(#s-arr)"/>
  <text x="340" y="637" fill="#34d399" font-size="11" font-weight="600" text-anchor="middle">14. Adherence Log &amp; Badge Updates: "Taken"</text>
</svg>`;

// 4. ESP32 HARDWARE SVG
const iotSvg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1000 280" width="100%" height="100%" style="background:#0b132b; font-family:-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;">
  <defs>
    <marker id="i-arr" viewBox="0 0 10 10" refX="6" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
      <path d="M 0 1 L 10 5 L 0 9 z" fill="#f97316" />
    </marker>
    <filter id="i-drop" x="-5%" y="-5%" width="110%" height="110%">
      <feDropShadow dx="0" dy="3" stdDeviation="4" flood-color="#000000" flood-opacity="0.4"/>
    </filter>
  </defs>

  <rect x="20" y="15" width="960" height="40" rx="6" fill="#1e293b" stroke="#334155" stroke-width="1.5" filter="url(#i-drop)"/>
  <text x="500" y="41" fill="#f97316" font-size="16" font-weight="700" text-anchor="middle">ESP32 SMART MEDICINE DISPENSER: SENSOR &amp; TELEMETRY ARCHITECTURE</text>

  <!-- Central ESP32 Box -->
  <rect x="360" y="80" width="280" height="175" rx="10" fill="#1e293b" stroke="#f97316" stroke-width="2.5" filter="url(#i-drop)"/>
  <rect x="360" y="80" width="280" height="35" rx="10" fill="#c2410c"/>
  <text x="500" y="103" fill="#ffffff" font-size="14" font-weight="700" text-anchor="middle">ESP32 MICROCONTROLLER</text>
  <text x="500" y="132" fill="#fb923c" font-size="12" font-weight="600" text-anchor="middle">Xtensa Dual-Core 240MHz</text>
  <text x="500" y="152" fill="#cbd5e1" font-size="11" text-anchor="middle">• Built-in 802.11 b/g/n Wi-Fi</text>
  <text x="500" y="172" fill="#cbd5e1" font-size="11" text-anchor="middle">• HTTPS TLS Client Communication</text>
  <text x="500" y="192" fill="#cbd5e1" font-size="11" text-anchor="middle">• Non-Volatile Flash Dose Storage</text>
  <text x="500" y="212" fill="#94a3b8" font-size="11" text-anchor="middle">• Multi-Compartment IR Pin Mapping</text>
  <text x="500" y="240" fill="#38bdf8" font-size="11" font-weight="600" text-anchor="middle">Firmware: FreeRTOS / Arduino C++</text>

  <!-- Peripherals Left -->
  <!-- RTC DS3231 -->
  <rect x="40" y="80" width="260" height="65" rx="6" fill="#1e293b" stroke="#38bdf8" stroke-width="1.5" filter="url(#i-drop)"/>
  <text x="55" y="105" fill="#38bdf8" font-size="13" font-weight="700">⏰ DS3231 Precision RTC</text>
  <text x="55" y="123" fill="#cbd5e1" font-size="11">Real-Time Clock via I2C Bus</text>
  <text x="55" y="137" fill="#94a3b8" font-size="10">Battery-backed hardware alarms</text>
  <line x1="300" y1="112" x2="360" y2="112" stroke="#38bdf8" stroke-width="2" marker-end="url(#i-arr)"/>

  <!-- IR Sensors -->
  <rect x="40" y="165" width="260" height="75" rx="6" fill="#1e293b" stroke="#f43f5e" stroke-width="1.5" filter="url(#i-drop)"/>
  <text x="55" y="190" fill="#fb7185" font-size="13" font-weight="700">🚨 IR Beam Sensors</text>
  <text x="55" y="208" fill="#cbd5e1" font-size="11">Infrared Compartment Drop Detect</text>
  <text x="55" y="224" fill="#94a3b8" font-size="10">Signals pill removal without user claim</text>
  <line x1="300" y1="202" x2="360" y2="202" stroke="#f43f5e" stroke-width="2" marker-end="url(#i-arr)"/>

  <!-- Peripherals Right -->
  <!-- OLED Display -->
  <rect x="700" y="80" width="260" height="65" rx="6" fill="#1e293b" stroke="#38bdf8" stroke-width="1.5" filter="url(#i-drop)"/>
  <text x="715" y="105" fill="#38bdf8" font-size="13" font-weight="700">📺 SSD1306 OLED Display</text>
  <text x="715" y="123" fill="#cbd5e1" font-size="11">0.96" I2C Monochrome Screen</text>
  <text x="715" y="137" fill="#94a3b8" font-size="10">Shows dose time, pill name &amp; status</text>
  <line x1="640" y1="112" x2="700" y2="112" stroke="#38bdf8" stroke-width="2" marker-end="url(#i-arr)"/>

  <!-- Buzzer & LEDs -->
  <rect x="700" y="165" width="260" height="75" rx="6" fill="#1e293b" stroke="#eab308" stroke-width="1.5" filter="url(#i-drop)"/>
  <text x="715" y="190" fill="#facc15" font-size="13" font-weight="700">🔔 Buzzer &amp; Multi-Color LEDs</text>
  <text x="715" y="208" fill="#cbd5e1" font-size="11">Auditory alarm &amp; visual indicators</text>
  <text x="715" y="224" fill="#94a3b8" font-size="10">Alerts patient when scheduled dose is due</text>
  <line x1="640" y1="202" x2="700" y2="202" stroke="#eab308" stroke-width="2" marker-end="url(#i-arr)"/>
</svg>`;

fs.writeFileSync(path.join(outDir, '01-system-architecture.svg'), sysArchSvg, 'utf8');
fs.writeFileSync(path.join(outDir, '02-interaction-sequence.svg'), seqSvg, 'utf8');
fs.writeFileSync(path.join(outDir, '03-ocr-pipeline-flowchart.svg'), ocrSvg, 'utf8');
fs.writeFileSync(path.join(outDir, '04-iot-telemetry-flowchart.svg'), iotSvg, 'utf8');

console.log('Successfully generated 4 SVG diagrams in assets/diagrams/');

