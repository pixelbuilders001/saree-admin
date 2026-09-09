// Test formula evaluator on a worksheet

function evaluateFormula(formula, getCellValue) {
    let expr = formula.trim();
    if (expr.startsWith('=')) expr = expr.substring(1).trim();

    // Replace cell references like A2, B10, AA5 with their values
    // But be careful not to replace function names like IF, OR, AND, etc.
    // Excel cell reference regex: \b([A-Z]{1,3})([1-9][0-9]*)\b
    
    // Helper to evaluate Excel CONCATENATE / CONCAT
    const upper = expr.toUpperCase();
    
    // Simple evaluator using recursion or parser
    try {
        // Handle & concatenation: e.g. B2 & "-" & D2 & "-001"
        // Also handle CONCATENATE(arg1, arg2, ...)
        // Also handle UPPER, LOWER, LEFT, RIGHT, TRIM
        return customEval(expr, getCellValue);
    } catch (e) {
        console.error('Eval error on formula:', formula, e.message);
        return null;
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

    // Handle LEFT(text, num)
    const leftMatch = expr.match(/^LEFT\s*\((.*)\)$/i);
    if (leftMatch) {
        const args = splitArgs(leftMatch[1]);
        const text = String(customEval(args[0], getCellValue) || '');
        const n = args[1] ? parseInt(customEval(args[1], getCellValue), 10) : 1;
        return text.substring(0, isNaN(n) ? 1 : n);
    }

    // Handle RIGHT(text, num)
    const rightMatch = expr.match(/^RIGHT\s*\((.*)\)$/i);
    if (rightMatch) {
        const args = splitArgs(rightMatch[1]);
        const text = String(customEval(args[0], getCellValue) || '');
        const n = args[1] ? parseInt(customEval(args[1], getCellValue), 10) : 1;
        return text.substring(text.length - (isNaN(n) ? 1 : n));
    }

    // Handle & string concatenation: "a" & B2 & "c"
    if (expr.includes('&')) {
        const parts = splitByAmpersand(expr);
        if (parts.length > 1) {
            return parts.map(p => customEval(p, getCellValue)).join('');
        }
    }

    // Handle string literal: "hello"
    if ((expr.startsWith('"') && expr.endsWith('"')) || (expr.startsWith("'") && expr.endsWith("'"))) {
        return expr.slice(1, -1);
    }

    // Handle number literal
    if (/^-?\d+(\.\d+)?$/.test(expr)) {
        return Number(expr);
    }

    // Handle Cell reference: e.g. B2, D12, AA3
    const cellRefMatch = expr.match(/^([A-Za-z]{1,3}[0-9]+)$/);
    if (cellRefMatch) {
        return getCellValue(cellRefMatch[1].toUpperCase());
    }

    return expr;
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

// Test examples
const mockCells = {
    'A2': 'Kanjivaram Red Silk',
    'B2': 'Kanjivaram Silk',
    'C2': 'Silk',
    'D2': 'Red',
    'G2': 5000,
    'H2': 4000
};

function getVal(cellId) {
    return mockCells[cellId] !== undefined ? mockCells[cellId] : '';
}

console.log('Test 1 (& concat):', evaluateFormula('UPPER(LEFT(B2, 3)) & "-" & UPPER(LEFT(D2, 3)) & "-001"', getVal));
console.log('Test 2 (CONCATENATE):', evaluateFormula('CONCATENATE("SKU-", B2, "-", D2)', getVal));
console.log('Test 3 (CONCAT):', evaluateFormula('CONCAT(LEFT(B2, 3), "-", D2, "-01")', getVal));
console.log('Test 4 (TRIM & UPPER):', evaluateFormula('TRIM(UPPER(D2))', getVal));
