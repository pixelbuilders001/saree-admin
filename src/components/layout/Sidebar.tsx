import React from 'react';
import { NavLink } from 'react-router-dom';
import {
    LayoutDashboard,
    Package,
    ShoppingCart,
    Truck,
    Users,
    BarChart3,
    LogOut,
    Menu,
    X,
    ArrowLeftRight,
    Settings,
    Shield,
    User,
    ShoppingBag
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { useAuthStore } from '@/store/useAuthStore';
import { toast } from 'sonner';
import { motion } from 'framer-motion';

const navGroups = [
    {
        title: "Operations",
        items: [
            { icon: LayoutDashboard, label: 'Dashboard', path: '/' },
            { icon: Package, label: 'Inventory', path: '/inventory' },
            { icon: ShoppingCart, label: 'Sales', path: '/sales' },
            { icon: ArrowLeftRight, label: 'Exchange', path: '/exchange' },
            { icon: ShoppingBag, label: 'Online Orders', path: '/orders' },
        ]
    },
    {
        title: "Partners & CRM",
        items: [
            { icon: Truck, label: 'Weavers Ledger', path: '/weavers' },
            { icon: Users, label: 'Customers', path: '/customers' },
        ]
    },
    {
        title: "Analytics & Control",
        items: [
            { icon: BarChart3, label: 'Reports', path: '/reports' },
            { icon: Settings, label: 'Settings', path: '/settings' },
        ]
    }
];

export const Sidebar = () => {
    const [isOpen, setIsOpen] = React.useState(false);
    const { logout, user } = useAuthStore();

    const handleNavClick = (e: React.MouseEvent<HTMLAnchorElement>, path: string) => {
        const isStaff = user?.role === 'staff';
        const isAllowed = path === '/sales' || path === '/settings';

        if (isStaff && !isAllowed) {
            e.preventDefault();
            toast.error("Not authorized! Staff can only access Sales and Settings.");
            return;
        }
        setIsOpen(false);
    };

    // Extract user initials
    const userInitials = React.useMemo(() => {
        if (!user?.email) return 'U';
        return user.email.split('@')[0].substring(0, 2).toUpperCase();
    }, [user]);

    return (
        <>
            {/* Mobile Header Toolbar */}
            <div className="lg:hidden fixed top-0 left-0 right-0 h-14 bg-maroon border-b border-gold/15 px-4 flex items-center justify-between z-40">
                <div className="flex items-center gap-2">
                    <img
                        src="/logo.png"
                        alt="Logo"
                        className="h-7 w-auto object-contain"
                        onError={(e) => {
                            (e.target as HTMLElement).style.display = 'none';
                        }}
                    />
                    <span className="text-xs font-black font-serif text-gold tracking-widest">SBS ADMIN</span>
                </div>
                <button
                    className="p-1.5 bg-maroon/25 text-gold border border-gold/20 rounded-md hover:bg-maroon/50 transition-all cursor-pointer"
                    onClick={() => setIsOpen(!isOpen)}
                >
                    {isOpen ? <X className="h-4.5 w-4.5" /> : <Menu className="h-4.5 w-4.5" />}
                </button>
            </div>

            {/* Sidebar Shell */}
            <div className={cn(
                "fixed inset-y-0 left-0 z-50 w-64 bg-maroon text-cream transition-transform duration-300 transform lg:translate-x-0 overflow-y-auto border-r border-gold/15 flex flex-col justify-between",
                isOpen ? "translate-x-0 pt-0" : "-translate-x-full lg:pt-0 pt-14"
            )}>
                <div className="flex flex-col h-full justify-between">

                    {/* Brand Banner */}
                    <div>
                        <div className="p-4 border-b border-gold/15 flex flex-col items-center justify-center bg-black/15 gap-1.5 relative">
                            {/* Close button for mobile inside sidebar */}
                            <button
                                className="lg:hidden absolute top-3 right-3 text-gold/60 hover:text-gold p-0.5"
                                onClick={() => setIsOpen(false)}
                            >
                                <X className="h-4 w-4" />
                            </button>

                            <div className="flex items-center gap-2">
                                <img
                                    src="/logo.png"
                                    alt="Logo"
                                    className="h-8 w-auto object-contain"
                                    onError={(e) => {
                                        (e.target as HTMLElement).style.display = 'none';
                                    }}
                                />
                                {/* <div className="text-center">
                                    <h1 className="text-sm font-black font-serif text-gold tracking-[0.2em] leading-none">SBS REGISTRY</h1>
                                    <p className="text-[7.5px] uppercase tracking-[0.25em] text-cream/40 font-semibold font-sans mt-1">Command Suite</p>
                                </div> */}
                            </div>
                        </div>

                        {/* Navigation Groups */}
                        <div className="px-3 py-4 space-y-5">
                            {navGroups.map((group) => (
                                <div key={group.title} className="space-y-1.5">
                                    <h3 className="px-3 text-[8.5px] font-bold uppercase tracking-[0.2em] text-gold/40 font-sans">
                                        {group.title}
                                    </h3>
                                    <nav className="space-y-0.5">
                                        {group.items.map((item) => {
                                            const isStaff = user?.role === 'staff';
                                            const isLocked = isStaff && !(item.path === '/sales' || item.path === '/settings');

                                            return (
                                                <NavLink
                                                    key={item.path}
                                                    to={item.path}
                                                    className={({ isActive }) => cn(
                                                        "flex items-center justify-between px-3 py-2 rounded-md transition-all duration-200 group relative",
                                                        isActive
                                                            ? "bg-gradient-to-r from-gold/15 to-gold/5 text-gold border-l-2 border-gold font-semibold shadow-sm"
                                                            : isLocked
                                                                ? "text-cream/30 cursor-not-allowed opacity-50"
                                                                : "text-cream/70 hover:bg-white/5 hover:text-cream hover:translate-x-0.5"
                                                    )}
                                                    onClick={(e) => handleNavClick(e, item.path)}
                                                >
                                                    <div className="flex items-center gap-3">
                                                        <item.icon className={cn(
                                                            "h-4 w-4 transition-transform duration-200 group-hover:scale-105",
                                                            isLocked ? "text-cream/20" : "text-gold/80"
                                                        )} />
                                                        <span className="text-[11px] uppercase tracking-wider font-sans">{item.label}</span>
                                                    </div>

                                                    {isLocked && (
                                                        <Shield className="h-3 w-3 text-gold/25" />
                                                    )}
                                                </NavLink>
                                            );
                                        })}
                                    </nav>
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* Footer User Info */}
                    <div className="p-3 border-t border-gold/15 bg-black/20 space-y-2.5">
                        {user && (
                            <div className="flex items-center gap-2.5 p-2 bg-white/5 rounded-md border border-gold/10">
                                <div className="w-8 h-8 rounded-full bg-gold/10 border border-gold/25 text-gold flex items-center justify-center font-bold text-xs shadow-inner">
                                    {userInitials}
                                </div>
                                <div className="min-w-0 flex-1">
                                    <div className="flex items-center gap-1.5">
                                        <span className="text-[9px] font-bold text-cream uppercase truncate max-w-[80px]" title={user.email}>
                                            {user.email?.split('@')[0]}
                                        </span>
                                        <span className={cn(
                                            "text-[7px] font-bold px-1.5 py-0.5 rounded uppercase font-mono tracking-widest",
                                            user.role === 'staff'
                                                ? "bg-blue-900/40 text-blue-300 border border-blue-800/40"
                                                : "bg-gold/15 text-gold border border-gold/20"
                                        )}>
                                            {user.role || 'Admin'}
                                        </span>
                                    </div>
                                    <p className="text-[8px] text-cream/40 font-mono truncate mt-0.5" title={user.email}>
                                        {user.email}
                                    </p>
                                </div>
                            </div>
                        )}
                        <Button
                            variant="ghost"
                            className="w-full justify-center gap-2 h-8 text-[10px] uppercase font-bold tracking-widest bg-transparent hover:bg-red-950/20 text-red-400 hover:text-red-300 border border-red-900/30 hover:border-red-800/40 rounded transition-all cursor-pointer"
                            onClick={() => logout()}
                        >
                            <LogOut className="h-3.5 w-3.5" />
                            Sign Out
                        </Button>
                    </div>
                </div>
            </div>

            {/* Mobile Sidebar Overlay */}
            {isOpen && (
                <div
                    className="fixed inset-0 z-45 bg-black/60 lg:hidden backdrop-blur-xs transition-opacity duration-300"
                    onClick={() => setIsOpen(false)}
                />
            )}
        </>
    );
};
