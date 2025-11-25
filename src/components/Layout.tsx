import { Outlet, Link, useLocation } from 'react-router-dom';
import { Home, User } from 'lucide-react';
import clsx from 'clsx';

export default function Layout() {
    const location = useLocation();

    const isActive = (path: string) => location.pathname === path;

    return (
        <div className="min-h-screen bg-zinc-950 text-zinc-50 flex flex-col landscape:flex-row">

            {/* Top Navigation Bar (Portrait Only) */}
            <nav className="fixed top-0 left-0 right-0 bg-zinc-900/90 backdrop-blur-md border-b border-zinc-800 z-50 h-12 landscape:hidden">
                <div className="flex justify-around items-center h-full max-w-screen-xl mx-auto">
                    <Link
                        to="/"
                        className={clsx(
                            "flex items-center space-x-2 px-4 py-1 rounded-full transition-all",
                            isActive('/') ? "bg-emerald-500/10 text-emerald-400" : "text-zinc-500 hover:text-zinc-300"
                        )}
                    >
                        <Home size={18} />
                        <span className="text-xs font-medium">Home</span>
                    </Link>

                    <Link
                        to="/profile"
                        className={clsx(
                            "flex items-center space-x-2 px-4 py-1 rounded-full transition-all",
                            isActive('/profile') ? "bg-emerald-500/10 text-emerald-400" : "text-zinc-500 hover:text-zinc-300"
                        )}
                    >
                        <User size={18} />
                        <span className="text-xs font-medium">Profile</span>
                    </Link>
                </div>
            </nav>

            {/* Left Sidebar Navigation (Landscape Only) */}
            <nav className="hidden landscape:flex flex-col w-16 bg-zinc-900/90 backdrop-blur-md border-r border-zinc-800 z-50 h-screen fixed left-0 top-0 items-center py-6 space-y-8">
                <Link
                    to="/"
                    className={clsx(
                        "p-3 rounded-xl transition-all",
                        isActive('/') ? "bg-emerald-500/10 text-emerald-400" : "text-zinc-500 hover:text-zinc-300 hover:bg-zinc-800/50"
                    )}
                    title="Home"
                >
                    <Home size={24} />
                </Link>

                <Link
                    to="/profile"
                    className={clsx(
                        "p-3 rounded-xl transition-all",
                        isActive('/profile') ? "bg-emerald-500/10 text-emerald-400" : "text-zinc-500 hover:text-zinc-300 hover:bg-zinc-800/50"
                    )}
                    title="Profile"
                >
                    <User size={24} />
                </Link>
            </nav>

            {/* Main Content Area */}
            <main className="flex-1 flex flex-col pt-12 landscape:pt-0 landscape:pl-16 overflow-hidden">
                <Outlet />
            </main>
        </div>
    );
}
