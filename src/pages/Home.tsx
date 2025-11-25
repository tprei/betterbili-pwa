import { useState, useEffect } from "react";
import { useSearchParams } from "react-router-dom";
import { CatalogGrid } from "../components/catalog/CatalogGrid";
import type {
    CatalogFilters,
    CatalogResponse,
    CatalogItem,
    SortOption,
    HSKLevel
} from "../types/catalog";
import { searchCatalog } from "../lib/catalog-api";
import { Search, RefreshCw } from "lucide-react";
import clsx from "clsx";

export default function Home() {
    const [searchParams, setSearchParams] = useSearchParams();

    // State
    const [data, setData] = useState<CatalogResponse | null>(null);
    const [loading, setLoading] = useState(true);
    const [loadingMore, setLoadingMore] = useState(false);
    const [hasMore, setHasMore] = useState(true);
    const [allItems, setAllItems] = useState<CatalogItem[]>([]);

    // Filters state
    const [filters, setFilters] = useState<CatalogFilters>({
        query: searchParams.get("q") || "",
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        genres: searchParams.get("genres")?.split(",").filter(Boolean) as any[] || [],
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        difficulty: searchParams.get("difficulty")?.split(",").filter(Boolean).map(Number) as any[] || [],
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        duration: searchParams.get("duration")?.split(",").filter(Boolean) as any[] || [],
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        popularity: searchParams.get("popularity")?.split(",").filter(Boolean) as any[] || [],
        creators: searchParams.get("creators")?.split(",").filter(Boolean) || [],
        sort: (searchParams.get("sort") as SortOption) || "trending" as SortOption,
    });

    // Fetch initial data
    useEffect(() => {
        const fetchData = async () => {
            setLoading(true);
            try {
                const response = await searchCatalog(filters, undefined, 24);
                setData(response);
                setAllItems(response.items);
                setHasMore(response.cursor !== undefined && !response.locked);
            } catch (error) {
                console.error("Failed to fetch catalog data:", error);
                // Set empty state
                setData(null);
                setAllItems([]);
                setHasMore(false);
            } finally {
                setLoading(false);
            }
        };

        fetchData();
    }, [filters]);

    // Update search params when filters change
    useEffect(() => {
        const params = new URLSearchParams();
        if (filters.query) params.set("q", filters.query);
        if (filters.genres.length > 0) params.set("genres", filters.genres.join(","));
        if (filters.difficulty.length > 0) params.set("difficulty", filters.difficulty.join(","));
        if (filters.duration.length > 0) params.set("duration", filters.duration.join(","));
        if (filters.popularity.length > 0) params.set("popularity", filters.popularity.join(","));
        if (filters.creators.length > 0) params.set("creators", filters.creators.join(","));
        if (filters.sort !== "trending") params.set("sort", filters.sort);

        setSearchParams(params);
    }, [filters, setSearchParams]);

    // Load more items
    const handleLoadMore = async () => {
        if (!data || loadingMore || !hasMore || !data.cursor) return;

        setLoadingMore(true);
        try {
            const response = await searchCatalog(filters, data.cursor, 24);

            setAllItems(prev => [...prev, ...response.items]);
            setData(response);

            setHasMore(response.cursor !== undefined && !response.locked);
        } catch (error) {
            console.error("Failed to load more:", error);
        } finally {
            setLoadingMore(false);
        }
    };

    const handleSearch = (e: React.FormEvent) => {
        e.preventDefault();
        // Trigger fetch via useEffect dependency
    };

    return (
        <div className="min-h-screen bg-zinc-950 text-zinc-100 p-4 md:p-8 pb-24">
            <div className="max-w-7xl mx-auto space-y-8">

                {/* Header */}
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div>
                        <h1 className="text-3xl font-bold text-white mb-1">Discover</h1>
                        <p className="text-zinc-400">Learn Chinese with authentic videos</p>
                    </div>

                    {/* Search Bar */}
                    <form onSubmit={handleSearch} className="relative w-full md:w-96">
                        <input
                            type="text"
                            placeholder="Search videos, channels..."
                            value={filters.query}
                            onChange={(e) => setFilters(prev => ({ ...prev, query: e.target.value }))}
                            className="w-full bg-zinc-900 border border-zinc-800 rounded-full py-2.5 pl-10 pr-4 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/50 focus:border-emerald-500 transition-all"
                        />
                        <Search className="absolute left-3.5 top-2.5 w-4 h-4 text-zinc-500" />
                    </form>
                </div>

                {/* Filters (Simplified for now) */}
                <div className="flex overflow-x-auto pb-2 gap-2 scrollbar-hide">
                    {['All', 'HSK 1-2', 'HSK 3-4', 'HSK 5-6'].map((label, i) => (
                        <button
                            key={label}
                            onClick={() => {
                                const newDifficulty = i === 0 ? [] : i === 1 ? [1, 2] : i === 2 ? [3, 4] : [5, 6];
                                setFilters(prev => ({ ...prev, difficulty: newDifficulty as HSKLevel[] }));
                            }}
                            className={clsx(
                                "px-4 py-1.5 rounded-full text-sm font-medium whitespace-nowrap transition-colors border",
                                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                                (i === 0 && filters.difficulty.length === 0) || (i > 0 && filters.difficulty.includes(i * 2 as any))
                                    ? "bg-emerald-500/20 text-emerald-400 border-emerald-500/30"
                                    : "bg-zinc-900 text-zinc-400 border-zinc-800 hover:bg-zinc-800 hover:text-zinc-200"
                            )}
                        >
                            {label}
                        </button>
                    ))}
                </div>

                {/* Content */}
                {loading ? (
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                        {[...Array(8)].map((_, i) => (
                            <div key={i} className="bg-zinc-900 rounded-xl overflow-hidden h-[300px] animate-pulse">
                                <div className="h-48 bg-zinc-800" />
                                <div className="p-4 space-y-3">
                                    <div className="h-4 bg-zinc-800 rounded w-3/4" />
                                    <div className="h-3 bg-zinc-800 rounded w-1/2" />
                                </div>
                            </div>
                        ))}
                    </div>
                ) : allItems.length > 0 ? (
                    <>
                        <CatalogGrid
                            items={allItems}
                            isAuthenticated={true} // Assume true for PWA for now
                        />

                        {hasMore && (
                            <div className="mt-12 text-center">
                                <button
                                    onClick={handleLoadMore}
                                    disabled={loadingMore}
                                    className="px-8 py-3 bg-zinc-800 text-white rounded-full hover:bg-zinc-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center gap-2 mx-auto"
                                >
                                    {loadingMore ? <RefreshCw className="w-4 h-4 animate-spin" /> : null}
                                    {loadingMore ? "Loading..." : "Load more"}
                                </button>
                            </div>
                        )}
                    </>
                ) : (
                    <div className="text-center py-20">
                        <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-zinc-900 mb-4">
                            <Search className="w-8 h-8 text-zinc-600" />
                        </div>
                        <h3 className="text-xl font-bold text-white mb-2">No videos found</h3>
                        <p className="text-zinc-500">Try adjusting your search or filters</p>
                        <button
                            onClick={() => setFilters({
                                query: "",
                                genres: [],
                                difficulty: [],
                                duration: [],
                                popularity: [],
                                creators: [],
                                sort: "trending",
                            })}
                            className="mt-6 px-6 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-500 transition-colors"
                        >
                            Reset Filters
                        </button>
                    </div>
                )}
            </div>
        </div>
    );
}
