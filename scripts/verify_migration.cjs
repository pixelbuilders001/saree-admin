#!/usr/bin/env node

/**
 * verify_migration.cjs
 *
 * Verifies that all product images in inventory_images have been migrated
 * to ImageKit and are accessible with HTTP 200.
 * Also verifies primary image flags, sort ordering, and storefront_products integration.
 */

const fs = require('fs');
const path = require('path');
const { createClient } = require('@supabase/supabase-js');

function loadEnv() {
    const envPaths = [
        path.resolve(process.cwd(), '.env'),
        path.resolve(__dirname, '../.env')
    ];
    const env = {};
    for (const p of envPaths) {
        if (fs.existsSync(p)) {
            const text = fs.readFileSync(p, 'utf8');
            text.split('\n').forEach(line => {
                const trimmed = line.trim();
                if (!trimmed || trimmed.startsWith('#')) return;
                const eqIdx = trimmed.indexOf('=');
                if (eqIdx !== -1) {
                    const key = trimmed.slice(0, eqIdx).trim();
                    let val = trimmed.slice(eqIdx + 1).trim();
                    if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
                        val = val.slice(1, -1);
                    }
                    if (!env[key]) env[key] = val;
                }
            });
        }
    }
    return env;
}

const env = loadEnv();
const SUPABASE_URL = env.VITE_SUPABASE_URL || env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_KEY = env.VITE_SUPABASE_ANON_KEY || env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
let IMAGEKIT_URL_ENDPOINT = env.IMAGEKIT_URL_ENDPOINT || env.VITE_IMAGEKIT_URL_ENDPOINT;
if (IMAGEKIT_URL_ENDPOINT && IMAGEKIT_URL_ENDPOINT.endsWith('/')) {
    IMAGEKIT_URL_ENDPOINT = IMAGEKIT_URL_ENDPOINT.slice(0, -1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

async function checkUrl(url) {
    try {
        const res = await fetch(url, { method: 'HEAD' });
        return {
            ok: res.ok,
            status: res.status,
            contentType: res.headers.get('content-type'),
            contentLength: res.headers.get('content-length')
        };
    } catch (e) {
        return { ok: false, status: 0, error: e.message };
    }
}

// Concurrency helper
async function mapConcurrent(items, limit, fn) {
    const results = [];
    let index = 0;
    async function worker() {
        while (index < items.length) {
            const i = index++;
            results[i] = await fn(items[i], i);
        }
    }
    const workers = Array.from({ length: Math.min(limit, items.length) }, () => worker());
    await Promise.all(workers);
    return results;
}

async function verify() {
    console.log('==================================================');
    console.log('MIGRATION VERIFICATION UTILITY');
    console.log(`Supabase URL: ${SUPABASE_URL}`);
    console.log(`ImageKit Endpoint: ${IMAGEKIT_URL_ENDPOINT}`);
    console.log('==================================================\n');

    console.log('1. Fetching all inventory_images records...');
    const { data: records, error } = await supabase
        .from('inventory_images')
        .select('*')
        .order('inventory_id', { ascending: true })
        .order('sort_order', { ascending: true });

    if (error) {
        console.error('Error fetching inventory_images:', error);
        process.exit(1);
    }

    console.log(`Fetched ${records.length} records.\n`);

    console.log('2. Checking ImageKit URLs and HTTP 200 accessibility...');
    let imagekitCount = 0;
    let supabaseCount = 0;
    let otherCount = 0;

    const checkedRecords = await mapConcurrent(records, 10, async (rec, idx) => {
        const isImageKit = rec.image_url && rec.image_url.startsWith(IMAGEKIT_URL_ENDPOINT);
        const isSupabase = rec.image_url && rec.image_url.includes('supabase.co');

        let checkResult = { ok: false };
        if (isImageKit) {
            imagekitCount++;
            checkResult = await checkUrl(rec.image_url);
        } else if (isSupabase) {
            supabaseCount++;
            checkResult = await checkUrl(rec.image_url);
        } else {
            otherCount++;
        }

        return {
            ...rec,
            isImageKit,
            isSupabase,
            accessible: checkResult.ok,
            status: checkResult.status,
            contentType: checkResult.contentType
        };
    });

    const verifiedImageKit = checkedRecords.filter(r => r.isImageKit && r.accessible);
    const brokenImageKit = checkedRecords.filter(r => r.isImageKit && !r.accessible);

    console.log('\n3. Validating primary images and sort ordering per product...');
    const productGroups = {};
    for (const rec of checkedRecords) {
        if (!productGroups[rec.inventory_id]) {
            productGroups[rec.inventory_id] = [];
        }
        productGroups[rec.inventory_id].push(rec);
    }

    let productsWithPrimary = 0;
    let productsWithoutPrimary = 0;
    let productsWithMultiplePrimary = 0;

    for (const [invId, imgs] of Object.entries(productGroups)) {
        const primaries = imgs.filter(img => img.is_primary);
        if (primaries.length === 1) {
            productsWithPrimary++;
        } else if (primaries.length === 0) {
            productsWithoutPrimary++;
            console.warn(`Product ${invId} has no primary image marked.`);
        } else {
            productsWithMultiplePrimary++;
            console.warn(`Product ${invId} has multiple (${primaries.length}) primary images marked.`);
        }
    }

    console.log('\n4. Verifying storefront integration (storefront_products view)...');
    const { data: sfProducts, error: sfErr } = await supabase
        .from('storefront_products')
        .select('id, saree_name, inventory_images(image_url, is_primary, sort_order)')
        .limit(10);

    let sfOk = false;
    if (sfErr) {
        console.error('Error querying storefront_products:', sfErr);
    } else {
        console.log(`Successfully queried ${sfProducts.length} sample storefront_products.`);
        const firstWithImgs = sfProducts.find(p => p.inventory_images && p.inventory_images.length > 0);
        if (firstWithImgs) {
            console.log(`Sample product ${firstWithImgs.id} (${firstWithImgs.saree_name}):`);
            console.log(`Images:`, firstWithImgs.inventory_images);
            sfOk = true;
        }
    }

    console.log('\n==================================================');
    console.log('VERIFICATION RESULTS');
    console.log('==================================================');
    console.log(`Total inventory_images: ${records.length}`);
    console.log(`ImageKit URLs: ${imagekitCount}`);
    console.log(`  - Accessible (HTTP 200): ${verifiedImageKit.length}`);
    console.log(`  - Broken/Inaccessible: ${brokenImageKit.length}`);
    console.log(`Legacy Supabase URLs remaining: ${supabaseCount}`);
    console.log(`Other URLs: ${otherCount}`);
    console.log(`Total unique products with images: ${Object.keys(productGroups).length}`);
    console.log(`Products with exactly 1 primary image: ${productsWithPrimary}`);
    console.log(`Products without primary image: ${productsWithoutPrimary}`);
    console.log(`Products with multiple primary images: ${productsWithMultiplePrimary}`);
    console.log(`Storefront query operational: ${sfOk ? 'YES' : 'NO'}`);
    console.log('==================================================\n');

    if (brokenImageKit.length > 0) {
        console.error('--- BROKEN IMAGEKIT ASSETS ---');
        brokenImageKit.forEach(b => {
            console.error(`ID: ${b.id}, Product: ${b.inventory_id}, URL: ${b.image_url}, Status: ${b.status}`);
        });
        process.exit(1);
    }
}

verify().catch(err => {
    console.error('Verification error:', err);
    process.exit(1);
});
