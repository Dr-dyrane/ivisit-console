Admin User Invitation & Onboarding Plan
Goal Description
Implement a secure and professional "Invite User" flow for the Admin Dashboard. Instead of manually creating users with temporary passwords, Admins will send email invitations. Invited users will click a link, be automatically logged in, and immediately prompted to set their own password, ensuring they never get "stuck" if they log out.

User Review Required
IMPORTANT

Password Enforcement Policy: We will implement a "Force Password Set" screen. When a user arrives via an Invite link, they will be redirected to a dedicated view where they must set a password before accessing the full dashboard. This prevents the "locked out after logout" scenario.

Proposed Changes
Frontend Logic (
src/contexts/AuthContext.jsx
 & src/App.jsx)
Listen for specific Supabase Auth events (specifically PASSWORD_RECOVERY which is often used for magic links/invites context, or detecting the hash).
If the user is authenticated but has no password set (hard to detect directly) OR ideally, we just rely on the event that brought them here.
Better approach: Trigger a "Set Password" modal if the user is active but we detect they came from an invite link.
Role Assignment: Verify AuthContext correctly assigns viewer role to new Google Sign-in users.
Progressive Login Page (src/components/pages/LoginPage.jsx)
Design Philosophy: One input at a time (Rule 19), focused, smooth transitions (Rule 17).
Step 1: Identity:
Input: Email.
Action: Check login.
Step 2A: Known User (Password Set):
Input: Password.
Action: valid ? Check 2FA : Error.
Step 2B: 2FA Challenge (if enabled):
Input: 6-digit TOTP Code.
Action: supabase.auth.signInWithOtp (or mfa.challenge).
Step 2C: Known User (No Password / Invited):
Action: "Welcome! Please set your password."
Option: "Send Login Link" -> Redirects to Set Password flow (this is handled by the Invite logic usually, but this is a fallback).
Step 2D: New User:
Options: Google, App Download, Support.
Settings: Two-Factor Authentication (src/components/pages/SettingsPage.jsx)
UI: "Security" Section.
Toggle: "Two-Factor Authentication".
Flow:
Click Toggle -> Show QR Code (using supabase.auth.mfa.enroll).
User Scans -> Enters Code.
Verify -> Enable MFA.
Save Recovery Codes (optional but recommended).
Verification Plan
Prod Testing: We will use the live Edge Functions (deploy via CLI if needed, or provide the code for you to push).
Flows:
Invite: Admin invites -> Real Email arrives -> Click -> Set Password -> Dashboard.
2FA: User enables 2FA -> Logout -> Login -> Email -> Password -> TOTP -> Dashboard.
Admin Interface (
src/components/pages/UsersPage.jsx
)
Action: Replace "Create User" button with "Invite User".
Component: Create InviteUserModal.
Inputs: Email Address, Role (Select).
Logic:
Trigger Supabase function (we will check for inviteUser edge function, or implement a direct call if RLS allows, but standard practice is a secure backend function).
Correction: We will use a standard supabase.auth.signInWithOtp (Magic Link) as a fallback "Invite" if a dedicated inviteUserByEmail function isn't set up, BUT best practice is inviteUserByEmail which sends a link that redirects to a password reset page.
Chosen Path: We will implement inviteUser calling a Supabase Edge Function (or simulate via client if user is admin). Self-correction: Client-side admin methods are dangerous/blocked. We likely need to check if an Edge Function exists or guide the user to add one.
Plan B (Client-Only): Admin manually triggers 
signUp
 with a temporary password (e.g., random UUID) and the system sends a custom email? No, that's insecure.
Plan C (Magic Link): Admin triggers "Send Magic Link" to that email. User clicks -> logs in.
Refined Plan: We will assume supabase.auth.admin is NOT available on client. We will implement post-invite via a hypothetical Edge Function invite-user. I will add a check for this or create a "Mock" service that explains this dependency.
Wait, actually simpler: supabase.auth.signInWithOtp({ email }). This sends a magic link. Admin can just "Login" the user? No, that logs the Admin out.
Final Decision: We need a backend function. I will write the code for the Frontend component to call an assumed endpoint invite-user, or provide the Edge Function code if needed.
Onboarding Interface (src/components/pages/SetPasswordPage.jsx)
Route: /set-password
Logic:
User arrives via email link (type recovery or invite).
Supabase Auth Event PASSWORD_RECOVERY fires.
AuthContext catches this and redirects to /set-password instead of Home.
UI:
"Welcome! Secure your account."
Password / Confirm Password inputs.
Submit -> supabase.auth.updateUser({ password }).
Success -> Redirect to /.
Auth Context Updates (
src/contexts/AuthContext.jsx
)
Add listener for PASSWORD_RECOVERY event.
If event detected, force navigate to /set-password.
Verification Plan
Manual Verification
Admin: Click "Invite User", enter email test+invite@example.com.
User: Check email (simulated or real).
User: Click link.
App: Should open and auto-navigate to "Set Password".
User: Set password.
User: Logout.
User: Login with Email + New Password -> Success.