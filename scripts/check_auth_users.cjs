const fs = require('fs');
const { createClient } = require('@supabase/supabase-js');

const env = Object.fromEntries(
    fs.readFileSync('.env', 'utf8')
        .split('\n')
        .filter(l => l.includes('='))
        .map(l => {
            const p = l.trim().split('=');
            return [p[0], p.slice(1).join('=')];
        })
);

const supabase = createClient(env.VITE_SUPABASE_URL, env.VITE_SUPABASE_ANON_KEY);

const candidates = [
    'rajeev06code@gmail.com',
    'shreebanarasi180@gmail.com',
    'admin@kasturisarees.com',
    'admin@shreebanarasisarees.com',
    'shreebanarasisarees@gmail.com',
    'contact@shreebanarasisarees.com',
    'support@shreebanarasisarees.com'
];

async function check() {
    for (const email of candidates) {
        const { data, error } = await supabase.auth.signInWithPassword({
            email,
            password: 'incorrect_probe_password_123456'
        });
        console.log(email, '->', error?.message || 'Logged in?!');
    }
}

check();
