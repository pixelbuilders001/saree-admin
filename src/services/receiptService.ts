import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import type { Sale } from './salesService';
import type { Order } from './ordersService';
import { NotoSansDevanagariBase64 } from '@/assets/fonts/HindiFont';

export interface ExchangeReceiptData {
    exchangeId: string;
    customerName: string;
    customerMobile: string;
    date: string;
    returnItems: { sareeId: string; sareeName: string; quantity: number; sellingPrice: number }[];
    replaceItems: { sareeId: string; sareeName: string; quantity: number; sellingPrice: number }[];
    netDifference: number;
}

export const receiptService = {
    generatePDF: (sale: Sale): jsPDF => {
        const doc = new jsPDF();

        // Register Hindi font
        doc.addFileToVFS('NotoSansDevanagari-Regular.ttf', NotoSansDevanagariBase64);
        doc.addFont('NotoSansDevanagari-Regular.ttf', 'NotoSansDevanagari', 'normal');

        // Use Helvetica as default for better reliability
        doc.setFont('helvetica');

        const shopName = "Shree Banarasi Sarees";
        const shopAddress = "Near City Center, Main Market";
        const shopContact = "+91 XXXXX XXXXX";

        const drawText = (text: string, x: number, y: number, options?: any) => {
            const hindiRegex = /[\u0900-\u097F]/;
            if (hindiRegex.test(text)) {
                doc.setFont('NotoSansDevanagari');
            } else {
                doc.setFont('helvetica');
            }
            doc.text(text, x, y, options);
        };

        // Header
        doc.setFontSize(22);
        doc.setFont("helvetica", "bold");
        doc.setTextColor(128, 0, 0); // Maroon
        doc.text(shopName, 105, 20, { align: 'center' });

        doc.setFontSize(10);
        doc.setFont("helvetica", "normal");
        doc.setTextColor(100);
        doc.text(shopAddress, 105, 27, { align: 'center' });
        doc.text(`Contact: ${shopContact}`, 105, 32, { align: 'center' });

        doc.setDrawColor(212, 175, 55); // Gold
        doc.setLineWidth(0.5);
        doc.line(20, 38, 190, 38);

        // Bill Info
        doc.setFontSize(12);
        doc.setTextColor(0);
        drawText(`Bill No: ${sale.saleId}`, 20, 50);
        drawText(`Date: ${new Date(sale.date).toLocaleDateString()}`, 190, 50, { align: 'right' });

        if (sale.customerName || sale.customerMobile) {
            doc.setFontSize(11);
            doc.setFont("helvetica", "bold");
            drawText("Customer Details:", 20, 62);
            doc.setFontSize(10);
            doc.setFont("helvetica", "normal");
            drawText(`Name: ${sale.customerName || 'N/A'}`, 20, 68);
            drawText(`Mobile: ${sale.customerMobile || 'N/A'}`, 20, 73);
        }

        // Table
        const tableColumn = ["Sr No.", "Item Name", "Qty", "Price", "Total"];
        const tableRows = sale.items.map((item, index) => [
            index + 1,
            item.sareeName,
            item.quantity,
            `Rs. ${item.sellingPrice.toLocaleString()}`,
            `Rs. ${(item.quantity * item.sellingPrice).toLocaleString()}`
        ]);

        autoTable(doc, {
            startY: 80,
            head: [tableColumn],
            body: tableRows,
            theme: 'striped',
            headStyles: {
                fillColor: [128, 0, 0],
                textColor: [255, 255, 255],
                font: 'helvetica'
            },
            alternateRowStyles: { fillColor: [245, 245, 220] },
            styles: {
                font: 'helvetica'
            },
            didParseCell: (data) => {
                // Check if the cell content contains Hindi characters
                const hindiRegex = /[\u0900-\u097F]/;
                if (hindiRegex.test(data.cell.text.join(''))) {
                    data.cell.styles.font = 'NotoSansDevanagari';
                }
            },
            margin: { left: 20, right: 20 },
        });

        const finalY = (doc as any).lastAutoTable.finalY + 10;

        let currentY = finalY;
        if (sale.isGstApplied) {
            doc.setFontSize(10);
            doc.setFont("helvetica", "normal");
            drawText(`Taxable Amount: Rs. ${(sale.taxableAmount || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}`, 190, currentY, { align: 'right' });
            currentY += 6;
            drawText(`CGST @ ${sale.cgstRate || 2.5}%: Rs. ${(sale.cgstAmount || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}`, 190, currentY, { align: 'right' });
            currentY += 6;
            drawText(`SGST @ ${sale.sgstRate || 2.5}%: Rs. ${(sale.sgstAmount || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}`, 190, currentY, { align: 'right' });
            currentY += 6;
            drawText(`Total GST: Rs. ${(sale.totalGst || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}`, 190, currentY, { align: 'right' });
            currentY += 8;
        }

        // Total / Grand Total
        doc.setFontSize(14);
        doc.setFont("helvetica", "bold");
        drawText(`${sale.isGstApplied ? 'Grand Total' : 'Total Amount'}: Rs. ${sale.totalAmount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}`, 190, currentY, { align: 'right' });

        // Footer
        doc.setFontSize(10);
        doc.setFont("helvetica", "italic");
        doc.setTextColor(150);
        drawText("Thank you for shopping with us!", 105, currentY + 25, { align: 'center' });

        return doc;
    },

    generateExchangePDF: (data: ExchangeReceiptData): jsPDF => {
        const doc = new jsPDF();
        doc.addFileToVFS('NotoSansDevanagari-Regular.ttf', NotoSansDevanagariBase64);
        doc.addFont('NotoSansDevanagari-Regular.ttf', 'NotoSansDevanagari', 'normal');
        doc.setFont('helvetica');

        const shopName = "Shree Banarasi Sarees";
        const shopAddress = "Near City Center, Main Market";
        const shopContact = "+91 XXXXX XXXXX";

        const drawText = (text: string, x: number, y: number, options?: any) => {
            const hindiRegex = /[\u0900-\u097F]/;
            if (hindiRegex.test(text)) {
                doc.setFont('NotoSansDevanagari');
            } else {
                doc.setFont('helvetica');
            }
            doc.text(text, x, y, options);
        };

        // Header
        doc.setFontSize(22);
        doc.setFont("helvetica", "bold");
        doc.setTextColor(128, 0, 0);
        doc.text(shopName, 105, 20, { align: 'center' });

        doc.setFontSize(10);
        doc.setFont("helvetica", "normal");
        doc.setTextColor(100);
        doc.text(shopAddress, 105, 27, { align: 'center' });
        doc.text(`Contact: ${shopContact}`, 105, 32, { align: 'center' });

        doc.setDrawColor(212, 175, 55);
        doc.setLineWidth(0.5);
        doc.line(20, 38, 190, 38);

        // Exchange Info
        doc.setFontSize(14);
        doc.setFont("helvetica", "bold");
        doc.setTextColor(128, 0, 0);
        doc.text("EXCHANGE MEMO", 105, 45, { align: 'center' });

        doc.setFontSize(11);
        doc.setTextColor(0);
        doc.setFont("helvetica", "normal");
        drawText(`Exchange ID: ${data.exchangeId}`, 20, 55);
        drawText(`Date: ${new Date(data.date).toLocaleDateString()}`, 190, 55, { align: 'right' });

        if (data.customerName) {
            drawText(`Customer: ${data.customerName}`, 20, 62);
            drawText(`Mobile: ${data.customerMobile}`, 190, 62, { align: 'right' });
        }

        // Returns Table
        doc.setFontSize(12);
        doc.setFont("helvetica", "bold");
        doc.setTextColor(128, 0, 0);
        doc.text("ITEMS RETURNED (-)", 20, 75);

        const returnRows = data.returnItems.map((item, idx) => [
            idx + 1,
            item.sareeName,
            item.quantity,
            `Rs. ${item.sellingPrice.toLocaleString()}`,
            `Rs. ${(item.quantity * item.sellingPrice).toLocaleString()}`
        ]);

        autoTable(doc, {
            startY: 78,
            head: [["Sr No.", "Item", "Qty", "Price", "Total"]],
            body: returnRows,
            theme: 'striped',
            headStyles: { fillColor: [150, 0, 0], textColor: [255, 255, 255] },
            margin: { left: 20, right: 20 },
            didParseCell: (data) => {
                const hindiRegex = /[\u0900-\u097F]/;
                if (hindiRegex.test(data.cell.text.join(''))) data.cell.styles.font = 'NotoSansDevanagari';
            }
        });

        let finalY = (doc as any).lastAutoTable.finalY + 15;

        // Replacements Table
        doc.setFontSize(12);
        doc.setFont("helvetica", "bold");
        doc.setTextColor(0, 100, 0);
        doc.text("NEW ITEMS TAKEN (+)", 20, finalY);

        const replaceRows = data.replaceItems.map((item, idx) => [
            idx + 1,
            item.sareeName,
            item.quantity,
            `Rs. ${item.sellingPrice.toLocaleString()}`,
            `Rs. ${(item.quantity * item.sellingPrice).toLocaleString()}`
        ]);

        autoTable(doc, {
            startY: finalY + 3,
            head: [["Sr No.", "Item", "Qty", "Price", "Total"]],
            body: replaceRows,
            theme: 'striped',
            headStyles: { fillColor: [0, 100, 0], textColor: [255, 255, 255] },
            margin: { left: 20, right: 20 },
            didParseCell: (data) => {
                const hindiRegex = /[\u0900-\u097F]/;
                if (hindiRegex.test(data.cell.text.join(''))) data.cell.styles.font = 'NotoSansDevanagari';
            }
        });

        finalY = (doc as any).lastAutoTable.finalY + 10;

        // Balance Summary
        doc.setDrawColor(200);
        doc.line(120, finalY, 190, finalY);

        doc.setFontSize(13);
        doc.setFont("helvetica", "bold");
        doc.setTextColor(0);
        const returnValue = data.returnItems.reduce((s, i) => s + (i.quantity * i.sellingPrice), 0);
        const replacementValue = data.replaceItems.reduce((s, i) => s + (i.quantity * i.sellingPrice), 0);

        drawText(`Return Value: Rs. ${returnValue.toLocaleString()}`, 190, finalY + 10, { align: 'right' });
        drawText(`New Total: Rs. ${replacementValue.toLocaleString()}`, 190, finalY + 18, { align: 'right' });

        doc.setFontSize(15);
        doc.setTextColor(128, 0, 0);
        const diffText = data.netDifference > 0 ? `Net To Pay: Rs. ${data.netDifference.toLocaleString()}` : `Balance Adjusted`;
        drawText(diffText, 190, finalY + 28, { align: 'right' });

        doc.setFontSize(10);
        doc.setFont("helvetica", "italic");
        doc.setTextColor(150);
        doc.text("Exchange processing complete. No further returns on these items.", 105, finalY + 50, { align: 'center' });

        return doc;
    },

    downloadPDF: (sale: Sale) => {
        const doc = receiptService.generatePDF(sale);
        doc.save(`Shree_Banarasi_Sarees_Receipt_${sale.saleId}.pdf`);
    },

    downloadExchangePDF: (data: ExchangeReceiptData) => {
        const doc = receiptService.generateExchangePDF(data);
        doc.save(`Shree_Banarasi_Sarees_Exchange_${data.exchangeId}.pdf`);
    },

    sharePDF: async (sale: Sale) => {
        const doc = receiptService.generatePDF(sale);
        const pdfBlob = doc.output('blob');
        const fileName = `Shree_Banarasi_Sarees_Receipt_${sale.saleId}.pdf`;
        const file = new File([pdfBlob], fileName, { type: 'application/pdf' });

        if (navigator.canShare && navigator.canShare({ files: [file] })) {
            try {
                await navigator.share({
                    files: [file],
                    title: 'Sale Receipt',
                    text: `Receipt from Shree Banarasi Sarees for Bill No: ${sale.saleId}`,
                });
                return true;
            } catch (error) {
                console.error('Error sharing:', error);
                return false;
            }
        } else {
            // Fallback: Download and alert
            doc.save(fileName);
            return 'fallback';
        }
    },

    // Keeping this for reference or simple text share if needed
    generateWhatsAppTextMessage: (sale: Sale) => {
        let message = `*Receipt from Shree Banarasi Sarees*\n`;
        // ... (rest of message logic)
        return message;
    },

    /**
     * Professional Tax Invoice Generator for Online Orders
     */
    generateOrderInvoicePDF: (order: Order): jsPDF => {
        const doc = new jsPDF();

        try {
            doc.addFileToVFS('NotoSansDevanagari-Regular.ttf', NotoSansDevanagariBase64);
            doc.addFont('NotoSansDevanagari-Regular.ttf', 'NotoSansDevanagari', 'normal');
        } catch {}

        doc.setFont('helvetica');

        const shopName = "SHREE BANARASI SAREES";
        const shopTagline = "Authentic Handloom & Pure Silk Sarees";
        const shopAddress = "Rudauli Chowk, Samastipur, Bihar – 848101";
        const shopContact = "Phone: +91-6203909946 | Email: shreebanarasi180@gmail.com";
        const shopGSTIN = "GSTIN: 10AGAFS4190H1Z8";

        const drawText = (text: string, x: number, y: number, options?: any) => {
            const hindiRegex = /[\u0900-\u097F]/;
            if (hindiRegex.test(text)) {
                doc.setFont('NotoSansDevanagari');
            } else {
                doc.setFont('helvetica');
            }
            doc.text(text, x, y, options);
        };

        // Header - Brand & Shop
        doc.setFontSize(20);
        doc.setFont("helvetica", "bold");
        doc.setTextColor(128, 0, 0); // Maroon
        doc.text(shopName, 105, 18, { align: 'center' });

        doc.setFontSize(8.5);
        doc.setFont("helvetica", "italic");
        doc.setTextColor(180, 130, 40); // Gold
        doc.text(shopTagline, 105, 23, { align: 'center' });

        doc.setFontSize(8);
        doc.setFont("helvetica", "normal");
        doc.setTextColor(80);
        doc.text(shopAddress, 105, 27.5, { align: 'center' });
        doc.text(shopContact, 105, 31.5, { align: 'center' });

        doc.setFont("helvetica", "bold");
        doc.setTextColor(128, 0, 0);
        doc.text(shopGSTIN, 105, 36, { align: 'center' });

        // Decorative Gold Line
        doc.setDrawColor(212, 175, 55);
        doc.setLineWidth(0.7);
        doc.line(15, 39, 195, 39);

        // Tax Invoice Title Ribbon
        doc.setFillColor(128, 0, 0);
        doc.roundedRect(80, 41, 50, 6.5, 1.2, 1.2, 'F');
        doc.setFontSize(9.5);
        doc.setFont("helvetica", "bold");
        doc.setTextColor(255, 255, 255);
        doc.text("TAX INVOICE", 105, 45.5, { align: 'center' });

        // Left Side: Invoice Details
        const invoiceNum = order.invoiceNumber || order.orderNumber;
        const invoiceDate = new Date(order.createdAt).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });

        // Address resolution
        const rawAddr = order.shippingAddress;
        let addrObj: any = {};
        if (typeof rawAddr === 'string') {
            try { addrObj = JSON.parse(rawAddr); } catch { addrObj = { line1: rawAddr }; }
        } else if (rawAddr && typeof rawAddr === 'object') {
            addrObj = rawAddr;
        }

        const placeOfSupply = (order.placeOfSupply || addrObj.state || 'Bihar').trim();
        const isIntraState = placeOfSupply.toLowerCase().includes('bihar');

        doc.setFontSize(8.5);
        doc.setTextColor(50);
        doc.setFont("helvetica", "bold");
        doc.text("INVOICE DETAILS:", 15, 54);
        doc.setFont("helvetica", "normal");
        doc.text(`Invoice No: ${invoiceNum}`, 15, 59);
        doc.text(`Order No: ${order.orderNumber}`, 15, 63.5);
        doc.text(`Date: ${invoiceDate}`, 15, 68);
        doc.text(`Place of Supply: ${placeOfSupply} (${isIntraState ? 'Intra-State' : 'Inter-State'})`, 15, 72.5);
        doc.text(`Payment: ${order.paymentMethod || 'Online'} (${order.paymentStatus})`, 15, 77);

        // Right Side: Billed & Shipped To
        const customerName = addrObj.name || addrObj.recipientName || order.customerName || 'Valued Customer';
        const customerPhone = addrObj.phone || addrObj.recipientPhone || order.customerPhone || '';
        const street = addrObj.street || addrObj.line1 || addrObj.address || '';
        const landmark = addrObj.line2 || addrObj.landmark || '';
        const cityState = [addrObj.city, addrObj.state].filter(Boolean).join(', ') + (addrObj.zip || addrObj.pincode ? ` - ${addrObj.zip || addrObj.pincode}` : '');

        doc.setFont("helvetica", "bold");
        doc.text("BILLED & SHIPPED TO:", 115, 54);
        doc.setFont("helvetica", "normal");
        drawText(customerName, 115, 59);
        if (customerPhone) doc.text(`Phone: ${customerPhone}`, 115, 63.5);
        let curAddrY = 68;
        if (street) {
            drawText(street.length > 38 ? street.substring(0, 38) + '...' : street, 115, curAddrY);
            curAddrY += 4.5;
        }
        if (landmark) {
            drawText(`Landmark: ${landmark}`, 115, curAddrY);
            curAddrY += 4.5;
        }
        if (cityState) {
            drawText(cityState, 115, curAddrY);
            curAddrY += 4.5;
        }
        if (order.customerGstin) {
            doc.setFont("helvetica", "bold");
            doc.text(`Buyer GSTIN: ${order.customerGstin}`, 115, curAddrY);
            doc.setFont("helvetica", "normal");
        }

        // Table
        const gstRate = order.gstRate ?? 5;
        const items = (order.items || []).filter(i => (i.itemStatus || '').toLowerCase() !== 'cancelled');
        const tableColumn = ["#", "Item Description", "HSN", "Qty", "Price", "Taxable", "GST", "Total"];
        const tableRows = items.map((item, idx) => {
            const itemPrice = Number(item.totalPrice || item.unitPrice * item.quantity);
            const itemTaxable = Number(item.taxableValue ?? Math.round(itemPrice / (1 + gstRate / 100)));
            const itemGst = Number(item.gstAmount ?? Math.max(0, itemPrice - itemTaxable));
            return [
                idx + 1,
                item.productName + (item.sku ? ` (${item.sku})` : ''),
                item.hsnCode || '5208',
                item.quantity,
                `Rs. ${Number(item.unitPrice).toLocaleString('en-IN')}`,
                `Rs. ${itemTaxable.toLocaleString('en-IN')}`,
                `Rs. ${itemGst.toLocaleString('en-IN')}`,
                `Rs. ${itemPrice.toLocaleString('en-IN')}`
            ];
        });

        autoTable(doc, {
            startY: 92,
            head: [tableColumn],
            body: tableRows,
            theme: 'striped',
            headStyles: {
                fillColor: [128, 0, 0],
                textColor: [255, 255, 255],
                font: 'helvetica',
                fontSize: 8,
                fontStyle: 'bold',
                halign: 'center'
            },
            alternateRowStyles: { fillColor: [253, 250, 245] },
            columnStyles: {
                0: { halign: 'center', cellWidth: 10 },
                1: { cellWidth: 60 },
                2: { halign: 'center', cellWidth: 16 },
                3: { halign: 'center', cellWidth: 12 },
                4: { halign: 'right', cellWidth: 22 },
                5: { halign: 'right', cellWidth: 22 },
                6: { halign: 'right', cellWidth: 20 },
                7: { halign: 'right', cellWidth: 24 },
            },
            styles: {
                font: 'helvetica',
                fontSize: 8,
                cellPadding: 2.5
            },
            didParseCell: (data) => {
                const hindiRegex = /[\u0900-\u097F]/;
                if (hindiRegex.test(data.cell.text.join(''))) {
                    data.cell.styles.font = 'NotoSansDevanagari';
                }
            },
            margin: { left: 15, right: 15 },
        });

        let finalY = (doc as any).lastAutoTable.finalY + 7;

        if (finalY > 230) {
            doc.addPage();
            finalY = 20;
        }

        // Financial Summary
        const subtotal = Number(order.subtotal || 0);
        const discount = Number(order.discount || 0);
        const shippingFee = Number(order.shippingFee || 0);
        const totalAmount = Number(order.totalAmount || 0);
        const taxableAmount = Number(order.taxableAmount ?? Math.round((totalAmount - shippingFee) / (1 + gstRate / 100)));
        const totalGst = Number(order.totalGst ?? Math.max(0, totalAmount - shippingFee - taxableAmount));
        const cgst = Number(order.cgstAmount ?? (isIntraState ? Math.round(totalGst / 2) : 0));
        const sgst = Number(order.sgstAmount ?? (isIntraState ? Math.round(totalGst / 2) : 0));
        const igst = Number(order.igstAmount ?? (!isIntraState ? totalGst : 0));

        doc.setFontSize(8.5);
        doc.setFont("helvetica", "normal");
        doc.setTextColor(60);

        const printSummaryLine = (lbl: string, val: string, bold = false) => {
            if (bold) doc.setFont("helvetica", "bold");
            else doc.setFont("helvetica", "normal");
            doc.text(lbl, 130, finalY);
            doc.text(val, 195, finalY, { align: 'right' });
            finalY += 4.5;
        };

        printSummaryLine("Items Subtotal:", `Rs. ${subtotal.toLocaleString('en-IN')}`);
        if (discount > 0) {
            printSummaryLine(`Discount ${order.couponCode ? `(${order.couponCode})` : ''}:`, `-Rs. ${discount.toLocaleString('en-IN')}`);
        }
        printSummaryLine("Shipping Charges:", shippingFee > 0 ? `Rs. ${shippingFee.toLocaleString('en-IN')}` : 'FREE');
        if (order.isGift) {
            printSummaryLine("Gift Wrap & Packaging:", "+Rs. 100");
        }

        doc.setDrawColor(220);
        doc.line(130, finalY - 1, 195, finalY - 1);

        printSummaryLine("Taxable Amount (Base):", `Rs. ${taxableAmount.toLocaleString('en-IN')}`);

        if (isIntraState) {
            printSummaryLine("CGST @ 2.5%:", `Rs. ${cgst.toLocaleString('en-IN')}`);
            printSummaryLine("SGST @ 2.5%:", `Rs. ${sgst.toLocaleString('en-IN')}`);
        } else {
            printSummaryLine("IGST @ 5.0%:", `Rs. ${igst.toLocaleString('en-IN')}`);
        }
        printSummaryLine("Total GST (5%):", `Rs. ${totalGst.toLocaleString('en-IN')}`);

        // Grand Total Highlight
        doc.setFillColor(128, 0, 0);
        doc.roundedRect(128, finalY, 67, 8, 1, 1, 'F');
        doc.setFontSize(9.5);
        doc.setFont("helvetica", "bold");
        doc.setTextColor(255, 255, 255);
        doc.text("GRAND TOTAL:", 132, finalY + 5.5);
        doc.text(`Rs. ${totalAmount.toLocaleString('en-IN')}`, 192, finalY + 5.5, { align: 'right' });

        // Terms & Conditions
        const noteY = finalY - 26 > 92 ? finalY - 26 : finalY + 14;
        doc.setFontSize(8);
        doc.setFont("helvetica", "bold");
        doc.setTextColor(128, 0, 0);
        doc.text("TERMS & CONDITIONS:", 15, noteY);
        doc.setFont("helvetica", "normal");
        doc.setTextColor(100);
        doc.text("1. Authentic Banarasi handloom products with Silk Mark assurance.", 15, noteY + 4);
        doc.text("2. Exchange allowed within 3 days with original tags intact.", 15, noteY + 8);
        doc.text("3. Care: Strictly Dry Clean Only.", 15, noteY + 12);
        doc.text("4. Subject to Bihar Jurisdiction.", 15, noteY + 16);

        // Signatory
        doc.setDrawColor(200);
        doc.line(15, noteY + 26, 65, noteY + 26);
        doc.setFontSize(7.5);
        doc.text("Authorized Signatory", 15, noteY + 30);
        doc.text("Shree Banarasi Sarees", 15, noteY + 34);

        // Footer
        doc.setFontSize(7.5);
        doc.setFont("helvetica", "italic");
        doc.setTextColor(140);
        doc.text("This is a computer-generated tax invoice and requires no physical signature.", 105, 287, { align: 'center' });

        return doc;
    },

    downloadOrderInvoicePDF: (order: Order) => {
        const doc = receiptService.generateOrderInvoicePDF(order);
        const fileName = `Invoice_${order.invoiceNumber || order.orderNumber || 'Order'}.pdf`;
        doc.save(fileName);
    }
};
