# Mechanical Sports Gala 2026 — Vercel + Neon DB + Groq AI Portal

Complete full-stack registration and organizer management system built with **Next.js (App Router)**, **Neon PostgreSQL**, and **Groq AI**.

## Features
- **Public Registration Portal (`/`)**: Mobile-first 6-step wizard supporting all 10 official sports, 1,000 PKR Individual All-Access Pass, dynamic team/pair/solo rosters, Cash & JazzCash (`03281159050` — Abdul Ahad) with compressed mobile receipt uploads, and 1-page printable PDF Proof of Registration Slip.
- **Organizer Management Portal (`/admin`)**: Password-protected desk portal with live KPIs, Roll Number / Name search, 1-click **Verify & Approve**, JazzCash Receipt Viewer, Roster Eligibility controls, Manual Payment entry, Live Game/Settings Editor, and 1-click Excel/CSV exports.
- **Gala AI Assistant (Groq)**: Built-in agentic assistant inside `/admin` (`llama-3.3-70b-versatile`) with read-only database tools to answer organizer questions in plain English or Roman Urdu.
- **Zero Manual DB Setup**: Tables (`event_settings`, `games`, `registrations`, `players`, `payments`) and all 10 official sports & fees are **automatically created and seeded** on the first request once `DATABASE_URL` is connected.

## Deploy to Vercel in 3 Minutes
1. Push this folder to a GitHub repository.
2. Go to [vercel.com](https://vercel.com) → **Add New Project** → Import your repo.
3. Add **Neon PostgreSQL**:
   - Either connect Neon via **Vercel Storage → Neon** (auto-sets `DATABASE_URL`), OR paste your Neon connection string from [console.neon.tech](https://console.neon.tech).
4. Add Environment Variables in Vercel Project Settings:
   - `DATABASE_URL` — Neon PostgreSQL URL
   - `GROQ_API_KEY` — Free API key from [console.groq.com](https://console.groq.com)
   - `ADMIN_PASSWORD` — Your organizer login password for `/admin`
   - `SESSION_SECRET` — Any random secret string
5. Click **Deploy**!
   - Student link: `https://your-project.vercel.app/`
   - Organizer Desk + AI Assistant: `https://your-project.vercel.app/admin`
