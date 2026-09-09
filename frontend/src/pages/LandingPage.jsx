import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  Activity,
  Pill,
  Brain,
  Wifi,
  ChevronDown,
  ArrowRight,
  FileCheck2,
  Cpu,
  LayoutDashboard,
} from 'lucide-react';
import { useAuth } from '../hooks/useAuth';

export const LandingPage = () => {
  const { user, role } = useAuth();
  const [activeFaq, setActiveFaq] = useState(null);

  const scrollToSection = (e, sectionId) => {
    e.preventDefault();
    const element = document.getElementById(sectionId);
    if (element) {
      element.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  };

  const faqs = [
    {
      q: 'How does the Smart Medicine Box IoT integration work?',
      a: 'The ESP32 microcontroller inside the smart medicine pillbox detects when a compartment is opened or closed and transmits a JSON payload to our backend REST API (/api/iot/medicine-status). If a dose is missed, automated notifications are immediately dispatched to the patient, doctor, and family members.',
    },
    {
      q: 'What algorithm powers the AI Disease Risk Prediction?',
      a: 'In Phase 1, our system utilizes a rule-based weighted risk calculation algorithm based on medical guidelines for Fasting Sugar, Blood Pressure, BMI, Age, and Symptom clusters. The architecture is modularly built so a Python microservice trained on ML models can be plugged in via HTTP without modifying existing code.',
    },
    {
      q: 'How does Tesseract.js OCR report parsing work?',
      a: 'When a patient or doctor uploads a lab report photo or PDF, our Node-native Tesseract.js OCR worker extracts raw text and parses key physiological markers (like Fasting Glucose or Blood Pressure) into structured JSON format in MongoDB.',
    },
    {
      q: 'Can family members monitor missed medicines remotely?',
      a: 'Yes! Family members assigned to a patient log into their dedicated Family Dashboard to view real-time adherence logs and receive instant emergency or missed dose notifications.',
    },
  ];

  return (
    <div className="min-h-screen bg-[#0b1329] text-slate-100 overflow-x-hidden">
      {/* Top Navbar */}
      <header className="sticky top-0 z-50 glass-panel border-b border-slate-800/80 px-6 py-4">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <Link to="/" className="flex items-center space-x-3">
            <div className="p-2.5 rounded-xl bg-gradient-to-tr from-brand-600 to-cyan-400 text-white shadow-lg shadow-cyan-500/20">
              <Activity className="w-6 h-6" />
            </div>
            <span className="text-xl font-extrabold text-white tracking-tight">
              Smart<span className="text-brand-400">Health</span>
            </span>
          </Link>

          {/* Nav links to page sections */}
          <div className="hidden md:flex items-center space-x-8 text-xs font-semibold text-slate-300">
            <a href="#features" onClick={(e) => scrollToSection(e, 'features')} className="hover:text-cyan-400 transition-colors">
              Features
            </a>
            <a href="#ai-prediction" onClick={(e) => scrollToSection(e, 'ai-prediction')} className="hover:text-cyan-400 transition-colors">
              AI Prediction
            </a>
            <a href="#iot-box" onClick={(e) => scrollToSection(e, 'iot-box')} className="hover:text-cyan-400 transition-colors">
              IoT Integration
            </a>
            <a href="#faq" onClick={(e) => scrollToSection(e, 'faq')} className="hover:text-cyan-400 transition-colors">
              FAQ
            </a>
          </div>

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
                  className="px-4 py-2 text-xs font-bold text-white bg-brand-500 hover:bg-brand-600 shadow-lg shadow-brand-500/25 rounded-xl transition-all"
                >
                  Get Started
                </Link>
              </>
            )}
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="relative pt-20 pb-28 px-6 overflow-hidden">
        <div className="absolute top-10 left-1/2 -translate-x-1/2 w-[700px] h-[350px] bg-brand-500/15 blur-[140px] pointer-events-none rounded-full" />

        <div className="max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-2 gap-12 items-center relative z-10">
          <motion.div initial={{ opacity: 0, x: -30 }} animate={{ opacity: 1, x: 0 }} transition={{ duration: 0.6 }}>
            <div className="inline-flex items-center space-x-2 px-3 py-1 rounded-full bg-brand-500/10 border border-brand-500/30 text-brand-400 text-xs font-semibold mb-6">
              <Wifi className="w-3.5 h-3.5 animate-pulse" />
              <span>Next-Gen IoT & AI Healthcare Platform</span>
            </div>

            <h1 className="text-4xl sm:text-5xl lg:text-6xl font-black text-white tracking-tight leading-[1.1]">
              Smart Medicine Reminders & <span className="text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-teal-300">AI Risk Prediction</span>
            </h1>

            <p className="text-slate-400 text-sm sm:text-base mt-6 leading-relaxed max-w-xl">
              An interactive healthcare platform connecting Patients, Doctors, Family members, Nurses, and CHOs with automated IoT medicine telemetry, Tesseract.js OCR lab report extraction, and predictive disease risk analytics.
            </p>

            <div className="flex flex-wrap items-center gap-4 mt-8">
              <Link
                to="/login"
                className="px-6 py-3.5 text-xs font-extrabold text-white bg-gradient-to-r from-brand-500 to-cyan-500 hover:from-brand-600 hover:to-cyan-600 rounded-2xl shadow-xl shadow-brand-500/30 flex items-center space-x-2 transition-all"
              >
                <span>Launch Interactive Demo</span>
                <ArrowRight className="w-4 h-4" />
              </Link>
              <Link
                to="/login"
                className="px-6 py-3.5 text-xs font-bold text-slate-300 bg-slate-900 border border-slate-800 hover:border-slate-700 rounded-2xl transition-all"
              >
                Explore Demo Roles
              </Link>
            </div>
          </motion.div>

          {/* Hero Visual Card */}
          <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} transition={{ duration: 0.6 }} className="relative">
            <div className="glass-card p-6 rounded-3xl border border-slate-800 shadow-2xl relative z-10 space-y-6">
              <div className="flex items-center justify-between border-b border-slate-800/80 pb-4">
                <div className="flex items-center space-x-3">
                  <div className="w-3 h-3 rounded-full bg-rose-500 animate-ping" />
                  <span className="text-xs font-bold text-white">Live Patient Telemetry Sync</span>
                </div>
                <span className="text-[10px] px-2.5 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 font-bold uppercase">
                  Active ESP32 Box
                </span>
              </div>

              {/* Stat Pill Grid */}
              <div className="grid grid-cols-2 gap-4">
                <div className="p-4 rounded-2xl bg-slate-950/80 border border-slate-800">
                  <p className="text-[10px] uppercase font-bold text-slate-500">Adherence Score</p>
                  <p className="text-2xl font-black text-emerald-400 mt-1">94.8%</p>
                </div>
                <div className="p-4 rounded-2xl bg-slate-950/80 border border-slate-800">
                  <p className="text-[10px] uppercase font-bold text-slate-500">AI Risk Rating</p>
                  <p className="text-2xl font-black text-amber-400 mt-1">Low (28%)</p>
                </div>
              </div>

              {/* Medicine Notification Snippet */}
              <div className="p-4 rounded-2xl bg-slate-950 border border-brand-500/30 flex items-center space-x-3">
                <Pill className="w-6 h-6 text-brand-400 shrink-0" />
                <div>
                  <p className="text-xs font-bold text-white">Metformin 500mg (Morning Dose)</p>
                  <p className="text-[11px] text-slate-400">Recorded via ESP32 Smart Medicine Box • 9:00 AM</p>
                </div>
              </div>
            </div>
          </motion.div>
        </div>
      </section>

      {/* Core Features Grid Section */}
      <section id="features" className="py-20 px-6 bg-slate-950/60 border-y border-slate-800/80">
        <div className="max-w-7xl mx-auto space-y-12">
          <div className="text-center max-w-2xl mx-auto">
            <h2 className="text-3xl font-black text-white">Core System Features</h2>
            <p className="text-xs text-slate-400 mt-2">End-to-end telemetry and clinical decision support for multi-role care teams.</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="glass-card p-6 rounded-2xl border border-slate-800">
              <div className="p-3 rounded-xl bg-brand-500/10 text-brand-400 border border-brand-500/20 w-fit mb-4">
                <Brain className="w-6 h-6" />
              </div>
              <h3 className="text-base font-bold text-white mb-2">AI Risk Assessment</h3>
              <p className="text-xs text-slate-400 leading-relaxed">
                Calculates percentage scores for Diabetes, Hypertension, Heart, and Kidney diseases using physiological vitals and symptom clusters.
              </p>
            </div>

            <div className="glass-card p-6 rounded-2xl border border-slate-800">
              <div className="p-3 rounded-xl bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 w-fit mb-4">
                <Wifi className="w-6 h-6" />
              </div>
              <h3 className="text-base font-bold text-white mb-2">IoT Medicine Reminder</h3>
              <p className="text-xs text-slate-400 leading-relaxed">
                ESP32 pillbox telemetry synchronizes medication status automatically and alerts linked family members when a dose is missed.
              </p>
            </div>

            <div className="glass-card p-6 rounded-2xl border border-slate-800">
              <div className="p-3 rounded-xl bg-purple-500/10 text-purple-400 border border-purple-500/20 w-fit mb-4">
                <FileCheck2 className="w-6 h-6" />
              </div>
              <h3 className="text-base font-bold text-white mb-2">Tesseract OCR Reader</h3>
              <p className="text-xs text-slate-400 leading-relaxed">
                Scans uploaded lab report images and extracts key metrics like Fasting Glucose and Blood Pressure into structured database records.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* AI Prediction Feature Showcase Section */}
      <section id="ai-prediction" className="py-20 px-6 max-w-7xl mx-auto">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
          <div>
            <div className="inline-flex items-center space-x-2 px-3 py-1 rounded-full bg-cyan-500/10 border border-cyan-500/30 text-cyan-400 text-xs font-semibold mb-4">
              <Brain className="w-3.5 h-3.5" />
              <span>Predictive Clinical Scoring Engine</span>
            </div>
            <h2 className="text-3xl font-black text-white">AI-Powered Disease Risk Assessment</h2>
            <p className="text-xs text-slate-400 mt-4 leading-relaxed">
              Our clinical scoring model processes physiological parameters including Fasting Glucose, Blood Pressure, Body Mass Index (BMI), Age, and symptomatic clusters to quantify individual multi-disease risk percentage.
            </p>
            <div className="mt-6 space-y-3">
              <div className="p-3.5 rounded-xl bg-slate-900 border border-slate-800 flex items-center justify-between text-xs">
                <span className="font-bold text-white">Diabetes Risk Model</span>
                <span className="text-cyan-400 font-bold">72% Risk (High)</span>
              </div>
              <div className="p-3.5 rounded-xl bg-slate-900 border border-slate-800 flex items-center justify-between text-xs">
                <span className="font-bold text-white">Hypertension Risk Model</span>
                <span className="text-amber-400 font-bold">68% Risk (Moderate)</span>
              </div>
              <div className="p-3.5 rounded-xl bg-slate-900 border border-slate-800 flex items-center justify-between text-xs">
                <span className="font-bold text-white">Cardiovascular Heart Risk</span>
                <span className="text-emerald-400 font-bold">45% Risk (Low)</span>
              </div>
            </div>
          </div>

          <div className="glass-card p-6 rounded-3xl border border-slate-800 text-center space-y-4">
            <h3 className="text-sm font-extrabold text-white">Interactive AI Risk Simulation</h3>
            <div className="w-40 h-40 mx-auto rounded-full border-8 border-brand-500/30 flex items-center justify-center flex-col">
              <span className="text-3xl font-black text-white">68%</span>
              <span className="text-[10px] uppercase font-bold text-amber-400">High Risk</span>
            </div>
            <p className="text-xs text-slate-400">Automated AI recommendations sent to Doctor & Patient</p>
          </div>
        </div>
      </section>

      {/* IoT Integration Feature Showcase Section */}
      <section id="iot-box" className="py-20 px-6 bg-slate-950/60 border-y border-slate-800/80">
        <div className="max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
          <div className="glass-card p-6 rounded-3xl border border-slate-800 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div className="flex items-center space-x-2">
                <Cpu className="w-5 h-5 text-emerald-400" />
                <span className="text-xs font-bold text-white">ESP32 Smart Box Telemetry Engine</span>
              </div>
              <span className="text-[10px] text-emerald-400 font-mono">STATUS: ONLINE</span>
            </div>
            <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 font-mono text-[11px] text-slate-300 leading-relaxed">
              {`POST /api/iot/medicine-status HTTP/1.1
Host: api.smarthealth.org
Payload: {
  "deviceId": "ESP32_SMARTBOX_01",
  "patientId": "65d83f...",
  "status": "Taken",
  "timestamp": "2026-08-17T09:00:00Z"
}`}
            </div>
          </div>

          <div>
            <div className="inline-flex items-center space-x-2 px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-xs font-semibold mb-4">
              <Wifi className="w-3.5 h-3.5" />
              <span>Real-Time Telemetry Hardware Sync</span>
            </div>
            <h2 className="text-3xl font-black text-white">ESP32 Smart Medicine Pillbox</h2>
            <p className="text-xs text-slate-400 mt-4 leading-relaxed">
              Equipped with magnetic reed sensors and Wi-Fi modules, our hardware smart box detects compartment access events in real time. Missed dose events trigger instant multi-channel alerts to linked caregivers.
            </p>
          </div>
        </div>
      </section>

      {/* FAQ Accordion Section */}
      <section id="faq" className="py-20 px-6 max-w-4xl mx-auto">
        <h2 className="text-3xl font-black text-white text-center mb-10">Frequently Asked Questions</h2>
        <div className="space-y-4">
          {faqs.map((faq, idx) => (
            <div key={idx} className="glass-card rounded-2xl border border-slate-800 overflow-hidden">
              <button
                onClick={() => setActiveFaq(activeFaq === idx ? null : idx)}
                className="w-full p-5 text-left flex items-center justify-between text-sm font-bold text-white"
              >
                <span>{faq.q}</span>
                <ChevronDown className={`w-4 h-4 text-slate-400 transition-transform ${activeFaq === idx ? 'rotate-180' : ''}`} />
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

      {/* Footer */}
      <footer className="py-8 px-6 border-t border-slate-800 text-center text-xs text-slate-500">
        <p>© 2026 AI-Based IoT Smart Healthcare System. Built with React, Express, MongoDB, and Tesseract.js.</p>
      </footer>
    </div>
  );
};
