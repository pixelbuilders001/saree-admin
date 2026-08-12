-- 1. Create Weavers Profile Table
CREATE TABLE public.weavers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    mobile TEXT NOT NULL,
    city TEXT NOT NULL,
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    created_by TEXT,
    updated_by TEXT
);

-- Enable Row Level Security (RLS) on Weavers
ALTER TABLE public.weavers ENABLE ROW LEVEL SECURITY;

-- Allow public read access to weavers list (so admin dashboard can view them)
CREATE POLICY "Allow public select on weavers" ON public.weavers
    FOR SELECT TO public USING (true);

-- Allow authenticated users to insert, update and delete
CREATE POLICY "Allow authenticated insert on weavers" ON public.weavers
    FOR INSERT TO authenticated WITH CHECK (true);

CREATE POLICY "Allow authenticated update on weavers" ON public.weavers
    FOR UPDATE TO authenticated USING (true);

CREATE POLICY "Allow authenticated delete on weavers" ON public.weavers
    FOR DELETE TO authenticated USING (true);


-- 2. Create Weaver Payments Ledger Table
CREATE TABLE public.weaver_payments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    weaver_id UUID NOT NULL REFERENCES public.weavers(id) ON DELETE CASCADE,
    amount NUMERIC NOT NULL CHECK (amount > 0),
    payment_method TEXT NOT NULL CHECK (payment_method IN ('Cash', 'UPI')),
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    created_by TEXT,
    updated_by TEXT
);

-- Enable Row Level Security (RLS) on Weaver Payments
ALTER TABLE public.weaver_payments ENABLE ROW LEVEL SECURITY;

-- Allow select access on weaver payments
CREATE POLICY "Allow public select on weaver_payments" ON public.weaver_payments
    FOR SELECT TO public USING (true);

-- Allow authenticated users to manage payments list
CREATE POLICY "Allow authenticated insert on weaver_payments" ON public.weaver_payments
    FOR INSERT TO authenticated WITH CHECK (true);

CREATE POLICY "Allow authenticated update on weaver_payments" ON public.weaver_payments
    FOR UPDATE TO authenticated USING (true);

CREATE POLICY "Allow authenticated delete on weaver_payments" ON public.weaver_payments
    FOR DELETE TO authenticated USING (true);


