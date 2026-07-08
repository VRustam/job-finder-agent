# MVP Scope - Phase 1: Authentication & Dashboard Foundation

## Goal
The primary objective of Phase 1 is to establish a secure, modern, and production-ready authentication foundation for the Job Finder Agent platform across both the Web (Next.js) and Mobile (Flutter) applications. This sets the stage for implementing the core career tools in future iterations.

## Scope of Phase 1

### 1. Authentication Options
- **Email & Password**: Standard registration, login, email verification, and password recovery.
- **Social Auth**: Google and Apple Single Sign-On (SSO) buttons integrated on both web and mobile UIs.
- **Session Persistence**: Secure, cross-session token storage using Supabase SDKs on both platforms.

### 2. User Profiles
- Automatically generate a corresponding `public.profiles` database record upon successful user creation in Supabase auth.
- Capture full name and avatar metadata from registrations or social logins.

### 3. Protected Dashboard Framework
- A secure area accessible only to authenticated users.
- Displays placeholders/coming soon cards for the future product modules:
  - Resume Builder
  - Job Applications
  - Calendar Scheduler
  - Interview Coach
  - Live Translation
- Clean, modern layout (startup style) with responsive design and sign-out controls.

## Exclusions (Out of Scope for Phase 1)
- Functional resume templates or builders.
- Active job tracking boards.
- Live calendar syncing.
- Active AI chat or voice coaching models.
- Active translation/transcription services.
