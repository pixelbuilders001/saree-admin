import { Sidebar } from './Sidebar';
import { Outlet } from 'react-router-dom';

export const AppLayout = () => {
    return (
        <div className="flex min-h-screen bg-cream-light">
            <Sidebar />

            <main className="flex-1 lg:ml-64 p-4 lg:p-8">
                <div className="max-w-7xl mx-auto">
                    <Outlet />
                </div>
            </main>
        </div>
    );
};
