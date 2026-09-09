import XLSX from 'xlsx';

// Test reading when an Excel file has formulas
// Suppose user created a file in Excel or Google Sheets or Excel Online with formulas:
const wb = XLSX.utils.book_new();

const headers = [
    'saree_name', 'category', 'fabric', 'color', 'purchase_price', 'mrp', 'selling_price', 'discount_amount', 'discount_percentage', 'stock', 'rack_no', 'status', 'sku'
];

// Row 2: saree_name is a formula, sku is a formula, discount is a formula
// In Excel, when user writes formulas, the cell object in SheetJS might look like:
// { f: 'CONCAT(B2, " ", C2, " Saree")', t: 's' } -> if cell.v is missing!
const ws = {
    '!ref': 'A1:M10',
    'A1': { v: 'saree_name', t: 's' },
    'B1': { v: 'category', t: 's' },
    'C1': { v: 'fabric', t: 's' },
    'D1': { v: 'color', t: 's' },
    'E1': { v: 'purchase_price', t: 's' },
    'F1': { v: 'mrp', t: 's' },
    'G1': { v: 'selling_price', t: 's' },
    'H1': { v: 'discount_amount', t: 's' },
    'I1': { v: 'discount_percentage', t: 's' },
    'J1': { v: 'stock', t: 's' },
    'K1': { v: 'rack_no', t: 's' },
    'L1': { v: 'status', t: 's' },
    'M1': { v: 'sku', t: 's' },

    // Data Row 2:
    'A2': { f: 'B2 & " " & C2 & " in " & D2' }, // Formula for saree name! No 'v'!
    'B2': { v: 'Kanjivaram Silk', t: 's' },
    'C2': { v: 'Pure Silk', t: 's' },
    'D2': { v: 'Maroon', t: 's' },
    'E2': { v: '1,500.00', t: 's' }, // Formatted text with comma
    'F2': { v: '6,000.00', t: 's' }, // Formatted text with comma
    'G2': { v: '5,400.00', t: 's' }, // Formatted text with comma
    'H2': { f: 'F2 - G2' }, // Formula! No 'v'!
    'I2': { f: '(F2 - G2) / F2' }, // Formula! No 'v'!
    'J2': { v: '10', t: 's' },
    'K2': { v: 'R-1', t: 's' },
    'L2': { v: 'Active', t: 's' },
    'M2': { f: 'UPPER(LEFT(B2, 3)) & "-" & UPPER(LEFT(D2, 3)) & "-001"' }, // Formula for SKU! No 'v'!

    // Row 3 to 10: Dragged-down empty formula rows!
    'A3': { f: 'B3 & " " & C3 & " in " & D3' },
    'M3': { f: 'UPPER(LEFT(B3, 3)) & "-" & UPPER(LEFT(D3, 3)) & "-002"' },
};

XLSX.utils.book_append_sheet(wb, ws, 'Products');

const outBuf = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' });

// Now read with standard sheet_to_json:
const readWb = XLSX.read(outBuf, { type: 'buffer' });
const readWs = readWb.Sheets[readWb.SheetNames[0]];

const resultDefault = XLSX.utils.sheet_to_json(readWs, { defval: '' });
console.log('Result with current sheet_to_json:');
console.log(JSON.stringify(resultDefault, null, 2));
