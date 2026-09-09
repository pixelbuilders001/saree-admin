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

async function main() {
  const { data: sfProds } = await supabase
    .from('storefront_products')
    .select('id, saree_name, color, design_code, inventory_images(id, image_url, is_primary, sort_order)')
    .eq('status', 'active');

  console.log(`Total active storefront products: ${sfProds.length}`);

  const byDesign = {};
  sfProds.forEach(p => {
    const dc = p.design_code || 'NO_DESIGN_CODE';
    if (!byDesign[dc]) byDesign[dc] = [];
    byDesign[dc].push(p);
  });

  console.log('\n--- Design codes summary ---');
  for (const [dc, prods] of Object.entries(byDesign)) {
    const withImg = prods.filter(p => p.inventory_images && p.inventory_images.length > 0);
    const withoutImg = prods.filter(p => !p.inventory_images || p.inventory_images.length === 0);
    if (withoutImg.length > 0) {
      console.log(`Design [${dc}]: Total ${prods.length} products | With images: ${withImg.length} | WITHOUT images: ${withoutImg.length}`);
      console.log(`  Prods without images:`, withoutImg.map(p => `${p.id} (${p.color})`).join(', '));
      console.log(`  Prods with images:`, withImg.map(p => `${p.id} (${p.color}): ${p.inventory_images[0].image_url}`).join(', '));
    }
  }
}

main().catch(console.error);
