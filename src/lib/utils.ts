import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
    return twMerge(clsx(inputs))
}

/**
 * Robust cross-browser clipboard copy with fallback to execCommand('copy')
 * for non-HTTPS or permission-restricted environments.
 */
export async function copyTextToClipboard(text: string): Promise<boolean> {
    if (!text) return false;

    // 1. Try modern navigator.clipboard API if available
    if (typeof navigator !== 'undefined' && navigator.clipboard && typeof navigator.clipboard.writeText === 'function') {
        try {
            await navigator.clipboard.writeText(text);
            return true;
        } catch (err) {
            console.warn('navigator.clipboard.writeText failed, falling back to textarea execCommand:', err);
        }
    }

    // 2. Fallback: Create a hidden textarea and execute copy
    try {
        const textArea = document.createElement('textarea');
        textArea.value = text;
        textArea.style.position = 'fixed';
        textArea.style.top = '0';
        textArea.style.left = '0';
        textArea.style.width = '2em';
        textArea.style.height = '2em';
        textArea.style.padding = '0';
        textArea.style.border = 'none';
        textArea.style.outline = 'none';
        textArea.style.boxShadow = 'none';
        textArea.style.background = 'transparent';
        textArea.setAttribute('readonly', '');
        document.body.appendChild(textArea);
        textArea.focus();
        textArea.select();
        textArea.setSelectionRange(0, text.length);

        const successful = document.execCommand('copy');
        document.body.removeChild(textArea);
        return Boolean(successful);
    } catch (fallbackErr) {
        console.error('execCommand copy failed:', fallbackErr);
        return false;
    }
}

/**
 * Generates a unique secret price code for a saree:
 * Takes the last 3 digits of the Saree ID/code (e.g. '866' from 'S567866')
 * followed by the rounded MRP (e.g. 2500 -> '8662500').
 * Only the shop owner knows that skipping the first 3 digits reveals the MRP.
 */
export function generateSecretPriceCode(
    id?: string | null,
    mrp?: number | null,
    fallbackPrice?: number | null
): string {
    const price = (mrp !== undefined && mrp !== null && mrp > 0)
        ? mrp
        : (fallbackPrice !== undefined && fallbackPrice !== null && fallbackPrice > 0 ? fallbackPrice : 0);

    if (!price) return '-';

    const cleanId = String(id || '').trim();
    // Extract numeric digits from the ID
    const digitsOnly = cleanId.replace(/\D/g, '');
    let prefix = '';

    if (digitsOnly.length >= 3) {
        prefix = digitsOnly.slice(-3);
    } else if (digitsOnly.length > 0) {
        prefix = digitsOnly.padStart(3, '0');
    } else if (cleanId.length >= 3) {
        prefix = cleanId.slice(-3);
    } else {
        prefix = (cleanId || '000').padStart(3, '0').slice(-3);
    }

    return `${prefix}${Math.round(price)}`;
}

