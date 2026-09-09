#!/usr/bin/env node

/**
 * cleanup_supabase_storage.cjs
 *
 * OPTIONAL CLEANUP SCRIPT for Supabase Storage.
 *
 * SAFETY RULES:
 * 1. Does NOT run automatically.
 * 2. Requires explicit `--confirm-delete` flag to delete anything.
 * 3. ONLY deletes files that have been verified to exist on ImageKit CDN (HTTP 200)
 *    and whose corresponding inventory_images record in Supabase is pointing to ImageKit.
 * 4. NEVER touches unmapped images or unverified records.
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
const BUCKET_NAME = 'sbs-inventory-images';
let IMAGEKIT_URL_ENDPOINT = env.IMAGEKIT_URL_ENDPOINT || env.VITE_IMAGEKIT_URL_ENDPOINT;
if (IMAGEKIT_URL_ENDPOINT && IMAGEKIT_URL_ENDPOINT.endsWith('/')) {
    IMAGEKIT_URL_ENDPOINT = IMAGEKIT_URL_ENDPOINT.slice(0, -1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

async function verifyUrl(url) {
    try {
        const res = await fetch(url, { method: 'HEAD' });
        return res.ok;
    } catch {
        return false;
    }
}

async function cleanup() {
    const isConfirmDelete = process.argv.includes('--confirm-delete');

    console.log('==================================================');
    console.log('SUPABASE STORAGE CLEANUP UTILITY (OPTIONAL)');
    console.log(`Bucket: ${BUCKET_NAME}`);
    console.log(`Mode: ${isConfirmDelete ? 'LIVE DELETION (--confirm-delete provided)' : 'DRY RUN (Preview Only)'}`);
    console.log('==================================================\n');

    if (!isConfirmDelete) {
        console.log('SAFETY NOTICE: Running in PREVIEW mode.');
        console.log('No files will be deleted from Supabase Storage.');
        console.log('To execute real deletions after complete storefront verification, run:');
        console.log('  node cleanup_supabase_storage.cjs --confirm-delete\n');
    }

    // 1. Fetch all inventory_images
    const { data: records, error: recErr } = await supabase
        .from('inventory_images')
        .select('*');

    if (recErr) throw recErr;

    // 2. Discover storage files
    const { data: topLevel, error: tlError } = await supabase.storage
        .from(BUCKET_NAME)
        .list('', { limit: 1000, sortBy: { column: 'name', order: 'asc' } });

    if (tlError) throw tlError;

    const eligibleForCleanup = [];
    const skippedNotMigrated = [];

    for (const folderItem of topLevel || []) {
        const inventoryId = folderItem.name;
        const { data: files } = await supabase.storage
            .from(BUCKET_NAME)
            .list(inventoryId, { limit: 1000 });

        for (const f of files || []) {
            if (f.name === '.emptyFolderPlaceholder') continue;
            const storagePath = `${inventoryId}/${f.name}`;

            // Check if there is a matching inventory_images record pointing to ImageKit
            const matchingRecord = records.find(r => {
                if (r.inventory_id !== inventoryId) return false;
                const fn = r.storage_key ? r.storage_key.split('/').pop() : '';
                return fn === f.name;
            });

            if (!matchingRecord) {
                // Unmapped file -> MUST NOT DELETE
                skippedNotMigrated.push({ path: storagePath, reason: 'unmapped (no DB record)' });
                continue;
            }

            const isImageKit = matchingRecord.image_url && matchingRecord.image_url.startsWith(IMAGEKIT_URL_ENDPOINT);
            if (!isImageKit) {
                // Still pointing to Supabase -> MUST NOT DELETE
                skippedNotMigrated.push({ path: storagePath, reason: 'database still pointing to Supabase' });
                continue;
            }

            // Verify accessible on ImageKit
            const accessible = await verifyUrl(matchingRecord.image_url);
            if (!accessible) {
                skippedNotMigrated.push({ path: storagePath, reason: 'ImageKit URL not responding with HTTP 200' });
                continue;
            }

            // Safe to clean up
            eligibleForCleanup.push({
                storagePath,
                inventoryId,
                filename: f.name,
                imagekitUrl: matchingRecord.image_url
            });
        }
    }

    console.log('==================================================');
    console.log('CLEANUP AUDIT RESULTS');
    console.log('==================================================');
    console.log(`Total storage files inspected: ${eligibleForCleanup.length + skippedNotMigrated.length}`);
    console.log(`Eligible for cleanup (verified on ImageKit): ${eligibleForCleanup.length}`);
    console.log(`Retained files (not eligible): ${skippedNotMigrated.length}`);
    console.log('==================================================\n');

    if (isConfirmDelete && eligibleForCleanup.length > 0) {
        console.log('Starting deletion of verified files from Supabase Storage...');
        const pathsToDelete = eligibleForCleanup.map(e => e.storagePath);

        // Delete in batches of 50
        const batchSize = 50;
        let deletedCount = 0;
        for (let i = 0; i < pathsToDelete.length; i += batchSize) {
            const batch = pathsToDelete.slice(i, i + batchSize);
            const { error: delErr } = await supabase.storage
                .from(BUCKET_NAME)
                .remove(batch);

            if (delErr) {
                console.error(`Error deleting batch ${i / batchSize + 1}:`, delErr.message);
            } else {
                deletedCount += batch.length;
                console.log(`Deleted batch of ${batch.length} files (${deletedCount}/${pathsToDelete.length}).`);
            }
        }
        console.log(`\nCleanup complete: ${deletedCount} files deleted from '${BUCKET_NAME}'.`);
    } else if (!isConfirmDelete) {
        console.log('Preview complete. 0 files deleted.');
    }
}

cleanup().catch(err => {
    console.error('Cleanup error:', err);
    process.exit(1);
});
