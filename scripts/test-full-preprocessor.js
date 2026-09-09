import XLSX from 'xlsx';

// Test our full formula preprocessor and sheet resolver
function preProcessWorksheet(sheet) {
    const range = XLSX.utils.decode_range(sheet['!ref'] || 'A1:Z100');
    
    // Helper to get cell value safely
    function getVal(cellAddress) {
        const c = sheet[cellAddress];
        if (!c) return '';
        if (c.v !== undefined && c.v !== null && c.v !== '') return c.v;
        if (c.w !== undefined && c.w !== null && c.w !== '') return c.w;
        if (c.f) {
            const evaluated = evalFormulaExpr(c.f, getVal);
            if (evaluated !== null && evaluated !== undefined) {
                c.v = evaluated;
                return evaluated;
            }
        }
        return '';
    }

    // Iterate through all cells with formulas
    for (let R = range.s.r; R <= range.e.r; ++R) {
        for (let C = range.s.c; C <= range.e.c; ++C) {
            const cellAddress = XLSX.utils.encode_cell({ r: R, c: C });
            const cell = sheet[cellAddress];
            if (!cell) continue;

            if (cell.f && (cell.v === undefined || cell.v === null || cell.v === '')) {
                const computed = evalFormulaExpr(cell.f, getVal);
                if (computed !== null && computed !== undefined) {
                    cell.v = computed;
                    cell.t = typeof computed === 'number' ? 'n' : 's';
                    cell.w = String(computed);
                }
            } else if (cell.v === undefined && cell.w) {
                cell.v = cell.w;
            }

            // Strip leading '=' if string literal formula e.g. ="TBS-001"
            if (typeof cell.v === 'string' && cell.v.startsWith('=')) {
                let s = cell.v.substring(1).trim();
                if ((s.startsWith('"') && s.endsWith('"')) || (s.startsWith("'") && s.endsWith("'"))) {
                    s = s.slice(1, -1);
                }
                cell.v = s;
            }
        }
    }
}

function evalFormulaExpr(formula, getCellValue) {
    if (!formula) return '';
    let expr = String(formula).trim();
    if (expr.startsWith('=')) expr = expr.substring(1).trim();

    try {
        return customEval(expr, getCellValue);
    } catch (err) {
        return '';
    }
}

