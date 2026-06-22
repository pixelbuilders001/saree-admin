import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import type { Sale } from './salesService';
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

        const shopName = "Kasturi Sarees";
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

        // Total
        doc.setFontSize(14);
        doc.setFont("helvetica", "bold");
        drawText(`Total Amount: Rs. ${sale.totalAmount.toLocaleString()}`, 190, finalY, { align: 'right' });

        // Footer
        doc.setFontSize(10);
        doc.setFont("helvetica", "italic");
        doc.setTextColor(150);
        drawText("Thank you for shopping with us!", 105, finalY + 30, { align: 'center' });

        return doc;
    },

    generateExchangePDF: (data: ExchangeReceiptData): jsPDF => {
        const doc = new jsPDF();
        doc.addFileToVFS('NotoSansDevanagari-Regular.ttf', NotoSansDevanagariBase64);
        doc.addFont('NotoSansDevanagari-Regular.ttf', 'NotoSansDevanagari', 'normal');
        doc.setFont('helvetica');

        const shopName = "Kasturi Sarees";
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
        doc.save(`Kasturi_Sarees_Receipt_${sale.saleId}.pdf`);
    },

    downloadExchangePDF: (data: ExchangeReceiptData) => {
        const doc = receiptService.generateExchangePDF(data);
        doc.save(`Kasturi_Sarees_Exchange_${data.exchangeId}.pdf`);
    },

    sharePDF: async (sale: Sale) => {
        const doc = receiptService.generatePDF(sale);
        const pdfBlob = doc.output('blob');
        const fileName = `Kasturi_Sarees_Receipt_${sale.saleId}.pdf`;
        const file = new File([pdfBlob], fileName, { type: 'application/pdf' });

        if (navigator.canShare && navigator.canShare({ files: [file] })) {
            try {
                await navigator.share({
                    files: [file],
                    title: 'Sale Receipt',
                    text: `Receipt from Kasturi Sarees for Bill No: ${sale.saleId}`,
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
        let message = `*Receipt from Kasturi Sarees*\n`;
        // ... (rest of message logic)
        return message;
    }
};
