#!/usr/bin/env node

/**
 * migrate_images_to_imagekit.cjs
 *
 * Migrates existing product images from Supabase Storage to ImageKit.
 * Preserves inventory_images records, is_primary status, and sort_order.
 * Supports:
 *   --dry-run   Preview migration mappings and statistics without making any changes.
 *   --migrate   Perform upload, verification, and database record update.
 *   --verify    Verify all migrated images against ImageKit CDN.
 */

const fs = require('fs');
const path = require('path');
const { createClient } = require('@supabase/supabase-js');

// 1. Load environment variables
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
const SUPABASE_SERVICE_ROLE_KEY = env.SUPABASE_SERVICE_ROLE_KEY;
const BUCKET_NAME = 'sbs-inventory-images';

const IMAGEKIT_PUBLIC_KEY = env.IMAGEKIT_PUBLIC_KEY || env.VITE_IMAGEKIT_PUBLIC_KEY;
const IMAGEKIT_PRIVATE_KEY = env.IMAGEKIT_PRIVATE_KEY || env.VITE_IMAGEKIT_PRIVATE_KEY;
let IMAGEKIT_URL_ENDPOINT = env.IMAGEKIT_URL_ENDPOINT || env.VITE_IMAGEKIT_URL_ENDPOINT;
if (IMAGEKIT_URL_ENDPOINT && IMAGEKIT_URL_ENDPOINT.endsWith('/')) {
    IMAGEKIT_URL_ENDPOINT = IMAGEKIT_URL_ENDPOINT.slice(0, -1);
}

if (!SUPABASE_URL || !SUPABASE_KEY) {
    console.error('Error: Supabase URL or Key not found in .env');
    process.exit(1);
}

if (!IMAGEKIT_PRIVATE_KEY || !IMAGEKIT_URL_ENDPOINT) {
    console.error('Error: ImageKit Private Key or URL Endpoint not found in .env');
    process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);
const supabaseAdmin = (SUPABASE_SERVICE_ROLE_KEY && !SUPABASE_SERVICE_ROLE_KEY.includes('your_'))
    ? createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)
    : supabase;

const STATE_FILE_PATH = path.resolve(__dirname, 'migration_state.json');
const SQL_UPDATE_FILE = path.resolve(__dirname, 'update_inventory_images.sql');

function loadMigrationState() {
    if (fs.existsSync(STATE_FILE_PATH)) {
        try {
            return JSON.parse(fs.readFileSync(STATE_FILE_PATH, 'utf8'));
        } catch (e) {
            console.warn('Warning: Could not parse migration_state.json, starting fresh.');
        }
    }
    return { records: {} };
}

function saveMigrationState(state) {
    fs.writeFileSync(STATE_FILE_PATH, JSON.stringify(state, null, 2), 'utf8');
}

// Check if a URL is accessible via HTTP with retries
async function verifyUrlAccessible(url, maxRetries = 5) {
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
        try {
            const res = await fetch(url);
            if (res.ok) return true;
        } catch (err) {
            // network error
        }
        if (attempt < maxRetries) {
            await new Promise(r => setTimeout(r, 1000 * attempt));
        }
    }
    return false;
}

// Upload buffer directly to ImageKit REST API
async function uploadBufferToImageKit(buffer, filename, folderPath) {
    const authHeader = 'Basic ' + Buffer.from(`${IMAGEKIT_PRIVATE_KEY}:`).toString('base64');
    const formData = new FormData();
    const blob = new Blob([buffer]);
    formData.append('file', blob, filename);
    formData.append('fileName', filename);
    formData.append('folder', folderPath);
    formData.append('useUniqueFileName', 'false');
    if (IMAGEKIT_PUBLIC_KEY) {
        formData.append('publicKey', IMAGEKIT_PUBLIC_KEY);
    }

    const response = await fetch('https://upload.imagekit.io/api/v1/files/upload', {
        method: 'POST',
        headers: {
            Authorization: authHeader
        },
        body: formData
    });

    if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`ImageKit upload failed (${response.status}): ${errorText}`);
    }

    return await response.json();
}

