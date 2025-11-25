import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';

export default function AuthCallback() {
    const navigate = useNavigate();

    useEffect(() => {
        // Handle the OAuth callback
        supabase.auth.getSession().then(({ data: { session }, error }) => {
            if (error) {
                navigate('/login');
            } else if (session) {
                navigate('/profile');
            } else {
                // If no session immediately, wait briefly for auth state change
                setTimeout(() => {
                    navigate('/');
                }, 2000);
            }
        });
    }, [navigate]);

    return (
        <div className="min-h-screen bg-zinc-950 flex items-center justify-center text-white">
            <div className="text-center space-y-4">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-emerald-500 mx-auto"></div>
                <p>Completing sign in...</p>
            </div>
        </div>
    );
}
