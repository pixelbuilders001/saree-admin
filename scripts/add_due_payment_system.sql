-- ============================================================================
-- SHREE BANARASI SAREES: CUSTOMER DUES (UDHAR / PARTIAL PAYMENT) SCHEMA
-- ============================================================================

-- 1. Add due tracking columns to `sales` table
ALTER TABLE public.sales
ADD COLUMN IF NOT EXISTS amount_paid NUMERIC DEFAULT NULL,
ADD COLUMN IF NOT EXISTS due_amount NUMERIC DEFAULT 0,
ADD COLUMN IF NOT EXISTS payment_status VARCHAR(20) DEFAULT 'paid',
ADD COLUMN IF NOT EXISTS due_date DATE DEFAULT NULL;

-- 2. Backfill existing records: all previous sales are considered fully paid
UPDATE public.sales
SET 
    amount_paid = COALESCE(amount_paid, total_amount),
    due_amount = COALESCE(due_amount, 0),
    payment_status = COALESCE(payment_status, 'paid')
WHERE amount_paid IS NULL;

-- 3. Create index for fast filtering of sales with dues
CREATE INDEX IF NOT EXISTS idx_sales_due_amount ON public.sales(due_amount) WHERE due_amount > 0;
CREATE INDEX IF NOT EXISTS idx_sales_payment_status ON public.sales(payment_status);

-- 4. Create `due_payments` ledger table for recording repayments
CREATE TABLE IF NOT EXISTS public.due_payments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    sale_id UUID NOT NULL REFERENCES public.sales(id) ON DELETE CASCADE,
    customer_id UUID REFERENCES public.customers(id) ON DELETE SET NULL,
    amount NUMERIC NOT NULL CHECK (amount > 0),
    payment_mode VARCHAR(20) DEFAULT 'cash',
    notes TEXT,
    collected_by TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index for querying repayments by sale or customer
CREATE INDEX IF NOT EXISTS idx_due_payments_sale_id ON public.due_payments(sale_id);
CREATE INDEX IF NOT EXISTS idx_due_payments_customer_id ON public.due_payments(customer_id);

-- 5. Enable Row Level Security (RLS) on due_payments
ALTER TABLE public.due_payments ENABLE ROW LEVEL SECURITY;

-- Allow authenticated users (cashiers/admins) full access to due_payments
DROP POLICY IF EXISTS "Allow staff full access to due_payments" ON public.due_payments;
CREATE POLICY "Allow staff full access to due_payments" 
ON public.due_payments
FOR ALL 
TO authenticated 
USING (true) 
WITH CHECK (true);

-- Allow public read/write if using anon key in POS
DROP POLICY IF EXISTS "Allow anon access to due_payments" ON public.due_payments;
CREATE POLICY "Allow anon access to due_payments" 
ON public.due_payments
FOR ALL 
TO anon 
USING (true) 
WITH CHECK (true);
