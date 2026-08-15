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

async function testWishlist() {
    console.log("Querying wishlist...");
    const { data, error } = await supabase.from('wishlist').select('*');
    if (error) {
        console.error("Wishlist query error:", error);
    } else {
        console.log("Wishlist data count:", data.length);
        console.log("Wishlist sample data:", data);
    }

    console.log("\nQuerying product_reviews...");
    const { data: reviewsData, error: reviewsError } = await supabase.from('product_reviews').select('*');
    if (reviewsError) {
        console.error("Reviews query error:", reviewsError);
    } else {
        console.log("Reviews data count:", reviewsData.length);
    }
}

testWishlist();
