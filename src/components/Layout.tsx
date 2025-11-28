import { Outlet, Link, useLocation } from 'react-router-dom';
import { Home, User, Menu, X } from 'lucide-react';
import clsx from 'clsx';
import { useState } from 'react';

export default function Layout() {
    const location = useLocation();
    const [isSidebarOpen, setIsSidebarOpen] = useState(false);

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

            {/* Landscape Toggle Button */}
            <button
                onClick={() => setIsSidebarOpen(!isSidebarOpen)}
                className="hidden landscape:flex fixed top-4 left-4 z-[60] p-2 bg-zinc-900/80 backdrop-blur-md rounded-lg border border-zinc-800 text-zinc-400 hover:text-white hover:bg-zinc-800 transition-all shadow-lg"
            >
                {isSidebarOpen ? <X size={20} /> : <Menu size={20} />}
            </button>

            {/* Left Sidebar Navigation (Landscape Only) */}
            <nav
                className={clsx(
                    "hidden landscape:flex flex-col w-20 bg-zinc-900/95 backdrop-blur-xl border-r border-zinc-800 z-50 h-screen fixed left-0 top-0 items-center pt-20 space-y-6 transition-transform duration-300 ease-in-out shadow-2xl",
                    isSidebarOpen ? "translate-x-0" : "-translate-x-full"
                )}
            >
                <Link
                    to="/"
                    className={clsx(
                        "p-3 rounded-xl transition-all flex flex-col items-center gap-1",
                        isActive('/') ? "bg-emerald-500/10 text-emerald-400" : "text-zinc-500 hover:text-zinc-300 hover:bg-zinc-800/50"
                    )}
                    title="Home"
                    onClick={() => setIsSidebarOpen(false)}
                >
                    <Home size={24} />
                    <span className="text-[10px] font-medium">Home</span>
                </Link>

                <Link
                    to="/profile"
                    className={clsx(
                        "p-3 rounded-xl transition-all flex flex-col items-center gap-1",
                        isActive('/profile') ? "bg-emerald-500/10 text-emerald-400" : "text-zinc-500 hover:text-zinc-300 hover:bg-zinc-800/50"
                    )}
                    title="Profile"
                    onClick={() => setIsSidebarOpen(false)}
                >
                    <User size={24} />
                    <span className="text-[10px] font-medium">Profile</span>
                </Link>
            </nav>

            {/* Main Content Area */}
            <main
                className={clsx(
                    "flex-1 flex flex-col pt-12 landscape:pt-0 overflow-hidden transition-all duration-300",
                    isSidebarOpen ? "landscape:pl-20" : "landscape:pl-0"
                )}
            >
                <Outlet />
            </main>
        </div>
    );
}
