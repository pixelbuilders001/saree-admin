-- ==============================================================================
-- Migration: Update display_style CHECK constraint on homepage_sections
-- ==============================================================================
-- Run this SQL in your Supabase Dashboard -> SQL Editor

-- 1. Drop existing check constraint
ALTER TABLE public.homepage_sections 
DROP CONSTRAINT IF EXISTS homepage_sections_display_style_check;

-- 2. Add updated check constraint with all 8 display styles
ALTER TABLE public.homepage_sections 
ADD CONSTRAINT homepage_sections_display_style_check 
CHECK (display_style IN (
    'banner',
    'grid',
    'carousel',
    'featured',
    'category_cards',
    'split_feature',
    'pinterest_grid',
    'offer_timer'
));