function customEval(expr, getCellValue) {
    expr = expr.trim();
    if (expr.startsWith('=')) expr = expr.substring(1).trim();

    // Handle CONCATENATE(...) or CONCAT(...)
    const concatMatch = expr.match(/^CONCAT(?:ENATE)?\s*\((.*)\)$/i);
    if (concatMatch) {
        const args = splitArgs(concatMatch[1]);
        return args.map(arg => customEval(arg, getCellValue)).join('');
    }

    // Handle TEXTJOIN(delimiter, ignore_empty, text1, ...)
    const textjoinMatch = expr.match(/^TEXTJOIN\s*\((.*)\)$/i);
    if (textjoinMatch) {
        const args = splitArgs(textjoinMatch[1]);
        const delim = String(customEval(args[0], getCellValue) || '');
        const ignoreEmpty = String(customEval(args[1], getCellValue)).toLowerCase() !== 'false';
        const parts = args.slice(2).map(a => String(customEval(a, getCellValue) || ''));
        const filtered = ignoreEmpty ? parts.filter(Boolean) : parts;
        return filtered.join(delim);
    }

    // Handle UPPER(...)
    const upperMatch = expr.match(/^UPPER\s*\((.*)\)$/i);
    if (upperMatch) {
        return String(customEval(upperMatch[1], getCellValue) || '').toUpperCase();
    }

    // Handle LOWER(...)
    const lowerMatch = expr.match(/^LOWER\s*\((.*)\)$/i);
    if (lowerMatch) {
        return String(customEval(lowerMatch[1], getCellValue) || '').toLowerCase();
    }

    // Handle TRIM(...)
    const trimMatch = expr.match(/^TRIM\s*\((.*)\)$/i);
    if (trimMatch) {
        return String(customEval(trimMatch[1], getCellValue) || '').trim();
    }

    // Handle LEFT(text, [num])
    const leftMatch = expr.match(/^LEFT\s*\((.*)\)$/i);
    if (leftMatch) {
        const args = splitArgs(leftMatch[1]);
        const text = String(customEval(args[0], getCellValue) || '');
        const n = args[1] !== undefined ? parseInt(customEval(args[1], getCellValue), 10) : 1;
        return text.substring(0, isNaN(n) ? 1 : n);
    }

    // Handle RIGHT(text, [num])
    const rightMatch = expr.match(/^RIGHT\s*\((.*)\)$/i);
    if (rightMatch) {
        const args = splitArgs(rightMatch[1]);
        const text = String(customEval(args[0], getCellValue) || '');
        const n = args[1] !== undefined ? parseInt(customEval(args[1], getCellValue), 10) : 1;
        return text.substring(text.length - (isNaN(n) ? 1 : n));
    }

    // Handle MID(text, start, num)
    const midMatch = expr.match(/^MID\s*\((.*)\)$/i);
    if (midMatch) {
        const args = splitArgs(midMatch[1]);
        const text = String(customEval(args[0], getCellValue) || '');
        const start = parseInt(customEval(args[1], getCellValue), 10) - 1;
        const len = parseInt(customEval(args[2], getCellValue), 10);
        return text.substring(Math.max(0, start), Math.max(0, start) + (isNaN(len) ? text.length : len));
    }

    // Handle IF(condition, true_val, false_val)
    const ifMatch = expr.match(/^IF\s*\((.*)\)$/i);
    if (ifMatch) {
        const args = splitArgs(ifMatch[1]);
        const cond = evalCondition(args[0], getCellValue);
        return cond ? (args[1] ? customEval(args[1], getCellValue) : '') : (args[2] ? customEval(args[2], getCellValue) : '');
    }

    // Handle & string concatenation: A2 & "-" & B2
    if (expr.includes('&')) {
        const parts = splitByAmpersand(expr);
        if (parts.length > 1) {
            return parts.map(p => customEval(p, getCellValue)).join('');
        }
    }

    // Handle simple arithmetic subtraction/addition e.g. F2 - G2 or (F2 - G2) / F2
    if (/^[A-Za-z0-9_().\s+\-*/]+$/.test(expr) && /[+\-*/]/.test(expr)) {
        try {
            // Replace cell references with numbers
            const arithmeticExpr = expr.replace(/\b([A-Za-z]{1,3}[0-9]+)\b/g, (match) => {
                const val = getCellValue(match.toUpperCase());
                const num = parseFloat(String(val).replace(/[^\d.-]/g, ''));
                return isNaN(num) ? '0' : String(num);
            });
            // Safe math evaluation
            if (/^[0-9().\s+\-*/]+$/.test(arithmeticExpr)) {
                const mathResult = Function(`"use strict"; return (${arithmeticExpr});`)();
                if (typeof mathResult === 'number' && !isNaN(mathResult)) {
                    return mathResult;
                }
            }
        } catch (e) {}
    }

    // Handle string literal: "hello"
    if ((expr.startsWith('"') && expr.endsWith('"')) || (expr.startsWith("'") && expr.endsWith("'"))) {
        return expr.slice(1, -1);
    }

    // Handle number literal
    if (/^-?\d+(\.\d+)?$/.test(expr)) {
        return Number(expr);
    }

    // Handle Cell reference: e.g. B2, D12
    const cellRefMatch = expr.match(/^([A-Za-z]{1,3}[0-9]+)$/);
    if (cellRefMatch) {
        return getCellValue(cellRefMatch[1].toUpperCase());
    }

    return expr;
}

