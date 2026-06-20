import React from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '@/store/useAuthStore';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from '@/components/ui/card';
import { toast } from 'sonner';

const loginSchema = z.object({
    username: z.string().min(3, 'Username must be at least 3 characters'),
    password: z.string().min(5, 'Password must be at least 5 characters'),
});

type LoginFormValues = z.infer<typeof loginSchema>;

export default function LoginPage() {
    const navigate = useNavigate();
    const { login, isAuthenticated } = useAuthStore();

    React.useEffect(() => {
        if (isAuthenticated) {
            navigate('/', { replace: true });
        }
    }, [isAuthenticated, navigate]);

    const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm<LoginFormValues>({
        resolver: zodResolver(loginSchema),
    });

    const onSubmit = async (data: LoginFormValues) => {
        // Allowing any credentials for dummy/testing purposes as requested
        login({ username: data.username, role: 'admin' });
        toast.success('Login successful (Dummy Mode)!');
        navigate('/', { replace: true });
    };

    return (
        <div className="min-h-screen flex items-center justify-center bg-cream-light p-4 relative overflow-hidden">
            {/* Decorative background elements */}
            <div className="absolute top-[-10%] right-[-10%] w-96 h-96 bg-maroon/5 rounded-full blur-3xl" />
            <div className="absolute bottom-[-10%] left-[-10%] w-96 h-96 bg-gold/10 rounded-full blur-3xl" />

            <Card className="w-full max-w-md border-gold/20 shadow-2xl z-10">
                <CardHeader className="text-center space-y-1">
                    <div className="mx-auto w-16 h-16 bg-maroon rounded-full flex items-center justify-center mb-4 border-2 border-gold shadow-lg">
                        <span className="text-2xl font-bold text-gold">S</span>
                    </div>
                    <CardTitle className="text-3xl font-bold text-maroon">Saree Shop</CardTitle>
                    <CardDescription className="text-gray-500 font-medium">Premium Inventory Management System</CardDescription>
                    <div className="mt-2 p-2 bg-gold/10 rounded-md border border-gold/20">
                        <p className="text-[10px] text-maroon/60 uppercase tracking-wider font-bold">Testing Mode</p>
                        <p className="text-xs text-maroon/80 italic">Use any username & password to enter</p>
                    </div>
                </CardHeader>
                <CardContent>
                    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
                        <div className="space-y-2">
                            <label className="text-sm font-semibold text-maroon/80 ml-1">Username</label>
                            <Input
                                {...register('username')}
                                placeholder="Enter username"
                                className="border-gold/30 focus-visible:ring-maroon"
                            />
                            {errors.username && <p className="text-xs text-red-500 ml-1">{errors.username.message}</p>}
                        </div>
                        <div className="space-y-2">
                            <label className="text-sm font-semibold text-maroon/80 ml-1">Password</label>
                            <Input
                                {...register('password')}
                                type="password"
                                placeholder="Enter password"
                                className="border-gold/30 focus-visible:ring-maroon"
                            />
                            {errors.password && <p className="text-xs text-red-500 ml-1">{errors.password.message}</p>}
                        </div>
                        <Button
                            type="submit"
                            className="w-full bg-maroon hover:bg-maroon-dark text-gold font-bold h-12 mt-4 text-lg"
                            disabled={isSubmitting}
                        >
                            {isSubmitting ? 'Authenticating...' : 'Sign In'}
                        </Button>
                    </form>
                </CardContent>
                <CardFooter className="flex flex-col items-center">
                    <p className="text-xs text-gray-400">© 2026 Saree Shop Admin Panel</p>
                </CardFooter>
            </Card>
        </div>
    );
}
