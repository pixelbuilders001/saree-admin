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
    const origin = typeof window !== 'undefined' ? window.location.origin : '';
    const scannerUrl = `${origin}/sales?remoteMode=scanner&sessionId=${sessionId}`;

    const handleCopy = () => {
        navigator.clipboard.writeText(scannerUrl);
        setCopied(true);
        toast.success("Link copied to clipboard");
        setTimeout(() => setCopied(false), 2000);
    };

    return (
        <Dialog open={isOpen} onOpenChange={onClose}>
            <DialogContent className="sm:max-w-md border-gold/20">
                <DialogHeader>
                    <DialogTitle className="text-maroon flex items-center gap-2">
                        <Smartphone className="h-5 w-5" />
                        Link Remote Scanner
                    </DialogTitle>
                    <DialogDescription>
                        Scan this QR code with your phone to start scanning sarees from your mobile camera.
                    </DialogDescription>
                </DialogHeader>

                <div className="flex flex-col items-center justify-center p-6 bg-white rounded-lg border border-gold/10">
                    <div className="bg-white p-4 rounded-xl border-2 border-cream">
                        <QRCode value={scannerUrl} size={200} />
                    </div>
                    <div className="mt-6 w-full space-y-4">
                        <div className="text-center">
                            <p className="text-sm font-medium text-gray-500 uppercase tracking-wider">Session ID</p>
                            <p className="text-2xl font-bold font-mono text-maroon">{sessionId}</p>
                        </div>

                        <div className="pt-4 flex flex-col gap-2">
                            <Button
                                variant="outline"
                                className="w-full border-gold/20 gap-2 h-11"
                                onClick={handleCopy}
                            >
                                {copied ? <Check className="h-4 w-4" /> : <LinkIcon className="h-4 w-4" />}
                                {copied ? "Copied!" : "Copy Scanner Link"}
                            </Button>
                            <Button
                                className="w-full bg-maroon hover:bg-maroon-dark text-gold h-11"
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
