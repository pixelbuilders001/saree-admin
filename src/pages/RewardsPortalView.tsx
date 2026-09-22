import React, { useState, useEffect, useRef } from 'react';
import { useParams } from 'react-router-dom';
import { loyaltyService } from '@/services/loyaltyService';
import type { LoyaltyCustomerInfo } from '@/types/loyalty';
import { 
    Lock, 
    ArrowRight, 
    AlertCircle, 
    Clock, 
    LogOut,
    Loader2,
    Shield,
    Phone
} from 'lucide-react';

export default function RewardsPortalView() {
    const { memberCode } = useParams<{ memberCode: string }>();
    const cleanMemberCode = (memberCode || '').trim().toUpperCase();

    const [pinDigits, setPinDigits] = useState<string[]>(['', '', '', '', '', '']);
    const [isLoading, setIsLoading] = useState<boolean>(false);
    const [errorMessage, setErrorMessage] = useState<string | null>(null);
    const [rewardData, setRewardData] = useState<LoyaltyCustomerInfo | null>(null);

    const inputRefs = useRef<(HTMLInputElement | null)[]>([]);

    useEffect(() => {
        inputRefs.current[0]?.focus();
    }, []);

    const handleDigitChange = (index: number, value: string) => {
        const val = value.replace(/\D/g, '').slice(-1);
        const newDigits = [...pinDigits];
        newDigits[index] = val;
        setPinDigits(newDigits);
        setErrorMessage(null);

        if (val && index < 5) {
            inputRefs.current[index + 1]?.focus();
        }
    };

    const handleKeyDown = (index: number, e: React.KeyboardEvent<HTMLInputElement>) => {
        if (e.key === 'Backspace' && !pinDigits[index] && index > 0) {
            inputRefs.current[index - 1]?.focus();
        }
        if (e.key === 'Enter') {
            handleSubmit();
        }
    };

    const handlePaste = (e: React.ClipboardEvent<HTMLInputElement>) => {
        e.preventDefault();
        const pasted = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, 6);
        if (!pasted) return;

        const newDigits = [...pinDigits];
        for (let i = 0; i < pasted.length; i++) {
            newDigits[i] = pasted[i];
        }
        setPinDigits(newDigits);
        const nextIndex = Math.min(pasted.length, 5);
        inputRefs.current[nextIndex]?.focus();
    };

    const handleSubmit = async (e?: React.FormEvent) => {
        if (e) e.preventDefault();
        const pin = pinDigits.join('');
        if (pin.length < 4) {
            setErrorMessage('Please enter your 6-digit PIN');
            return;
        }

        setIsLoading(true);
        setErrorMessage(null);

        try {
            const data = await loyaltyService.verifyAndFetchRewards(cleanMemberCode, pin);
            if (data.valid) {
                setRewardData(data);
            } else {
                setErrorMessage(data.error || 'Incorrect PIN. Please try again.');
                setPinDigits(['', '', '', '', '', '']);
                inputRefs.current[0]?.focus();
            }
        } catch (err: any) {
            setErrorMessage(err?.message || 'Connection error. Please try again.');
        } finally {
            setIsLoading(false);
        }
    };

    const handleLock = () => {
        setRewardData(null);
        setPinDigits(['', '', '', '', '', '']);
        setErrorMessage(null);
        setTimeout(() => inputRefs.current[0]?.focus(), 100);
    };

    return (
        <div className="min-h-screen bg-[#FBF9F5] flex flex-col items-center justify-between p-4 sm:p-8 text-stone-800 antialiased font-sans">
            {/* Header: Clean Official Brand Logo Only */}
            <header className="w-full max-w-sm flex justify-center pt-4 pb-6">
                <img
                    src="/logo.png"
                    alt="Brand Logo"
                    className="h-16 sm:h-20 w-auto object-contain drop-shadow-xs"
                />
            </header>

            {/* Main Content */}
            <main className="w-full max-w-sm my-auto">
                {!rewardData ? (
                    /* ── State 1: Locked Screen (PIN Entry) ─────────────────────── */
                    <div className="bg-white rounded-2xl border border-stone-200/90 shadow-[0_12px_40px_rgba(0,0,0,0.06)] p-6 sm:p-8 space-y-6">
                        {/* Member Identity & Protection Notice */}
                        <div className="text-center space-y-2.5">
                            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-stone-100/90 border border-stone-200 text-[11px] font-mono tracking-wider text-stone-600 font-semibold uppercase">
                                <span>MEMBER</span>
                                <span className="text-stone-900 font-bold">{cleanMemberCode || 'SR-REWARD'}</span>
                            </div>

                            <h1 className="text-lg font-serif font-bold text-stone-900 tracking-tight">
                                Rewards Passbook
                            </h1>

                            <p className="text-xs text-stone-500 flex items-center justify-center gap-1.5 font-medium">
                                <Shield className="h-3.5 w-3.5 text-stone-400" />
                                <span>Protected by 6-digit PIN</span>
                            </p>
                        </div>

                        {/* PIN Entry Form */}
                        <form onSubmit={handleSubmit} className="space-y-5">
                            <div className="space-y-2">
                                <label className="block text-center text-xs font-medium text-stone-500">
                                    Enter Loyalty PIN
                                </label>

                                <div className="flex justify-center gap-2" onPaste={handlePaste}>
                                    {pinDigits.map((digit, idx) => (
                                        <input
                                            key={idx}
                                            ref={el => {
                                                inputRefs.current[idx] = el;
                                            }}
                                            type="password"
                                            inputMode="numeric"
                                            pattern="[0-9]*"
                                            maxLength={1}
                                            value={digit}
                                            onChange={e => handleDigitChange(idx, e.target.value)}
                                            onKeyDown={e => handleKeyDown(idx, e)}
                                            className="w-10 h-13 sm:w-11 sm:h-14 text-center text-xl font-bold font-mono border border-stone-200 rounded-xl bg-stone-50/70 text-[#5C111C] focus:border-[#5C111C] focus:bg-white focus:ring-1 focus:ring-[#5C111C]/30 focus:outline-none transition-all shadow-2xs"
                                        />
                                    ))}
                                </div>
                            </div>

                            {errorMessage && (
                                <div className="flex items-start gap-2 bg-red-50/90 border border-red-200 rounded-xl p-3 text-xs text-red-700 leading-tight">
                                    <AlertCircle className="h-4 w-4 shrink-0 text-red-600 mt-0.5" />
                                    <span>{errorMessage}</span>
                                </div>
                            )}

                            <button
                                type="submit"
                                disabled={isLoading || pinDigits.join('').length < 4}
                                className="w-full h-11 bg-[#5C111C] hover:bg-[#450C14] text-[#E8D099] disabled:opacity-50 font-bold rounded-xl shadow-md transition-all flex items-center justify-center gap-2 text-xs tracking-wider uppercase cursor-pointer"
                            >
                                {isLoading ? (
                                    <>
                                        <Loader2 className="h-4 w-4 animate-spin text-[#E8D099]" />
                                        <span>Verifying...</span>
                                    </>
                                ) : (
                                    <>
                                        <span>View Rewards</span>
                                        <ArrowRight className="h-4 w-4" />
                                    </>
                                )}
                            </button>
                        </form>

                        <div className="pt-2 flex items-center justify-center gap-1.5 text-xs text-stone-500">
                            <span>Need assistance?</span>
                            <a
                                href="tel:+916203909946"
                                className="inline-flex items-center gap-1 font-semibold text-[#5C111C] hover:underline"
                            >
                                <Phone className="h-3 w-3" />
                                <span>Call Store</span>
                            </a>
                        </div>
                    </div>
                ) : (
                    /* ── State 2: Unlocked Screen (VIP Passbook) ─────────────────────── */
                    <div className="space-y-4">
                        {/* Digital Membership Card */}
                        <div className="bg-gradient-to-br from-[#4A0E17] via-[#5C111C] to-[#34070E] text-white rounded-2xl p-6 shadow-xl border border-[#C5A059]/30 relative overflow-hidden space-y-6">
                            {/* Subtle Ambient Glow */}
                            <div className="absolute top-0 right-0 w-32 h-32 bg-[#C5A059]/10 rounded-full blur-2xl pointer-events-none" />

                            {/* Card Header: Member ID & Lock Action */}
                            <div className="flex items-center justify-between relative z-10">
                                <span className="font-mono text-[11px] tracking-widest text-[#E8D099] uppercase">
                                    {cleanMemberCode}
                                </span>
                                <button
                                    onClick={handleLock}
                                    title="Lock screen"
                                    className="text-stone-300 hover:text-white transition-colors p-1"
                                >
                                    <LogOut className="h-4 w-4" />
                                </button>
                            </div>

                            {/* Member Name & Tier */}
                            <div className="relative z-10">
                                <div className="text-xl font-serif font-bold text-white">
                                    Welcome, {rewardData.first_name}
                                </div>
                                <div className="text-[11px] font-semibold uppercase tracking-[0.2em] text-[#C5A059] mt-0.5">
                                    {rewardData.tier || 'Silver'} Member
                                </div>
                            </div>

                            {/* Points Balance */}
                            <div className="pt-2 border-t border-white/10 relative z-10 flex items-baseline justify-between">
                                <div>
                                    <div className="text-[10px] tracking-widest uppercase text-stone-300 font-medium">
                                        Rewards Balance
                                    </div>
                                    <div className="text-4xl font-serif font-bold text-white mt-0.5">
                                        {(rewardData.balance || 0).toLocaleString('en-IN')}
                                    </div>
                                </div>
                                <div className="text-right">
                                    <div className="text-[10px] tracking-widest uppercase text-stone-300 font-medium">
                                        Store Value
                                    </div>
                                    <div className="font-mono text-lg font-bold text-[#E8D099] mt-0.5">
                                        ₹{(rewardData.balance || 0).toLocaleString('en-IN')}
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Store Redemption Info */}
                        <div className="bg-white rounded-xl border border-stone-200/80 p-3.5 text-xs text-stone-600 leading-relaxed shadow-2xs">
                            <span className="font-bold text-stone-900 block mb-0.5">In-Store Redemption</span>
                            Share your registered mobile number at the billing counter to redeem points as an instant discount on your saree purchase.
                        </div>

                        {/* Recent Activity Ledger */}
                        <div className="bg-white rounded-xl border border-stone-200/80 p-4 space-y-3 shadow-2xs">
                            <div className="text-[11px] font-bold uppercase tracking-wider text-stone-500 flex items-center gap-1.5 pb-2 border-b border-stone-100">
                                <Clock className="h-3.5 w-3.5 text-stone-400" />
                                <span>Recent Activity</span>
                            </div>

                            {rewardData.activity && rewardData.activity.length > 0 ? (
                                <div className="divide-y divide-stone-100">
                                    {rewardData.activity.map((item, idx) => {
                                        const isPositive = item.points_change > 0;
                                        return (
                                            <div key={idx} className="py-2.5 first:pt-0 last:pb-0 flex items-center justify-between text-xs">
                                                <div>
                                                    <div className="font-medium text-stone-800">
                                                        {item.transaction_type === 'EARNED' ? 'Purchase' : (item.transaction_type === 'REDEEMED' ? 'Redeemed' : item.transaction_type)}
                                                    </div>
                                                    <div className="text-[10px] text-stone-400 mt-0.5">
                                                        {new Date(item.created_at).toLocaleDateString('en-IN', {
                                                            day: '2-digit',
                                                            month: 'short',
                                                            year: 'numeric'
                                                        })}
                                                    </div>
                                                </div>
                                                <div className={`font-mono font-bold text-sm ${isPositive ? 'text-emerald-700' : 'text-stone-700'}`}>
                                                    {isPositive ? `+${item.points_change}` : item.points_change}
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            ) : (
                                <div className="text-center py-4 text-xs text-stone-400">
                                    No recent transactions.
                                </div>
                            )}
                        </div>

                        {/* Lock Button */}
                        <div className="text-center pt-1">
                            <button
                                onClick={handleLock}
                                className="text-xs text-stone-500 hover:text-stone-800 font-medium underline underline-offset-4 cursor-pointer"
                            >
                                Lock Passbook
                            </button>
                        </div>
                    </div>
                )}
            </main>

            {/* Footer */}
            <footer className="w-full max-w-sm text-center py-4 text-[11px] text-stone-400 space-y-1">
                <div>Samastipur, Bihar</div>
                <div>
                    <a href="tel:+916203909946" className="font-mono text-[11px] text-stone-500 hover:text-stone-800 transition-colors inline-flex items-center gap-1">
                        <Phone className="h-2.5 w-2.5" />
                        <span>+91 62039 09946</span>
                    </a>
                </div>
            </footer>
        </div>
    );
}
