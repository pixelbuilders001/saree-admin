import React from 'react';
import { Html5Qrcode } from 'html5-qrcode';
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import { Button } from '@/components/ui/button';
import { X, Camera, AlertCircle } from 'lucide-react';

interface BarcodeScannerProps {
    isOpen: boolean;
    onClose: () => void;
    onScan: (decodedText: string) => void;
}

export function BarcodeScanner({ isOpen, onClose, onScan }: BarcodeScannerProps) {
    const [error, setError] = React.useState<string | null>(null);
    const html5QrCodeRef = React.useRef<Html5Qrcode | null>(null);

    React.useEffect(() => {
        if (isOpen) {
            setError(null);
            const timer = setTimeout(async () => {
                try {
                    const instance = new Html5Qrcode('reader');
                    html5QrCodeRef.current = instance;

                    const config = {
                        fps: 10,
                        qrbox: { width: 250, height: 150 },
                        aspectRatio: 1.0,
                    };

                    await instance.start(
                        { facingMode: "environment" },
                        config,
                        (decodedText) => {
                            onScan(decodedText);
                        },
                        undefined // ignore errors
                    );
                } catch (err: any) {
                    console.error("Failed to start scanner:", err);
                    setError(err?.message || "Could not access camera. Ensure you are using HTTPS and have granted permissions.");
                }
            }, 500);

            return () => {
                clearTimeout(timer);
                if (html5QrCodeRef.current && html5QrCodeRef.current.isScanning) {
                    html5QrCodeRef.current.stop()
                        .then(() => html5QrCodeRef.current?.clear())
                        .catch(err => console.error("Failed to stop scanner", err));
                }
            };
        }
    }, [isOpen, onScan]);

    return (
        <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
            <DialogContent className="sm:max-w-md border-gold/20 flex flex-col items-center">
                <DialogHeader className="w-full">
                    <DialogTitle className="text-maroon flex items-center gap-2">
                        <Camera className="h-5 w-5" />
                        Scan Barcode
                    </DialogTitle>
                </DialogHeader>

                <div className="w-full relative">
                    <div
                        id="reader"
                        className="w-full overflow-hidden rounded-lg border-2 border-gold/20 bg-black min-h-[300px]"
                    />

                    {error && (
                        <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/80 p-6 text-center rounded-lg">
                            <AlertCircle className="h-10 w-10 text-red-500 mb-2" />
                            <p className="text-white text-sm mb-4">{error}</p>
                            <Button
                                variant="outline"
                                size="sm"
                                className="bg-white text-black hover:bg-white/90"
                                onClick={() => window.location.reload()}
                            >
                                Reload Page
                            </Button>
                        </div>
                    )}
                </div>

                {!error && (
                    <div className="mt-4 text-center text-sm text-gray-500 italic">
                        Position the barcode within the frame to scan
                    </div>
                )}

                <Button
                    variant="outline"
                    onClick={onClose}
                    className="mt-4 w-full border-gold/20 text-maroon"
                >
                    <X className="h-4 w-4 mr-2" />
                    Cancel
                </Button>
            </DialogContent>
        </Dialog>
    );
}
