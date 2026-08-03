# Phase 4: Change Password Option Plan

This plan details the implementation of a **Change Password** screen inside the web application for logged-in employees to update their credentials via **Supabase Auth**.

---

## Proposed Changes

### UI Components

#### [NEW] [Settings.tsx](file:///home/rajeev/pixelbuilders/saree-react-admin/src/pages/Settings.tsx)
- Create a Settings page containing a password change form.
- Form inputs: New Password, Confirm New Password.
- Perform zod confirmation validation.
- Call Supabase Auth:
  ```typescript
  const { error } = await supabase.auth.updateUser({
      password: data.password
  });
  ```
- Show success toast notification on completion.

#### [MODIFY] [Sidebar.tsx](file:///home/rajeev/pixelbuilders/saree-react-admin/src/components/layout/Sidebar.tsx)
- Import `Key` or `Settings` icon from `lucide-react`.
- Append a NavLink for **Settings** (`/settings`) to `navItems`.

---

### Routing & Shell Layout

#### [MODIFY] [App.tsx](file:///home/rajeev/pixelbuilders/saree-react-admin/src/App.tsx)
- Import `SettingsPage` from `@/pages/Settings`.
- Add a new route `<Route path="settings" element={<SettingsPage />} />` under the protected parent route.

---

## Verification Plan

### Manual Verification
1. Log in.
2. Click **Settings** in the Sidebar.
3. Attempt modifying password with mismatched confirmation checks.
4. Try updating to a new password; check for success confirmation toast.
5. Log out, then verify you can log back in using the fresh password.
