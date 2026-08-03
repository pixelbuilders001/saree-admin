# Phase 5: User Display & Database Action Auditing Plan

This plan introduces auditing columns (`created_by`, `updated_by`) for database tables to track which logged-in user performs additions or modifications, and renders the current user's email in the admin layout sidebar.

---

## 🗄️ Supabase Migration DDL Required
Run this script inside the Supabase SQL editor to create the necessary column headers:

```sql
ALTER TABLE inventory ADD COLUMN IF NOT EXISTS created_by VARCHAR(255);
ALTER TABLE inventory ADD COLUMN IF NOT EXISTS updated_by VARCHAR(255);

ALTER TABLE sales ADD COLUMN IF NOT EXISTS created_by VARCHAR(255);
ALTER TABLE sales ADD COLUMN IF NOT EXISTS updated_by VARCHAR(255);

ALTER TABLE purchases ADD COLUMN IF NOT EXISTS created_by VARCHAR(255);
ALTER TABLE purchases ADD COLUMN IF NOT EXISTS updated_by VARCHAR(255);

ALTER TABLE expenses ADD COLUMN IF NOT EXISTS created_by VARCHAR(255);
ALTER TABLE expenses ADD COLUMN IF NOT EXISTS updated_by VARCHAR(255);

ALTER TABLE customers ADD COLUMN IF NOT EXISTS created_by VARCHAR(255);
ALTER TABLE customers ADD COLUMN IF NOT EXISTS updated_by VARCHAR(255);
```

---

## Proposed Changes

### UI Components

#### [MODIFY] [Sidebar.tsx](file:///home/rajeev/pixelbuilders/saree-react-admin/src/components/layout/Sidebar.tsx)
- Import `useAuthStore` to fetch the logged-in user profile.
- Render the current user's email ID at the footer above the logout button.

---

### Service Adapters (Applying `created_by` / `updated_by` auditing data)

We will update database insert and update queries to include:
- `created_by: useAuthStore.getState().user?.email || 'system'`
- `updated_by: useAuthStore.getState().user?.email || 'system'`

#### [MODIFY] [inventoryService.ts](file:///home/rajeev/pixelbuilders/saree-react-admin/src/services/inventoryService.ts)
- Update `createSaree` (adds `created_by` and `updated_by`).
- Update `updateSaree` (updates `updated_by`).

#### [MODIFY] [purchaseService.ts](file:///home/rajeev/pixelbuilders/saree-react-admin/src/services/purchaseService.ts)
- Update `createPurchase` (adds `created_by` and `updated_by` to the new purchase record, and updates `updated_by` inside the inventory item table).

#### [MODIFY] [salesService.ts](file:///home/rajeev/pixelbuilders/saree-react-admin/src/services/salesService.ts)
- Update `createSale` (adds `created_by`/`updated_by` to sales, and updates `updated_by` inside the modified inventory stocks).
- Update `processExchange` (adds `created_by`/`updated_by` to sales, and updates `updated_by` on affected returning/replacing inventory items).

#### [MODIFY] [expenseService.ts](file:///home/rajeev/pixelbuilders/saree-react-admin/src/services/expenseService.ts)
- Update `createExpense` (adds `created_by` and `updated_by`).

#### [MODIFY] [customerService.ts](file:///home/rajeev/pixelbuilders/saree-react-admin/src/services/customerService.ts)
- Update `createCustomer` (adds `created_by` and `updated_by`).

---

## Verification Plan

### Manual Verification
1. Log into the application and inspect the Sidebar. Confirm your login email is visible.
2. Add a new Saree in the inventory page. Check the supabase database state to verify `created_by` / `updated_by` capture that customer account.
3. Perform a sale or register an expense. Check the respective database rows.
