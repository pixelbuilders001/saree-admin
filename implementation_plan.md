# Phase 1: Supabase Database Migration Plan

This plan details the transition of the application data layer from Google Sheets / Google Apps Script to a Postgres database powered by **Supabase**.

---

## 1. Prerequisites & Dependencies

### Package Installation
We will need to install the Supabase JS client SDK:
```bash
npm install @supabase/supabase-js
```

### Environment Configuration (`.env`)
Replace or append the following keys to your `/home/rajeev/pixelbuilders/saree-react-admin/.env` file:
```env
VITE_SUPABASE_URL=https://your-project-id.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

---

## 2. Relational Database Schema (SQL DDL)

Execute the following script in the Supabase **SQL Editor** to create the tables, relationships, and indices.

```sql
-- Enable UUID extension
create extension if not exists "uuid-ossp";

-- 1. CUSTOMERS TABLE
create table customers (
    id uuid default uuid_generate_v4() primary key,
    name text not null,
    mobile varchar(15) unique not null,
    address text,
    city text,
    created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- 2. SAREES (INVENTORY) TABLE
create table sarees (
    id text primary key, -- Custom short-code ID (e.g. S001)
    saree_name text not null,
    category text not null,
    fabric text not null,
    color text not null,
    purchase_price decimal(10, 2) not null,
    selling_price decimal(10, 2) not null,
    stock integer not null default 0 check (stock >= 0),
    rack_no varchar(50),
    barcode text unique,
    status text not null default 'active' check (status in ('active', 'inactive')),
    created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- 3. SALES TABLE
create table sales (
    id uuid default uuid_generate_v4() primary key,
    customer_id uuid references customers(id) on delete set null,
    total_amount decimal(10, 2) not null,
    profit decimal(10, 2) not null,
    created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- 4. SALE ITEMS TABLE
create table sale_items (
    id uuid default uuid_generate_v4() primary key,
    sale_id uuid references sales(id) on delete cascade not null,
    saree_id text references sarees(id) on delete restrict not null,
    quantity integer not null check (quantity > 0),
    selling_price decimal(10, 2) not null
);

-- 5. PURCHASES TABLE
create table purchases (
    id uuid default uuid_generate_v4() primary key,
    saree_id text references sarees(id) on delete restrict not null,
    saree_name text not null,
    quantity integer not null check (quantity > 0),
    purchase_price decimal(10, 2) not null,
    supplier text not null,
    created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- 6. EXPENSES TABLE
create table expenses (
    id uuid default uuid_generate_v4() primary key,
    category text not null check (category in ('Rent', 'Electricity', 'Salary', 'Marketing', 'Other')),
    amount decimal(10, 2) not null check (amount > 0),
    description text,
    created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- 7. SYNC SCANS TABLE
create table sync_scans (
    id uuid default uuid_generate_v4() primary key,
    session_id text not null,
    barcode text not null,
    created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Optimization Indexes
create index idx_sarees_barcode on sarees(barcode);
create index idx_customers_mobile on customers(mobile);
create index idx_sales_created_at on sales(created_at);
create index idx_sync_scans_session_id on sync_scans(session_id);
```

---

## 3. Subabase Client Setup

Create a new client file `src/lib/supabase.ts`:
```typescript
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Missing Supabase Environment Variables');
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey);
```

---

## 4. Service Migrations

We will rewrite each service in `src/services/` to query Supabase directly instead of calling `gsRequest()`.

### Example: `inventoryService.ts` Rewrite
```typescript
import { supabase } from '@/lib/supabase';
import type { Saree } from './inventoryService';

export const inventoryService = {
    getSarees: async (): Promise<Saree[]> => {
        const { data, error } = await supabase
            .from('sarees')
            .select('*')
            .order('created_at', { ascending: false });
        if (error) throw error;
        
        return data.map(item => ({
            id: item.id,
            sareeName: item.saree_name,
            category: item.category,
            fabric: item.fabric,
            color: item.color,
            purchasePrice: Number(item.purchase_price),
            sellingPrice: Number(item.selling_price),
            stock: item.stock,
            rackNo: item.rack_no,
            barcode: item.barcode,
            addedDate: item.created_at,
            status: item.status,
        }));
    },
    // ...other CRUD operations
};
```

---

## 5. Verification Plan

1. **Local Schema Validation**: Build local typescript interfaces reflecting Supabase table schemas.
2. **Data Integrity Checks**: Verify transaction operations (e.g. creating a Sale must deduct Saree stock and insert into `sales` + `sale_items` atomically via PostgreSQL Triggers or Supabase RPC functions).
