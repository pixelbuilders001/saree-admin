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
    Receipt,
    Settings
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { useAuthStore } from '@/store/useAuthStore';

const navItems = [
    { icon: LayoutDashboard, label: 'Dashboard', path: '/' },
    { icon: Package, label: 'Inventory', path: '/inventory' },
    { icon: ShoppingCart, label: 'Sales', path: '/sales' },
    // { icon: Truck, label: 'Purchases', path: '/purchases' },
    { icon: ArrowLeftRight, label: 'Exchange', path: '/exchange' },
    { icon: Receipt, label: 'Expenses', path: '/expenses' },
    { icon: Truck, label: 'Weavers Ledger', path: '/weavers' },
    { icon: Users, label: 'Customers', path: '/customers' },
    { icon: BarChart3, label: 'Reports', path: '/reports' },
    { icon: Settings, label: 'Settings', path: '/settings' },
];

export const Sidebar = () => {
    const [isOpen, setIsOpen] = React.useState(false);
    const { logout, user } = useAuthStore();

    return (
        <>
            {/* Mobile Toggle */}
            <button
                className="fixed top-4 left-4 z-50 lg:hidden p-2 bg-maroon text-white rounded-md"
                onClick={() => setIsOpen(!isOpen)}
            >
                {isOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
            </button>

            {/* Sidebar */}
            <div className={cn(
                "fixed inset-y-0 left-0 z-40 w-64 bg-maroon text-white transition-transform duration-300 transform lg:translate-x-0 overflow-y-auto border-r border-gold/20",
                isOpen ? "translate-x-0" : "-translate-x-full"
            )}>
                <div className="flex flex-col h-full">
                    <div className="p-4 border-b border-gold/20 flex justify-center items-center">
                        <img
                            src="/logo.png"
                            alt="Logo"
                            className="h-10 w-auto object-contain"
                        />
                    </div>

                    <nav className="flex-1 px-2 py-3 space-y-2">
                        {navItems.map((item) => (
                            <NavLink
                                key={item.path}
                                to={item.path}
                                className={({ isActive }) => cn(
                                    "flex items-center gap-3 px-4 py-2 rounded-lg transition-colors",
                                    isActive
                                        ? "bg-white/80 text-maroon"
                                        : "text-white/80 hover:bg-white/10 hover:text-white"
                                )}
                                onClick={() => setIsOpen(false)}
                            >
                                <item.icon className="h-5 w-5" />
                                {item.label}
                            </NavLink>
                        ))}
                    </nav>

                    <div className="p-4 border-t border-gold/20 flex flex-col gap-3">
                        {user && (
                            <div className="px-4 py-2 bg-white/5 rounded-lg border border-white/10">
                                <p className="text-xs text-gold font-medium">Logged in as</p>
                                <p className="text-sm text-white truncate max-w-full font-mono mt-0.5" title={user.email}>
                                    {user.email}
                                </p>
                            </div>
                        )}
                        <Button
                            variant="secondary"
                            className="w-full justify-start gap-3 bg-transparent text-white border-white/20 hover:bg-white/10"
                            onClick={() => {
                                logout();
                            }}
                        >
                            <LogOut className="h-5 w-5" />
                            Logout
                        </Button>
                    </div>
                </div>
            </div>

            {/* Overlay */}
            {isOpen && (
                <div
                    className="fixed inset-0 z-30 bg-black/50 lg:hidden"
                    onClick={() => setIsOpen(false)}
                />
            )}
        </>
    );
};
