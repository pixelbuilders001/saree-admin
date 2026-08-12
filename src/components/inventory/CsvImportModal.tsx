import React, { useRef, useState } from 'react';
import Papa from 'papaparse';
import * as XLSX from 'xlsx';
import {
    Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import { Upload, FileText, AlertCircle, CheckCircle2, Download, Loader2, X } from 'lucide-react';
import { inventoryService } from '@/services/inventoryService';
import { useQueryClient } from '@tanstack/react-query';

// ── Column map: CSV header → internal field ────────────────────────────────────
const COL_MAP: Record<string, string> = {
    'saree_name': 'sareeName', 'name': 'sareeName', 'saree name': 'sareeName',
    'category': 'category',
    'fabric': 'fabric',
    'color': 'color',
    'purchase_price': 'purchasePrice', 'purchase price': 'purchasePrice', 'cost': 'purchasePrice',
    'selling_price': 'sellingPrice', 'selling price': 'sellingPrice', 'price': 'sellingPrice',
    'stock': 'stock', 'qty': 'stock', 'quantity': 'stock',
    'rack_no': 'rackNo', 'rack no': 'rackNo', 'rack': 'rackNo',
    'barcode': 'barcode',
    'status': 'status',
    'sku': 'sku', 'sku_code': 'sku', 'sku code': 'sku',
    'category_id': 'categoryId', 'category id': 'categoryId',
    'description': 'description',
    'mrp': 'mrp', 'maximum_retail_price': 'mrp', 'maximum retail price': 'mrp',
    'discount_amount': 'discountAmount', 'discount amount': 'discountAmount', 'discount': 'discountAmount',
    'discount_percentage': 'discountPercentage', 'discount percentage': 'discountPercentage', 'discount %': 'discountPercentage'
};

const REQUIRED = ['sareeName', 'category', 'fabric', 'color', 'purchasePrice', 'sellingPrice'];
const TEMPLATE_HEADERS = 'saree_name,category,fabric,color,purchase_price,selling_price,stock,rack_no,barcode,status,sku,category_id,description,mrp,discount_amount,discount_percentage';
const TEMPLATE_EXAMPLE = 'Kanjivaram Red Silk,Kanjivaram,Silk,Red,4500,8000,5,A-12,,active,SKU-KAN-001,cat_101,Beautiful handwoven Kanjivaram silk saree,10000,2000,20\nBanarasi Gold Zari,Banarasi,Silk,Gold,5000,9500,3,B-04,,active,SKU-BAN-002,cat_102,Stunning gold zari Banarasi silk,12000,2500,20.83';

interface ParsedRow {
    sareeName: string;
    category: string;
    categoryId?: string;
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
    const [importResult, setImportResult] = useState<{ inserted: number; errors: string[] } | null>(null);

    const reset = () => {
        setStep('upload');
        setRows([]);
        setParseErrors([]);
        setImportResult(null);
        if (fileInputRef.current) fileInputRef.current.value = '';
    };

    const handleClose = () => { reset(); onClose(); };

    const downloadTemplate = () => {
        const content = TEMPLATE_HEADERS + '\n' + TEMPLATE_EXAMPLE;
        const blob = new Blob([content], { type: 'text/csv' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'saree_import_template.csv';
        a.click();
        URL.revokeObjectURL(url);
    };

    const processRawData = (data: Record<string, any>[], initialErrors: string[]) => {
        const errs: string[] = [...initialErrors];
        const parsed: ParsedRow[] = [];

        data.forEach((rawRow, idx) => {
            // Normalize headers
            const row: Record<string, string> = {};
            Object.entries(rawRow).forEach(([k, v]) => {
                const mapped = COL_MAP[k.trim().toLowerCase()];
                if (mapped) row[mapped] = v !== undefined && v !== null ? String(v) : '';
            });

            // Check required
            const missing = REQUIRED.filter(f => !row[f]?.trim());
            if (missing.length) {
                errs.push(`Row ${idx + 2}: Missing ${missing.join(', ')}`);
                return;
            }

            parsed.push({
                sareeName: row.sareeName?.trim() || '',
                category: row.category?.trim() || '',
                categoryId: row.categoryId?.trim() || '',
                sku: row.sku?.trim() || '',
                description: row.description?.trim() || '',
                fabric: row.fabric?.trim() || '',
                color: row.color?.trim() || '',
                purchasePrice: parseFloat(row.purchasePrice) || 0,
                sellingPrice: parseFloat(row.sellingPrice) || 0,
                stock: parseInt(row.stock) || 0,
                rackNo: row.rackNo?.trim() || '',
                barcode: row.barcode?.trim() || '',
                status: row.status?.trim() || 'active',
                mrp: parseFloat(row.mrp) || parseFloat(row.sellingPrice) || 0,
                discountAmount: parseFloat(row.discountAmount) || 0,
                discountPercentage: parseFloat(row.discountPercentage) || 0,
            });
        });

        setParseErrors(errs);
        setRows(parsed);
        if (parsed.length > 0) setStep('preview');
        else toast.error('No valid rows found in file. Check your file format.');
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
                    const workbook = XLSX.read(data, { type: 'array' });
                    const firstSheetName = workbook.SheetNames[0];
                    const worksheet = workbook.Sheets[firstSheetName];
                    
                    const rowsData = XLSX.utils.sheet_to_json<Record<string, any>>(worksheet, { defval: '' });
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
                skipEmptyLines: true,
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
            const result = await inventoryService.bulkCreateSarees(
                rows.map(r => ({ ...r, status: (r.status === 'inactive' ? 'inactive' : 'active') as 'active' | 'inactive' }))
            );
            setImportResult(result);
            setStep('done');
            queryClient.invalidateQueries({ queryKey: ['sarees'] });
            if (result.inserted > 0) toast.success(`${result.inserted} sarees imported successfully!`);
        } catch (e: any) {
            toast.error('Import failed: ' + (e?.message || 'Unknown error'));
            setStep('preview');
        }
    };

    return (
        <Dialog open={isOpen} onOpenChange={(open) => !open && handleClose()}>
            <DialogContent className="max-w-3xl max-h-[90vh] flex flex-col border-gold/20 shadow-2xl p-0 overflow-hidden">

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
                            <Button variant="outline" size="sm" onClick={downloadTemplate} className="border-gold/30 text-maroon gap-1.5 text-xs h-8">
                                <Download className="h-3.5 w-3.5" />
                                Download CSV Template
                            </Button>
                        </div>

                        {/* Required columns info */}
                        <div className="w-full max-w-md bg-amber-50/50 border border-amber-200/60 rounded-lg px-4 py-3 text-xs text-amber-800">
                            <p className="font-bold mb-1">Required columns:</p>
                            <p className="font-mono text-[11px] text-amber-700">saree_name, category, fabric, color, purchase_price, selling_price</p>
                            <p className="mt-1 text-amber-600">Optional: stock, rack_no, barcode, status</p>
                        </div>
                    </div>
                )}

                {/* ── PREVIEW STEP ─────────────────────────────────────────── */}
                {step === 'preview' && (
                    <div className="flex flex-col flex-1 min-h-0 px-5 py-3 gap-3">
                        {/* Summary bar */}
                        <div className="flex items-center gap-3 shrink-0">
                            <div className="flex items-center gap-1.5 bg-green-50 border border-green-200 rounded-lg px-3 py-1.5 text-xs text-green-700 font-semibold">
                                <CheckCircle2 className="h-3.5 w-3.5" />
                                {rows.length} rows ready to import
                            </div>
                            {parseErrors.length > 0 && (
                                <div className="flex items-center gap-1.5 bg-red-50 border border-red-200 rounded-lg px-3 py-1.5 text-xs text-red-700 font-semibold">
                                    <AlertCircle className="h-3.5 w-3.5" />
                                    {parseErrors.length} rows skipped
                                </div>
                            )}
                            <button onClick={reset} className="ml-auto flex items-center gap-1 text-xs text-gray-400 hover:text-maroon transition-colors">
                                <X className="h-3.5 w-3.5" /> Change file
                            </button>
                        </div>

                        {/* Parse errors */}
                        {parseErrors.length > 0 && (
                            <div className="bg-red-50 border border-red-200 rounded-lg px-3 py-2 max-h-24 overflow-y-auto shrink-0">
                                {parseErrors.map((e, i) => (
                                    <p key={i} className="text-[11px] text-red-600 font-mono">{e}</p>
                                ))}
                            </div>
                        )}

                        {/* Preview table */}
                        <div className="flex-1 min-h-0 overflow-auto border border-gold/15 rounded-lg">
                            <table className="w-full text-[11px] border-collapse">
                                <thead className="bg-cream/20 sticky top-0">
                                    <tr>
                                        {['#', 'Name', 'Category', 'Fabric', 'Color', 'Purchase ₹', 'Selling ₹', 'Stock', 'Rack', 'Status'].map(h => (
                                            <th key={h} className="text-left px-2 py-1.5 text-maroon font-bold border-b border-gold/15 whitespace-nowrap">{h}</th>
                                        ))}
                                    </tr>
                                </thead>
                                <tbody>
                                    {rows.map((r, i) => (
                                        <tr key={i} className="border-b border-gold/5 hover:bg-cream/5">
                                            <td className="px-2 py-1 text-gray-400">{i + 1}</td>
                                            <td className="px-2 py-1 font-medium text-gray-800 max-w-[140px] truncate">{r.sareeName}</td>
                                            <td className="px-2 py-1 text-gray-600">{r.category}</td>
                                            <td className="px-2 py-1 text-gray-600">{r.fabric}</td>
                                            <td className="px-2 py-1 text-gray-600">{r.color}</td>
                                            <td className="px-2 py-1 text-right text-gray-500">₹{r.purchasePrice.toLocaleString()}</td>
                                            <td className="px-2 py-1 text-right font-bold text-maroon">₹{r.sellingPrice.toLocaleString()}</td>
                                            <td className="px-2 py-1 text-center">{r.stock}</td>
                                            <td className="px-2 py-1 text-gray-500">{r.rackNo || '—'}</td>
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
                    <div className="flex flex-col items-center justify-center gap-4 py-14 px-6">
                        <div className="w-14 h-14 rounded-full bg-green-100 flex items-center justify-center">
                            <CheckCircle2 className="h-8 w-8 text-green-600" />
                        </div>
                        <div className="text-center">
                            <p className="text-lg font-bold text-maroon">{importResult.inserted} Sarees Imported!</p>
                            <p className="text-xs text-gray-500 mt-1">Your inventory has been updated successfully.</p>
                        </div>
                        {importResult.errors.length > 0 && (
                            <div className="w-full max-w-sm bg-amber-50 border border-amber-200 rounded-lg px-3 py-2">
                                <p className="text-xs text-amber-700 font-bold mb-1">{importResult.errors.length} rows had errors and were skipped:</p>
                                {importResult.errors.map((e, i) => (
                                    <p key={i} className="text-[11px] text-amber-600 font-mono">{e}</p>
                                ))}
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
