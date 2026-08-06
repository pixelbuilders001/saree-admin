import React from 'react';
import QRCode from 'react-qr-code';
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogDescription,
} from "@/components/ui/dialog";
import { Button } from '@/components/ui/button';
import { Smartphone, Link as LinkIcon, Check } from 'lucide-react';
import { toast } from 'sonner';

interface RemoteScannerLinkProps {
    sessionId: string;
    isOpen: boolean;
    onClose: () => void;
}

export function RemoteScannerLink({ sessionId, isOpen, onClose }: RemoteScannerLinkProps) {
    const [copied, setCopied] = React.useState(false);
    const scannerUrl = `https://barcode-scanner-dun.vercel.app?sessionId=${sessionId}`;

    const handleCopy = () => {
        navigator.clipboard.writeText(scannerUrl);
        setCopied(true);
        toast.success("Link copied to clipboard");
        setTimeout(() => setCopied(false), 2000);
    };

    return (
        <Dialog open={isOpen} onOpenChange={onClose}>
            <DialogContent className="sm:max-w-md border-gold/20">
                <DialogHeader className="pb-2">
                    <DialogTitle className="text-maroon flex items-center gap-2 text-base">
                        <Smartphone className="h-4.5 w-4.5" />
                        Link Remote Scanner
                    </DialogTitle>
                    <DialogDescription className="text-xs">
                        Scan QR code with your mobile camera to sync scanners.
                    </DialogDescription>
                </DialogHeader>

                <div className="flex flex-row items-center gap-5 p-4 bg-cream/10 rounded-lg border border-gold/10">
                    <div className="bg-white p-2.5 rounded-lg border border-cream shadow-sm flex-shrink-0">
                        <QRCode value={scannerUrl} size={120} />
                    </div>
                    <div className="flex-1 flex flex-col justify-between space-y-4">
                        <div className="space-y-0.5">
                            <p className="text-[9px] font-semibold text-gray-400 uppercase tracking-wider">Session ID</p>
                            <p className="text-xl font-bold font-mono text-maroon tracking-wide">{sessionId}</p>
                        </div>

                        <div className="flex flex-col gap-1.5 w-full">
                            <Button
                                variant="outline"
                                size="sm"
                                className="w-full border-gold/20 gap-1.5 h-8.5 text-xs"
                                onClick={handleCopy}
                            >
                                {copied ? <Check className="h-3.5 w-3.5" /> : <LinkIcon className="h-3.5 w-3.5" />}
                                {copied ? "Copied!" : "Copy Link"}
                            </Button>
                            <Button
                                size="sm"
                                className="w-full bg-maroon hover:bg-maroon-dark text-gold h-8.5 text-xs"
                                onClick={onClose}
                            >
                                Done
                            </Button>
                        </div>
                    </div>
                </div>
            </DialogContent>
        </Dialog>
    );
}
