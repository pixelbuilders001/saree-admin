import { Sidebar } from './Sidebar';
import { Outlet, useLocation, Navigate } from 'react-router-dom';
import { useAuthStore } from '@/store/useAuthStore';

export const AppLayout = () => {
    const { user } = useAuthStore();
    const location = useLocation();

    const isStaff = user?.role === 'staff';
    const currentPath = location.pathname;

    // Staff can only access sales and settings.
    // Redirect staff trying to access other routes (including Dashboard /) to /sales.
    const isAllowedPathForStaff = currentPath === '/sales' || currentPath === '/settings';

    if (isStaff && !isAllowedPathForStaff) {
        return <Navigate to="/sales" replace />;
    }

    const isPOSPage = currentPath === '/sales' || currentPath === '/exchange';

    return (
        <div className="min-h-screen bg-cream-light">
            <Sidebar />

            <main className="lg:ml-64 p-4 lg:p-8">
                <div className={isPOSPage ? "max-w-none w-full mx-auto" : "max-w-7xl mx-auto"}>
                    <Outlet />
                </div>
            </main>
        </div>
    );
};
