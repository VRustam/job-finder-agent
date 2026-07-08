# Authentication Flow Specification

This document details the authentication flows, redirect configurations, and Supabase backend setups for both the Next.js web application and the Flutter mobile application.

---

## 1. Web Authentication Flows

### Email & Password Sign-Up
1. User enters Full Name, Email, Password, and Confirm Password, and accepts the Terms checkbox.
2. Form checks:
   - Valid email format.
   - Password is at least 8 characters.
   - Passwords match.
   - Terms are accepted.
3. Next.js App calls `supabase.auth.signUp()` with the user's email, password, and `full_name` inside `options.data`.
4. Supabase sends a confirmation email to the user's address.
5. The UI shows: *"Check your email to verify your account."*
6. User clicks the verification link in the email, which redirects them to `/auth/callback` with an auth code.
7. The callback handler exchanges the code for a session and redirects the user to `/dashboard`.

### Email & Password Sign-In
1. User enters Email and Password.
2. Next.js App calls `supabase.auth.signInWithPassword()`.
3. If the account's email is not yet verified, and Supabase settings require confirmation, the sign-in will fail. The UI will show a friendly message: *"Please verify your email before logging in."*
4. On success, the session is created, the middleware detects the session, and redirects/allows entry to `/dashboard`.

### Google & Apple Sign-In
1. User clicks *"Continue with Google"* or *"Continue with Apple"*.
2. Next.js App calls `supabase.auth.signInWithOAuth()` with the selected provider.
3. Redirect URL (`redirectTo`) is set to `http://localhost:3000/auth/callback` (or the production equivalent).
4. Upon successful provider authentication, the user is redirected back to the callback route and then into the `/dashboard`.

### Password Recovery (Forgot & Reset Password)
1. **Request**: User submits their email on `/auth/forgot-password`.
2. Next.js App calls `supabase.auth.resetPasswordForEmail()` with `redirectTo` set to `http://localhost:3000/auth/reset-password`.
3. **Reset**: User clicks the link in the recovery email and is redirected to `/auth/reset-password`.
4. User enters their new password and confirms it.
5. The page calls `supabase.auth.updateUser()` with the new password.
6. User is redirected to `/dashboard` upon success.

---

## 2. Mobile Authentication Flows

### Session Management & Auth Gate
1. On application launch, the App checks if a valid Supabase session exists using the Supabase SDK.
2. If session is valid -> Navigate directly to `DashboardScreen`.
3. If session is invalid/null -> Navigate to `SignInScreen`.

### Email & Password Sign-Up / Sign-In
- Follows the same logic as the Web Auth flow, using the `supabase_flutter` SDK.
- Upon successful sign-up, the app displays a success prompt indicating that a verification email was sent.

### Mobile OAuth (Google & Apple)
1. Mobile triggers `supabase.client.auth.signInWithOAuth()` or uses native Google/Apple sign-in SDKs and passes the identity token to Supabase.
2. For redirection-based OAuth, the deep link scheme `ai-career-agent://` must be specified as the redirect URL.

---

## 3. Redirects & Deep Links Configuration

To enable correct redirection after email verification or social login, the following configurations are required in the Supabase Dashboard:

### Supabase Settings
1. **Site URL**:
   - Local: `http://localhost:3000`
   - Production: `https://your-production-app.vercel.app` (Placeholder)
2. **Redirect URLs**:
   - `http://localhost:3000/auth/callback`
   - `ai-career-agent://auth/callback`
   - `https://your-production-app.vercel.app/auth/callback`

### Mobile Deep Link Setup
- **Android**: Configure `<intent-filter>` in `AndroidManifest.xml` to capture `ai-career-agent` scheme.
- **iOS**: Configure URL Schemes in `Info.plist` or Associated Domains to map `ai-career-agent://` redirects.
