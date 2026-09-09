const fs = require('fs');

const content = fs.readFileSync('/home/rajeev/pixelbuilders/shreebanarsisarees/.env.local', 'utf8');
const lines = content.split('\n');
const sLine = lines.find(l => l.startsWith('SUPABASE_SERVICE_ROLE_KEY='));
if (!sLine) {
    console.log("Not found");
} else {
    const rawVal = sLine.split('=')[1];
    console.log("Raw length:", rawVal.length);
    console.log("First 15 chars:", rawVal.slice(0, 15));
    console.log("Last 15 chars:", rawVal.slice(-15));
    console.log("Has quotes?", rawVal.startsWith('"') || rawVal.startsWith("'"));
}
