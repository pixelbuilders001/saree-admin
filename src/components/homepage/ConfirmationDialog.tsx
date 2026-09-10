import React from 'react';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { AlertTriangle, AlertCircle } from 'lucide-react';

interface ConfirmationDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    title: string;
    description: string;
    confirmLabel?: string;
    cancelLabel?: string;
    variant?: 'danger' | 'warning';
    onConfirm: () => void;
    loading?: boolean;
}

export const ConfirmationDialog: React.FC<ConfirmationDialogProps> = ({
    open,
    onOpenChange,
    title,
    description,
    confirmLabel = 'Confirm',
    cancelLabel = 'Cancel',
    variant = 'danger',
    onConfirm,
    loading = false,
}) => {
    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-[425px] border-gold/20 shadow-xl bg-white">
                <DialogHeader className="flex flex-row items-center gap-3 space-y-0">
                    <div className={`p-2.5 rounded-full ${variant === 'danger' ? 'bg-red-50 text-red-600' : 'bg-amber-50 text-amber-600'}`}>
                        {variant === 'danger' ? (
                            <AlertTriangle className="h-5 w-5" />
                        ) : (
                            <AlertCircle className="h-5 w-5" />
                        )}
                    </div>
                    <div>
                        <DialogTitle className="text-base font-bold text-gray-900 font-serif">
                            {title}
                        </DialogTitle>
                        <DialogDescription className="text-xs text-gray-500 mt-1">
                            {description}
                        </DialogDescription>
                    </div>
                </DialogHeader>
                <DialogFooter className="mt-4 flex gap-2 justify-end">
                    <Button
                        type="button"
                        variant="outline"
                        onClick={() => onOpenChange(false)}
                        disabled={loading}
                        className="text-xs border-gold/30 hover:bg-cream/40"
                    >
                        {cancelLabel}
                    </Button>
                    <Button
                        type="button"
                        onClick={() => {
                            onConfirm();
                        }}
                        disabled={loading}
                        className={`text-xs font-semibold ${
                            variant === 'danger'
                                ? 'bg-red-600 hover:bg-red-700 text-white'
                                : 'bg-maroon hover:bg-maroon-dark text-gold'
                        }`}
                    >
                        {loading ? 'Processing...' : confirmLabel}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
};
