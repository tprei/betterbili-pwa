import { Settings, LogOut, Mail, Shield, User as UserIcon } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { useSubscription } from "@/hooks/useSubscription";
import { useNavigate } from "react-router-dom";

export default function Profile() {
    const { user, signOut } = useAuth();
    const { subscription, loading: subscriptionLoading } = useSubscription();
    const navigate = useNavigate();

    const handleSignOut = async () => {
        await signOut();
        navigate("/login");
    };

    if (!user) {
        return (
            <div className="min-h-screen bg-zinc-950 flex items-center justify-center">
                <div className="text-zinc-400">Loading profile...</div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-zinc-950 text-zinc-100 p-4 md:p-8 pb-24">
            <div className="max-w-3xl mx-auto space-y-8 landscape:space-y-0 landscape:grid landscape:grid-cols-2 landscape:gap-6 landscape:items-start">
                <div className="space-y-8 landscape:space-y-4">
                    <h1 className="text-3xl font-bold text-white">Profile</h1>

                    {/* User Info Card */}
                    <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6 md:p-8 flex flex-col items-center text-center gap-4 landscape:p-6">
                        <div className="w-24 h-24 rounded-full bg-emerald-500/20 flex items-center justify-center text-emerald-400 text-3xl font-bold">
                            {user.email?.charAt(0).toUpperCase() || <UserIcon className="w-12 h-12" />}
                        </div>
                        <div className="space-y-2">
                            <h2 className="text-2xl font-bold text-white">
                                {user.user_metadata?.full_name || user.email?.split('@')[0] || 'User'}
                            </h2>
                            <div className="flex items-center justify-center gap-2 text-zinc-400">
                                <Mail className="w-4 h-4" />
                                <span>{user.email}</span>
                            </div>
                            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-zinc-800 text-xs font-medium text-zinc-300 mt-2 capitalize">
                                <Shield className="w-3 h-3" />
                                <span>{subscriptionLoading ? 'Loading...' : `${subscription?.plan || 'Free'} Plan`}</span>
                            </div>
                        </div>
                        <button className="w-full px-4 py-2 bg-zinc-800 hover:bg-zinc-700 rounded-lg text-sm font-medium transition-colors mt-2">
                            Edit Profile
                        </button>
                    </div>
                </div>

                {/* Settings Sections */}
                <div className="grid gap-6 landscape:gap-4 landscape:pt-14">
                    {/* Preferences */}
                    <section className="space-y-4 landscape:space-y-2">
                        <h3 className="text-lg font-semibold text-zinc-400 uppercase tracking-wider text-xs ml-1">Settings</h3>
                        <div className="bg-zinc-900 border border-zinc-800 rounded-xl overflow-hidden divide-y divide-zinc-800">
                            <button className="w-full flex items-center justify-between p-4 hover:bg-zinc-800/50 transition-colors text-left landscape:p-3">
                                <div className="flex items-center gap-3">
                                    <div className="p-2 bg-purple-500/10 text-purple-400 rounded-lg">
                                        <Settings className="w-5 h-5" />
                                    </div>
                                    <div>
                                        <div className="font-medium text-zinc-200">Preferences</div>
                                        <div className="text-xs text-zinc-500">Language and playback settings</div>
                                    </div>
                                </div>
                                <span className="text-zinc-600">→</span>
                            </button>
                        </div>
                    </section>

                    {/* Danger Zone */}
                    <section className="space-y-4 landscape:space-y-2">
                        <div className="bg-zinc-900 border border-zinc-800 rounded-xl overflow-hidden">
                            <button
                                onClick={handleSignOut}
                                className="w-full flex items-center justify-between p-4 hover:bg-rose-500/10 transition-colors text-left group landscape:p-3"
                            >
                                <div className="flex items-center gap-3">
                                    <div className="p-2 bg-rose-500/10 text-rose-500 rounded-lg group-hover:bg-rose-500 group-hover:text-white transition-colors">
                                        <LogOut className="w-5 h-5" />
                                    </div>
                                    <div>
                                        <div className="font-medium text-rose-500">Sign Out</div>
                                    </div>
                                </div>
                            </button>
                        </div>
                    </section>
                </div>
            </div>
        </div>
    );
}
