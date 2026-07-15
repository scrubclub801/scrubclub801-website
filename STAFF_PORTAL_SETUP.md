# STAFF_PORTAL_SETUP

## Access URL
- Staff login URL: `/staff`
- Direct dashboard URL: `/staff/dashboard`
- Protected pages:
  - `/staff/quotes`
  - `/staff/appointments`
  - `/staff/customers`
  - `/staff/employees`
  - `/staff/analytics`
  - `/staff/settings`

## 1. How to access the Staff Portal
1. Open `https://scrubclub801.us/staff`.
2. Enter staff email and password.
3. On successful login, staff are redirected to `/staff/dashboard`.

## 2. How to create employee accounts
1. Connect Supabase Auth or Firebase Authentication first.
2. Create user accounts in your provider dashboard.
3. Set each staff account role metadata/claim to `employee` or `manager`.
4. Confirm each user can sign in at `/staff`.

## 3. How to connect Supabase Auth or Firebase Authentication
1. Open `staff/assets/js/config.js`.
2. Set `authProvider` to `supabase` or `firebase`.
3. Fill in provider credentials.
4. Load the provider SDK in staff pages:
- Supabase: include `https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2`
- Firebase: include Firebase Auth SDK scripts
5. Deploy and test sign in.

## 4. How to change passwords
1. For Supabase, use reset password emails from the provider dashboard or UI flow.
2. For Firebase, use reset password emails from Firebase Auth.
3. The login page already has a Forgot Password hook wired to `sendPasswordReset`.

## 5. How to add new employees
1. Create a new auth user in your provider.
2. Add role metadata/claim as `employee`.
3. Verify login works at `/staff`.

## 6. How to remove employees
1. Disable or delete the user in Supabase Auth or Firebase Authentication.
2. Confirm the removed account can no longer sign in.
3. Check active sessions are revoked in the provider dashboard.

## 7. How to promote an employee to manager
1. Update role metadata/claim from `employee` to `manager`.
2. Force re-login or token refresh.
3. Verify access to `/staff/analytics` and `/staff/settings`.

## 8. How to protect every /staff page
1. Keep `staff/assets/js/guard.js` included on all protected pages.
2. Keep `data-required-role` set on each protected page body.
3. Ensure server-side access controls are added in production.
4. If using edge middleware, block all `/staff/*` requests without a valid session token.

## 9. Which files control authentication
- `staff/assets/js/config.js`
- `staff/assets/js/auth.js`
- `staff/assets/js/login.js`

## 10. Which files control permissions
- `staff/assets/js/auth.js` role hierarchy and role checks
- `staff/assets/js/guard.js` route protection and redirects
- `staff/assets/js/portal.js` role-based navigation rendering

## 11. How to change the Staff Portal URL if needed
1. Move the `staff` folder to your new path (example: `internal`).
2. Update deployment rewrite rules so the new path resolves correctly.
3. Update path logic in `staff/assets/js/auth.js` if your route base changes.
4. Test login and all protected routes after the move.

## 12. How to deploy the secured portal after authentication is connected
1. Configure auth provider credentials in `staff/assets/js/config.js`.
2. Add provider SDK scripts.
3. Configure HTTPS and environment variables.
4. Add server or edge middleware to enforce session checks on `/staff/*`.
5. Deploy.
6. Run role-based access tests for employee and manager users.

## Security Checklist Before Going Live
- Authentication connected
- Passwords enabled
- Public access blocked
- Role permissions verified
- Session expiration working
- HTTPS enabled
- Test employee login completed
- Test manager login completed
- Logout revokes access
- Unauthorized direct URL access redirects to login
- Provider API keys are environment-managed and not hardcoded in production
- Audit logging enabled for sign-in and role changes
