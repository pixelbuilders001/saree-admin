#!/usr/bin/env node

/**
 * apply_sql_updates.cjs
 *
 * Applies the generated ImageKit URLs and storage_key updates to the inventory_images
 * table in Supabase.
 *
 * Requirements:
 * - If SUPABASE_SERVICE_ROLE_KEY is set in .env or environment, updates are applied via
 *   the Supabase PostgREST API with service role privileges.
 * - Otherwise, instructions are printed to execute `scripts/update_inventory_images.sql`
 *   in the Supabase SQL Editor.
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
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || env.SUPABASE_SERVICE_ROLE_KEY;

const STATE_FILE = path.resolve(__dirname, 'migration_state.json');
const SQL_FILE = path.resolve(__dirname, 'update_inventory_images.sql');

async function main() {
    console.log('==================================================');
    console.log('APPLY INVENTORY_IMAGES DATABASE UPDATES');
    console.log('==================================================\n');

    if (!fs.existsSync(STATE_FILE)) {
        console.error('Error: migration_state.json not found. Run migrate_images_to_imagekit.cjs first.');
        process.exit(1);
    }

    const state = JSON.parse(fs.readFileSync(STATE_FILE, 'utf8'));
    const records = Object.values(state.records).filter(r => r.status === 'verified');
    console.log(`Found ${records.length} verified ImageKit migration records in state.\n`);

    const hasServiceKey = SUPABASE_SERVICE_ROLE_KEY && !SUPABASE_SERVICE_ROLE_KEY.includes('your_');

    if (hasServiceKey) {
        console.log('SUPABASE_SERVICE_ROLE_KEY detected. Applying updates via Supabase API...');
        const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

        let updatedCount = 0;
        let failedCount = 0;

        for (let i = 0; i < records.length; i++) {
            const r = records[i];
            const { data, error } = await supabase
                .from('inventory_images')
                .update({
                    image_url: r.imagekit_url,
                    storage_key: r.imagekit_path
                })
                .eq('id', r.id)
                .select();

            if (error || !data || data.length === 0) {
                console.error(`[FAILED] ID: ${r.id}, Product: ${r.inventory_id} -> ${error?.message || '0 rows updated'}`);
                failedCount++;
            } else {
                r.db_updated = true;
                updatedCount++;
                if ((i + 1) % 20 === 0 || i === records.length - 1) {
                    console.log(`Progress: ${i + 1}/${records.length} records updated.`);
                }
            }
        }

        fs.writeFileSync(STATE_FILE, JSON.stringify(state, null, 2), 'utf8');
        console.log(`\nCompleted: ${updatedCount} records successfully updated in Supabase, ${failedCount} failed.`);
    } else {
        console.log('NOTICE: No SUPABASE_SERVICE_ROLE_KEY found in .env.');
        console.log(`A ready-to-run SQL script has been prepared with all ${records.length} updates:`);
        console.log(`  File: ${SQL_FILE}\n`);
        console.log('HOW TO APPLY VIA SUPABASE DASHBOARD:');
        console.log('1. Open your Supabase project dashboard (vzqlsawxvvyvsstyzzff).');
        console.log('2. Go to the "SQL Editor" in the left sidebar.');
        console.log('3. Paste the contents of `update_inventory_images.sql` and click "Run".');
        console.log('All 121 inventory_images records will be updated atomically in 1 second.\n');
        console.log('OR: Set SUPABASE_SERVICE_ROLE_KEY in `.env` and re-run:');
        console.log('  node scripts/apply_sql_updates.cjs\n');
    }
}

main().catch(err => {
    console.error('Error applying updates:', err);
    process.exit(1);
});
