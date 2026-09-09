import XLSX from 'xlsx';

// Create a workbook with formulas
const ws_data = [
    ['saree_name', 'category', 'fabric', 'color', 'purchase_price', 'selling_price', 'stock', 'sku'],
    [
        'Kanjivaram Red Silk',
        'Kanjivaram',
        'Silk',
        'Red',
        1000,
        2000,
        5,
        // Formula in SKU:
        { f: 'CONCATENATE(B2, "-", D2, "-001")' }
    ],
    [
        // Formula in saree_name:
        { f: 'CONCATENATE(B3, " ", C3, " ", D3)' },
        'Banarasi',
        'Silk',
        'Gold',
        1200,
        2400,
        3,
        { f: 'CONCATENATE(B3, "-", D3, "-002")' }
    ]
];

const wb = XLSX.utils.book_new();
const ws = XLSX.utils.aoa_to_sheet(ws_data);
XLSX.utils.book_append_sheet(wb, ws, 'Sheet1');

const outBuf = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' });

// Now read it back using our current CsvImportModal code:
const readWb = XLSX.read(outBuf, { type: 'buffer' });
const readWs = readWb.Sheets[readWb.SheetNames[0]];
console.log('Read Cells:');
for (const k in readWs) {
    if (!k.startsWith('!')) {
        console.log(k, 'v=', readWs[k].v, 'f=', readWs[k].f, 't=', readWs[k].t, 'w=', readWs[k].w);
    }
}

const rowsData = XLSX.utils.sheet_to_json(readWs, { defval: '' });
console.log('sheet_to_json default (raw=true):', JSON.stringify(rowsData, null, 2));

const rowsDataRawFalse = XLSX.utils.sheet_to_json(readWs, { defval: '', raw: false });
console.log('sheet_to_json raw=false:', JSON.stringify(rowsDataRawFalse, null, 2));
