import XLSX from 'xlsx';
import fs from 'fs';

const filePath = 'public/template_product_upload.xlsx';
const buf = fs.readFileSync(filePath);
const wb = XLSX.read(buf, { type: 'buffer', cellFormula: true, cellHTML: false, cellText: true, cellDates: true });

const sheet = wb.Sheets[wb.SheetNames[0]];

console.log('All cells:');
for (const cellAddress in sheet) {
    if (cellAddress.startsWith('!')) continue;
    const cell = sheet[cellAddress];
    console.log(`${cellAddress}: v=${cell.v}, f=${cell.f}, t=${cell.t}, w=${cell.w}`);
}
