import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import type { Sale } from './salesService';

export const receiptService = {
    generatePDF: (sale: Sale): jsPDF => {
        const doc = new jsPDF();
        const shopName = "Kasturi Sarees";
        const shopAddress = "Near City Center, Main Market";
        const shopContact = "+91 XXXXX XXXXX";

        // Header
        doc.setFontSize(22);
        doc.setTextColor(128, 0, 0); // Maroon
        doc.text(shopName, 105, 20, { align: 'center' });

        doc.setFontSize(10);
        doc.setTextColor(100);
        doc.text(shopAddress, 105, 27, { align: 'center' });
        doc.text(`Contact: ${shopContact}`, 105, 32, { align: 'center' });

        doc.setDrawColor(212, 175, 55); // Gold
        doc.setLineWidth(0.5);
        doc.line(20, 38, 190, 38);

        // Bill Info
        doc.setFontSize(12);
        doc.setTextColor(0);
        doc.text(`Bill No: ${sale.saleId}`, 20, 50);
        doc.text(`Date: ${new Date(sale.date).toLocaleDateString()}`, 190, 50, { align: 'right' });

        if (sale.customerName || sale.customerMobile) {
            doc.setFontSize(11);
            doc.text("Customer Details:", 20, 62);
            doc.setFontSize(10);
            doc.text(`Name: ${sale.customerName || 'N/A'}`, 20, 68);
            doc.text(`Mobile: ${sale.customerMobile || 'N/A'}`, 20, 73);
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
            headStyles: { fillColor: [128, 0, 0], textColor: [255, 255, 255] },
            alternateRowStyles: { fillColor: [245, 245, 220] },
            margin: { left: 20, right: 20 },
        });

        const finalY = (doc as any).lastAutoTable.finalY + 10;

        // Total
        doc.setFontSize(14);
        doc.setFont("helvetica", "bold");
        doc.text(`Total Amount: Rs. ${sale.totalAmount.toLocaleString()}`, 190, finalY, { align: 'right' });

        // Footer
        doc.setFontSize(10);
        doc.setFont("helvetica", "italic");
        doc.setTextColor(150);
        doc.text("Thank you for shopping with us!", 105, finalY + 30, { align: 'center' });

        return doc;
    },

    downloadPDF: (sale: Sale) => {
        const doc = receiptService.generatePDF(sale);
        doc.save(`Kasturi_Sarees_Receipt_${sale.saleId}.pdf`);
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
