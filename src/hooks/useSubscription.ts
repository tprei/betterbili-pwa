import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';

export interface Subscription {
    plan: 'free' | 'learner' | 'polyglot';
    status: 'active' | 'trialing' | 'past_due' | 'canceled' | 'incomplete' | 'incomplete_expired' | 'unpaid';
    renewalDate: string | null;
}

const TARGET_STRIPE_MODE = import.meta.env.VITE_BILLING_MODE === 'test' ? 'test' : 'live';

export function useSubscription() {
    const { user } = useAuth();
    const [subscription, setSubscription] = useState<Subscription | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<Error | null>(null);

    useEffect(() => {
        if (!user) {
            setSubscription(null);
            setLoading(false);
            return;
        }

        const fetchSubscription = async () => {
            try {
                setLoading(true);

                // Fetch billing record
                const { data: billingData, error: billingError } = await supabase
                    .from('billing')
                    .select('*')
                    .eq('user_id', user.id)
                    .eq('stripe_mode', TARGET_STRIPE_MODE)
                    .maybeSingle();

                if (billingError) throw billingError;

                // Fetch user context (edge function) for more details if needed
                // For now, billing table is sufficient for basic plan display
                // const { data: contextData, error: contextError } = await supabase.functions.invoke('user-context', {
                //   headers: { 'x-stripe-mode': TARGET_STRIPE_MODE }
                // });

                if (billingData) {
                    setSubscription({
                        plan: billingData.plan as Subscription['plan'],
                        status: billingData.status as Subscription['status'],
                        renewalDate: billingData.renewal_date,
                    });
                } else {
                    // Default to free if no record found
                    setSubscription({
                        plan: 'free',
                        status: 'active',
                        renewalDate: null,
                    });
                }
            } catch (err) {
                console.error('Error fetching subscription:', err);
                setError(err instanceof Error ? err : new Error('Failed to fetch subscription'));
                // Fallback to free on error to avoid blocking UI
                setSubscription({
                    plan: 'free',
                    status: 'active',
                    renewalDate: null,
                });
            } finally {
                setLoading(false);
            }
        };

        fetchSubscription();
    }, [user]);

    return { subscription, loading, error };
}
