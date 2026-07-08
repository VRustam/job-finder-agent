# Security Checklist

Ensure the following security standards are maintained throughout the development of the Job Finder Agent platform.

---

## 1. Secrets & Environment Variables
- [ ] **No Hardcoded Secrets**: Absolutely no Supabase Service Role keys, API secrets, or passwords should be written in source code.
- [ ] **Config Examples**: Provide only `.env.example` in git.
- [ ] **Local Environments**: Keep local `.env` and `.env.local` files in the `.gitignore` to prevent accidental commits.

---

## 2. Supabase Database Security (RLS)
- [ ] **Row Level Security (RLS)**: Must be enabled on all tables in the `public` schema.
- [ ] **Profile Access Rules**:
  - `SELECT`: A user can read only their own profile row.
  - `UPDATE`: A user can modify only their own profile row.
  - `INSERT`: A user can create only their own profile row.
  - `DELETE`: Cascade deleted if the corresponding `auth.users` row is removed.
- [ ] **Triggers**: Auto-creation triggers must use security definer functions carefully and validate inputs to prevent privilege escalation.

---

## 3. Web App Security
- [ ] **Next.js Middleware Check**: Verify that `/dashboard` is fully protected server-side, preventing unauthenticated clients from viewing layout components.
- [ ] **Secure OAuth Callback**: Handle codes/tokens strictly in `/auth/callback` before redirecting. Ensure the callback validates the authentication query parameters.
- [ ] **No Logging of Sensitive Data**: Make sure OAuth tokens, refresh tokens, and passwords are never printed to the browser or server consoles.
- [ ] **Access Controls**: Set appropriate HTTP Headers, CORS, and cookie flags if self-managing cookies.

---

## 4. Mobile App Security
- [ ] **Secure Storage**: Access tokens and refresh tokens must be stored in secure OS-level storage (e.g., keychain/shared preferences via Supabase SDK).
- [ ] **No Passwords Stored Locally**: Avoid storing plaintext user passwords in local memory or databases.
- [ ] **App Store Compliance**: Ensure placeholders are ready for future privacy/compliance requirements (e.g., Apple Sign-In and account deletion functions).