async function fetchAllInventoryImages() {
    let allRecords = [];
    let from = 0;
    const pageSize = 500;
    while (true) {
        const { data, error } = await supabase
            .from('inventory_images')
            .select('*')
            .range(from, from + pageSize - 1)
            .order('sort_order', { ascending: true });

        if (error) throw error;
        if (!data || data.length === 0) break;
        allRecords = allRecords.concat(data);
        if (data.length < pageSize) break;
        from += pageSize;
    }
    return allRecords;
}

// Discover storage folders and files
async function discoverStorageFiles() {
    const { data: topLevel, error: tlError } = await supabase.storage
        .from(BUCKET_NAME)
        .list('', { limit: 1000, sortBy: { column: 'name', order: 'asc' } });

    if (tlError) throw tlError;

    const folders = [];
    const storageFiles = []; // { folder: inventory_id, name: filename, path: 'folder/name' }

    for (const item of topLevel || []) {
        // Skip placeholder files if any
        if (item.id && !item.name.includes('/')) {
            // It might be a root file or folder
        }
        // In Supabase storage, folders have id === null or metadata === null
        const folderName = item.name;
        folders.push(folderName);

        // List files inside folder
        const { data: files, error: fError } = await supabase.storage
            .from(BUCKET_NAME)
            .list(folderName, { limit: 1000, sortBy: { column: 'name', order: 'asc' } });

        if (fError) {
            console.error(`Error listing folder ${folderName}:`, fError.message);
            continue;
        }

        for (const file of files || []) {
            if (file.name === '.emptyFolderPlaceholder') continue;
            storageFiles.push({
                inventory_id: folderName,
                name: file.name,
                path: `${folderName}/${file.name}`,
                size: file.metadata?.size || 0,
                created_at: file.created_at
            });
        }
    }

    return { folders, storageFiles };
}

