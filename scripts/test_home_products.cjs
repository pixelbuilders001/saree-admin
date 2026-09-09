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

function mapDbProductToProduct(item) {
  let imageUrls = [];
  if (item.inventory_images && item.inventory_images.length > 0) {
    const sorted = [...item.inventory_images].sort((a, b) => {
      if (a.is_primary && !b.is_primary) return -1;
      if (!a.is_primary && b.is_primary) return 1;
      return (a.sort_order || 0) - (b.sort_order || 0);
    });
    imageUrls = sorted.map(img => img.image_url);
  }
  const idHash = item.id.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
  return {
    id: item.id,
    name: item.saree_name,
    design_code: item.design_code,
    color: item.color,
    images: imageUrls,
    bestseller: item.status === 'active' && (idHash % 5 === 0),
    newArrival: item.status === 'active' && (idHash % 3 === 0),
  };
}

async function test() {
  const { data, error } = await supabase
    .from('storefront_products')
    .select(PUBLIC_INVENTORY_SELECT)
    .eq('status', 'active');

  const products = data.map(mapDbProductToProduct);
  const bestsellers = products.filter(p => p.bestseller).slice(0, 8);
  const newArrivals = products.filter(p => p.newArrival).slice(0, 8);

  console.log('--- BESTSELLERS ON HOMEPAGE ---');
  bestsellers.forEach(p => {
    console.log(`${p.id} (${p.color}) - images: ${p.images.length} - ${p.images[0]?.slice(0, 70)}`);
  });

  console.log('\n--- NEW ARRIVALS ON HOMEPAGE ---');
  newArrivals.forEach(p => {
    console.log(`${p.id} (${p.color}) - images: ${p.images.length} - ${p.images[0]?.slice(0, 70)}`);
  });
}

test();
