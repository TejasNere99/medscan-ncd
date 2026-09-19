import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  FileSearch,
  Activity,
  Brain,
  HeartPulse,
  ShieldAlert,
  Sparkles,
  ChevronDown,
  ArrowRight,
  FileText,
  LayoutDashboard,
  TrendingUp,
  CheckCircle2,
  ArrowUpRight,
  ArrowDownRight,
  Layers,
  Microscope,
  UserCheck,
  Stethoscope,
  Building2,
  AlertTriangle,
  LineChart,
  GitCompare,
  History,
  Lock,
  Clock,
  Zap,
} from 'lucide-react';
import { useAuth } from '../hooks/useAuth';

export const LandingPage = () => {
  const { user, role } = useAuth();
  const [activeFaq, setActiveFaq] = useState(null);
  const [selectedDisease, setSelectedDisease] = useState('diabetes');

  const scrollToSection = (e, sectionId) => {
    e.preventDefault();
    const element = document.getElementById(sectionId);
    if (element) {
      element.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  };

  const diseases = {
    diabetes: {
      name: 'Diabetes Risk',
      score: 24,
      level: 'Low Risk',
      badgeColor: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30',
      barColor: 'from-emerald-500 to-teal-400',
      description:
        'Evaluates metabolic glucose regulation using fasting glucose, body mass index, age, and historical glycemic patterns.',
      contributingFactors: [
        { name: 'Fasting Glucose (108 mg/dL)', impact: 'Mild Elevation (+)', type: 'risk' },
        { name: 'Body Mass Index (24.6 kg/m²)', impact: 'Optimal Range (•)', type: 'neutral' },
        { name: 'Patient Age (46 yrs)', impact: 'Baseline Factor (•)', type: 'neutral' },
        { name: 'Longitudinal Trend (+6 mg/dL over 8 mos)', impact: 'Upward Drift (+)', type: 'risk' },
      ],
      protectiveFactors: ['Regular physical activity profile', 'Normotensive blood pressure'],
    },
    heart: {
      name: 'Heart Disease Risk',
      score: 31,
      level: 'Moderate Risk',
      badgeColor: 'bg-amber-500/10 text-amber-400 border-amber-500/30',
      barColor: 'from-amber-500 to-yellow-400',
      description:
        'Analyzes cardiovascular markers including systolic blood pressure, total cholesterol, age, and vascular risk indicators.',
      contributingFactors: [
        { name: 'Systolic Blood Pressure (128 mmHg)', impact: 'Pre-hypertensive (+)', type: 'risk' },
        { name: 'Total Cholesterol (195 mg/dL)', impact: 'Borderline Upper (+)', type: 'risk' },
        { name: 'Age & Demographic Factor', impact: 'Moderate Weight (•)', type: 'neutral' },
        { name: 'Historical SBP Trend (Stable)', impact: 'No Rapid Acceleration (-)', type: 'protective' },
      ],
      protectiveFactors: ['Non-smoker status', 'Normal renal clearance'],
    },
    hypertension: {
      name: 'Hypertension Risk',
      score: 18,
      level: 'Low Risk',
      badgeColor: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30',
      barColor: 'from-emerald-500 to-cyan-400',
      description:
        'Monitors arterial pressure trajectories, pulse pressure deltas, BMI, and longitudinal circulatory trends across reports.',
      contributingFactors: [
        { name: 'Current BP (128/82 mmHg)', impact: 'Mild Systolic Variance (+)', type: 'risk' },
        { name: 'Diastolic Reading (82 mmHg)', impact: 'Controlled Range (•)', type: 'neutral' },
        { name: 'BMI Profile (24.6 kg/m²)', impact: 'Healthy Weight Profile (-)', type: 'protective' },
        { name: 'Multi-Report SBP Trend', impact: 'Controlled Variation (-)', type: 'protective' },
      ],
      protectiveFactors: ['Consistent diastolic stability', 'Balanced lifestyle markers'],
    },
    kidney: {
      name: 'Kidney Disease Risk',
      score: 12,
      level: 'Low Risk',
      badgeColor: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30',
      barColor: 'from-emerald-500 to-teal-400',
      description:
        'Tracks renal filtration biomarkers including serum creatinine, blood urea nitrogen, and longitudinal clearance stability.',
      contributingFactors: [
        { name: 'Serum Creatinine (0.9 mg/dL)', impact: 'Optimal Filtration (-)', type: 'protective' },
        { name: 'Estimated GFR (>90 mL/min)', impact: 'Healthy Clearance (-)', type: 'protective' },
        { name: 'Blood Urea (18 mg/dL)', impact: 'Normal Range (•)', type: 'neutral' },
        { name: 'Longitudinal Delta (0.88 → 0.90)', impact: 'Stable Glomerular Trend (-)', type: 'protective' },
      ],
      protectiveFactors: ['Optimal hydration markers', 'Absence of microalbuminuria markers'],
    },
  };

  const faqs = [
    {
      q: 'What is MedScan-NCD?',
      a: 'MedScan-NCD is an AI-assisted preventive healthcare platform that extracts key physiological data from uploaded medical reports using Optical Character Recognition (OCR), links current findings with patient health history, and assesses risk across major non-communicable diseases (NCDs) for early preventive decision support.',
    },
    {
      q: 'How does the medical report OCR work?',
      a: 'When you upload an image or PDF of a diagnostic lab report, our OCR engine extracts raw text and uses pattern recognition to parse supported physiological parameters (such as Fasting Glucose, Blood Pressure, Cholesterol, and Creatinine) into structured, validated data records.',
    },
    {
      q: 'Which diseases does MedScan-NCD evaluate?',
      a: 'The platform focuses on four primary non-communicable diseases: 1) Diabetes, 2) Heart Disease, 3) Hypertension, and 4) Kidney Disease. These four conditions represent the largest global burden of chronic preventable morbidity.',
    },
    {
      q: 'What is Longitudinal Health Intelligence and why does it matter?',
      a: 'A single lab report is only a static snapshot. MedScan-NCD builds an evolving health profile: each newly uploaded report is stored and evaluated alongside the patient\'s historical records. This allows the system and clinicians to detect subtle trajectories (such as a gradual fasting sugar increase of 102 → 110 → 118 mg/dL) long before critical thresholds are reached.',
    },
    {
      q: 'Can MedScan-NCD provide a definitive medical diagnosis?',
      a: 'No. MedScan-NCD is strictly a preventive risk assessment and clinical decision-support platform. It does NOT diagnose diseases or replace licensed medical practitioners. All risk estimates and insights are designed to empower informed discussions between patients and their physicians.',
    },
    {
      q: 'How does MedScan-NCD assist doctors and healthcare teams?',
      a: 'Doctors can instantly view structured biometric values without manually typing from paper reports, review multi-disease risk indicators, understand the physiological factors driving risk scores, and examine multi-year longitudinal health trends to support evidence-based clinical decisions.',
    },
    {
      q: 'Can I compare multiple medical reports side-by-side?',
      a: 'Yes! The platform tracks parameters across chronological reports, displaying delta indicators (e.g., changes in glucose or blood pressure over time) so both patients and clinicians can observe how lifestyle or clinical interventions affect health indicators.',
    },
    {
      q: 'Is my medical data secure and confidential?',
      a: 'Yes. MedScan-NCD uses encrypted transmission, role-based access control, and strict authentication to ensure that patient records are accessible only by authorized individuals (patients, assigned physicians, and designated care teams).',
    },
  ];

  return (
    <div className="min-h-screen bg-[#0b1329] text-slate-100 overflow-x-hidden">
      {/* Top Navbar */}
      <header className="sticky top-0 z-50 glass-panel border-b border-slate-800/80 px-6 py-3.5">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <Link to="/" className="flex items-center space-x-3 group">
            <div className="p-2.5 rounded-xl bg-gradient-to-tr from-brand-600 to-cyan-400 text-white shadow-lg shadow-cyan-500/20 group-hover:scale-105 transition-transform">
              <FileSearch className="w-5 h-5" />
            </div>
            <div>
              <span className="text-xl font-extrabold text-white tracking-tight block leading-none">
                MedScan<span className="text-brand-400">-NCD</span>
              </span>
              <span className="text-[10px] text-slate-400 font-medium tracking-wide uppercase">
                Preventive Health Intelligence
              </span>
            </div>
          </Link>

          {/* Nav links to page sections */}
          <nav className="hidden md:flex items-center space-x-7 text-xs font-semibold text-slate-300">
            <a href="#features" onClick={(e) => scrollToSection(e, 'features')} className="hover:text-cyan-400 transition-colors">
              Features
            </a>
            <a href="#how-it-works" onClick={(e) => scrollToSection(e, 'how-it-works')} className="hover:text-cyan-400 transition-colors">
              How It Works
            </a>
            <a href="#ai-prediction" onClick={(e) => scrollToSection(e, 'ai-prediction')} className="hover:text-cyan-400 transition-colors">
              AI Prediction
            </a>
            <a href="#health-intelligence" onClick={(e) => scrollToSection(e, 'health-intelligence')} className="hover:text-cyan-400 transition-colors">
              Health Intelligence
            </a>
            <a href="#faq" onClick={(e) => scrollToSection(e, 'faq')} className="hover:text-cyan-400 transition-colors">
              FAQ
            </a>
          </nav>

          {/* Auth Action Buttons */}
          <div className="flex items-center space-x-3">
            {user ? (
              <Link
                to={`/${role?.toLowerCase()}/dashboard`}
                className="px-4 py-2 text-xs font-bold text-white bg-gradient-to-r from-brand-500 to-cyan-500 hover:from-brand-600 hover:to-cyan-600 shadow-lg shadow-brand-500/20 rounded-xl flex items-center space-x-2 transition-all"
              >
                <LayoutDashboard className="w-4 h-4" />
                <span>Go to Dashboard ({role})</span>
              </Link>
            ) : (
              <>
                <Link
                  to="/login"
                  className="px-4 py-2 text-xs font-bold text-white bg-slate-900 border border-slate-800 hover:bg-slate-800 rounded-xl transition-all"
                >
                  Sign In
                </Link>
                <Link
                  to="/register"
                  className="px-4 py-2 text-xs font-bold text-white bg-gradient-to-r from-brand-500 to-cyan-500 hover:from-brand-600 hover:to-cyan-600 shadow-lg shadow-brand-500/25 rounded-xl transition-all"
                >
                  Get Started
                </Link>
              </>
            )}
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="relative pt-16 pb-24 px-6 overflow-hidden">
        {/* Ambient lighting glows */}
        <div className="absolute top-10 left-1/3 -translate-x-1/2 w-[650px] h-[350px] bg-brand-500/15 blur-[140px] pointer-events-none rounded-full" />
        <div className="absolute top-40 right-10 w-[450px] h-[280px] bg-teal-500/10 blur-[130px] pointer-events-none rounded-full" />

        <div className="max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-12 gap-12 items-center relative z-10">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            className="lg:col-span-7 space-y-6"
          >
            {/* Eyebrow badge */}
            <div className="inline-flex items-center space-x-2 px-3.5 py-1.5 rounded-full bg-brand-500/10 border border-brand-500/30 text-brand-400 text-xs font-semibold">
              <Sparkles className="w-3.5 h-3.5 text-cyan-400 animate-pulse" />
              <span>AI-Powered Preventive Healthcare Platform</span>
            </div>

            {/* Main Headline */}
            <h1 className="text-4xl sm:text-5xl lg:text-6xl font-black text-white tracking-tight leading-[1.12]">
              Turn Medical Reports into{' '}
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 via-teal-300 to-emerald-400">
                AI-Powered Health Insights
              </span>
            </h1>

            {/* Core Subheading */}
            <p className="text-slate-300 text-sm sm:text-base leading-relaxed max-w-2xl">
              MedScan-NCD uses OCR and machine learning to extract meaningful health information from medical reports,
              assess risk across multiple non-communicable diseases, and provide explainable insights for preventive
              healthcare.
            </p>

            {/* Core USP Highlight Banner */}
            <div className="p-4 rounded-2xl bg-slate-900/80 border border-slate-800/90 flex items-start space-x-3 text-xs">
              <div className="p-2 rounded-xl bg-cyan-500/10 text-cyan-400 shrink-0 mt-0.5">
                <History className="w-4 h-4" />
              </div>
              <div className="space-y-0.5">
                <p className="font-bold text-white">Longitudinal Health Intelligence</p>
                <p className="text-slate-400 text-[11px] leading-relaxed">
                  From a single medical report to an evolving AI-powered health profile: linking current health parameters
                  with historical records enables more meaningful preventive risk insights.
                </p>
              </div>
            </div>

            {/* CTAs */}
            <div className="flex flex-wrap items-center gap-4 pt-2">
              <Link
                to="/register"
                className="px-6 py-3.5 text-xs font-extrabold text-white bg-gradient-to-r from-brand-500 to-cyan-500 hover:from-brand-600 hover:to-cyan-600 rounded-2xl shadow-xl shadow-brand-500/25 flex items-center space-x-2 transition-all group"
              >
                <span>Get Started</span>
                <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
              </Link>
              <a
                href="#ai-prediction"
                onClick={(e) => scrollToSection(e, 'ai-prediction')}
                className="px-6 py-3.5 text-xs font-bold text-slate-300 bg-slate-900 border border-slate-800 hover:border-slate-700 hover:text-white rounded-2xl transition-all"
              >
                Explore AI Prediction
              </a>
            </div>

            {/* Trust Badges */}
            <div className="pt-4 border-t border-slate-800/80 grid grid-cols-2 sm:grid-cols-4 gap-4 text-slate-400">
              <div className="space-y-1">
                <p className="text-lg font-black text-white">4 NCDs</p>
                <p className="text-[11px]">Comprehensive Multi-Risk</p>
              </div>
              <div className="space-y-1">
                <p className="text-lg font-black text-white">OCR Engine</p>
                <p className="text-[11px]">Automated Vitals Extraction</p>
              </div>
              <div className="space-y-1">
                <p className="text-lg font-black text-white">Trend History</p>
                <p className="text-[11px]">Longitudinal Profiling</p>
              </div>
              <div className="space-y-1">
                <p className="text-lg font-black text-white">Explainable AI</p>
                <p className="text-[11px]">Interpretable Attribution</p>
              </div>
            </div>
          </motion.div>

          {/* Hero Visual Card (AI Health Analytics Preview) */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.6, delay: 0.1 }}
            className="lg:col-span-5 relative"
          >
            <div className="glass-card p-6 rounded-3xl border border-slate-800 shadow-2xl relative z-10 space-y-5">
              {/* Card Header */}
              <div className="flex items-center justify-between border-b border-slate-800 pb-3.5">
                <div className="flex items-center space-x-2.5">
                  <div className="p-2 rounded-lg bg-brand-500/10 text-brand-400">
                    <Activity className="w-4 h-4" />
                  </div>
                  <div>
                    <h2 className="text-xs font-bold text-white">AI Health Analysis</h2>
                    <p className="text-[10px] text-slate-400">Demo Patient • Metabolic Panel</p>
                  </div>
                </div>
                <span className="text-[10px] px-2.5 py-0.5 rounded-full bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 font-bold uppercase tracking-wider">
                  Report Analyzed
                </span>
              </div>

              {/* Health Risk Overview Grid */}
              <div className="space-y-2.5">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-bold text-slate-300">Health Risk Overview</span>
                  <span className="text-[10px] text-slate-500 font-mono">Sample Analysis</span>
                </div>

                <div className="grid grid-cols-2 gap-2.5">
                  <div className="p-3 rounded-xl bg-slate-950/80 border border-slate-800/90 space-y-1">
                    <div className="flex justify-between items-center text-xs">
                      <span className="text-slate-300 font-semibold">Diabetes</span>
                      <span className="text-emerald-400 font-black">24%</span>
                    </div>
                    <div className="w-full bg-slate-800 h-1.5 rounded-full overflow-hidden">
                      <div className="bg-emerald-400 h-full rounded-full" style={{ width: '24%' }} />
                    </div>
                    <span className="text-[10px] text-emerald-400/90 font-medium">Low Risk</span>
                  </div>

                  <div className="p-3 rounded-xl bg-slate-950/80 border border-slate-800/90 space-y-1">
                    <div className="flex justify-between items-center text-xs">
                      <span className="text-slate-300 font-semibold">Heart Disease</span>
                      <span className="text-amber-400 font-black">31%</span>
                    </div>
                    <div className="w-full bg-slate-800 h-1.5 rounded-full overflow-hidden">
                      <div className="bg-amber-400 h-full rounded-full" style={{ width: '31%' }} />
                    </div>
                    <span className="text-[10px] text-amber-400/90 font-medium">Moderate Risk</span>
                  </div>

                  <div className="p-3 rounded-xl bg-slate-950/80 border border-slate-800/90 space-y-1">
                    <div className="flex justify-between items-center text-xs">
                      <span className="text-slate-300 font-semibold">Hypertension</span>
                      <span className="text-emerald-400 font-black">18%</span>
                    </div>
                    <div className="w-full bg-slate-800 h-1.5 rounded-full overflow-hidden">
                      <div className="bg-emerald-400 h-full rounded-full" style={{ width: '18%' }} />
                    </div>
                    <span className="text-[10px] text-emerald-400/90 font-medium">Low Risk</span>
                  </div>

                  <div className="p-3 rounded-xl bg-slate-950/80 border border-slate-800/90 space-y-1">
                    <div className="flex justify-between items-center text-xs">
                      <span className="text-slate-300 font-semibold">Kidney Disease</span>
                      <span className="text-emerald-400 font-black">12%</span>
                    </div>
                    <div className="w-full bg-slate-800 h-1.5 rounded-full overflow-hidden">
                      <div className="bg-emerald-400 h-full rounded-full" style={{ width: '12%' }} />
                    </div>
                    <span className="text-[10px] text-emerald-400/90 font-medium">Low Risk</span>
                  </div>
                </div>
              </div>

              {/* Key Health Indicators (OCR Extracted with Delta) */}
              <div className="space-y-2">
                <div className="flex justify-between items-center text-xs">
                  <span className="font-bold text-slate-300">Key Health Indicators</span>
                  <span className="text-[10px] text-cyan-400">OCR Extracted</span>
                </div>

                <div className="grid grid-cols-2 gap-2 text-[11px]">
                  <div className="p-2.5 rounded-xl bg-slate-950/90 border border-slate-800/80">
                    <p className="text-slate-500 font-medium text-[10px]">Fasting Sugar</p>
                    <div className="flex items-center justify-between mt-0.5">
                      <span className="font-extrabold text-white">108 mg/dL</span>
                      <span className="text-[10px] text-amber-400 font-semibold flex items-center">
                        <ArrowUpRight className="w-3 h-3" /> +6
                      </span>
                    </div>
                  </div>

                  <div className="p-2.5 rounded-xl bg-slate-950/90 border border-slate-800/80">
                    <p className="text-slate-500 font-medium text-[10px]">Blood Pressure</p>
                    <div className="flex items-center justify-between mt-0.5">
                      <span className="font-extrabold text-white">128/82 mmHg</span>
                      <span className="text-[10px] text-slate-400 font-semibold">Stable</span>
                    </div>
                  </div>

                  <div className="p-2.5 rounded-xl bg-slate-950/90 border border-slate-800/80">
                    <p className="text-slate-500 font-medium text-[10px]">Body Mass Index</p>
                    <div className="flex items-center justify-between mt-0.5">
                      <span className="font-extrabold text-white">24.6</span>
                      <span className="text-[10px] text-emerald-400 font-semibold flex items-center">
                        <ArrowDownRight className="w-3 h-3" /> -0.4
                      </span>
                    </div>
                  </div>

                  <div className="p-2.5 rounded-xl bg-slate-950/90 border border-slate-800/80">
                    <p className="text-slate-500 font-medium text-[10px]">Serum Creatinine</p>
                    <div className="flex items-center justify-between mt-0.5">
                      <span className="font-extrabold text-white">0.9 mg/dL</span>
                      <span className="text-[10px] text-emerald-400 font-semibold">Optimal</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* AI Insight snippet */}
              <div className="p-3.5 rounded-2xl bg-cyan-950/30 border border-cyan-500/25 flex items-start space-x-2.5 text-xs">
                <Brain className="w-4 h-4 text-cyan-400 shrink-0 mt-0.5" />
                <div>
                  <p className="font-bold text-cyan-300 text-[11px]">AI Insight & Trend Notice</p>
                  <p className="text-[11px] text-slate-300 leading-snug mt-0.5">
                    Elevated fasting glucose contributes to current diabetes risk. Longitudinal comparison flags a steady
                    upward trend over the last 2 reports.
                  </p>
                </div>
              </div>

              <p className="text-[10px] text-slate-500 text-center italic">
                Sample UI demonstration. AI provides decision support and does not replace clinical diagnosis.
              </p>
            </div>
          </motion.div>
        </div>
      </section>

      {/* Features Section */}
      <section id="features" className="py-20 px-6 bg-slate-950/60 border-y border-slate-800/80">
        <div className="max-w-7xl mx-auto space-y-12">
          <div className="text-center max-w-2xl mx-auto space-y-3">
            <div className="inline-flex items-center space-x-2 px-3 py-1 rounded-full bg-cyan-500/10 border border-cyan-500/30 text-cyan-400 text-xs font-semibold">
              <Layers className="w-3.5 h-3.5" />
              <span>Platform Capabilities</span>
            </div>
            <h2 className="text-3xl font-black text-white">Comprehensive Health Intelligence</h2>
            <p className="text-xs sm:text-sm text-slate-400 leading-relaxed">
              Designed from the ground up for medical document digitization, explainable multi-disease prediction, and
              longitudinal clinical decision support.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {/* Feature 1 */}
            <div className="glass-card p-6 rounded-2xl border border-slate-800 hover:border-cyan-500/40 transition-colors space-y-3">
              <div className="p-3 rounded-xl bg-cyan-500/10 text-cyan-400 border border-cyan-500/20 w-fit">
                <FileSearch className="w-5 h-5" />
              </div>
              <h3 className="text-base font-bold text-white">Medical Report OCR</h3>
              <p className="text-xs text-slate-400 leading-relaxed">
                Upload medical reports, lab documents, and PDFs. High-precision OCR automatically extracts unstructured text
                into raw clinical content.
              </p>
            </div>

            {/* Feature 2 */}
            <div className="glass-card p-6 rounded-2xl border border-slate-800 hover:border-cyan-500/40 transition-colors space-y-3">
              <div className="p-3 rounded-xl bg-teal-500/10 text-teal-400 border border-teal-500/20 w-fit">
                <Microscope className="w-5 h-5" />
              </div>
              <h3 className="text-base font-bold text-white">Intelligent Data Extraction</h3>
              <p className="text-xs text-slate-400 leading-relaxed">
                Converts unstructured diagnostic text into structured parameters including Blood Glucose, Blood Pressure,
                Cholesterol, Creatinine, and BMI.
              </p>
            </div>

            {/* Feature 3 */}
            <div className="glass-card p-6 rounded-2xl border border-slate-800 hover:border-cyan-500/40 transition-colors space-y-3">
              <div className="p-3 rounded-xl bg-brand-500/10 text-brand-400 border border-brand-500/20 w-fit">
                <Brain className="w-5 h-5" />
              </div>
              <h3 className="text-base font-bold text-white">Multi-Disease Risk Prediction</h3>
              <p className="text-xs text-slate-400 leading-relaxed">
                Simultaneously quantifies predictive risk across 4 major non-communicable conditions: Diabetes, Heart Disease,
                Hypertension, and Kidney Disease.
              </p>
            </div>

            {/* Feature 4 */}
            <div className="glass-card p-6 rounded-2xl border border-slate-800 hover:border-cyan-500/40 transition-colors space-y-3">
              <div className="p-3 rounded-xl bg-purple-500/10 text-purple-400 border border-purple-500/20 w-fit">
                <Sparkles className="w-5 h-5" />
              </div>
              <h3 className="text-base font-bold text-white">Explainable AI (XAI)</h3>
              <p className="text-xs text-slate-400 leading-relaxed">
                Understand the "why" behind every score. Transparent factor breakdowns show which physiological parameters
                elevate or mitigate disease risk.
              </p>
            </div>

            {/* Feature 5 */}
            <div className="glass-card p-6 rounded-2xl border border-slate-800 hover:border-cyan-500/40 transition-colors space-y-3">
              <div className="p-3 rounded-xl bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 w-fit">
                <History className="w-5 h-5" />
              </div>
              <h3 className="text-base font-bold text-white">Longitudinal Health Profile</h3>
              <p className="text-xs text-slate-400 leading-relaxed">
                Builds an evolving health record by securely storing confirmed report results and matching new uploads
                against patient history.
              </p>
            </div>

            {/* Feature 6 */}
            <div className="glass-card p-6 rounded-2xl border border-slate-800 hover:border-cyan-500/40 transition-colors space-y-3">
              <div className="p-3 rounded-xl bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 w-fit">
                <GitCompare className="w-5 h-5" />
              </div>
              <h3 className="text-base font-bold text-white">Report Comparison & Deltas</h3>
              <p className="text-xs text-slate-400 leading-relaxed">
                Inspect side-by-side deltas between past and current medical tests to evaluate biomarker trajectories and
                treatment responses.
              </p>
            </div>

            {/* Feature 7 */}
            <div className="glass-card p-6 rounded-2xl border border-slate-800 hover:border-cyan-500/40 transition-colors space-y-3">
              <div className="p-3 rounded-xl bg-pink-500/10 text-pink-400 border border-pink-500/20 w-fit">
                <HeartPulse className="w-5 h-5" />
              </div>
              <h3 className="text-base font-bold text-white">Preventive Health Insights</h3>
              <p className="text-xs text-slate-400 leading-relaxed">
                Provides actionable, understandable preventive lifestyle recommendations tailored to identified risk
                factors before conditions progress.
              </p>
            </div>

            {/* Feature 8 */}
            <div className="glass-card p-6 rounded-2xl border border-slate-800 hover:border-cyan-500/40 transition-colors space-y-3">
              <div className="p-3 rounded-xl bg-amber-500/10 text-amber-400 border border-amber-500/20 w-fit">
                <Stethoscope className="w-5 h-5" />
              </div>
              <h3 className="text-base font-bold text-white">Doctor Decision Support</h3>
              <p className="text-xs text-slate-400 leading-relaxed">
                Assists physicians and care teams with structured biomarker summaries, longitudinal trend lines, and
                evidence-based triage views.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* "How It Works" 5-Step Pipeline Section */}
      <section id="how-it-works" className="py-20 px-6 max-w-7xl mx-auto">
        <div className="space-y-12">
          <div className="text-center max-w-2xl mx-auto space-y-3">
            <div className="inline-flex items-center space-x-2 px-3 py-1 rounded-full bg-teal-500/10 border border-teal-500/30 text-teal-400 text-xs font-semibold">
              <Zap className="w-3.5 h-3.5" />
              <span>End-to-End Workflow</span>
            </div>
            <h2 className="text-3xl font-black text-white">How MedScan-NCD Works</h2>
            <p className="text-xs sm:text-sm text-slate-400 leading-relaxed">
              A 5-step clinical intelligence pipeline turning raw paper or digital lab documents into longitudinal
              preventive insights.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-5 gap-4 relative">
            {/* Step 1 */}
            <div className="glass-card p-5 rounded-2xl border border-slate-800 flex flex-col justify-between space-y-4">
              <div className="space-y-3">
                <div className="w-8 h-8 rounded-xl bg-brand-500/20 text-brand-400 flex items-center justify-center font-black text-xs">
                  01
                </div>
                <h3 className="text-sm font-bold text-white">Upload Medical Report</h3>
                <p className="text-[11px] text-slate-400 leading-relaxed">
                  User uploads a diagnostic lab report photo or PDF document.
                </p>
              </div>
              <div className="text-[10px] text-cyan-400 font-semibold uppercase tracking-wider">
                Step 1 • Ingestion
              </div>
            </div>

            {/* Step 2 */}
            <div className="glass-card p-5 rounded-2xl border border-slate-800 flex flex-col justify-between space-y-4">
              <div className="space-y-3">
                <div className="w-8 h-8 rounded-xl bg-cyan-500/20 text-cyan-400 flex items-center justify-center font-black text-xs">
                  02
                </div>
                <h3 className="text-sm font-bold text-white">OCR & Parameter Extraction</h3>
                <p className="text-[11px] text-slate-400 leading-relaxed">
                  OCR scans text and identifies supported physiological parameters (Glucose, BP, Lipids, etc.).
                </p>
              </div>
              <div className="text-[10px] text-cyan-400 font-semibold uppercase tracking-wider">
                Step 2 • Digitization
              </div>
            </div>

            {/* Step 3 */}
            <div className="glass-card p-5 rounded-2xl border border-slate-800 flex flex-col justify-between space-y-4">
              <div className="space-y-3">
                <div className="w-8 h-8 rounded-xl bg-teal-500/20 text-teal-400 flex items-center justify-center font-black text-xs">
                  03
                </div>
                <h3 className="text-sm font-bold text-white">Data Processing & History Match</h3>
                <p className="text-[11px] text-slate-400 leading-relaxed">
                  Extracted metrics are validated, normalized, and linked to the patient’s historical records.
                </p>
              </div>
              <div className="text-[10px] text-teal-400 font-semibold uppercase tracking-wider">
                Step 3 • Profile Linking
              </div>
            </div>

            {/* Step 4 */}
            <div className="glass-card p-5 rounded-2xl border border-slate-800 flex flex-col justify-between space-y-4">
              <div className="space-y-3">
                <div className="w-8 h-8 rounded-xl bg-purple-500/20 text-purple-400 flex items-center justify-center font-black text-xs">
                  04
                </div>
                <h3 className="text-sm font-bold text-white">AI Multi-Disease Risk Prediction</h3>
                <p className="text-[11px] text-slate-400 leading-relaxed">
                  Machine learning algorithms calculate risk percentages and categories across the 4 major NCDs.
                </p>
              </div>
              <div className="text-[10px] text-purple-400 font-semibold uppercase tracking-wider">
                Step 4 • Predictive Modeling
              </div>
            </div>

            {/* Step 5 */}
            <div className="glass-card p-5 rounded-2xl border border-slate-800 flex flex-col justify-between space-y-4">
              <div className="space-y-3">
                <div className="w-8 h-8 rounded-xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center font-black text-xs">
                  05
                </div>
                <h3 className="text-sm font-bold text-white">Health Insights & Trends</h3>
                <p className="text-[11px] text-slate-400 leading-relaxed">
                  The system displays risk levels, contributing factors, longitudinal curves, and preventive guidance.
                </p>
              </div>
              <div className="text-[10px] text-emerald-400 font-semibold uppercase tracking-wider">
                Step 5 • Preventive Support
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* AI Prediction Section */}
      <section id="ai-prediction" className="py-20 px-6 bg-slate-950/60 border-y border-slate-800/80">
        <div className="max-w-7xl mx-auto space-y-12">
          <div className="text-center max-w-2xl mx-auto space-y-3">
            <div className="inline-flex items-center space-x-2 px-3 py-1 rounded-full bg-brand-500/10 border border-brand-500/30 text-brand-400 text-xs font-semibold">
              <Brain className="w-3.5 h-3.5" />
              <span>Multi-Disease Risk Engine</span>
            </div>
            <h2 className="text-3xl font-black text-white">AI-Powered Multi-Disease Risk Assessment</h2>
            <p className="text-xs sm:text-sm text-slate-400 leading-relaxed">
              MedScan-NCD analyzes relevant health indicators to estimate risk across multiple non-communicable diseases
              and presents the results in an understandable format.
            </p>
          </div>

          {/* 4 Disease Selector Tabs */}
          <div className="flex flex-wrap justify-center gap-3">
            {Object.keys(diseases).map((key) => {
              const d = diseases[key];
              const isSelected = selectedDisease === key;
              return (
                <button
                  key={key}
                  onClick={() => setSelectedDisease(key)}
                  className={`px-5 py-3 rounded-2xl text-xs font-bold transition-all flex items-center space-x-2.5 ${
                    isSelected
                      ? 'bg-gradient-to-r from-brand-500 to-cyan-500 text-white shadow-lg shadow-brand-500/25 border-transparent'
                      : 'bg-slate-900/90 text-slate-400 border border-slate-800 hover:border-slate-700 hover:text-white'
                  }`}
                >
                  <span>{d.name}</span>
                  <span
                    className={`text-[10px] px-2 py-0.5 rounded-full font-extrabold ${
                      isSelected ? 'bg-white/20 text-white' : 'bg-slate-800 text-slate-300'
                    }`}
                  >
                    {d.score}%
                  </span>
                </button>
              );
            })}
          </div>

          {/* Active Disease Detail Card */}
          {(() => {
            const current = diseases[selectedDisease];
            return (
              <div className="glass-card p-8 rounded-3xl border border-slate-800 max-w-4xl mx-auto space-y-6">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-800 pb-6">
                  <div>
                    <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">
                      Disease Risk Evaluation
                    </span>
                    <h3 className="text-2xl font-black text-white mt-1">{current.name}</h3>
                    <p className="text-xs text-slate-400 mt-1 max-w-xl">{current.description}</p>
                  </div>
                  <div className="text-right sm:border-l sm:border-slate-800 sm:pl-6 shrink-0">
                    <span className="text-xs text-slate-500 font-semibold block">Risk Score</span>
                    <div className="text-4xl font-black text-white mt-0.5">{current.score}%</div>
                    <span
                      className={`inline-block text-[11px] px-2.5 py-0.5 rounded-full border font-bold mt-1 ${current.badgeColor}`}
                    >
                      {current.level}
                    </span>
                  </div>
                </div>

                {/* Contributing Biometrics Breakdown */}
                <div className="space-y-3">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400">
                    Key Contributing Biomarkers & Factors
                  </h4>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {current.contributingFactors.map((f, idx) => (
                      <div
                        key={idx}
                        className="p-3.5 rounded-xl bg-slate-950/80 border border-slate-800 flex items-center justify-between text-xs"
                      >
                        <span className="font-semibold text-slate-200">{f.name}</span>
                        <span
                          className={`text-[11px] font-bold ${
                            f.type === 'risk'
                              ? 'text-amber-400'
                              : f.type === 'protective'
                              ? 'text-emerald-400'
                              : 'text-slate-400'
                          }`}
                        >
                          {f.impact}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Protective Factors */}
                <div className="pt-2 border-t border-slate-800/80 flex flex-wrap items-center gap-4 text-xs text-slate-400">
                  <span className="font-bold text-slate-300">Protective Indicators:</span>
                  {current.protectiveFactors.map((item, idx) => (
                    <span key={idx} className="flex items-center space-x-1 text-emerald-400 text-[11px]">
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      <span>{item}</span>
                    </span>
                  ))}
                </div>
              </div>
            );
          })()}
        </div>
      </section>

      {/* Explainable AI (XAI) Section */}
      <section id="explainable-ai" className="py-20 px-6 max-w-7xl mx-auto">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-center">
          <div className="lg:col-span-6 space-y-6">
            <div className="inline-flex items-center space-x-2 px-3 py-1 rounded-full bg-purple-500/10 border border-purple-500/30 text-purple-400 text-xs font-semibold">
              <Sparkles className="w-3.5 h-3.5" />
              <span>Interpretable Machine Learning</span>
            </div>

            <h2 className="text-3xl sm:text-4xl font-black text-white tracking-tight leading-tight">
              Don't Just See the Risk.
              <br />
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-purple-400 to-cyan-400">
                Understand It.
              </span>
            </h2>

            <p className="text-slate-300 text-xs sm:text-sm leading-relaxed">
              Traditional healthcare models often function as opaque black boxes, providing a single percentage without
              context. MedScan-NCD is architected for transparency: it unpacks the risk prediction to display which
              biomarkers contribute towards higher risk, and which metrics act protectively.
            </p>

            <div className="space-y-3 pt-2 text-xs">
              <div className="flex items-start space-x-3">
                <div className="p-1.5 rounded-lg bg-emerald-500/10 text-emerald-400 mt-0.5">
                  <CheckCircle2 className="w-4 h-4" />
                </div>
                <div>
                  <span className="font-bold text-white">Actionable Transparency: </span>
                  <span className="text-slate-400">
                    Patients see which specific lifestyle or dietary changes will have the highest positive impact on
                    reducing their score.
                  </span>
                </div>
              </div>

              <div className="flex items-start space-x-3">
                <div className="p-1.5 rounded-lg bg-cyan-500/10 text-cyan-400 mt-0.5">
                  <CheckCircle2 className="w-4 h-4" />
                </div>
                <div>
                  <span className="font-bold text-white">Clinical Verification: </span>
                  <span className="text-slate-400">
                    Physicians can quickly audit the underlying biometric evidence rather than blindly trusting an AI score.
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Explainable AI Visual Card */}
          <div className="lg:col-span-6">
            <div className="glass-card p-6 rounded-3xl border border-slate-800 space-y-5">
              <div className="flex justify-between items-center border-b border-slate-800 pb-3">
                <div>
                  <h3 className="text-xs font-bold text-white">Factor Attribution Visualizer</h3>
                  <p className="text-[10px] text-slate-400">Diabetes Risk Model • Sample Attribution</p>
                </div>
                <span className="text-[10px] px-2 py-0.5 rounded-md bg-purple-500/20 text-purple-400 border border-purple-500/30 font-bold">
                  24% Low Risk
                </span>
              </div>

              {/* Contributing (Upward Risk Drivers) */}
              <div className="space-y-2">
                <p className="text-[10px] uppercase font-bold text-amber-400 tracking-wider flex items-center space-x-1">
                  <span>Major Contributing Factors (Increasing Risk)</span>
                </p>
                <div className="space-y-2">
                  <div className="p-2.5 rounded-xl bg-slate-950/80 border border-slate-800 flex items-center justify-between text-xs">
                    <span className="text-slate-200">+ Fasting Glucose (108 mg/dL)</span>
                    <span className="text-amber-400 font-bold text-[11px]">+14% attribution</span>
                  </div>
                  <div className="p-2.5 rounded-xl bg-slate-950/80 border border-slate-800 flex items-center justify-between text-xs">
                    <span className="text-slate-200">+ Body Mass Index (24.6)</span>
                    <span className="text-amber-400 font-bold text-[11px]">+6% attribution</span>
                  </div>
                  <div className="p-2.5 rounded-xl bg-slate-950/80 border border-slate-800 flex items-center justify-between text-xs">
                    <span className="text-slate-200">+ Patient Age (46 yrs)</span>
                    <span className="text-amber-400 font-bold text-[11px]">+4% attribution</span>
                  </div>
                </div>
              </div>

              {/* Protective (Lower-risk factors) */}
              <div className="space-y-2 pt-2 border-t border-slate-800/60">
                <p className="text-[10px] uppercase font-bold text-emerald-400 tracking-wider flex items-center space-x-1">
                  <span>Protective Factors (Mitigating Risk)</span>
                </p>
                <div className="space-y-2">
                  <div className="p-2.5 rounded-xl bg-slate-950/80 border border-slate-800 flex items-center justify-between text-xs">
                    <span className="text-slate-200">• Controlled Blood Pressure (120/80 mmHg)</span>
                    <span className="text-emerald-400 font-bold text-[11px]">-8% mitigation</span>
                  </div>
                  <div className="p-2.5 rounded-xl bg-slate-950/80 border border-slate-800 flex items-center justify-between text-xs">
                    <span className="text-slate-200">• Healthy Serum Creatinine (0.9 mg/dL)</span>
                    <span className="text-emerald-400 font-bold text-[11px]">-5% mitigation</span>
                  </div>
                </div>
              </div>

              <p className="text-[10px] text-slate-500 text-center italic">
                Sample interpretability demonstration. Clinical values shown for conceptual visualization.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Dedicated Longitudinal Health Intelligence Section */}
      <section id="health-intelligence" className="py-20 px-6 bg-slate-950/60 border-y border-slate-800/80">
        <div className="max-w-7xl mx-auto space-y-12">
          <div className="text-center max-w-3xl mx-auto space-y-3">
            <div className="inline-flex items-center space-x-2 px-3 py-1 rounded-full bg-cyan-500/10 border border-cyan-500/30 text-cyan-400 text-xs font-semibold">
              <History className="w-3.5 h-3.5" />
              <span>Evolving Patient Health Profiles</span>
            </div>
            <h2 className="text-3xl font-black text-white">From One Report to Your Health Journey</h2>
            <p className="text-xs sm:text-sm text-slate-400 leading-relaxed">
              MedScan-NCD does not treat every medical report as an isolated prediction. It builds an evolving patient
              health profile by comparing current health information with previous results to support longitudinal risk
              assessment.
            </p>
          </div>

          {/* Longitudinal Progression Visualizer */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Report 1 */}
            <div className="glass-card p-6 rounded-2xl border border-slate-800 space-y-4">
              <div className="flex justify-between items-center border-b border-slate-800 pb-3">
                <span className="text-xs font-bold text-white">Report 1</span>
                <span className="text-[10px] text-slate-400">Jan 2026 • Baseline</span>
              </div>
              <div className="space-y-2 text-xs">
                <div className="flex justify-between py-1 border-b border-slate-900">
                  <span className="text-slate-400">Fasting Glucose</span>
                  <span className="font-bold text-white">102 mg/dL</span>
                </div>
                <div className="flex justify-between py-1 border-b border-slate-900">
                  <span className="text-slate-400">Blood Pressure</span>
                  <span className="font-bold text-white">130/84 mmHg</span>
                </div>
                <div className="flex justify-between py-1 border-b border-slate-900">
                  <span className="text-slate-400">Serum Creatinine</span>
                  <span className="font-bold text-white">0.88 mg/dL</span>
                </div>
                <div className="flex justify-between py-1">
                  <span className="text-slate-400">Total Cholesterol</span>
                  <span className="font-bold text-white">190 mg/dL</span>
                </div>
              </div>
              <div className="p-2.5 rounded-xl bg-slate-900/80 text-[10px] text-slate-400 text-center">
                Initial baseline established
              </div>
            </div>

            {/* Report 2 */}
            <div className="glass-card p-6 rounded-2xl border border-slate-800 space-y-4">
              <div className="flex justify-between items-center border-b border-slate-800 pb-3">
                <span className="text-xs font-bold text-white">Report 2</span>
                <span className="text-[10px] text-slate-400">May 2026 • +4 Months</span>
              </div>
              <div className="space-y-2 text-xs">
                <div className="flex justify-between py-1 border-b border-slate-900">
                  <span className="text-slate-400">Fasting Glucose</span>
                  <span className="font-bold text-amber-400 flex items-center">
                    110 mg/dL <ArrowUpRight className="w-3.5 h-3.5 ml-1" />
                  </span>
                </div>
                <div className="flex justify-between py-1 border-b border-slate-900">
                  <span className="text-slate-400">Blood Pressure</span>
                  <span className="font-bold text-emerald-400 flex items-center">
                    128/82 mmHg <ArrowDownRight className="w-3.5 h-3.5 ml-1" />
                  </span>
                </div>
                <div className="flex justify-between py-1 border-b border-slate-900">
                  <span className="text-slate-400">Serum Creatinine</span>
                  <span className="font-bold text-white">0.89 mg/dL</span>
                </div>
                <div className="flex justify-between py-1">
                  <span className="text-slate-400">Total Cholesterol</span>
                  <span className="font-bold text-white">192 mg/dL</span>
                </div>
              </div>
              <div className="p-2.5 rounded-xl bg-amber-500/10 text-[10px] text-amber-400 text-center border border-amber-500/20">
                Early glycemic elevation detected (+8 mg/dL)
              </div>
            </div>

            {/* Report 3 (Latest) */}
            <div className="glass-card p-6 rounded-2xl border border-cyan-500/40 bg-cyan-950/10 space-y-4 shadow-xl shadow-cyan-500/5">
              <div className="flex justify-between items-center border-b border-slate-800 pb-3">
                <span className="text-xs font-bold text-cyan-300">Report 3 (Current)</span>
                <span className="text-[10px] text-cyan-400 font-semibold">Sep 2026 • Latest</span>
              </div>
              <div className="space-y-2 text-xs">
                <div className="flex justify-between py-1 border-b border-slate-900">
                  <span className="text-slate-400">Fasting Glucose</span>
                  <span className="font-bold text-amber-400 flex items-center">
                    118 mg/dL <ArrowUpRight className="w-3.5 h-3.5 ml-1" />
                  </span>
                </div>
                <div className="flex justify-between py-1 border-b border-slate-900">
                  <span className="text-slate-400">Blood Pressure</span>
                  <span className="font-bold text-emerald-400 flex items-center">
                    126/80 mmHg <ArrowDownRight className="w-3.5 h-3.5 ml-1" />
                  </span>
                </div>
                <div className="flex justify-between py-1 border-b border-slate-900">
                  <span className="text-slate-400">Serum Creatinine</span>
                  <span className="font-bold text-white">0.90 mg/dL</span>
                </div>
                <div className="flex justify-between py-1">
                  <span className="text-slate-400">Total Cholesterol</span>
                  <span className="font-bold text-white">194 mg/dL</span>
                </div>
              </div>
              <div className="p-2.5 rounded-xl bg-cyan-500/10 text-[10px] text-cyan-400 text-center border border-cyan-500/20 font-bold">
                Longitudinal insight: +16 mg/dL over 8 months
              </div>
            </div>
          </div>

          {/* Longitudinal Philosophy Explanatory Card */}
          <div className="p-6 rounded-2xl bg-slate-900/90 border border-slate-800 flex flex-col md:flex-row items-center justify-between gap-6 text-xs">
            <div className="space-y-1.5 max-w-2xl">
              <h4 className="text-sm font-extrabold text-white">Why Longitudinal Tracking Matters</h4>
              <p className="text-slate-400 leading-relaxed text-[11px]">
                A single fasting glucose reading of 118 mg/dL might appear as mild pre-diabetes. But knowing it increased
                from 102 → 110 → 118 across three consecutive tests alerts patients and doctors to an active upward trajectory,
                enabling timely preventive lifestyle interventions before chronic disease manifests.
              </p>
            </div>
            <div className="shrink-0 flex items-center space-x-2 text-[11px] font-bold text-cyan-400 bg-cyan-950/40 px-4 py-2 rounded-xl border border-cyan-500/30">
              <TrendingUp className="w-4 h-4" />
              <span>Current Health + Previous Health History</span>
            </div>
          </div>
        </div>
      </section>

      {/* Patient + Doctor Value Section */}
      <section className="py-20 px-6 max-w-7xl mx-auto">
        <div className="space-y-12">
          <div className="text-center max-w-2xl mx-auto space-y-3">
            <h2 className="text-3xl font-black text-white">Empowering Patients and Clinicians</h2>
            <p className="text-xs sm:text-sm text-slate-400 leading-relaxed">
              Designed to bridge communication between individuals managing their health and the medical teams supporting them.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            {/* For Patients */}
            <div className="glass-card p-8 rounded-3xl border border-slate-800 space-y-6">
              <div className="flex items-center space-x-3">
                <div className="p-3 rounded-2xl bg-brand-500/10 text-brand-400 border border-brand-500/20">
                  <UserCheck className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-white">For Patients</h3>
                  <p className="text-xs text-slate-400">Clarity, early awareness, and health empowerment</p>
                </div>
              </div>

              <ul className="space-y-3 text-xs text-slate-300">
                <li className="flex items-start space-x-3">
                  <CheckCircle2 className="w-4 h-4 text-cyan-400 shrink-0 mt-0.5" />
                  <span>
                    <strong className="text-white">Understand medical reports:</strong> Complex laboratory numbers translated
                    into intuitive, readable summaries.
                  </span>
                </li>
                <li className="flex items-start space-x-3">
                  <CheckCircle2 className="w-4 h-4 text-cyan-400 shrink-0 mt-0.5" />
                  <span>
                    <strong className="text-white">AI-assisted risk insights:</strong> Early risk indications across major NCDs
                    before acute symptoms develop.
                  </span>
                </li>
                <li className="flex items-start space-x-3">
                  <CheckCircle2 className="w-4 h-4 text-cyan-400 shrink-0 mt-0.5" />
                  <span>
                    <strong className="text-white">Track longitudinal health:</strong> Build a unified health journey across
                    different clinics and diagnostic labs.
                  </span>
                </li>
                <li className="flex items-start space-x-3">
                  <CheckCircle2 className="w-4 h-4 text-cyan-400 shrink-0 mt-0.5" />
                  <span>
                    <strong className="text-white">Report comparison:</strong> See how health parameters change over time with
                    visual delta comparisons.
                  </span>
                </li>
                <li className="flex items-start space-x-3">
                  <CheckCircle2 className="w-4 h-4 text-cyan-400 shrink-0 mt-0.5" />
                  <span>
                    <strong className="text-white">Preventive guidance:</strong> Receive lifestyle insights to manage key risk
                    drivers proactively.
                  </span>
                </li>
              </ul>
            </div>

            {/* For Doctors */}
            <div className="glass-card p-8 rounded-3xl border border-slate-800 space-y-6">
              <div className="flex items-center space-x-3">
                <div className="p-3 rounded-2xl bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                  <Stethoscope className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-white">For Doctors & Care Teams</h3>
                  <p className="text-xs text-slate-400">Streamlined reviews and evidence-based decision support</p>
                </div>
              </div>

              <ul className="space-y-3 text-xs text-slate-300">
                <li className="flex items-start space-x-3">
                  <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                  <span>
                    <strong className="text-white">Structured medical data:</strong> Rapidly review OCR-extracted physiological
                    parameters without manual data entry.
                  </span>
                </li>
                <li className="flex items-start space-x-3">
                  <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                  <span>
                    <strong className="text-white">Clinical decision support:</strong> AI-assisted multi-disease risk
                    evaluations to complement medical expertise.
                  </span>
                </li>
                <li className="flex items-start space-x-3">
                  <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                  <span>
                    <strong className="text-white">Explainable biomarkers:</strong> Inspect exactly which laboratory metrics
                    contributed to the risk assessment.
                  </span>
                </li>
                <li className="flex items-start space-x-3">
                  <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                  <span>
                    <strong className="text-white">Longitudinal patient history:</strong> Track chronologic trends across multiple
                    consultations and laboratory tests.
                  </span>
                </li>
                <li className="flex items-start space-x-3">
                  <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                  <span>
                    <strong className="text-white">Efficient clinical triage:</strong> Identify patients requiring closer
                    preventive monitoring faster.
                  </span>
                </li>
              </ul>
            </div>
          </div>
        </div>
      </section>

      {/* Emergency & Critical Care Roadmap (Future Scope) */}
      <section className="py-16 px-6 bg-slate-950/60 border-y border-slate-800/80">
        <div className="max-w-7xl mx-auto space-y-8">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <div className="inline-flex items-center space-x-2 px-3 py-1 rounded-full bg-amber-500/10 border border-amber-500/30 text-amber-400 text-xs font-semibold mb-2">
                <Building2 className="w-3.5 h-3.5" />
                <span>Future Scope & Clinical Roadmap</span>
              </div>
              <h2 className="text-2xl font-black text-white">Emergency & Hospital Network Integrations</h2>
              <p className="text-xs text-slate-400 mt-1 max-w-xl">
                Planned capabilities designed to connect preventive health analytics with acute healthcare infrastructure.
              </p>
            </div>
            <span className="text-[11px] px-3 py-1 rounded-xl bg-slate-900 border border-slate-800 text-slate-400 font-semibold w-fit">
              Roadmap Feature Preview
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="p-4 rounded-2xl bg-slate-900/60 border border-slate-800 space-y-2">
              <div className="p-2 rounded-xl bg-slate-800 text-amber-400 w-fit">
                <AlertTriangle className="w-4 h-4" />
              </div>
              <h3 className="text-xs font-bold text-white">Emergency SOS Support</h3>
              <p className="text-[11px] text-slate-400 leading-relaxed">
                Automated critical vitals threshold triggers notifying emergency contacts and linked clinicians.
              </p>
            </div>

            <div className="p-4 rounded-2xl bg-slate-900/60 border border-slate-800 space-y-2">
              <div className="p-2 rounded-xl bg-slate-800 text-amber-400 w-fit">
                <Building2 className="w-4 h-4" />
              </div>
              <h3 className="text-xs font-bold text-white">Hospital Recommendations</h3>
              <p className="text-[11px] text-slate-400 leading-relaxed">
                Smart recommendations of nearby specialized facilities based on identified risk indicators.
              </p>
            </div>

            <div className="p-4 rounded-2xl bg-slate-900/60 border border-slate-800 space-y-2">
              <div className="p-2 rounded-xl bg-slate-800 text-amber-400 w-fit">
                <Activity className="w-4 h-4" />
              </div>
              <h3 className="text-xs font-bold text-white">ICU & Bed Availability</h3>
              <p className="text-[11px] text-slate-400 leading-relaxed">
                Future API connectivity with hospital management networks for critical care capacity queries.
              </p>
            </div>

            <div className="p-4 rounded-2xl bg-slate-900/60 border border-slate-800 space-y-2">
              <div className="p-2 rounded-xl bg-slate-800 text-amber-400 w-fit">
                <HeartPulse className="w-4 h-4" />
              </div>
              <h3 className="text-xs font-bold text-white">Ambulance Routing</h3>
              <p className="text-[11px] text-slate-400 leading-relaxed">
                Location-aware routing integration for immediate dispatch assistance during acute events.
              </p>
            </div>
          </div>

          <p className="text-[10px] text-slate-500 text-center italic">
            Notice: Emergency and hospital network features represent future architectural milestones. No mock emergency services
            are presented as real-time active data.
          </p>
        </div>
      </section>

      {/* FAQ Accordion Section */}
      <section id="faq" className="py-20 px-6 max-w-4xl mx-auto space-y-10">
        <div className="text-center space-y-3">
          <div className="inline-flex items-center space-x-2 px-3 py-1 rounded-full bg-cyan-500/10 border border-cyan-500/30 text-cyan-400 text-xs font-semibold">
            <Sparkles className="w-3.5 h-3.5" />
            <span>Common Questions</span>
          </div>
          <h2 className="text-3xl font-black text-white">Frequently Asked Questions</h2>
          <p className="text-xs text-slate-400">Everything you need to know about MedScan-NCD and AI risk assessment.</p>
        </div>

        <div className="space-y-3.5">
          {faqs.map((faq, idx) => (
            <div key={idx} className="glass-card rounded-2xl border border-slate-800 overflow-hidden transition-colors">
              <button
                onClick={() => setActiveFaq(activeFaq === idx ? null : idx)}
                className="w-full p-5 text-left flex items-center justify-between text-xs sm:text-sm font-bold text-white hover:text-cyan-400 transition-colors"
              >
                <span>{faq.q}</span>
                <ChevronDown
                  className={`w-4 h-4 text-slate-400 shrink-0 ml-4 transition-transform ${
                    activeFaq === idx ? 'rotate-180 text-cyan-400' : ''
                  }`}
                />
              </button>
              {activeFaq === idx && (
                <div className="p-5 pt-0 text-xs text-slate-400 leading-relaxed border-t border-slate-800/60 mt-1">
                  {faq.a}
                </div>
              )}
            </div>
          ))}
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 px-6 max-w-7xl mx-auto">
        <div className="glass-card p-10 sm:p-14 rounded-3xl border border-slate-800 relative overflow-hidden text-center space-y-6">
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[250px] bg-brand-500/15 blur-[120px] pointer-events-none rounded-full" />

          <div className="relative z-10 max-w-2xl mx-auto space-y-4">
            <h2 className="text-3xl sm:text-4xl font-black text-white tracking-tight">
              Start Understanding Your Health Reports
            </h2>
            <p className="text-xs sm:text-sm text-slate-300 leading-relaxed">
              Upload your medical report and explore AI-powered health insights with MedScan-NCD. Build your evolving
              health profile today.
            </p>

            <div className="flex flex-wrap items-center justify-center gap-4 pt-4">
              <Link
                to="/register"
                className="px-6 py-3.5 text-xs font-extrabold text-white bg-gradient-to-r from-brand-500 to-cyan-500 hover:from-brand-600 hover:to-cyan-600 rounded-2xl shadow-xl shadow-brand-500/25 flex items-center space-x-2 transition-all"
              >
                <span>Get Started Free</span>
                <ArrowRight className="w-4 h-4" />
              </Link>
              <a
                href="#ai-prediction"
                onClick={(e) => scrollToSection(e, 'ai-prediction')}
                className="px-6 py-3.5 text-xs font-bold text-slate-300 bg-slate-900 border border-slate-800 hover:border-slate-700 hover:text-white rounded-2xl transition-all"
              >
                Explore Platform Demo
              </a>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-12 px-6 border-t border-slate-800/80 bg-slate-950 text-xs text-slate-400">
        <div className="max-w-7xl mx-auto space-y-8">
          <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
            <div className="space-y-2">
              <div className="flex items-center space-x-3">
                <div className="p-2 rounded-xl bg-gradient-to-tr from-brand-600 to-cyan-400 text-white shadow-lg shadow-cyan-500/20">
                  <FileSearch className="w-5 h-5" />
                </div>
                <span className="text-base font-extrabold text-white tracking-tight">
                  MedScan<span className="text-brand-400">-NCD</span>
                </span>
              </div>
              <p className="text-[11px] text-slate-400 max-w-sm">
                AI-powered medical report analysis and preventive health intelligence for multi-disease risk assessment.
              </p>
            </div>

            <div className="flex flex-wrap gap-8 text-[11px]">
              <div>
                <p className="font-bold text-white mb-2">Product</p>
                <div className="space-y-1.5">
                  <a href="#features" onClick={(e) => scrollToSection(e, 'features')} className="block hover:text-cyan-400 transition-colors">
                    Features
                  </a>
                  <a href="#how-it-works" onClick={(e) => scrollToSection(e, 'how-it-works')} className="block hover:text-cyan-400 transition-colors">
                    How It Works
                  </a>
                  <a href="#ai-prediction" onClick={(e) => scrollToSection(e, 'ai-prediction')} className="block hover:text-cyan-400 transition-colors">
                    AI Prediction
                  </a>
                  <a href="#health-intelligence" onClick={(e) => scrollToSection(e, 'health-intelligence')} className="block hover:text-cyan-400 transition-colors">
                    Health Intelligence
                  </a>
                  <a href="#faq" onClick={(e) => scrollToSection(e, 'faq')} className="block hover:text-cyan-400 transition-colors">
                    FAQ
                  </a>
                </div>
              </div>

              <div>
                <p className="font-bold text-white mb-2">Platform Roles</p>
                <div className="space-y-1.5">
                  <Link to="/login" className="block hover:text-cyan-400 transition-colors">
                    Patient Portal
                  </Link>
                  <Link to="/login" className="block hover:text-cyan-400 transition-colors">
                    Doctor Portal
                  </Link>
                  <Link to="/login" className="block hover:text-cyan-400 transition-colors">
                    Nurse Portal
                  </Link>
                  <Link to="/login" className="block hover:text-cyan-400 transition-colors">
                    CHO Portal
                  </Link>
                </div>
              </div>
            </div>
          </div>

          {/* Medical Safety Disclaimer */}
          <div className="p-4 rounded-xl bg-slate-900/60 border border-slate-800/80 text-[10px] text-slate-400 leading-relaxed">
            <p className="font-bold text-slate-300 mb-1">Medical Decision Support Disclaimer:</p>
            <p>
              MedScan-NCD is an AI-assisted decision-support platform intended solely for educational, informational, and
              preventive risk assessment purposes. It is NOT a diagnostic device, does not provide medical diagnoses, and
              should never replace clinical evaluation, consultation, diagnosis, or treatment by a qualified healthcare professional.
            </p>
          </div>

          <div className="flex flex-col sm:flex-row items-center justify-between text-[11px] text-slate-500 pt-4 border-t border-slate-900">
            <p>© 2026 MedScan-NCD. All rights reserved.</p>
            <p>OCR-Based Medical Report Analysis & Multi-Disease Risk Prediction</p>
          </div>
        </div>
      </footer>
    </div>
  );
};
