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

const PUBLIC_INVENTORY_SELECT = 'id, saree_name, category, fabric, color, selling_price, stock, status, sku, design_code, description, mrp, discount_amount, discount_percentage, hsn_code, gst_rate, price_includes_gst, inventory_images(image_url, is_primary, sort_order)';

async function test() {
  const { data } = await supabase
    .from('storefront_products')
    .select(PUBLIC_INVENTORY_SELECT)
    .eq('status', 'active');

  const groups = {};
  data.forEach(p => {
    if (p.design_code) {
      if (!groups[p.design_code]) groups[p.design_code] = [];
      groups[p.design_code].push(p);
    }
  });

  for (const [dc, prods] of Object.entries(groups)) {
    if (prods.length > 1) {
      console.log(`\nDesign Code: ${dc} (${prods.length} products)`);
      prods.forEach(p => {
        const imgCount = p.inventory_images ? p.inventory_images.length : 0;
        const imgUrl = imgCount > 0 ? p.inventory_images[0].image_url : 'NO IMAGE';
        const isPrim = imgCount > 0 ? p.inventory_images[0].is_primary : false;
        console.log(`  - ${p.id} [${p.color}]: ${imgCount} imgs, primary=${isPrim}, ${imgUrl.slice(0, 60)}`);
      });
    }
  }
}

test();