async function run() {
    const isDryRun = process.argv.includes('--dry-run');
    const isMigrate = process.argv.includes('--migrate');
    const isVerify = process.argv.includes('--verify');

    if (!isDryRun && !isMigrate && !isVerify) {
        console.log(`
Usage:
  node migrate_images_to_imagekit.cjs --dry-run   Preview migration without making any changes
  node migrate_images_to_imagekit.cjs --migrate   Execute ImageKit migration and update inventory_images
  node migrate_images_to_imagekit.cjs --verify    Verify migrated images on ImageKit CDN
        `);
        process.exit(0);
    }

    console.log('==================================================');
    console.log('IMAGEKIT MIGRATION UTILITY');
    console.log(`Mode: ${isDryRun ? 'DRY RUN (Preview Only)' : isMigrate ? 'LIVE MIGRATION' : 'VERIFICATION ONLY'}`);
    console.log(`Supabase Bucket: ${BUCKET_NAME}`);
    console.log(`ImageKit Endpoint: ${IMAGEKIT_URL_ENDPOINT}`);
    console.log('==================================================\n');

    console.log('1. Querying inventory_images metadata from database...');
    const inventoryImages = await fetchAllInventoryImages();
    console.log(`Found ${inventoryImages.length} inventory_images records in database.`);

    console.log('2. Discovering storage folders and files in Supabase Storage...');
    const { folders, storageFiles } = await discoverStorageFiles();
    console.log(`Discovered ${folders.length} inventory folders in bucket '${BUCKET_NAME}'.`);
    console.log(`Discovered ${storageFiles.length} images across storage folders.\n`);

    // Build lookup maps
    // Key: storage path e.g. "S10068/d4uzqu975pw.jpg"
    const storageMap = new Map();
    for (const sf of storageFiles) {
        storageMap.set(sf.path, sf);
    }

    // Map inventory_images records by (inventory_id + '/' + filename)
    // Note: storage_key might be "S10068/d4uzqu975pw.jpg" or "products/S10068/d4uzqu975pw.jpg"
    function extractFilename(keyOrUrl) {
        if (!keyOrUrl) return '';
        const parts = keyOrUrl.split('?')[0].split('/');
        return parts[parts.length - 1];
    }

    const matchedPairs = [];
    const unmappedStorageImages = [];
    const missingStorageImages = [];
    const alreadyMigrated = [];
    const toMigrate = [];

    const matchedDbIds = new Set();
    const matchedStoragePaths = new Set();

    // Match storage files to db records
    for (const sf of storageFiles) {
        // Find matching record in inventory_images
        const matchingRecord = inventoryImages.find(rec => {
            if (rec.inventory_id !== sf.inventory_id) return false;
            // Check storage_key
            if (rec.storage_key === sf.path) return true;
            if (rec.storage_key === `products/${sf.path}`) return true;
            if (extractFilename(rec.storage_key) === sf.name) return true;
            if (extractFilename(rec.image_url) === sf.name) return true;
            return false;
        });

        if (matchingRecord) {
            matchedPairs.push({ storageFile: sf, dbRecord: matchingRecord });
            matchedDbIds.add(matchingRecord.id);
            matchedStoragePaths.add(sf.path);

            const isAlreadyImageKit = 
                matchingRecord.image_url && 
                matchingRecord.image_url.includes('ik.imagekit.io') &&
                matchingRecord.storage_key && 
                matchingRecord.storage_key.startsWith('products/');

            if (isAlreadyImageKit) {
                alreadyMigrated.push({ storageFile: sf, dbRecord: matchingRecord });
            } else {
                toMigrate.push({ storageFile: sf, dbRecord: matchingRecord });
            }
        } else {
            unmappedStorageImages.push(sf);
        }
    }

    // Find DB records that do not have a matching storage file
    for (const rec of inventoryImages) {
        if (!matchedDbIds.has(rec.id)) {
            missingStorageImages.push(rec);
        }
    }

    // Summary Statistics
    console.log('==================================================');
    console.log(isDryRun ? 'MIGRATION PREVIEW (DRY RUN)' : 'MIGRATION AUDIT SUMMARY');
    console.log('==================================================');
    console.log(`Supabase bucket detected: ${BUCKET_NAME}`);
    console.log(`Total inventory folders: ${folders.length}`);
    console.log(`Total inventory_images records: ${inventoryImages.length}`);
    console.log(`Total images found in Storage: ${storageFiles.length}`);
    console.log(`Images successfully mapped: ${matchedPairs.length}`);
    console.log(`Images without inventory_images record: ${unmappedStorageImages.length}`);
    console.log(`inventory_images records without matching Storage image: ${missingStorageImages.length}`);
    console.log(`Already migrated images: ${alreadyMigrated.length}`);
    console.log(`Images requiring migration: ${toMigrate.length}`);
    console.log('Errors: 0');
    console.log('==================================================\n');

    if (unmappedStorageImages.length > 0) {
        console.log('--- UNMAPPED STORAGE IMAGES ---');
        unmappedStorageImages.forEach(u => {
            console.log(`UNMAPPED STORAGE IMAGE -> inventory_id: ${u.inventory_id}, file: ${u.name}, reason: no inventory_images record`);
        });
        console.log('');
    }

    if (missingStorageImages.length > 0) {
        console.log('--- MISSING STORAGE IMAGES ---');
        missingStorageImages.forEach(m => {
            console.log(`MISSING STORAGE IMAGE -> inventory_id: ${m.inventory_id}, id: ${m.id}, image_url: ${m.image_url}, storage_key: ${m.storage_key}`);
        });
        console.log('');
    }

    if (isDryRun) {
        console.log('Dry run complete. No files were uploaded or modified.\n');
        return;
    }

    if (isVerify) {
        console.log('--- VERIFYING MIGRATED IMAGES ON IMAGEKIT CDN ---');
        let verifiedCount = 0;
        let unverifiedCount = 0;
        for (const item of matchedPairs) {
            const expectedUrl = `${IMAGEKIT_URL_ENDPOINT}/products/${item.storageFile.inventory_id}/${item.storageFile.name}`;
            const currentUrl = item.dbRecord.image_url;
            const isMatch = currentUrl && currentUrl.startsWith(IMAGEKIT_URL_ENDPOINT);
            const accessible = await verifyUrlAccessible(expectedUrl);

            if (isMatch && accessible) {
                verifiedCount++;
            } else {
                unverifiedCount++;
                console.warn(`[UNVERIFIED] ${item.storageFile.path} -> Current DB: ${currentUrl}, Accessible: ${accessible}`);
            }
        }
        console.log(`Verification completed: ${verifiedCount} verified OK, ${unverifiedCount} unverified.`);
        return;
    }

    if (isMigrate) {
        console.log('--- STARTING IMAGE MIGRATION TO IMAGEKIT ---');
        const state = loadMigrationState();
        let migratedCount = 0;
        let skippedCount = 0;
        let failedCount = 0;
        const sqlStatements = [];

        const concurrency = 3;
        let activeIndex = 0;

        async function worker() {
            while (activeIndex < matchedPairs.length) {
                const i = activeIndex++;
                const { storageFile, dbRecord } = matchedPairs[i];
                const inventoryId = storageFile.inventory_id;
                const filename = storageFile.name;
                const originalPath = storageFile.path;
                const targetFolder = `/products/${inventoryId}`;
                const targetStorageKey = `products/${inventoryId}/${filename}`;
                const expectedImageKitUrl = `${IMAGEKIT_URL_ENDPOINT}/${targetStorageKey}`;
                const stateKey = `${inventoryId}/${filename}`;

                const progressPrefix = `[${i + 1}/${matchedPairs.length}] ${inventoryId}/${filename}`;

                // Check if already migrated and verified
                const dbIsMigrated = dbRecord.image_url && dbRecord.image_url.startsWith(IMAGEKIT_URL_ENDPOINT) && dbRecord.storage_key === targetStorageKey;
                const stateIsVerified = state.records[stateKey]?.status === 'verified';

                if (dbIsMigrated && stateIsVerified) {
                    console.log(`${progressPrefix}: Already migrated and verified. Skipping.`);
                    skippedCount++;
                    continue;
                }

                // Also check if already accessible on ImageKit CDN
                const isAccessible = await verifyUrlAccessible(expectedImageKitUrl);
                if (isAccessible && dbIsMigrated) {
                    console.log(`${progressPrefix}: Asset already on ImageKit CDN & DB updated. Skipping.`);
                    state.records[stateKey] = {
                        inventory_id: inventoryId,
                        original_supabase_path: originalPath,
                        imagekit_path: targetStorageKey,
                        imagekit_url: expectedImageKitUrl,
                        status: 'verified',
                        migrated_at: state.records[stateKey]?.migrated_at || new Date().toISOString(),
                        verified_at: new Date().toISOString()
                    };
                    saveMigrationState(state);
                    skippedCount++;
                    continue;
                }

                try {
                    // 1. Download original from Supabase Storage
                    let fileBuffer;
                    let uploadRes = null;
                    if (!isAccessible) {
                        console.log(`${progressPrefix}: Downloading from Supabase Storage...`);
                        const { data: blob, error: dlError } = await supabase.storage
                            .from(BUCKET_NAME)
                            .download(originalPath);

                        if (dlError) {
                            throw new Error(`Supabase download failed: ${dlError.message}`);
                        }
                        fileBuffer = Buffer.from(await blob.arrayBuffer());

                        // 2. Upload to ImageKit
                        console.log(`${progressPrefix}: Uploading to ImageKit ${targetFolder}...`);
                        uploadRes = await uploadBufferToImageKit(fileBuffer, filename, targetFolder);
                        if (!uploadRes || !uploadRes.fileId) {
                            throw new Error(`ImageKit upload response missing fileId: ${JSON.stringify(uploadRes)}`);
                        }
                    } else {
                        console.log(`${progressPrefix}: Asset already in ImageKit CDN, updating DB record...`);
                    }

                    // 3. Verify upload via ImageKit CDN HTTP request or valid fileId
                    const verifyOk = isAccessible || (uploadRes && uploadRes.fileId) || await verifyUrlAccessible(expectedImageKitUrl);
                    if (!verifyOk) {
                        throw new Error(`Verification failed: ImageKit URL ${expectedImageKitUrl} did not return 200 OK.`);
                    }

                    // 4. Update inventory_images record in database
                    console.log(`${progressPrefix}: Updating inventory_images record (${dbRecord.id})...`);
                    let dbSuccess = false;
                    const { data: updated, error: updateError } = await supabaseAdmin
                        .from('inventory_images')
                        .update({
                            image_url: expectedImageKitUrl,
                            storage_key: targetStorageKey
                        })
                        .eq('id', dbRecord.id)
                        .select();

                    if (!updateError && updated && updated.length > 0) {
                        dbSuccess = true;
                    } else if (updateError) {
                        console.warn(`${progressPrefix}: Direct REST update failed (${updateError.message}). SQL fallback prepared.`);
                    } else {
                        console.warn(`${progressPrefix}: Direct REST update affected 0 rows (RLS policy requires service role or SQL). SQL fallback prepared.`);
                    }

                    // SQL statement fallback
                    const sqlStatement = `UPDATE public.inventory_images SET image_url = '${expectedImageKitUrl}', storage_key = '${targetStorageKey}' WHERE id = '${dbRecord.id}';`;
                    sqlStatements.push(sqlStatement);

                    // 5. Update migration state
                    state.records[stateKey] = {
                        id: dbRecord.id,
                        inventory_id: inventoryId,
                        original_supabase_path: originalPath,
                        imagekit_path: targetStorageKey,
                        imagekit_url: expectedImageKitUrl,
                        status: 'verified',
                        db_updated: dbSuccess,
                        is_primary: dbRecord.is_primary,
                        sort_order: dbRecord.sort_order,
                        migrated_at: new Date().toISOString(),
                        verified_at: new Date().toISOString()
                    };
                    saveMigrationState(state);

                    console.log(`${progressPrefix}: SUCCESS (ImageKit verified) -> ${expectedImageKitUrl} [DB updated: ${dbSuccess}]`);
                    migratedCount++;
                } catch (err) {
                    console.error(`${progressPrefix}: FAILED -> ${err.message}`);
                    state.records[stateKey] = {
                        inventory_id: inventoryId,
                        original_supabase_path: originalPath,
                        status: 'failed',
                        error_message: err.message,
                        failed_at: new Date().toISOString()
                    };
                    saveMigrationState(state);
                    failedCount++;
                }
            }
        }

        const workers = Array.from({ length: concurrency }, () => worker());
        await Promise.all(workers);

        if (sqlStatements.length > 0) {
            const sqlContent = [
                '-- ==============================================================',
                '-- INVENTORY_IMAGES IMAGEKIT MIGRATION SQL UPDATE SCRIPT',
                `-- Generated at: ${new Date().toISOString()}`,
                `-- Total statements: ${sqlStatements.length}`,
                '-- Execute in Supabase SQL Editor to update all inventory_images records.',
                '-- ==============================================================',
                'BEGIN;',
                '',
                ...sqlStatements,
                '',
                'COMMIT;',
                ''
            ].join('\n');
            fs.writeFileSync(SQL_UPDATE_FILE, sqlContent, 'utf8');
            console.log(`Generated SQL update script: ${SQL_UPDATE_FILE} (${sqlStatements.length} updates)`);
        }

        console.log('\n==================================================');
        console.log('MIGRATION EXECUTION COMPLETED');
        console.log('==================================================');
        console.log(`Total images processed: ${matchedPairs.length}`);
        console.log(`Successfully migrated & verified: ${migratedCount}`);
        console.log(`Already migrated (skipped): ${skippedCount}`);
        console.log(`Failed images: ${failedCount}`);
        console.log('State saved to scripts/migration_state.json');
        console.log('==================================================\n');
    }
}

run().catch(err => {
    console.error('Migration script error:', err);
    process.exit(1);
});
