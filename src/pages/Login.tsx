import React from 'react';
import { Eye, EyeOff } from 'lucide-react';
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
    password: z.string().min(1, 'Password is required'),
});

type LoginFormValues = z.infer<typeof loginSchema>;

export default function LoginPage() {
    const navigate = useNavigate();
    const { login, isAuthenticated } = useAuthStore();
    const [showPassword, setShowPassword] = React.useState(false);

    React.useEffect(() => {
        if (isAuthenticated) {
            navigate('/', { replace: true });
        }
    }, [isAuthenticated, navigate]);

    const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm<LoginFormValues>({
        resolver: zodResolver(loginSchema),
    });

    const onSubmit = async (data: LoginFormValues) => {
        if (data.password === 'Admin@123') {
            login();
            toast.success('Login successful!');
            navigate('/', { replace: true });
        } else {
            toast.error('Invalid password. Please try again.');
        }
    };

    return (
        <div className="min-h-screen flex items-center justify-center bg-cream-light p-4 relative overflow-hidden">
            {/* Decorative background elements */}
            <div className="absolute top-[-10%] right-[-10%] w-96 h-96 bg-maroon/5 rounded-full blur-3xl" />
            <div className="absolute bottom-[-10%] left-[-10%] w-96 h-96 bg-gold/10 rounded-full blur-3xl" />

            <Card className="w-full max-w-md border-gold/20 shadow-2xl z-10">
                <CardHeader className="text-center space-y-1">
                    <div className="mx-auto w-16 h-16 bg-maroon rounded-full flex items-center justify-center mb-4 border-2 border-gold shadow-lg">
                        <span className="text-2xl font-bold text-gold">K</span>
                    </div>
                    <CardTitle className="text-3xl font-bold text-maroon">Kasturi Sarees Admin</CardTitle>
                    <CardDescription className="text-gray-500 font-medium">Secure Inventory Management System</CardDescription>
                </CardHeader>
                <CardContent>
                    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
                        <div className="space-y-2">
                            <label className="text-sm font-semibold text-maroon/80 ml-1">Admin Password</label>
                            <div className="relative">
                                <Input
                                    {...register('password')}
                                    type={showPassword ? 'text' : 'password'}
                                    placeholder="Enter admin password"
                                    className="border-gold/30 focus-visible:ring-maroon h-11 pr-10"
                                />
                                <button
                                    type="button"
                                    onClick={() => setShowPassword(!showPassword)}
                                    className="absolute right-3 top-1/2 -translate-y-1/2 text-maroon/50 hover:text-maroon transition-colors"
                                >
                                    {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                                </button>
                            </div>
                            {errors.password && <p className="text-xs text-red-500 ml-1">{errors.password.message}</p>}
                        </div>
                        <Button
                            type="submit"
                            className="w-full bg-maroon hover:bg-maroon-dark text-gold font-bold h-12 mt-4 text-lg"
                            disabled={isSubmitting}
                        >
                            {isSubmitting ? 'Verifying...' : 'Access Dashboard'}
                        </Button>
                    </form>
                </CardContent>
                <CardFooter className="flex flex-col items-center">
                    <p className="text-xs text-gray-400">© 2026 Kasturi Sarees Admin portal</p>
                </CardFooter>
            </Card>
        </div>
    );
}
