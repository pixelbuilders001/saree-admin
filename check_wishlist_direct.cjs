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
    const { data: selectData, error: selectError } = await supabase.from('wishlist').select('*');
    if (selectError) {
        console.error("Wishlist select error:", selectError);
    } else {
        console.log("Wishlist data count:", selectData.length);
        console.log("Wishlist sample data:", selectData);
    }

    console.log("\nAttempting to insert a mock wishlist item...");
    // Let's use a real user id and product id from product_reviews
    const mockUserId = '97bb9d26-28ca-4a47-98d8-5c01fbb947bd';
    const mockProductId = 'S99083';

    const { data: insertData, error: insertError } = await supabase.from('wishlist').insert({
        user_id: mockUserId,
        product_id: mockProductId
    }).select();

    if (insertError) {
        console.error("Wishlist insert failed:", insertError);
    } else {
        console.log("Wishlist insert succeeded:", insertData);
        
        // Now read it back
        const { data: selectData2, error: selectError2 } = await supabase.from('wishlist').select('*');
        console.log("Read back count after insert:", selectData2 ? selectData2.length : 0);
        
        // Now clean up
        console.log("\nCleaning up mock insert...");
        const { error: deleteError } = await supabase.from('wishlist').delete().eq('user_id', mockUserId).eq('product_id', mockProductId);
        if (deleteError) {
            console.error("Wishlist delete failed:", deleteError);
        } else {
            console.log("Wishlist delete succeeded.");
        }
    }
}

testWishlist();
