const fs = require('fs');
const path = require('path');
const { createClient } = require('@supabase/supabase-js');

function loadEnv() {
    const p = path.resolve(__dirname, '../.env');
    const env = {};
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
                env[key] = val;
            }
        });
    }
    return env;
}

const env = loadEnv();
const url = env.VITE_SUPABASE_URL;
const key = env.VITE_SUPABASE_ANON_KEY || env.SUPABASE_SERVICE_ROLE_KEY;

if (!url || !key) {
    console.error("Missing Supabase credentials in .env");
    process.exit(1);
}

const supabase = createClient(url, key);

async function check() {
    const { data, error } = await supabase
        .from('pwa_installs')
        .select('*')
        .order('created_at', { ascending: false });

    if (error) {
        console.error("Error fetching pwa_installs:", error);
        return;
    }

    console.log("Total pwa_installs rows:", data.length);
    console.log(JSON.stringify(data, null, 2));
}

check();
