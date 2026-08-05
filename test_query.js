const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');

// Parse .env
const envText = fs.readFileSync('.env', 'utf8');
const env = {};
envText.split('\n').forEach(line => {
    const parts = line.split('=');
    if (parts.length >= 2) {
        const key = parts[0].trim();
        const value = parts.slice(1).join('=').trim();
        env[key] = value;
    }
});

const supabaseUrl = env['VITE_SUPABASE_URL'];
const supabaseAnonKey = env['VITE_SUPABASE_ANON_KEY'];

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function checkConstraints() {
    console.log("Fetching sales...");
    const { data: sales, error: salesErr } = await supabase.from('sales').select('id').limit(1);
    if (salesErr) {
        console.error("Sales fetch error:", salesErr);
        return;
    }
    const { data: sarees, error: sareesErr } = await supabase.from('inventory').select('id').limit(1);
    if (sareesErr) {
        console.error("Sarees fetch error:", sareesErr);
        return;
    }
    if (!sales || sales.length === 0 || !sarees || sarees.length === 0) {
        console.log("No sales or sarees found to test insert");
        return;
    }

    const saleId = sales[0].id;
    const sareeId = sarees[0].id;

    console.log(`Testing insert into sale_items with sale_id: ${saleId}, saree_id: ${sareeId}...`);

    console.log("1. Trying quantity = 1, selling_price = -100...");
    const res1 = await supabase.from('sale_items').insert([{
        sale_id: saleId,
        saree_id: sareeId,
        quantity: 1,
        selling_price: -100
    }]);
    console.log("Result 1:", JSON.stringify(res1));

    console.log("2. Trying quantity = -1, selling_price = 100...");
    const res2 = await supabase.from('sale_items').insert([{
        sale_id: saleId,
        saree_id: sareeId,
        quantity: -1,
        selling_price: 100
    }]);
    console.log("Result 2:", JSON.stringify(res2));
}

checkConstraints();
