-- ============================================================================
-- SHREE BANARASI SAREES: IN-STORE LOYALTY PROGRAM SCHEMA & RPC FUNCTIONS
-- ============================================================================

-- 1. Enable pgcrypto for industry-standard bcrypt hashing
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- 2. Add loyalty columns to existing `customers` table
ALTER TABLE public.customers
ADD COLUMN IF NOT EXISTS loyalty_member_code VARCHAR(16) UNIQUE,
ADD COLUMN IF NOT EXISTS loyalty_pin_hash TEXT,
ADD COLUMN IF NOT EXISTS loyalty_points_balance INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS loyalty_tier VARCHAR(20) DEFAULT 'Silver',
ADD COLUMN IF NOT EXISTS failed_pin_attempts INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS pin_locked_until TIMESTAMPTZ;

-- Index for instant lookup by member code (for QR code landing page)
CREATE INDEX IF NOT EXISTS idx_customers_loyalty_member_code 
ON public.customers(loyalty_member_code);

-- 3. Add loyalty tracking columns to `sales` table
ALTER TABLE public.sales
ADD COLUMN IF NOT EXISTS loyalty_points_redeemed INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS loyalty_points_earned INTEGER DEFAULT 0;

-- 4. Create immutable `loyalty_transactions` ledger table
CREATE TABLE IF NOT EXISTS public.loyalty_transactions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    customer_id UUID NOT NULL REFERENCES public.customers(id) ON DELETE CASCADE,
    sale_id UUID REFERENCES public.sales(id) ON DELETE SET NULL,
    points_change INTEGER NOT NULL,                         -- +65 (Earned) or -500 (Redeemed)
    balance_after INTEGER NOT NULL,                         -- Balance right after this transaction
    transaction_type VARCHAR(30) NOT NULL,                  -- 'EARNED', 'REDEEMED', 'MANUAL_BONUS', 'RETURN_REVERSAL'
    notes TEXT,                                             -- e.g. "Earned on invoice INV-2026-0042"
    created_at TIMESTAMPTZ DEFAULT NOW(),
    created_by UUID REFERENCES auth.users(id)
);

CREATE INDEX IF NOT EXISTS idx_loyalty_transactions_customer_id 
ON public.loyalty_transactions(customer_id, created_at DESC);

-- Enable Row Level Security (RLS) on loyalty_transactions
ALTER TABLE public.loyalty_transactions ENABLE ROW LEVEL SECURITY;

-- Allow authenticated users (cashiers/admins) full access to loyalty_transactions
DROP POLICY IF EXISTS "Allow staff full access to loyalty_transactions" ON public.loyalty_transactions;
CREATE POLICY "Allow staff full access to loyalty_transactions" 
ON public.loyalty_transactions
FOR ALL 
TO authenticated 
USING (true) 
WITH CHECK (true);

-- Allow public read access via the secure RPC function only (no direct public SELECT)
DROP POLICY IF EXISTS "Public no direct access to loyalty_transactions" ON public.loyalty_transactions;


-- 5. RPC: Public info check (Pre-PIN screen on QR scan)
-- MUST NEVER RETURN personal details, phone numbers, or points!
CREATE OR REPLACE FUNCTION public.get_loyalty_public_info(p_member_code TEXT)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_clean_code TEXT;
    v_exists BOOLEAN;
BEGIN
    v_clean_code := UPPER(TRIM(p_member_code));
    
    SELECT EXISTS (
        SELECT 1 FROM public.customers 
        WHERE loyalty_member_code = v_clean_code
    ) INTO v_exists;

    IF v_exists THEN
        RETURN jsonb_build_object(
            'valid', true,
            'member_code', v_clean_code
        );
    ELSE
        RETURN jsonb_build_object(
            'valid', false,
            'error', 'Membership record not found'
        );
    END IF;
END;
$$;

-- Grant public / anon access to the public check function
GRANT EXECUTE ON FUNCTION public.get_loyalty_public_info(TEXT) TO anon, authenticated;


-- 6. RPC: PIN Verification & Secure Rewards Fetch (Post-PIN screen)
-- Validates bcrypt hash, enforces 5-attempt rate limit (15 min lock), returns sanitized data
CREATE OR REPLACE FUNCTION public.verify_and_fetch_rewards(p_member_code TEXT, p_pin TEXT)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_clean_code TEXT;
    v_clean_pin TEXT;
    v_cust RECORD;
    v_recent_tx JSONB;
    v_first_name TEXT;
