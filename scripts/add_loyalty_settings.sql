-- ============================================================================
-- SHREE BANARASI SAREES: IN-STORE LOYALTY PROGRAM CONFIGURATION SETTINGS
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.loyalty_settings (
    id TEXT PRIMARY KEY DEFAULT 'default',
    is_active BOOLEAN NOT NULL DEFAULT true,
    earn_percentage NUMERIC NOT NULL DEFAULT 1,             -- 1% (1 pt per ₹100 spent)
    point_value_in_inr NUMERIC NOT NULL DEFAULT 1,          -- ₹1 per point
    min_points_to_redeem INTEGER NOT NULL DEFAULT 100,      -- Min balance needed to unlock redemption
    min_bill_amount_for_redeem NUMERIC NOT NULL DEFAULT 1000, -- Min bill amount in ₹
    max_redeem_percent_of_bill NUMERIC NOT NULL DEFAULT 25,  -- Max 25% of bill payable via points
    max_points_per_order INTEGER NOT NULL DEFAULT 1000,      -- Max points per order (0 = unlimited)
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    updated_by TEXT
);

-- Enable Row Level Security
ALTER TABLE public.loyalty_settings ENABLE ROW LEVEL SECURITY;

-- Allow read access to all users
DROP POLICY IF EXISTS "Allow select on loyalty_settings" ON public.loyalty_settings;
CREATE POLICY "Allow select on loyalty_settings" 
ON public.loyalty_settings 
FOR SELECT 
USING (true);

-- Allow authenticated users (Admins / Cashiers) to insert/update settings
DROP POLICY IF EXISTS "Allow authenticated modify on loyalty_settings" ON public.loyalty_settings;
CREATE POLICY "Allow authenticated modify on loyalty_settings" 
ON public.loyalty_settings 
FOR ALL 
TO authenticated 
USING (true) 
WITH CHECK (true);

-- Seed initial default configuration row
INSERT INTO public.loyalty_settings (
    id,
    is_active,
    earn_percentage,
    point_value_in_inr,
    min_points_to_redeem,
    min_bill_amount_for_redeem,
    max_redeem_percent_of_bill,
    max_points_per_order
) VALUES (
    'default',
    true,
    1,
    1,
    100,
    1000,
    25,
    1000
) ON CONFLICT (id) DO NOTHING;
