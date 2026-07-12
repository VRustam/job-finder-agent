# Job Finder Agent Monorepo

Job Finder Agent is a web and mobile platform designed to automate and support professional career paths. It helps users manage applications, optimize resumes, prepare for interviews, and track recruiters.

This repository is structured as a monorepo containing:
- **`apps/web`**: Next.js (App Router, TypeScript, Tailwind CSS)
- **`apps/mobile`**: Flutter application
- **`supabase`**: Backend Postgres migrations & triggers
- **`docs`**: Design, roadmap, and workflow documentations

---

## Current Status: Phase 1 (Authentication Foundation)
We are currently in **Phase 1: Authentication & Dashboard Foundation**. 
The web and mobile projects have their folder structure and auth screens/pages configured.

---

## Project Structure
```text
ai-career-agent/
├── .github/
│   └── workflows/          # GitHub Actions (CI/CD)
├── apps/
│   ├── web/                # Next.js Web App
│   └── mobile/             # Flutter Mobile App
├── docs/                   # Documentation & Checklists
├── packages/
│   └── shared/             # Shared TypeScript or config resources
└── supabase/
    └── migrations/         # Database migrations
```

---

## Local Setup & Run Guide

### Prerequisite Environment Variables
Create a `.env` file (or set these inside your environment) based on `.env.example`:
```env
NEXT_PUBLIC_SUPABASE_URL=your-supabase-url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-supabase-anon-key
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

### 1. Web App (Next.js)
```bash
cd apps/web
npm install
npm run dev
```
Open [https://career-agent-web-rose.vercel.app](https://career-agent-web-rose.vercel.app) in your browser.

### 2. Mobile App (Flutter)
Ensure you have the Flutter SDK installed and a running simulator/device:
```bash
cd apps/mobile
flutter pub get
flutter run
```

---

## GitHub Workflow & PR rules
- Always branch off `develop` using `feature/your-feature-name`.
- Use semantic commit messages (e.g., `feat: ...`, `fix: ...`).
- Open a PR targeting `develop` and complete the template.
- First version tag is `v0.1.0-auth-foundation`.
