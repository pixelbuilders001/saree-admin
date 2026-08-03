import { useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { QueryClient, QueryClientProvider, QueryCache, MutationCache } from '@tanstack/react-query';
import { Toaster } from '@/components/ui/sonner';
import { AppLayout } from '@/components/layout/AppLayout';
import { useAuthStore } from '@/store/useAuthStore';
import LoginPage from '@/pages/Login';
import InventoryPage from '@/pages/Inventory';
import SalesPage from '@/pages/Sales';
import PurchasesPage from '@/pages/Purchases';
import CustomersPage from '@/pages/Customers';
import DashboardPage from '@/pages/Dashboard';
import ReportsPage from '@/pages/Reports';
import ExchangePage from '@/pages/Exchange';
import ExpensesPage from '@/pages/Expenses';
import SettingsPage from '@/pages/Settings';
import { supabase } from '@/lib/supabase';
import { Loader2 } from 'lucide-react';
import { toast } from 'sonner';

const handleGlobalAuthError = (error: any) => {
  const isAuthError =
    error?.status === 401 ||
    error?.statusCode === 401 ||
    error?.code === 'PGRST301' ||
    error?.message?.toLowerCase().includes('jwt expired') ||
    error?.message?.toLowerCase().includes('invalid jwt') ||
    error?.message?.toLowerCase().includes('token expired') ||
    error?.message?.toLowerCase().includes('invalid token') ||
    error?.message?.toLowerCase().includes('unauthorized');

  if (isAuthError) {
    toast.error('Session expired. Please log in again.');
    useAuthStore.getState().logout();
  }
};

const queryClient = new QueryClient({
  queryCache: new QueryCache({
    onError: handleGlobalAuthError
  }),
  mutationCache: new MutationCache({
    onError: handleGlobalAuthError
  })
});

const ProtectedRoute = ({ children }: { children: React.ReactNode }) => {
  const { isAuthenticated, isInitialized } = useAuthStore();

  if (!isInitialized) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-cream-light">
        <Loader2 className="h-8 w-8 animate-spin text-maroon" />
      </div>
    );
  }

  if (!isAuthenticated) return <Navigate to="/login" replace />;
  return <>{children}</>;
};

const PublicRoute = ({ children }: { children: React.ReactNode }) => {
  const { isAuthenticated, isInitialized } = useAuthStore();

  if (!isInitialized) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-cream-light">
        <Loader2 className="h-8 w-8 animate-spin text-maroon" />
      </div>
    );
  }

  if (isAuthenticated) return <Navigate to="/" replace />;
  return <>{children}</>;
};

function App() {
  const setSession = useAuthStore(state => state.setSession);

  useEffect(() => {
    // 1. Get initial session on mount
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session?.user) {
        setSession({
          email: session.user.email || '',
          id: session.user.id
        });
      } else {
        setSession(null);
      }
    });

    // 2. Register real-time change listener
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session?.user) {
        setSession({
          email: session.user.email || '',
          id: session.user.id
        });
      } else {
        setSession(null);
      }
    });

    return () => {
      subscription.unsubscribe();
    };
  }, [setSession]);

  return (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <Routes>
          <Route path="/login" element={
            <PublicRoute>
              <LoginPage />
            </PublicRoute>
          } />
          <Route path="/" element={
            <ProtectedRoute>
              <AppLayout />
            </ProtectedRoute>
          }>
            <Route index element={<DashboardPage />} />
            <Route path="inventory" element={<InventoryPage />} />
            <Route path="sales" element={<SalesPage />} />
            <Route path="purchases" element={<PurchasesPage />} />
            <Route path="customers" element={<CustomersPage />} />
            <Route path="reports" element={<ReportsPage />} />
            <Route path="exchange" element={<ExchangePage />} />
            <Route path="expenses" element={<ExpensesPage />} />
            <Route path="settings" element={<SettingsPage />} />
          </Route>
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
        <Toaster position="top-right" richColors />
      </BrowserRouter>
    </QueryClientProvider>
  );
}

export default App;