function evalCondition(condStr, getCellValue) {
    condStr = condStr.trim();
    // Check OR(...)
    const orMatch = condStr.match(/^OR\s*\((.*)\)$/i);
    if (orMatch) {
        const args = splitArgs(orMatch[1]);
        return args.some(a => evalCondition(a, getCellValue));
    }
    // Check AND(...)
    const andMatch = condStr.match(/^AND\s*\((.*)\)$/i);
    if (andMatch) {
        const args = splitArgs(andMatch[1]);
        return args.every(a => evalCondition(a, getCellValue));
    }
    // Check equality A2="" or A2=0
    const eqMatch = condStr.match(/^(.+?)\s*=\s*(.*)$/);
    if (eqMatch) {
        const left = customEval(eqMatch[1], getCellValue);
        const right = customEval(eqMatch[2], getCellValue);
        return String(left).trim() === String(right).trim();
    }
    const val = customEval(condStr, getCellValue);
    return Boolean(val);
}

function splitArgs(str) {
    const args = [];
    let cur = '';
    let inQuotes = false;
    let parenDepth = 0;
    for (let i = 0; i < str.length; i++) {
        const ch = str[i];
        if (ch === '"') inQuotes = !inQuotes;
        else if (ch === '(' && !inQuotes) parenDepth++;
        else if (ch === ')' && !inQuotes) parenDepth--;
        else if (ch === ',' && !inQuotes && parenDepth === 0) {
            args.push(cur.trim());
            cur = '';
            continue;
        }
        cur += ch;
    }
    if (cur.trim()) args.push(cur.trim());
    return args;
}

function splitByAmpersand(str) {
    const parts = [];
    let cur = '';
    let inQuotes = false;
    let parenDepth = 0;
    for (let i = 0; i < str.length; i++) {
        const ch = str[i];
        if (ch === '"') inQuotes = !inQuotes;
        else if (ch === '(' && !inQuotes) parenDepth++;
        else if (ch === ')' && !inQuotes) parenDepth--;
        else if (ch === '&' && !inQuotes && parenDepth === 0) {
            parts.push(cur.trim());
            cur = '';
            continue;
        }
        cur += ch;
    }
    if (cur.trim()) parts.push(cur.trim());
    return parts;
}

// TEST ON THE REALISTIC WORKSHEET
const wb = XLSX.utils.book_new();
const ws = {
    '!ref': 'A1:M4',
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
    'A2': { f: 'B2 & " " & C2 & " in " & D2' },
    'B2': { v: 'Kanjivaram Silk', t: 's' },
    'C2': { v: 'Pure Silk', t: 's' },
    'D2': { v: 'Maroon', t: 's' },
    'E2': { v: '1,500.00', t: 's' },
    'F2': { v: '6,000.00', t: 's' },
    'G2': { v: '5,400.00', t: 's' },
    'H2': { f: 'F2 - G2' },
    'I2': { f: '(F2 - G2) / F2' },
    'J2': { v: '10', t: 's' },
    'K2': { v: 'R-1', t: 's' },
    'L2': { v: 'Active', t: 's' },
    'M2': { f: 'UPPER(LEFT(B2, 3)) & "-" & UPPER(LEFT(D2, 3)) & "-001"' },

    // Row 3: CONCAT formula
    'A3': { f: 'CONCAT(B3, " Special")' },
    'B3': { v: 'Banarasi Silk', t: 's' },
    'C3': { v: 'Katan Silk', t: 's' },
    'D3': { v: 'Royal Blue', t: 's' },
    'E3': { v: '2,000.00', t: 's' },
    'F3': { v: '8,000.00', t: 's' },
    'G3': { v: '7,200.00', t: 's' },
    'H3': { f: 'IF(OR(F3="",G3=""),"",F3-G3)' },
    'I3': { f: 'IF(OR(F3="",G3="",F3=0),"",(F3-G3)/F3)' },
    'J3': { v: '5', t: 's' },
    'K3': { v: 'R-2', t: 's' },
    'L3': { v: 'Active', t: 's' },
    'M3': { f: 'CONCATENATE("SKU-", LEFT(B3, 3), "-", LEFT(D3, 4))' },
};

XLSX.utils.book_append_sheet(wb, ws, 'Products');

// Run preprocessor
preProcessWorksheet(ws);

const rowsData = XLSX.utils.sheet_to_json(ws, { defval: '' });
console.log('Result after preProcessWorksheet:');
console.log(JSON.stringify(rowsData, null, 2));
