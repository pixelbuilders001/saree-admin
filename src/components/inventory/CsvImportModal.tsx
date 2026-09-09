import React, { useRef, useState } from 'react';
import Papa from 'papaparse';
import * as XLSX from 'xlsx';
import {
    Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import { Upload, FileText, AlertCircle, CheckCircle2, Download, Loader2, X, Image as ImageIcon, Clock, Sparkles, FileSpreadsheet } from 'lucide-react';
import { inventoryService, type BulkImportSummary } from '@/services/inventoryService';
import { useQueryClient } from '@tanstack/react-query';
import { cn } from '@/lib/utils';

// ── Column map: CSV header → internal field ────────────────────────────────────
const COL_MAP: Record<string, string> = {
    // Saree Name
    'saree_name': 'sareeName', 'saree name': 'sareeName', 'name': 'sareeName',
    'title': 'sareeName', 'item': 'sareeName', 'product': 'sareeName',
    'product_name': 'sareeName', 'product name': 'sareeName', 'saree': 'sareeName',
    'item_name': 'sareeName', 'item name': 'sareeName',

    // Category
    'category': 'category', 'category_name': 'category', 'category name': 'category',
    'cat': 'category', 'type': 'category',

    // Fabric
    'fabric': 'fabric', 'material': 'fabric', 'fabric_type': 'fabric', 'fabric type': 'fabric',

    // Color
    'color': 'color', 'colour': 'color', 'shade': 'color',

    // Purchase Price
    'purchase_price': 'purchasePrice', 'purchase price': 'purchasePrice', 'cost': 'purchasePrice',
    'cost_price': 'purchasePrice', 'cost price': 'purchasePrice', 'buy_price': 'purchasePrice',
    'buy price': 'purchasePrice', 'purchase': 'purchasePrice', 'buy': 'purchasePrice',

    // Selling Price
    'selling_price': 'sellingPrice', 'selling price': 'sellingPrice', 'price': 'sellingPrice',
    'sale_price': 'sellingPrice', 'sale price': 'sellingPrice', 'rate': 'sellingPrice',
    'selling': 'sellingPrice', 'mrp_selling': 'sellingPrice',

    // Stock
    'stock': 'stock', 'qty': 'stock', 'quantity': 'stock', 'count': 'stock', 'units': 'stock',

    // Rack No
    'rack_no': 'rackNo', 'rack no': 'rackNo', 'rack': 'rackNo', 'location': 'rackNo', 'rack_number': 'rackNo',

    // Barcode
    'barcode': 'barcode', 'code': 'barcode', 'barcode_no': 'barcode',

    // Status
    'status': 'status',

    // SKU
    'sku': 'sku', 'sku_code': 'sku', 'sku code': 'sku', 'product_code': 'sku', 'product code': 'sku', 'item_code': 'sku', 'item code': 'sku',

    // Design Code / Variant Group
    'design_code': 'designCode', 'design code': 'designCode', 'design': 'designCode',
    'group_id': 'designCode', 'group id': 'designCode', 'variant_code': 'designCode',
    'variant code': 'designCode', 'style_code': 'designCode', 'style code': 'designCode',

    // HSN Code
    'hsn_code': 'hsnCode', 'hsn code': 'hsnCode', 'hsn': 'hsnCode', 'hsncode': 'hsnCode',

    // Category ID & Description
    'category_id': 'categoryId', 'category id': 'categoryId',
    'description': 'description', 'desc': 'description', 'details': 'description',

    // Pricing & Discounts
    'mrp': 'mrp', 'maximum_retail_price': 'mrp', 'maximum retail price': 'mrp',
    'discount_amount': 'discountAmount', 'discount amount': 'discountAmount', 'discount': 'discountAmount',
    'discount_percentage': 'discountPercentage', 'discount percentage': 'discountPercentage', 'discount %': 'discountPercentage', 'discount_percent': 'discountPercentage',

    // Occasion
    'occasion': 'occasion', 'event': 'occasion',

    // GST Rate
    'gst_rate': 'gstRate', 'gst rate': 'gstRate', 'gst': 'gstRate', 'gst %': 'gstRate', 'gst_percentage': 'gstRate', 'tax': 'gstRate', 'tax_rate': 'gstRate', 'gst_percent': 'gstRate',

    // Price Includes GST
    'price_includes_gst': 'priceIncludesGst', 'price includes gst': 'priceIncludesGst', 'includes_gst': 'priceIncludesGst', 'includes gst': 'priceIncludesGst', 'gst_included': 'priceIncludesGst', 'gst included': 'priceIncludesGst', 'is_gst_included': 'priceIncludesGst'
};

const TEMPLATE_HEADERS = 'sku,saree_name,category,fabric,color,purchase_price,selling_price,stock,rack_no,barcode,status,design_code,hsn_code,category_id,description,mrp,discount_amount,discount_percentage,occasion,gst_rate,price_includes_gst';
const TEMPLATE_EXAMPLE = 'SB001,Kanjivaram Red Silk,Kanjivaram,Silk,Red,4500,8000,5,A-12,,active,KATAN-101,5407,cat_101,Beautiful handwoven Kanjivaram silk saree,10000,2000,20,Wedding,5,true\nSB002,Banarasi Gold Zari,Banarasi,Silk,Gold,5000,9500,3,B-04,,active,KATAN-101,5407,cat_102,Stunning gold zari Banarasi silk,12000,2500,20.83,Festive,5,true';

interface ParsedRow {
    sareeName: string;
    category: string;
    categoryId?: string;
    designCode?: string;
    hsnCode?: string;
    sku?: string;
    description?: string;
    fabric: string;
    color: string;
    purchasePrice: number;
    sellingPrice: number;
    stock: number;
    rackNo: string;
    barcode: string;
    status: string;
    mrp: number;
    discountAmount: number;
    discountPercentage: number;
    occasion?: string;
    gstRate?: number;
    priceIncludesGst?: boolean;
}

/**
 * Strips currency symbols (₹, $, €, £), commas, and whitespace, returning a clean float.
 */
export function parseCleanNumber(val: any): number {
    if (val === undefined || val === null || val === '') return 0;
    if (typeof val === 'number') return isNaN(val) ? 0 : val;
    const clean = String(val).replace(/[₹$€£,\s]/g, '').trim();
    const num = parseFloat(clean);
    return isNaN(num) ? 0 : num;
}

/**
 * Handles discount percentage formatting (e.g. "10.00%", "10%", 0.1 -> 10).
 */
export function parseCleanDiscountPercentage(val: any): number {
    if (val === undefined || val === null || val === '') return 0;
    if (typeof val === 'number') {
        if (isNaN(val)) return 0;
        return (val > 0 && val <= 1) ? Math.round(val * 100 * 100) / 100 : val;
    }
    const str = String(val).trim();
    const hasPercent = str.includes('%');
    const num = parseCleanNumber(str.replace('%', ''));
    if (hasPercent) return num;
    if (num > 0 && num <= 1) return Math.round(num * 100 * 100) / 100;
    return num;
}

function parseCellAddress(addr: string): { sheet?: string; col: string; row: number } | null {
    if (!addr) return null;
    let s = String(addr).trim();
    let sheetName: string | undefined;
    const sheetMatch = s.match(/^(?:'([^']+)'|([A-Za-z0-9_]+))!(.*)$/);
    if (sheetMatch) {
        sheetName = sheetMatch[1] || sheetMatch[2];
        s = sheetMatch[3];
    }
    const cleanAddr = s.replace(/\$/g, '').trim().toUpperCase();
    const m = cleanAddr.match(/^([A-Z]{1,3})([0-9]+)$/);
    if (!m) return null;
    return { sheet: sheetName, col: m[1], row: parseInt(m[2], 10) };
}

function formatExcelText(val: any, fmt: string): string {
    if (!fmt) return String(val ?? '');
    let cleanFmt = fmt.trim();
    if (cleanFmt.startsWith('"') && cleanFmt.endsWith('"')) cleanFmt = cleanFmt.slice(1, -1);
    if (cleanFmt.startsWith("'") && cleanFmt.endsWith("'")) cleanFmt = cleanFmt.slice(1, -1);

    // Pattern like "000", "0000", "00"
    if (/^0+$/.test(cleanFmt)) {
        const num = Math.round(Number(val));
        if (isNaN(num)) return String(val ?? '');
        return String(num).padStart(cleanFmt.length, '0');
    }

    // Pattern like "0.00"
    if (/^0+\.0+$/.test(cleanFmt)) {
        const decimals = cleanFmt.split('.')[1].length;
        const num = Number(val);
        if (isNaN(num)) return String(val ?? '');
        return num.toFixed(decimals);
    }

    return String(val ?? '');
}

function extractFunctionArgs(expr: string, funcName: string): string[] | null {
    const trimmed = expr.trim();
    const prefix = funcName.toUpperCase() + '(';
    if (!trimmed.toUpperCase().startsWith(prefix)) return null;
    if (!trimmed.endsWith(')')) return null;

    let depth = 0;
    let inQuotes = false;
    for (let i = prefix.length - 1; i < trimmed.length; i++) {
        const ch = trimmed[i];
        if (ch === '"') inQuotes = !inQuotes;
        else if (ch === '(' && !inQuotes) depth++;
        else if (ch === ')' && !inQuotes) {
            depth--;
            if (depth === 0) {
                if (i !== trimmed.length - 1) return null;
                const inside = trimmed.substring(prefix.length, trimmed.length - 1);
                return splitFormulaArgs(inside);
            }
        }
    }
    return null;
}

function splitFormulaArgs(str: string): string[] {
    const args: string[] = [];
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

function splitFormulaByAmpersand(str: string): string[] {
    const parts: string[] = [];
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

function evalFormulaExpr(formula: string, getCellValue: (cellAddress: string) => any, currentRow?: number): any {
    if (!formula) return '';
    let expr = String(formula).trim();
    if (expr.startsWith('=')) expr = expr.substring(1).trim();

    try {
        return customEvalFormula(expr, getCellValue, currentRow);
    } catch {
        return '';
    }
}

function customEvalFormula(expr: string, getCellValue: (cellAddress: string) => any, currentRow?: number): any {
    expr = expr.trim();
    if (expr.startsWith('=')) expr = expr.substring(1).trim();
    if (!expr) return '';

    // 1. String literal: "hello"
    if ((expr.startsWith('"') && expr.endsWith('"')) || (expr.startsWith("'") && expr.endsWith("'"))) {
        return expr.slice(1, -1);
    }

    // 2. Number literal: 123, -45.67
    if (/^-?\d+(\.\d+)?$/.test(expr)) {
        return Number(expr);
    }

    // 3. String concatenation & (evaluated at parenDepth 0)
    if (expr.includes('&')) {
        const parts = splitFormulaByAmpersand(expr);
        if (parts.length > 1) {
            return parts.map(p => customEvalFormula(p, getCellValue, currentRow)).join('');
        }
    }

    // 4. Excel functions:
    const upperArgs = extractFunctionArgs(expr, 'UPPER');
    if (upperArgs !== null && upperArgs.length >= 1) {
        return String(customEvalFormula(upperArgs[0], getCellValue, currentRow) || '').toUpperCase();
    }

    const lowerArgs = extractFunctionArgs(expr, 'LOWER');
    if (lowerArgs !== null && lowerArgs.length >= 1) {
        return String(customEvalFormula(lowerArgs[0], getCellValue, currentRow) || '').toLowerCase();
    }

    const trimArgs = extractFunctionArgs(expr, 'TRIM');
    if (trimArgs !== null && trimArgs.length >= 1) {
        return String(customEvalFormula(trimArgs[0], getCellValue, currentRow) || '').trim();
    }

    const properArgs = extractFunctionArgs(expr, 'PROPER');
    if (properArgs !== null && properArgs.length >= 1) {
        const str = String(customEvalFormula(properArgs[0], getCellValue, currentRow) || '');
        return str.replace(/\b\w/g, l => l.toUpperCase()).replace(/\B\w/g, l => l.toLowerCase());
    }

    const leftArgs = extractFunctionArgs(expr, 'LEFT');
    if (leftArgs !== null && leftArgs.length >= 1) {
        const text = String(customEvalFormula(leftArgs[0], getCellValue, currentRow) || '');
        const n = leftArgs[1] !== undefined ? parseInt(customEvalFormula(leftArgs[1], getCellValue, currentRow), 10) : 1;
        return text.substring(0, isNaN(n) ? 1 : n);
    }

    const rightArgs = extractFunctionArgs(expr, 'RIGHT');
    if (rightArgs !== null && rightArgs.length >= 1) {
        const text = String(customEvalFormula(rightArgs[0], getCellValue, currentRow) || '');
        const n = rightArgs[1] !== undefined ? parseInt(customEvalFormula(rightArgs[1], getCellValue, currentRow), 10) : 1;
        return text.substring(text.length - (isNaN(n) ? 1 : n));
    }

    const midArgs = extractFunctionArgs(expr, 'MID');
    if (midArgs !== null && midArgs.length >= 2) {
        const text = String(customEvalFormula(midArgs[0], getCellValue, currentRow) || '');
        const start = Math.max(0, parseInt(customEvalFormula(midArgs[1], getCellValue, currentRow), 10) - 1);
        const len = midArgs[2] !== undefined ? parseInt(customEvalFormula(midArgs[2], getCellValue, currentRow), 10) : text.length;
        return text.substring(start, start + (isNaN(len) ? text.length : len));
    }

    const lenArgs = extractFunctionArgs(expr, 'LEN');
    if (lenArgs !== null && lenArgs.length >= 1) {
        const text = String(customEvalFormula(lenArgs[0], getCellValue, currentRow) || '');
        return text.length;
    }

    const subArgs = extractFunctionArgs(expr, 'SUBSTITUTE');
    if (subArgs !== null && subArgs.length >= 3) {
        const src = String(customEvalFormula(subArgs[0], getCellValue, currentRow) || '');
        const oldT = String(customEvalFormula(subArgs[1], getCellValue, currentRow) || '');
        const newT = String(customEvalFormula(subArgs[2], getCellValue, currentRow) || '');
        return src.split(oldT).join(newT);
    }

    const repArgs = extractFunctionArgs(expr, 'REPLACE');
    if (repArgs !== null && repArgs.length >= 4) {
        const src = String(customEvalFormula(repArgs[0], getCellValue, currentRow) || '');
        const start = Math.max(0, parseInt(customEvalFormula(repArgs[1], getCellValue, currentRow), 10) - 1);
        const len = parseInt(customEvalFormula(repArgs[2], getCellValue, currentRow), 10) || 0;
        const newT = String(customEvalFormula(repArgs[3], getCellValue, currentRow) || '');
        return src.substring(0, start) + newT + src.substring(start + len);
    }

    const reptArgs = extractFunctionArgs(expr, 'REPT');
    if (reptArgs !== null && reptArgs.length >= 2) {
        const str = String(customEvalFormula(reptArgs[0], getCellValue, currentRow) || '');
        const count = parseInt(customEvalFormula(reptArgs[1], getCellValue, currentRow), 10) || 0;
        return str.repeat(Math.max(0, count));
    }

    const concatArgs = extractFunctionArgs(expr, 'CONCATENATE') || extractFunctionArgs(expr, 'CONCAT');
    if (concatArgs !== null) {
        return concatArgs.map(a => customEvalFormula(a, getCellValue, currentRow)).join('');
    }

    const tjArgs = extractFunctionArgs(expr, 'TEXTJOIN');
    if (tjArgs !== null && tjArgs.length >= 3) {
        const delim = String(customEvalFormula(tjArgs[0], getCellValue, currentRow) || '');
        const ignoreEmpty = String(customEvalFormula(tjArgs[1], getCellValue, currentRow)).toLowerCase() !== 'false';
        const parts = tjArgs.slice(2).map(a => String(customEvalFormula(a, getCellValue, currentRow) || ''));
        const filtered = ignoreEmpty ? parts.filter(Boolean) : parts;
        return filtered.join(delim);
    }

    const textArgs = extractFunctionArgs(expr, 'TEXT');
    if (textArgs !== null && textArgs.length >= 2) {
        const val = customEvalFormula(textArgs[0], getCellValue, currentRow);
        const fmt = String(customEvalFormula(textArgs[1], getCellValue, currentRow) || '');
        return formatExcelText(val, fmt);
    }

    const rowArgs = extractFunctionArgs(expr, 'ROW');
    if (rowArgs !== null) {
        if (rowArgs.length === 0 || !rowArgs[0]) {
            return currentRow || 1;
        }
        const cInfo = parseCellAddress(rowArgs[0]);
        return cInfo ? cInfo.row : (currentRow || 1);
    }

    const colArgs = extractFunctionArgs(expr, 'COLUMN');
    if (colArgs !== null) {
        if (colArgs.length === 0 || !colArgs[0]) return 1;
        const cInfo = parseCellAddress(colArgs[0]);
        if (cInfo) {
            let colNum = 0;
            for (let i = 0; i < cInfo.col.length; i++) {
                colNum = colNum * 26 + (cInfo.col.charCodeAt(i) - 64);
            }
            return colNum;
        }
        return 1;
    }

    const ifArgs = extractFunctionArgs(expr, 'IF');
    if (ifArgs !== null && ifArgs.length >= 2) {
        const cond = evalFormulaCondition(ifArgs[0], getCellValue, currentRow);
        return cond
            ? (ifArgs[1] !== undefined ? customEvalFormula(ifArgs[1], getCellValue, currentRow) : '')
            : (ifArgs[2] !== undefined ? customEvalFormula(ifArgs[2], getCellValue, currentRow) : '');
    }

    // 5. Basic arithmetic: e.g. G2 - H2 or (G2 - H2) / G2 or ROW() - 1
    if (/^[A-Za-z0-9_().\s+\-*/$]+$/.test(expr) && /[+\-*/]/.test(expr)) {
        try {
            const arithmeticExpr = expr.replace(/\b\$?([A-Za-z]{1,3})\$?([0-9]+)\b/g, (match) => {
                const val = getCellValue(match);
                const num = parseCleanNumber(val);
                return String(num);
            }).replace(/\bROW\(\)/gi, String(currentRow || 1));

            if (/^[0-9().\s+\-*/]+$/.test(arithmeticExpr)) {
                const mathResult = Function(`"use strict"; return (${arithmeticExpr});`)();
                if (typeof mathResult === 'number' && !isNaN(mathResult)) {
                    return mathResult;
                }
            }
        } catch {}
    }

    // 6. Cell reference: e.g. A2, $A$2, 'Sheet'!B4
    const cellInfo = parseCellAddress(expr);
    if (cellInfo) {
        const standardAddr = `${cellInfo.col}${cellInfo.row}`;
        return getCellValue(standardAddr);
    }

    return expr;
}

function evalFormulaCondition(condStr: string, getCellValue: (cellAddress: string) => any, currentRow?: number): boolean {
    condStr = condStr.trim();
    
    const orArgs = extractFunctionArgs(condStr, 'OR');
    if (orArgs !== null) {
        return orArgs.some(a => evalFormulaCondition(a, getCellValue, currentRow));
    }

    const andArgs = extractFunctionArgs(condStr, 'AND');
    if (andArgs !== null) {
        return andArgs.every(a => evalFormulaCondition(a, getCellValue, currentRow));
    }

    const notArgs = extractFunctionArgs(condStr, 'NOT');
    if (notArgs !== null && notArgs.length >= 1) {
        return !evalFormulaCondition(notArgs[0], getCellValue, currentRow);
    }

    const eqMatch = condStr.match(/^(.+?)\s*=\s*(.*)$/);
    if (eqMatch) {
        const left = customEvalFormula(eqMatch[1], getCellValue, currentRow);
        const right = customEvalFormula(eqMatch[2], getCellValue, currentRow);
        return String(left).trim() === String(right).trim();
    }

    const neMatch = condStr.match(/^(.+?)\s*<>\s*(.*)$/);
    if (neMatch) {
        const left = customEvalFormula(neMatch[1], getCellValue, currentRow);
        const right = customEvalFormula(neMatch[2], getCellValue, currentRow);
        return String(left).trim() !== String(right).trim();
    }

    const val = customEvalFormula(condStr, getCellValue, currentRow);
    return Boolean(val);
}

function preProcessWorksheet(sheet: XLSX.WorkSheet): void {
    if (!sheet || !sheet['!ref']) return;
    const range = XLSX.utils.decode_range(sheet['!ref']);

    const evaluating = new Set<string>();

    function getVal(cellAddress: string, rowHint?: number): any {
        const cInfo = parseCellAddress(cellAddress);
        const cleanAddr = cInfo ? `${cInfo.col}${cInfo.row}` : cellAddress.replace(/\$/g, '').trim().toUpperCase();
        const c = sheet[cleanAddr];
        if (!c) return '';

        if (c.f && !evaluating.has(cleanAddr)) {
            evaluating.add(cleanAddr);
            try {
                const rNum = cInfo ? cInfo.row : (rowHint || 1);
                const evaluated = evalFormulaExpr(c.f, getVal, rNum);
                evaluating.delete(cleanAddr);
                if (evaluated !== null && evaluated !== undefined && evaluated !== '') {
                    c.v = evaluated;
                    c.w = String(evaluated);
                    c.t = typeof evaluated === 'number' ? 'n' : 's';
                    return evaluated;
                }
            } catch {
                evaluating.delete(cleanAddr);
            }
        }

        if (c.v !== undefined && c.v !== null && c.v !== '' && c.t !== 'e') return c.v;
        if (c.w !== undefined && c.w !== null && c.w !== '') return c.w;
        return '';
    }

    for (let R = range.s.r; R <= range.e.r; ++R) {
        for (let C = range.s.c; C <= range.e.c; ++C) {
            const cellAddress = XLSX.utils.encode_cell({ r: R, c: C });
            const cell = sheet[cellAddress];
            if (!cell) continue;

            if (cell.f) {
                const computed = evalFormulaExpr(cell.f, getVal, R + 1);
                if (computed !== null && computed !== undefined && computed !== '') {
                    cell.v = computed;
                    cell.w = String(computed);
                    cell.t = typeof computed === 'number' ? 'n' : 's';
                }
            } else if (cell.v === undefined && cell.w) {
                cell.v = cell.w;
            }

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

interface CsvImportModalProps {
    isOpen: boolean;
    onClose: () => void;
}

export function CsvImportModal({ isOpen, onClose }: CsvImportModalProps) {
    const fileInputRef = useRef<HTMLInputElement>(null);
    const queryClient = useQueryClient();

    const [step, setStep] = useState<'upload' | 'preview' | 'importing' | 'done'>('upload');
    const [rows, setRows] = useState<ParsedRow[]>([]);
    const [parseErrors, setParseErrors] = useState<string[]>([]);
    const [importResult, setImportResult] = useState<BulkImportSummary | null>(null);

    const reset = () => {
        setStep('upload');
        setRows([]);
        setParseErrors([]);
        setImportResult(null);
        if (fileInputRef.current) fileInputRef.current.value = '';
    };

    const handleClose = () => { reset(); onClose(); };

    const downloadExcelTemplate = () => {
        const link = document.createElement('a');
        link.href = '/template_product_upload.xlsx';
        link.download = 'template_product_upload.xlsx';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    const downloadCsvTemplate = downloadExcelTemplate;
    const downloadTemplate = downloadExcelTemplate;

    const processRawData = (data: Record<string, any>[], initialErrors: string[]) => {
        const errs: string[] = [...initialErrors];
        const parsed: ParsedRow[] = [];
        const seenSkus = new Set<string>();

        data.forEach((rawRow, idx) => {
            // Normalize headers (cleaning UTF-8 BOM & leading/trailing spaces)
            const row: Record<string, any> = {};
            Object.entries(rawRow).forEach(([k, v]) => {
                const rawKey = k.replace(/^\uFEFF/, '').trim();
                const cleanKey = rawKey.toLowerCase();

                let mapped = COL_MAP[cleanKey];
                if (!mapped) {
                    const alphaKey = cleanKey.replace(/[^a-z0-9]/g, '');
                    mapped = COL_MAP[alphaKey];
                }

                if (!mapped) {
                    if (cleanKey.includes('sku')) mapped = 'sku';
                    else if (cleanKey.includes('saree') || cleanKey.includes('title')) mapped = 'sareeName';
                    else if (cleanKey.includes('fabric') || cleanKey.includes('material')) mapped = 'fabric';
                    else if (cleanKey.includes('color') || cleanKey.includes('colour') || cleanKey.includes('shade')) mapped = 'color';
                    else if (cleanKey.includes('selling') || cleanKey === 'price') mapped = 'sellingPrice';
                    else if (cleanKey.includes('purchase') || cleanKey.includes('cost') || cleanKey.includes('buy')) mapped = 'purchasePrice';
                    else if (cleanKey.includes('stock') || cleanKey.includes('qty') || cleanKey.includes('units')) mapped = 'stock';
                    else if (cleanKey.includes('mrp')) mapped = 'mrp';
                    else if (cleanKey.includes('hsn')) mapped = 'hsnCode';
                    else if (cleanKey.includes('design') || cleanKey.includes('style')) mapped = 'designCode';
                    else if (cleanKey.includes('barcode')) mapped = 'barcode';
                    else if (cleanKey.includes('rack')) mapped = 'rackNo';
                    else if (cleanKey.includes('category_id') || cleanKey.includes('cat_id')) mapped = 'categoryId';
                    else if (cleanKey.includes('category') || cleanKey.includes('type')) mapped = 'category';
                    else if (cleanKey.includes('occasion')) mapped = 'occasion';
                    else if (cleanKey.includes('status')) mapped = 'status';
                    else if (cleanKey.includes('desc')) mapped = 'description';
                }

                if (mapped) row[mapped] = v !== undefined && v !== null ? v : '';
            });

            // Extra fallback for SKU: if row.sku is empty, search rawRow for any key containing "sku"
            if (!row.sku) {
                const skuEntry = Object.entries(rawRow).find(([k]) => k.toLowerCase().includes('sku'));
                if (skuEntry && skuEntry[1] !== undefined && skuEntry[1] !== null && String(skuEntry[1]).trim() !== '') {
                    row.sku = String(skuEntry[1]).trim();
                }
            }

            // Saree Name & Core Specs
            const name = String(row.sareeName || '').trim();
            const category = String(row.category || '').trim();
            const fabric = String(row.fabric || '').trim();
            const rawSku = String(row.sku || '').trim();

            const sellingPrice = parseCleanNumber(row.sellingPrice);
            const purchasePrice = parseCleanNumber(row.purchasePrice);

            // GHOST / EMPTY ROW FILTERING:
            // If a row has no name, no category, no fabric, no sku, and 0 price, it's an empty or dragged-down formula row
            if (!name && !category && !fabric && !rawSku && sellingPrice === 0 && purchasePrice === 0) {
                return;
            }

            // Saree Name check
            if (!name) {
                errs.push(`Row ${idx + 2}: Missing Saree Name`);
                return;
            }

            // Warn duplicate SKU in file
            if (rawSku) {
                const skuUpper = rawSku.toUpperCase();
                if (seenSkus.has(skuUpper)) {
                    errs.push(`Row ${idx + 2}: Duplicate SKU "${rawSku}" in file`);
                } else {
                    seenSkus.add(skuUpper);
                }
            }

            const mrp = parseCleanNumber(row.mrp) || sellingPrice;
            const discountAmount = parseCleanNumber(row.discountAmount);
            const discountPercentage = parseCleanDiscountPercentage(row.discountPercentage);
            const stock = Math.round(parseCleanNumber(row.stock));

            const statusStr = String(row.status || '').toLowerCase().trim();
            const status = statusStr === 'inactive' ? 'inactive' : 'active';

            parsed.push({
                sareeName: name,
                category: category || 'General',
                categoryId: String(row.categoryId || '').trim(),
                designCode: row.designCode ? String(row.designCode).trim().toUpperCase() : '',
                hsnCode: row.hsnCode ? String(row.hsnCode).trim() : '',
                sku: rawSku,
                description: String(row.description || '').trim(),
                fabric: fabric || 'Silk',
                color: String(row.color || '').trim() || 'Multicolor',
                purchasePrice: purchasePrice,
                sellingPrice: sellingPrice,
                stock: stock,
                rackNo: String(row.rackNo || '').trim(),
                barcode: String(row.barcode || '').trim(),
                status: status,
                mrp: mrp,
                discountAmount: discountAmount,
                discountPercentage: discountPercentage,
                occasion: String(row.occasion || '').trim(),
                gstRate: row.gstRate !== undefined && row.gstRate !== '' ? parseCleanNumber(row.gstRate) : undefined,
                priceIncludesGst: String(row.priceIncludesGst).toLowerCase() === 'true' || String(row.priceIncludesGst).toLowerCase() === 'yes' || String(row.priceIncludesGst) === '1',
            });
        });

        setParseErrors(errs);
        setRows(parsed);
        setStep('preview');

        if (parsed.length === 0) {
            toast.error('No valid rows found in file. Please check column names or errors below.');
        }
    };

    const handleFile = (file: File) => {
        const isExcel = file.name.endsWith('.xlsx') || file.name.endsWith('.xls') || 
                        file.type === 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' ||
                        file.type === 'application/vnd.ms-excel';

        if (isExcel) {
            const reader = new FileReader();
            reader.onload = (e) => {
                try {
                    const data = e.target?.result;
                    if (!data) {
                        toast.error('Could not read Excel file.');
                        return;
                    }
                    const workbook = XLSX.read(data, {
                        type: 'array',
                        cellFormula: true,
                        cellDates: true,
                        cellText: true,
                        cellNF: true,
                    });

                    // Search for best sheet that contains product headers (e.g. saree_name, sku, category)
                    let targetSheetName = workbook.SheetNames[0];
                    for (const sName of workbook.SheetNames) {
                        const ws = workbook.Sheets[sName];
                        if (ws) {
                            const sample = XLSX.utils.sheet_to_json<any[]>(ws, { header: 1 });
                            if (sample && sample[0] && Array.isArray(sample[0])) {
                                const headerRow = sample[0].map(h => String(h).toLowerCase());
                                if (headerRow.some(h => h.includes('saree') || h.includes('sku') || h.includes('price') || h.includes('fabric'))) {
                                    targetSheetName = sName;
                                    break;
                                }
                            }
                        }
                    }

                    const worksheet = workbook.Sheets[targetSheetName];
                    if (!worksheet) {
                        toast.error('Could not find worksheet in Excel file.');
                        return;
                    }

                    // Pre-process formulas so uncalculated formula cells get evaluated
                    preProcessWorksheet(worksheet);

                    const rowsData = XLSX.utils.sheet_to_json<Record<string, any>>(worksheet, { defval: '', raw: true });
                    if (rowsData.length === 0) {
                        toast.error('Excel sheet is empty.');
                        return;
                    }

                    processRawData(rowsData, []);
                } catch (error: any) {
                    toast.error('Error parsing Excel file: ' + (error?.message || 'Unknown error'));
                }
            };
            reader.readAsArrayBuffer(file);
        } else {
            Papa.parse(file, {
                header: true,
                skipEmptyLines: 'greedy',
                transformHeader: (h) => h.replace(/^\uFEFF/, '').trim(),
                complete: ({ data, errors }) => {
                    const errs: string[] = errors.map(e => `Parse error row ${e.row}: ${e.message}`);
                    processRawData(data as Record<string, string>[], errs);
                },
            });
        }
    };

    const handleImport = async () => {
        setStep('importing');
        try {
            const result = await inventoryService.bulkImportProducts(
                rows.map(r => ({ ...r, status: (r.status === 'inactive' ? 'inactive' : 'active') as 'active' | 'inactive' }))
            );
            setImportResult(result);
            setStep('done');
            queryClient.invalidateQueries({ queryKey: ['sarees'] });
            if (result.created > 0 || result.updated > 0) {
                toast.success(`Import completed: ${result.created} created, ${result.updated} updated!`);
            } else if (result.failed > 0) {
                toast.error(`Import failed for ${result.failed} rows. Review errors below.`);
            }
        } catch (e: any) {
            toast.error('Import failed: ' + (e?.message || 'Unknown error'));
            setStep('preview');
        }
    };

    return (
        <Dialog open={isOpen} onOpenChange={(open) => !open && handleClose()}>
            <DialogContent className="max-w-4xl max-h-[90vh] flex flex-col border-gold/20 shadow-2xl p-0 overflow-hidden">

                <DialogHeader className="border-b border-gold/15 px-5 py-3 shrink-0">
                    <DialogTitle className="text-base font-bold font-serif text-maroon flex items-center gap-2">
                        <Upload className="h-4 w-4" />
                        BULK IMPORT — CSV / EXCEL
                    </DialogTitle>
                </DialogHeader>

                {/* ── UPLOAD STEP ──────────────────────────────────────────── */}
                {step === 'upload' && (
                    <div className="flex flex-col items-center gap-5 py-10 px-6">
                        {/* Drop zone */}
                        <div
                            className="w-full max-w-md border-2 border-dashed border-gold/40 rounded-xl p-10 flex flex-col items-center gap-3 text-center cursor-pointer hover:bg-cream/10 hover:border-maroon/40 transition-colors"
                            onClick={() => fileInputRef.current?.click()}
                            onDragOver={(e) => e.preventDefault()}
                            onDrop={(e) => {
                                e.preventDefault();
                                const file = e.dataTransfer.files[0];
                                if (file) handleFile(file);
                            }}
                        >
                            <div className="w-12 h-12 rounded-full bg-maroon/10 flex items-center justify-center">
                                <FileText className="h-6 w-6 text-maroon" />
                            </div>
                            <div>
                                <p className="font-semibold text-sm text-maroon">Click to upload or drag & drop</p>
                                <p className="text-xs text-gray-400 mt-1">CSV or XLSX/XLS files · Max 5MB</p>
                            </div>
                            <input
                                ref={fileInputRef}
                                type="file"
                                accept=".csv, .xlsx, .xls"
                                className="hidden"
                                onChange={(e) => { if (e.target.files?.[0]) handleFile(e.target.files[0]); }}
                            />
                        </div>

                        {/* Template download */}
                        <div className="flex flex-col items-center gap-2">
                            <p className="text-xs text-gray-400">Don't have a template?</p>
                            <div className="flex items-center gap-2 flex-wrap justify-center">
                                <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={downloadExcelTemplate}
                                    className="border-gold/40 text-maroon gap-2 text-xs h-9 font-semibold hover:bg-gold/10 shadow-sm px-4"
                                >
                                    <FileSpreadsheet className="h-4 w-4 text-emerald-700" />
                                    Download Sample Template (.xlsx)
                                </Button>
                            </div>
                        </div>

                        {/* Required columns info */}
                        <div className="w-full max-w-md bg-amber-50/50 border border-amber-200/60 rounded-lg px-4 py-3 text-xs text-amber-800">
                            <p className="font-bold mb-1">Recommended columns:</p>
                            <p className="font-mono text-[11px] text-amber-700">saree_name, category, fabric, color, purchase_price, selling_price</p>
                            <p className="mt-1 text-amber-600">Optional: design_code, hsn_code, stock, rack_no, barcode, status, mrp, discount_amount</p>
                        </div>
                    </div>
                )}

                {/* ── PREVIEW STEP ─────────────────────────────────────────── */}
                {step === 'preview' && (
                    <div className="flex flex-col flex-1 min-h-0 px-5 py-3 gap-3">
                        {/* Zero images note banner */}
                        <div className="bg-amber-50/80 border border-amber-200/80 rounded-lg px-3.5 py-2.5 flex items-start gap-2.5 text-xs text-amber-900 shrink-0">
                            <ImageIcon className="h-4 w-4 text-amber-600 shrink-0 mt-0.5" />
                            <div>
                                <span className="font-bold text-amber-950">Product Data Import (Zero Images Workflow)</span>
                                <p className="text-[11px] text-amber-800 mt-0.5">
                                    Products will be imported immediately. Zero images is completely valid and will not cause rows to fail. Product images will be uploaded separately later through the dedicated image bulk uploader using SKU matching.
                                </p>
                            </div>
                        </div>

                        {/* Summary bar */}
                        <div className="flex items-center gap-3 shrink-0">
                            <div className="flex items-center gap-1.5 bg-green-50 border border-green-200 rounded-lg px-3 py-1.5 text-xs text-green-700 font-semibold">
                                <CheckCircle2 className="h-3.5 w-3.5" />
                                {rows.length} rows ready to import
                            </div>
                            {parseErrors.length > 0 && (
                                <div className="flex items-center gap-1.5 bg-red-50 border border-red-200 rounded-lg px-3 py-1.5 text-xs text-red-700 font-semibold">
                                    <AlertCircle className="h-3.5 w-3.5" />
                                    {parseErrors.length} rows skipped / issues found
                                </div>
                            )}
                            <button onClick={reset} className="ml-auto flex items-center gap-1 text-xs text-gray-400 hover:text-maroon transition-colors">
                                <X className="h-3.5 w-3.5" /> Change file
                            </button>
                        </div>

                        {/* Parse errors */}
                        {parseErrors.length > 0 && (
                            <div className="bg-red-50 border border-red-200 rounded-lg px-3 py-2 max-h-28 overflow-y-auto shrink-0">
                                <p className="text-xs font-bold text-red-700 mb-1">File Warnings / Errors:</p>
                                {parseErrors.map((e, i) => (
                                    <p key={i} className="text-[11px] text-red-600 font-mono">{e}</p>
                                ))}
                            </div>
                        )}

                        {/* Preview table */}
                        {rows.length > 0 ? (
                            <div className="flex-1 min-h-0 overflow-auto border border-gold/15 rounded-lg">
                                <table className="w-full text-[11px] border-collapse">
                                    <thead className="bg-cream/20 sticky top-0">
                                        <tr>
                                            {['#', 'SKU', 'Name', 'Category', 'Fabric', 'Color', 'Design Code', 'HSN Code', 'Purchase ₹', 'Selling ₹', 'Stock', 'Occasion', 'Images', 'Status'].map(h => (
                                                <th key={h} className="text-left px-2 py-1.5 text-maroon font-bold border-b border-gold/15 whitespace-nowrap">{h}</th>
                                            ))}
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {rows.map((r, i) => (
                                            <tr key={i} className="border-b border-gold/5 hover:bg-cream/5">
                                                <td className="px-2 py-1 text-gray-400">{i + 1}</td>
                                                <td className="px-2 py-1 font-mono text-purple-700 font-bold">{r.sku || '—'}</td>
                                                <td className="px-2 py-1 font-medium text-gray-800 max-w-[140px] truncate">{r.sareeName}</td>
                                                <td className="px-2 py-1 text-gray-600">{r.category}</td>
                                                <td className="px-2 py-1 text-gray-600">{r.fabric}</td>
                                                <td className="px-2 py-1 text-gray-600">{r.color}</td>
                                                <td className="px-2 py-1 font-mono text-purple-700 font-bold">{r.designCode || '—'}</td>
                                                <td className="px-2 py-1 font-mono text-gray-600">{r.hsnCode || '—'}</td>
                                                <td className="px-2 py-1 text-right text-gray-500">₹{r.purchasePrice.toLocaleString()}</td>
                                                <td className="px-2 py-1 text-right font-bold text-maroon">₹{r.sellingPrice.toLocaleString()}</td>
                                                <td className="px-2 py-1 text-center">{r.stock}</td>
                                                <td className="px-2 py-1 text-gray-600">{r.occasion || '—'}</td>
                                                <td className="px-2 py-1 whitespace-nowrap">
                                                    <span className="inline-flex items-center gap-1 text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-amber-50 text-amber-700 border border-amber-200">
                                                        <Clock className="h-3 w-3 text-amber-500" /> Pending
                                                    </span>
                                                </td>
                                                <td className="px-2 py-1">
                                                    <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full ${r.status === 'active' ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'}`}>
                                                        {r.status}
                                                    </span>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        ) : (
                            <div className="flex-1 flex flex-col items-center justify-center text-center p-6 border border-dashed border-red-200 rounded-lg bg-red-50/20">
                                <AlertCircle className="h-8 w-8 text-red-500 mb-2" />
                                <p className="text-sm font-bold text-red-800">No Valid Rows Parsed</p>
                                <p className="text-xs text-gray-600 max-w-md mt-1">
                                    Please review the file warnings above. Ensure your file headers include at least <span className="font-semibold text-maroon">saree_name</span>.
                                </p>
                            </div>
                        )}
                    </div>
                )}

                {/* ── IMPORTING STEP ───────────────────────────────────────── */}
                {step === 'importing' && (
                    <div className="flex flex-col items-center justify-center gap-4 py-16">
                        <Loader2 className="h-10 w-10 animate-spin text-maroon" />
                        <p className="text-sm font-semibold text-maroon">Importing {rows.length} sarees to database…</p>
                        <p className="text-xs text-gray-400">Please wait, do not close this window</p>
                    </div>
                )}

                {/* ── DONE STEP ────────────────────────────────────────────── */}
                {step === 'done' && importResult && (
                    <div className="flex flex-col flex-1 min-h-0 px-5 py-4 gap-3.5 overflow-y-auto">
                        {/* Header banner */}
                        <div className="flex items-center gap-3 bg-gradient-to-r from-emerald-50 to-teal-50/40 border border-emerald-200 rounded-xl p-3 shrink-0">
                            <div className="w-10 h-10 rounded-full bg-emerald-100 flex items-center justify-center shrink-0">
                                <CheckCircle2 className="h-5 w-5 text-emerald-600" />
                            </div>
                            <div className="flex-1">
                                <h3 className="text-sm font-bold text-gray-900 font-serif">Import Completed</h3>
                                <p className="text-[11px] text-gray-500">
                                    Product catalog data has been processed. Image uploads remain a separate independent workflow.
                                </p>
                            </div>
                        </div>

                        {/* Summary Metrics Grid */}
                        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-2.5 shrink-0">
                            <div className="bg-gray-50 border border-gray-200 rounded-lg p-2.5 text-center shadow-xs">
                                <span className="text-[10px] uppercase font-bold text-gray-400 block tracking-wider">Rows Processed</span>
                                <span className="text-lg font-bold font-mono text-gray-800">{importResult.totalRows}</span>
                            </div>
                            <div className="bg-emerald-50/70 border border-emerald-200 rounded-lg p-2.5 text-center shadow-xs">
                                <span className="text-[10px] uppercase font-bold text-emerald-600 block tracking-wider">Created</span>
                                <span className="text-lg font-bold font-mono text-emerald-700">{importResult.created}</span>
                            </div>
                            <div className="bg-blue-50/70 border border-blue-200 rounded-lg p-2.5 text-center shadow-xs">
                                <span className="text-[10px] uppercase font-bold text-blue-600 block tracking-wider">Updated</span>
                                <span className="text-lg font-bold font-mono text-blue-700">{importResult.updated}</span>
                            </div>
                            <div className={cn(
                                "border rounded-lg p-2.5 text-center shadow-xs",
                                importResult.failed > 0 ? "bg-red-50/80 border-red-200 text-red-700" : "bg-gray-50 border-gray-200 text-gray-400"
                            )}>
                                <span className="text-[10px] uppercase font-bold block tracking-wider">Failed</span>
                                <span className="text-lg font-bold font-mono">{importResult.failed}</span>
                            </div>
                            <div className="bg-teal-50/70 border border-teal-200 rounded-lg p-2.5 text-center shadow-xs">
                                <span className="text-[10px] uppercase font-bold text-teal-700 block tracking-wider">Images Uploaded</span>
                                <span className="text-lg font-bold font-mono text-teal-800">{importResult.imagesUploaded}</span>
                            </div>
                            <div className="bg-amber-50/70 border border-amber-200 rounded-lg p-2.5 text-center shadow-xs">
                                <span className="text-[10px] uppercase font-bold text-amber-700 block tracking-wider">Images Pending</span>
                                <span className="text-lg font-bold font-mono text-amber-800">{importResult.imagesPending}</span>
                            </div>
                        </div>

                        {/* Errors report */}
                        {importResult.errors.length > 0 && (
                            <div className="bg-red-50 border border-red-200 rounded-lg p-3 shrink-0">
                                <div className="flex items-center gap-1.5 mb-1.5">
                                    <AlertCircle className="h-4 w-4 text-red-600 shrink-0" />
                                    <p className="text-xs font-bold text-red-700">Failed Rows ({importResult.errors.length}):</p>
                                </div>
                                <div className="space-y-1 max-h-24 overflow-y-auto pl-5">
                                    {importResult.errors.map((e, i) => (
                                        <p key={i} className="text-[11px] text-red-600 font-mono">{e}</p>
                                    ))}
                                </div>
                            </div>
                        )}

                        {/* Breakdown table */}
                        {importResult.itemResults.length > 0 && (
                            <div className="flex-1 min-h-[160px] flex flex-col border border-gold/15 rounded-lg overflow-hidden">
                                <div className="bg-cream/20 px-3 py-1.5 border-b border-gold/15 flex items-center justify-between text-xs font-bold text-maroon shrink-0">
                                    <span>Import Results Breakdown ({importResult.itemResults.length})</span>
                                    <span className="text-[10px] font-normal text-gray-500">Missing images are not errors</span>
                                </div>
                                <div className="flex-1 overflow-auto">
                                    <table className="w-full text-[11px] border-collapse">
                                        <thead className="bg-cream/10 sticky top-0">
                                            <tr>
                                                <th className="text-left px-2.5 py-1.5 text-gray-500 font-semibold border-b border-gold/10">Row</th>
                                                <th className="text-left px-2.5 py-1.5 text-gray-500 font-semibold border-b border-gold/10">SKU</th>
                                                <th className="text-left px-2.5 py-1.5 text-gray-500 font-semibold border-b border-gold/10">Product Name</th>
                                                <th className="text-left px-2.5 py-1.5 text-gray-500 font-semibold border-b border-gold/10">Product Data</th>
                                                <th className="text-left px-2.5 py-1.5 text-gray-500 font-semibold border-b border-gold/10">Images</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {importResult.itemResults.map((item, idx) => (
                                                <tr key={idx} className="border-b border-gold/5 hover:bg-cream/5">
                                                    <td className="px-2.5 py-1 text-gray-400 font-mono">{item.rowNumber}</td>
                                                    <td className="px-2.5 py-1 font-mono font-bold text-purple-700">{item.sku || '—'}</td>
                                                    <td className="px-2.5 py-1 text-gray-800 font-medium max-w-[200px] truncate">{item.sareeName}</td>
                                                    <td className="px-2.5 py-1">
                                                        {item.action === 'created' ? (
                                                            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-700">
                                                                ✓ Created
                                                            </span>
                                                        ) : item.action === 'updated' ? (
                                                            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-blue-100 text-blue-700">
                                                                ✓ Updated
                                                            </span>
                                                        ) : (
                                                            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-red-100 text-red-700">
                                                                Failed
                                                            </span>
                                                        )}
                                                    </td>
                                                    <td className="px-2.5 py-1">
                                                        {item.imageStatus === 'uploaded' ? (
                                                            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200">
                                                                ✓ Uploaded
                                                            </span>
                                                        ) : (
                                                            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-50 text-amber-700 border border-amber-200">
                                                                ⏳ Pending
                                                            </span>
                                                        )}
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            </div>
                        )}
                    </div>
                )}

                {/* ── FOOTER ───────────────────────────────────────────────── */}
                <DialogFooter className="border-t border-gold/15 px-5 py-3 shrink-0">
                    {step === 'upload' && (
                        <Button variant="outline" onClick={handleClose} className="border-gold/30 text-maroon text-xs h-8">Cancel</Button>
                    )}
                    {step === 'preview' && (
                        <>
                            <Button variant="outline" onClick={handleClose} className="border-gold/30 text-maroon text-xs h-8">Cancel</Button>
                            <Button
                                onClick={handleImport}
                                disabled={rows.length === 0}
                                className="bg-maroon hover:bg-maroon-dark text-gold gap-1.5 h-8 text-xs font-bold"
                            >
                                <Upload className="h-3.5 w-3.5" />
                                Import {rows.length} Sarees
                            </Button>
                        </>
                    )}
                    {step === 'done' && (
                        <Button onClick={handleClose} className="bg-maroon hover:bg-maroon-dark text-gold h-8 text-xs font-bold">
                            Done
                        </Button>
                    )}
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
