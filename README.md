# 📱 MediSnap - AI Healthcare Companion

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![TypeScript](https://img.shields.io/badge/TypeScript-98.2%25-blue)](https://www.typescriptlang.org/)
[![Built with Vite](https://img.shields.io/badge/Built%20with-Vite-646CFF.svg)](https://vitejs.dev/)

**MediSnap** is an AI-powered healthcare application built to bridge the doctor-patient language gap in Pakistan. Scan medicine labels, decode prescriptions, track symptoms via voice (Urdu/English), and generate professional health reports.

🏆 **Built in 6 hours** at the **iterate'26 Hackathon** (Salim Habib University, May 12, 2026)

🌐 **Live Demo:** [medi-urdu-snap.vercel.app](https://medi-urdu-snap.vercel.app)

---

## 🚨 The Problem We Solve

In Pakistan, over **220 million people** face a critical healthcare barrier:
- ❌ Medicine labels and prescriptions are written in **English only**
- ❌ Patients cannot understand medical abbreviations like `TDS`, `BD`, `PC`
- ❌ Illegible **handwritten prescriptions** lead to wrong dosages
- ❌ No easy way to track **symptoms, drug interactions, or medical history**
- ❌ Elderly and low-literacy users are completely excluded from digital health tools

> **Result:** Medication errors, missed drug interactions, lost health history, and preventable health crises.

---

## ✨ Key Features

| Feature | Description |
|---------|-------------|
| 📸 **Medicine Label Scanner** | Snap a photo → AI instantly translates label text to **Urdu** (dosage, frequency, warnings) |
| ✍️ **Prescription Decoder** | Decodes messy handwriting & abbreviations (e.g., *"Tab. Amoxillin 500mg TDS x 5/7 PC"* → clear Urdu instructions) |
| 🗣️ **Voice Symptom Logging** | Speak naturally in **Urdu or English** → AI auto-extracts pain level (1-10), sleep hours, mood, and notes |
| ⚠️ **Drug Interaction Checker** | Automatically alerts when scanned medicines may interact → *"Consult your doctor"* |
| 🔴 **Red Alert Banner** | For dangerous medicines (e.g., paracetamol overdose) → *"CONSULT DOCTOR BEFORE TAKING"* |
| 📅 **Health Calendar + Charts** | Color-coded health timeline: 🟢 Good (pain 1-3) / 🟡 Okay (pain 4-6) / 🔴 Bad (pain 7-10) |
| 📄 **PDF Doctor Report** | One-tap generation of professional patient summary (medicines, symptom trends, pain chart) using `jsPDF` |
| 🕒 **History Page** | All scans and symptoms saved → viewable by date |
| 👵 **Elderly & Illiterate Friendly** | Zero typing required — just voice + camera |

---

## 🛠️ Tech Stack

| Layer | Technology |
|-------|-------------|
| **Frontend** | React, TypeScript, Vite, Bun |
| **Backend & DB** | Supabase (Auth, real-time DB, storage) |
| **AI Processing** | Claude API (handwriting decoding, Urdu extraction, symptom parsing) |
| **PDF Generation** | jsPDF |
| **Deployment** | Vercel |

**Language breakdown:** TypeScript (98.2%) · CSS (1.4%) · JavaScript (0.4%)

---

## 🚀 Getting Started

### Prerequisites
- Node.js (v18+)
- Bun (recommended) or npm
- Supabase account
- Claude API key

### Installation

1. **Clone the repository**
   ```bash
   git clone https://github.com/areeba-amirr/medi-urdu-snap.git
   cd medi-urdu-snap
