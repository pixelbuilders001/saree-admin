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
