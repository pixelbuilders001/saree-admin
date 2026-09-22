-- ==============================================================================
-- Migration: Add collection_id support to hero_banners
-- ==============================================================================
-- Run this script in your Supabase Dashboard -> SQL Editor (optional, code also provides fallback)

-- 1. Add collection_id column if it doesn't already exist
ALTER TABLE public.hero_banners 
ADD COLUMN IF NOT EXISTS collection_id UUID REFERENCES public.collections(id) ON DELETE SET NULL;

-- 2. Add an index for quick lookup
CREATE INDEX IF NOT EXISTS idx_hero_banners_collection_id ON public.hero_banners(collection_id);

-- 3. Comment on column
COMMENT ON COLUMN public.hero_banners.collection_id IS 'Optional foreign key to collections table for collection page redirection';
