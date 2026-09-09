const fs = require('fs');
const path = require('path');

const dirs = [
    '/home/rajeev/pixelbuilders/shreebanarsisarees',
    '/home/rajeev/pixelbuilders/saree-react-admin',
    '/home/rajeev/pixelbuilders'
];

for (const dir of dirs) {
    if (!fs.existsSync(dir)) continue;
    const files = fs.readdirSync(dir);
    for (const f of files) {
        if (f.startsWith('.env')) {
            const fullPath = path.join(dir, f);
            const content = fs.readFileSync(fullPath, 'utf8');
            const keys = content.split('\n')
                .map(l => l.trim())
                .filter(l => l && !l.startsWith('#'))
                .map(l => l.split('=')[0]);
            console.log(fullPath, '-> keys:', keys);
        }
    }
}