BEGIN
    v_clean_code := UPPER(TRIM(p_member_code));
    v_clean_pin := TRIM(p_pin);

    -- Find customer
    SELECT * INTO v_cust 
    FROM public.customers 
    WHERE loyalty_member_code = v_clean_code;

    IF v_cust IS NULL THEN
        RETURN jsonb_build_object('success', false, 'error', 'Invalid Member ID');
    END IF;

    -- Check if account has no PIN configured yet
    IF v_cust.loyalty_pin_hash IS NULL THEN
        RETURN jsonb_build_object(
            'success', false, 
            'error', 'Rewards PIN has not been set yet. Please visit the store billing counter to activate your rewards.'
        );
    END IF;

    -- Check if locked due to brute force
    IF v_cust.pin_locked_until IS NOT NULL AND v_cust.pin_locked_until > NOW() THEN
        RETURN jsonb_build_object(
            'success', false, 
            'error', 'Account temporarily locked due to multiple incorrect attempts. Please try again after 15 minutes.'
        );
    END IF;

    -- Verify bcrypt hash
    IF v_cust.loyalty_pin_hash = crypt(v_clean_pin, v_cust.loyalty_pin_hash) THEN
        -- Reset failed attempts on success
        UPDATE public.customers 
        SET failed_pin_attempts = 0, 
            pin_locked_until = NULL 
        WHERE id = v_cust.id;

        -- Extract first name only for privacy
        v_first_name := split_part(TRIM(v_cust.name), ' ', 1);
        IF v_first_name IS NULL OR v_first_name = '' THEN
            v_first_name := 'Valued Customer';
        END IF;

        -- Fetch last 5 ledger transactions
        SELECT jsonb_agg(
            jsonb_build_object(
                'points_change', points_change,
                'transaction_type', transaction_type,
                'created_at', created_at,
                'notes', notes
            )
        ) INTO v_recent_tx 
        FROM (
            SELECT points_change, transaction_type, created_at, notes
            FROM public.loyalty_transactions 
            WHERE customer_id = v_cust.id 
            ORDER BY created_at DESC 
            LIMIT 5
        ) t;

        -- Return sanitized data
        RETURN jsonb_build_object(
            'success', true,
            'member_code', v_clean_code,
            'first_name', v_first_name,
            'tier', COALESCE(v_cust.loyalty_tier, 'Silver'),
            'balance', COALESCE(v_cust.loyalty_points_balance, 0),
            'activity', COALESCE(v_recent_tx, '[]'::jsonb)
        );
    ELSE
        -- Increment failed attempts
        UPDATE public.customers 
        SET failed_pin_attempts = COALESCE(failed_pin_attempts, 0) + 1,
            pin_locked_until = CASE 
                WHEN COALESCE(failed_pin_attempts, 0) + 1 >= 5 THEN NOW() + INTERVAL '15 minutes' 
                ELSE NULL 
            END
        WHERE id = v_cust.id;

        IF COALESCE(v_cust.failed_pin_attempts, 0) + 1 >= 5 THEN
            RETURN jsonb_build_object(
                'success', false, 
                'error', 'Too many incorrect attempts. Account locked for 15 minutes.'
            );
        ELSE
            RETURN jsonb_build_object(
                'success', false, 
                'error', 'Incorrect PIN. Please try again. (' || (5 - (COALESCE(v_cust.failed_pin_attempts, 0) + 1)) || ' attempts remaining)'
            );
        END IF;
    END IF;
END;
$$;

-- Grant public / anon access to the verification function
GRANT EXECUTE ON FUNCTION public.verify_and_fetch_rewards(TEXT, TEXT) TO anon, authenticated;


-- 7. RPC: Set or Reset Customer Loyalty PIN (Used by Cashier/Admin)
CREATE OR REPLACE FUNCTION public.set_customer_loyalty_pin(
    p_customer_id UUID, 
    p_pin TEXT,
    p_member_code TEXT DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_clean_pin TEXT;
    v_code TEXT;
BEGIN
    v_clean_pin := TRIM(p_pin);

    IF length(v_clean_pin) < 4 OR length(v_clean_pin) > 6 THEN
        RETURN jsonb_build_object('success', false, 'error', 'PIN must be between 4 and 6 digits.');
    END IF;

    -- If member code not provided, keep existing or generate a new random 6-char code
    SELECT COALESCE(p_member_code, loyalty_member_code) INTO v_code
    FROM public.customers WHERE id = p_customer_id;

    IF v_code IS NULL OR v_code = '' THEN
        v_code := 'SR-' || UPPER(SUBSTRING(MD5(RANDOM()::TEXT) FROM 1 FOR 6));
    END IF;

    UPDATE public.customers
    SET loyalty_pin_hash = crypt(v_clean_pin, gen_salt('bf', 10)),
        loyalty_member_code = v_code,
        failed_pin_attempts = 0,
        pin_locked_until = NULL
    WHERE id = p_customer_id;

    RETURN jsonb_build_object(
        'success', true, 
        'member_code', v_code
    );
END;
$$;

GRANT EXECUTE ON FUNCTION public.set_customer_loyalty_pin(UUID, TEXT, TEXT) TO authenticated;
