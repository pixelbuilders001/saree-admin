const fs = require('fs');
const path = require('path');
const { createClient } = require('@supabase/supabase-js');

function loadEnv() {
    const text = fs.readFileSync('.env', 'utf8');
    const env = {};
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
            env[key] = val;
        }
    });
    return env;
}

const env = loadEnv();
const SUPABASE_URL = env.VITE_SUPABASE_URL;
const SUPABASE_KEY = env.VITE_SUPABASE_ANON_KEY;
const IMAGEKIT_PUBLIC_KEY = env.VITE_IMAGEKIT_PUBLIC_KEY;
const IMAGEKIT_PRIVATE_KEY = env.VITE_IMAGEKIT_PRIVATE_KEY;
const IMAGEKIT_URL_ENDPOINT = env.VITE_IMAGEKIT_URL_ENDPOINT;

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

async function testOne() {
    console.log("ImageKit Endpoint:", IMAGEKIT_URL_ENDPOINT);
    const testPath = 'S10068/d4uzqu975pw.jpg';
    console.log("Downloading", testPath);
    const { data: blob, error: dlError } = await supabase.storage
        .from('sbs-inventory-images')
        .download(testPath);

    if (dlError) {
        console.error("Download error:", dlError);
        return;
    }

    const buffer = Buffer.from(await blob.arrayBuffer());
    console.log("Downloaded bytes:", buffer.length);

    const authHeader = 'Basic ' + Buffer.from(`${IMAGEKIT_PRIVATE_KEY}:`).toString('base64');
    const formData = new FormData();
    const fileBlob = new Blob([buffer]);
    formData.append('file', fileBlob, 'd4uzqu975pw.jpg');
    formData.append('fileName', 'd4uzqu975pw.jpg');
    formData.append('folder', '/products/S10068');
    formData.append('useUniqueFileName', 'false');
    if (IMAGEKIT_PUBLIC_KEY) {
        formData.append('publicKey', IMAGEKIT_PUBLIC_KEY);
    }

    console.log("Uploading to ImageKit...");
    const res = await fetch('https://upload.imagekit.io/api/v1/files/upload', {
        method: 'POST',
        headers: { Authorization: authHeader },
        body: formData
    });

    console.log("Response status:", res.status);
    const json = await res.json();
    console.log("Response json:", json);

    if (json.url) {
        console.log("\nTesting fetch of returned url:", json.url);
        const getRes = await fetch(json.url);
        console.log("Returned URL status:", getRes.status, "content-type:", getRes.headers.get('content-type'));
    }

    const constructedUrl = `${IMAGEKIT_URL_ENDPOINT}/products/S10068/d4uzqu975pw.jpg`;
    console.log("\nTesting constructed url:", constructedUrl);
    const constRes = await fetch(constructedUrl);
    console.log("Constructed URL status:", constRes.status);
}

testOne().catch(console.error);
