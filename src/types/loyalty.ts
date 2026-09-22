export interface LoyaltyTransaction {
    id?: string;
    customer_id?: string;
    sale_id?: string;
    points_change: number;
    balance_after?: number;
    transaction_type: 'EARNED' | 'REDEEMED' | 'MANUAL_BONUS' | 'RETURN_REVERSAL';
    notes?: string;
    created_at: string;
}

export interface LoyaltyCustomerInfo {
    valid: boolean;
    member_code: string;
    first_name?: string;
    tier?: string;
    balance?: number;
    activity?: Array<{
        points_change: number;
        transaction_type: string;
        created_at: string;
        notes?: string;
    }>;
    error?: string;
}

export interface LoyaltyProfile {
    memberCode: string | null;
    pointsBalance: number;
    tier: string;
    hasPin: boolean;
    isLocked?: boolean;
}
