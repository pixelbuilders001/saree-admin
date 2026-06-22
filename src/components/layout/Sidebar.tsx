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
    Receipt
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
    { icon: Users, label: 'Customers', path: '/customers' },
    { icon: BarChart3, label: 'Reports', path: '/reports' },
];

export const Sidebar = () => {
    const [isOpen, setIsOpen] = React.useState(false);
    const logout = useAuthStore(state => state.logout);

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
                    <div className="p-6 border-b border-gold/20">
                        <h1 className="text-xl font-bold text-gold flex items-center gap-2">
                            <span className="bg-gold text-maroon p-1 rounded">KS</span>
                            Kasturi Sarees
                        </h1>
                    </div>

                    <nav className="flex-1 px-4 py-6 space-y-2">
                        {navItems.map((item) => (
                            <NavLink
                                key={item.path}
                                to={item.path}
                                className={({ isActive }) => cn(
                                    "flex items-center gap-3 px-4 py-3 rounded-lg transition-colors",
                                    isActive
                                        ? "bg-gold text-maroon font-semibold"
                                        : "text-white/80 hover:bg-white/10 hover:text-white"
                                )}
                                onClick={() => setIsOpen(false)}
                            >
                                <item.icon className="h-5 w-5" />
                                {item.label}
                            </NavLink>
                        ))}
                    </nav>

                    <div className="p-4 border-t border-gold/20">
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