-- 3. Create Inventory Images Table
CREATE TABLE public.inventory_images (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    inventory_id TEXT NOT NULL REFERENCES public.inventory(id) ON DELETE CASCADE,
    image_url TEXT NOT NULL,
    storage_key TEXT,
    is_primary BOOLEAN NOT NULL DEFAULT false,
    sort_order INTEGER NOT NULL DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_inventory_images_inventory_id ON public.inventory_images(inventory_id);

-- Enable Row Level Security (RLS) on inventory_images
ALTER TABLE public.inventory_images ENABLE ROW LEVEL SECURITY;

-- Allow public read access to inventory images
CREATE POLICY "Allow public select on inventory_images" ON public.inventory_images
    FOR SELECT TO public USING (true);

-- Allow authenticated users to insert, update, and delete
CREATE POLICY "Allow authenticated insert on inventory_images" ON public.inventory_images
    FOR INSERT TO authenticated WITH CHECK (true);

CREATE POLICY "Allow authenticated update on inventory_images" ON public.inventory_images
    FOR UPDATE TO authenticated USING (true);

CREATE POLICY "Allow authenticated delete on inventory_images" ON public.inventory_images
    FOR DELETE TO authenticated USING (true);


-- 4. Supabase Storage Policies for sbs-inventory-images bucket
-- Note: Make sure the bucket 'sbs-inventory-images' is created in the Supabase Storage dashboard first.
-- These policies enable reading, uploading, updating, and deleting files.

-- Enable SELECT (Read) access for everyone
CREATE POLICY "Allow public read access on sbs-inventory-images" ON storage.objects
    FOR SELECT TO public USING (bucket_id = 'sbs-inventory-images');

-- Enable INSERT (Upload) access for authenticated users
CREATE POLICY "Allow authenticated insert on sbs-inventory-images" ON storage.objects
    FOR INSERT TO authenticated WITH CHECK (bucket_id = 'sbs-inventory-images');

-- Enable UPDATE access for authenticated users
CREATE POLICY "Allow authenticated update on sbs-inventory-images" ON storage.objects
    FOR UPDATE TO authenticated USING (bucket_id = 'sbs-inventory-images');

-- Enable DELETE access for authenticated users
CREATE POLICY "Allow authenticated delete on sbs-inventory-images" ON storage.objects
    FOR DELETE TO authenticated USING (bucket_id = 'sbs-inventory-images');


-- 5. Create Categories Table
CREATE TABLE public.categories (
  id uuid not null default gen_random_uuid (),
  category_id text not null,
  name text not null,
  slug text not null,
  description text null,
  image_url text null,
  status text not null default 'active'::text,
  sort_order integer null default 0,
  created_at timestamp with time zone null default now(),
  updated_at timestamp with time zone null default now(),
  constraint categories_pkey primary key (id),
  constraint categories_category_id_key unique (category_id),
  constraint categories_slug_key unique (slug)
);

-- Enable Row Level Security (RLS) on Categories
ALTER TABLE public.categories ENABLE ROW LEVEL SECURITY;

-- Allow public read access to categories
CREATE POLICY "Allow public select on categories" ON public.categories
    FOR SELECT TO public USING (true);

-- Allow authenticated users to manage categories
CREATE POLICY "Allow authenticated insert on categories" ON public.categories
    FOR INSERT TO authenticated WITH CHECK (true);

CREATE POLICY "Allow authenticated update on categories" ON public.categories
    FOR UPDATE TO authenticated USING (true);

CREATE POLICY "Allow authenticated delete on categories" ON public.categories
    FOR DELETE TO authenticated USING (true);


-- 6. Create Online Orders Tables
CREATE TABLE public.orders (
  id uuid not null default gen_random_uuid (),
  order_number text not null,
  user_id uuid null,
  customer_name text not null,
  customer_phone text not null,
  customer_email text null,
  shipping_address jsonb not null,
  subtotal numeric(12, 2) not null default 0,
  shipping_fee numeric(12, 2) not null default 0,
  discount numeric(12, 2) not null default 0,
  total_amount numeric(12, 2) not null default 0,
  payment_method text not null default 'cod'::text,
  payment_status text not null default 'pending'::text,
  order_status text not null default 'placed'::text,
  notes text null,
  created_at timestamp with time zone not null default now(),
  updated_at timestamp with time zone not null default now(),
  constraint orders_pkey primary key (id),
  constraint orders_order_number_key unique (order_number),
  constraint orders_user_id_fkey foreign KEY (user_id) references auth.users (id),
  constraint orders_payment_method_check check ((payment_method = 'cod'::text)),
  constraint orders_payment_status_check check (
    (
      payment_status = any (
        array[
          'pending'::text,
          'paid'::text,
          'failed'::text,
          'refunded'::text
        ]
      )
    )
  ),
  constraint orders_status_check check (
    (
      order_status = any (
        array[
          'placed'::text,
          'confirmed'::text,
          'processing'::text,
          'packed'::text,
          'shipped'::text,
          'out_for_delivery'::text,
          'delivered'::text,
          'cancelled'::text,
          'returned'::text
        ]
      )
    )
  )
) TABLESPACE pg_default;

-- Enable Row Level Security (RLS) on Orders
ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow public select on orders" ON public.orders
    FOR SELECT TO public USING (true);

CREATE POLICY "Allow authenticated insert on orders" ON public.orders
    FOR INSERT TO authenticated WITH CHECK (true);

CREATE POLICY "Allow authenticated update on orders" ON public.orders
    FOR UPDATE TO authenticated USING (true);

CREATE POLICY "Allow authenticated delete on orders" ON public.orders
    FOR DELETE TO authenticated USING (true);


CREATE TABLE public.order_items (
  id uuid not null default gen_random_uuid (),
  order_id uuid not null,
  inventory_id text not null,
  product_name text not null,
  sku text null,
  barcode text null,
  quantity integer not null default 1,
  unit_price numeric(12, 2) not null,
  total_price numeric(12, 2) not null,
  product_snapshot jsonb null,
  created_at timestamp with time zone not null default now(),
  constraint order_items_pkey primary key (id),
  constraint order_items_inventory_id_fkey foreign KEY (inventory_id) references inventory (id),
  constraint order_items_order_id_fkey foreign KEY (order_id) references orders (id) on delete CASCADE,
  constraint order_items_quantity_check check ((quantity > 0))
) TABLESPACE pg_default;

-- Enable Row Level Security (RLS) on Order Items
ALTER TABLE public.order_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow public select on order_items" ON public.order_items
    FOR SELECT TO public USING (true);

CREATE POLICY "Allow authenticated insert on order_items" ON public.order_items
    FOR INSERT TO authenticated WITH CHECK (true);

CREATE POLICY "Allow authenticated update on order_items" ON public.order_items
    FOR UPDATE TO authenticated USING (true);

CREATE POLICY "Allow authenticated delete on order_items" ON public.order_items
    FOR DELETE TO authenticated USING (true);


CREATE TABLE public.order_status_history (
  id uuid not null default gen_random_uuid (),
  order_id uuid not null,
  status text not null,
  note text null,
  created_at timestamp with time zone not null default now(),
  constraint order_status_history_pkey primary key (id),
  constraint order_status_history_order_id_fkey foreign KEY (order_id) references orders (id) on delete CASCADE
) TABLESPACE pg_default;

CREATE INDEX IF NOT EXISTS idx_order_status_history_order_id ON public.order_status_history USING btree (order_id) TABLESPACE pg_default;

-- Enable Row Level Security (RLS) on Order Status History
ALTER TABLE public.order_status_history ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow public select on order_status_history" ON public.order_status_history
    FOR SELECT TO public USING (true);

CREATE POLICY "Allow authenticated insert on order_status_history" ON public.order_status_history
    FOR INSERT TO authenticated WITH CHECK (true);

CREATE POLICY "Allow authenticated update on order_status_history" ON public.order_status_history
    FOR UPDATE TO authenticated USING (true);

CREATE POLICY "Allow authenticated delete on order_status_history" ON public.order_status_history
    FOR DELETE TO authenticated USING (true);

