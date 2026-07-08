# Manual QA Authentication Checklist

This document contains the step-by-step manual QA verification plans for the Phase 1 Authentication MVP of the Job Finder Agent platform.

---

## 1. Web QA Test Cases

| ID | Test Case | Action | Expected Result |
|----|-----------|--------|-----------------|
| W-01 | Sign-up with invalid email | Input `"testemail"` into the email field and try to sign up. | Form validation fails, showing an error indicating email format is invalid. |
| W-02 | Sign-up with weak password | Input a password less than 8 characters (e.g., `"12345"`). | Validation error: *"Password must be at least 8 characters long."* |
| W-03 | Sign-up with unmatched passwords | Input different values in password and confirm password fields. | Validation error: *"Passwords do not match."* |
| W-04 | Sign-up without accepting terms | Fill out sign-up details, leave "Accept Terms" unchecked, and submit. | Validation error: *"You must accept the Terms and Privacy Policy."* |
| W-05 | Successful email sign-up | Fill form correctly, accept terms, click Sign Up. | App calls Supabase auth. Shows success message: *"Check your email to verify your account."* |
| W-06 | Sign-in before email verification | Try logging in with the newly registered credentials before clicking the email link. | Friendly error: *"Please confirm your email address before logging in."* |
| W-07 | Email verification link callback | Click the verification link in the received email. | User is redirected to `/auth/callback`, session is established, and user is redirected to `/dashboard`. |
| W-08 | Successful sign-in | Enter verified email and password on `/auth/sign-in`. | User enters `/dashboard` immediately. |
| W-09 | Sign-in with wrong password | Enter correct email but incorrect password. | Error displayed: *"Invalid login credentials."* |
| W-10 | Forgot password flow | Go to `/auth/forgot-password`, enter verified email, click Send. | Display success: *"Password recovery email sent."* |
| W-11 | Reset password recovery callback | Click the link in recovery email, enter new password on `/auth/reset-password`, submit. | Password updated successfully and user is navigated to `/dashboard`. |
| W-12 | Google/Apple redirect | Click Google/Apple sign-in button. | Redirected to OAuth provider authorization page, then back to `/auth/callback`, and finally to `/dashboard`. |
| W-13 | Dashboard protection | Try to access `/dashboard` directly while logged out. | Middleware intercepts request and redirects back to `/auth/sign-in` with query param `next=/dashboard`. |
| W-14 | Sign out | Click "Sign Out" button on the dashboard. | Session is destroyed and user is returned to landing page or sign-in page. |
| W-15 | Responsive Web UI | Resize browser window to mobile layout. | Layout collapses into single column, forms remain readable and accessible. |

---

## 2. Mobile QA Test Cases

| ID | Test Case | Action | Expected Result |
|----|-----------|--------|-----------------|
| M-01 | mobile AuthGate (Initial launch) | Launch app logged out. | App shows Splash page, checks session, redirects to `SignInScreen`. |
| M-02 | mobile AuthGate (Logged in) | Launch app with active session. | App bypasses sign-in and loads `DashboardScreen`. |
| M-03 | Email validation & mismatch | Try to register with mismatching passwords or bad email format on mobile. | Alerts/validators show corresponding errors. |
| M-04 | Google/Apple Auth | Click Google/Apple sign-in buttons on mobile. | Opens webview/native auth dialog, handles token exchange. |
| M-05 | mobile deep link callback | Click verification link on a mobile device. | Scheme `ai-career-agent://` catches redirect, signs user in, and opens `DashboardScreen`. |

---

## 3. Known Limitations
- Social logins (Google/Apple) require actual app IDs configured in the Supabase Dashboard. Without them, clicking these buttons will result in redirect errors from the auth provider.
- Email verification emails might arrive in the spam folder during testing depending on email provider filters.
- Native Apple sign-in on iOS requires configured provisioning profiles and Apple developer capabilities in Xcode.
