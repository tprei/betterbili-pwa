import { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { Mail, Lock, Loader2, AlertCircle } from 'lucide-react';

export default function Login() {
    const navigate = useNavigate();
    const location = useLocation();
    const from = location.state?.from?.pathname || '/profile';

    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [mode, setMode] = useState<'signin' | 'signup'>('signin');

    const handleAuth = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setError(null);

        try {
            if (mode === 'signup') {
                const { error } = await supabase.auth.signUp({
                    email,
                    password,
                });
                if (error) throw error;
                // For signup, we might need to wait for email verification or auto-login
                // Assuming auto-login or "check email" message
                alert('Check your email for the confirmation link!');
            } else {
                const { error } = await supabase.auth.signInWithPassword({
                    email,
                    password,
                });
                if (error) throw error;
                navigate(from, { replace: true });
            }
        } catch (err) {
            setError(err instanceof Error ? err.message : 'An error occurred');
        } finally {
            setLoading(false);
        }
    };

    const handleGoogleLogin = async () => {
        try {
            const { error } = await supabase.auth.signInWithOAuth({
                provider: 'google',
                options: {
                    redirectTo: `${window.location.origin}/auth/callback`,
                },
            });
            if (error) throw error;
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Failed to sign in with Google');
        }
    };

    return (
        <div className="min-h-screen bg-zinc-950 flex items-center justify-center p-4">
            <div className="w-full max-w-md bg-zinc-900 border border-zinc-800 rounded-2xl p-8 space-y-6">
                <div className="text-center space-y-2">
                    <h1 className="text-2xl font-bold text-white">
                        {mode === 'signin' ? 'Welcome Back' : 'Create Account'}
                    </h1>
                    <p className="text-zinc-400 text-sm">
                        {mode === 'signin'
                            ? 'Enter your credentials to access your account'
                            : 'Sign up to start learning Chinese'}
                    </p>
                </div>

                {error && (
                    <div className="bg-rose-500/10 border border-rose-500/20 text-rose-400 text-sm p-3 rounded-lg flex items-center gap-2">
                        <AlertCircle className="w-4 h-4" />
                        {error}
                    </div>
                )}

                <div className="space-y-4">
                    <button
                        type="button"
                        onClick={handleGoogleLogin}
                        className="w-full bg-white text-black hover:bg-zinc-200 font-medium py-2.5 rounded-lg transition-colors flex items-center justify-center gap-2"
                    >
                        <img
                            src="https://www.google.com/favicon.ico"
                            alt="Google"
                            className="w-4 h-4"
                        />
                        Continue with Google
                    </button>

                    <div className="relative">
                        <div className="absolute inset-0 flex items-center">
                            <span className="w-full border-t border-zinc-800" />
                        </div>
                        <div className="relative flex justify-center text-xs uppercase">
                            <span className="bg-zinc-900 px-2 text-zinc-500">Or continue with email</span>
                        </div>
                    </div>
                </div>

                <form onSubmit={handleAuth} className="space-y-4">
                    <div className="space-y-2">
                        <label className="text-xs font-medium text-zinc-400 uppercase tracking-wider">
                            Email
                        </label>
                        <div className="relative">
                            <input
                                type="email"
                                required
                                autoComplete="email"
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                className="w-full bg-zinc-950 border border-zinc-800 rounded-lg py-2.5 pl-10 pr-4 text-white focus:outline-none focus:ring-2 focus:ring-emerald-500/50 focus:border-emerald-500 transition-all"
                                placeholder="name@example.com"
                            />
                            <Mail className="absolute left-3 top-2.5 w-5 h-5 text-zinc-500" />
                        </div>
                    </div>

                    <div className="space-y-2">
                        <label className="text-xs font-medium text-zinc-400 uppercase tracking-wider">
                            Password
                        </label>
                        <div className="relative">
                            <input
                                type="password"
                                required
                                autoComplete="current-password"
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                className="w-full bg-zinc-950 border border-zinc-800 rounded-lg py-2.5 pl-10 pr-4 text-white focus:outline-none focus:ring-2 focus:ring-emerald-500/50 focus:border-emerald-500 transition-all"
                                placeholder="••••••••"
                                minLength={6}
                            />
                            <Lock className="absolute left-3 top-2.5 w-5 h-5 text-zinc-500" />
                        </div>
                    </div>

                    <button
                        type="submit"
                        disabled={loading}
                        className="w-full bg-emerald-600 hover:bg-emerald-500 text-white font-medium py-2.5 rounded-lg transition-colors flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        {loading ? (
                            <Loader2 className="w-5 h-5 animate-spin" />
                        ) : mode === 'signin' ? (
                            'Sign In'
                        ) : (
                            'Sign Up'
                        )}
                    </button>
                </form>

                <div className="text-center text-sm text-zinc-500">
                    {mode === 'signin' ? "Don't have an account? " : 'Already have an account? '}
                    <button
                        onClick={() => setMode(mode === 'signin' ? 'signup' : 'signin')}
                        className="text-emerald-400 hover:text-emerald-300 font-medium transition-colors"
                    >
                        {mode === 'signin' ? 'Sign Up' : 'Sign In'}
                    </button>
                </div>
            </div>
        </div>
    );
}
