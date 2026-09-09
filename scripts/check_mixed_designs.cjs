const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

const env = {};
const envText = fs.readFileSync(path.resolve(__dirname, '../.env'), 'utf8');
envText.split('\n').forEach(line => {
  const t = line.trim();
  if (!t || t.startsWith('#')) return;
  const idx = t.indexOf('=');
  if (idx !== -1) {
    let v = t.slice(idx + 1).trim();
    if ((v.startsWith('"') && v.endsWith('"')) || (v.startsWith("'") && v.endsWith("'"))) v = v.slice(1, -1);
    env[t.slice(0, idx).trim()] = v;
  }
});

const supabase = createClient(env.VITE_SUPABASE_URL, env.VITE_SUPABASE_ANON_KEY);

async function test() {
  const { data } = await supabase
    .from('storefront_products')
    .select('id, saree_name, color, design_code, inventory_images(id, image_url, is_primary, sort_order)')
    .eq('status', 'active');

  const groups = {};
  data.forEach(p => {
    const dc = p.design_code || 'NONE';
    if (!groups[dc]) groups[dc] = [];
    groups[dc].push(p);
  });

  console.log('--- Checking mixed design codes (some with images, some without) ---');
  for (const [dc, prods] of Object.entries(groups)) {
    const withImg = prods.filter(p => p.inventory_images && p.inventory_images.length > 0);
    const withoutImg = prods.filter(p => !p.inventory_images || p.inventory_images.length === 0);
    if (withImg.length > 0 && withoutImg.length > 0) {
      console.log(`\nMixed Design Code [${dc}]: Total ${prods.length} products`);
      console.log(`  HAS IMAGES (${withImg.length}):`);
      withImg.forEach(p => console.log(`    ${p.id} [${p.color}]: ${p.inventory_images.map(i => i.image_url.slice(-25)).join(', ')}`));
      console.log(`  MISSING IMAGES (${withoutImg.length}):`);
      withoutImg.forEach(p => console.log(`    ${p.id} [${p.color}]`));
    }
  }
}

test();
