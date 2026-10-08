-- ==============================================================================
-- ADD-ONS SALES LEDGER TABLE MIGRATION
-- Table: public.addon_sales
-- Allows recording sales of add-ons/accessories directly with stock deductions.
-- Run this in the Supabase Dashboard SQL Editor (Project: vzqlsawxvvyvsstyzzff).
-- ==============================================================================

CREATE TABLE IF NOT EXISTS public.addon_sales (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    addon_id UUID REFERENCES public.addons(id) ON DELETE SET NULL,
    addon_name TEXT NOT NULL,
    category TEXT DEFAULT 'Other',
    quantity INTEGER NOT NULL CHECK (quantity > 0),
    unit_price NUMERIC NOT NULL CHECK (unit_price >= 0),
    total_amount NUMERIC NOT NULL CHECK (total_amount >= 0),
    customer_name TEXT DEFAULT 'Walk-in Customer',
    payment_method TEXT DEFAULT 'Cash',
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_addon_sales_created_at ON public.addon_sales(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_addon_sales_addon_id ON public.addon_sales(addon_id);

-- Enable Row Level Security (RLS)
ALTER TABLE public.addon_sales ENABLE ROW LEVEL SECURITY;

-- Allow public read access to sales ledger
CREATE POLICY "Allow public select on addon_sales" ON public.addon_sales
    FOR SELECT TO public USING (true);

-- Allow public insert to sales ledger
CREATE POLICY "Allow public insert on addon_sales" ON public.addon_sales
    FOR INSERT TO public WITH CHECK (true);

-- Allow public update to sales ledger
CREATE POLICY "Allow public update on addon_sales" ON public.addon_sales
    FOR UPDATE TO public USING (true);

-- Allow public delete to sales ledger
CREATE POLICY "Allow public delete on addon_sales" ON public.addon_sales
    FOR DELETE TO public USING (true);
