import { useState, useEffect, useRef, useCallback } from "react";
import { useSearchParams } from "react-router-dom";
import { CatalogGrid } from "../components/catalog/CatalogGrid";
import { CatalogControls } from "../components/catalog/CatalogControls";
import type {
    CatalogFilters,
    CatalogResponse,
    CatalogItem,
    SortOption
} from "../types/catalog";
import { searchCatalog } from "../lib/catalog-api";
import { useAuth } from "../contexts/AuthContext";
import { Search, RefreshCw } from "lucide-react";

export default function Home() {
    const [searchParams, setSearchParams] = useSearchParams();
    const { session } = useAuth();

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
                const response = await searchCatalog(filters, undefined, 5, session?.access_token);
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
    }, [filters, session?.access_token]);

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
    const handleLoadMore = useCallback(async () => {
        if (!data || loadingMore || !hasMore || !data.cursor) return;

        setLoadingMore(true);
        try {
            const response = await searchCatalog(filters, data.cursor, 5, session?.access_token);

            setAllItems(prev => [...prev, ...response.items]);
            setData(response);

            setHasMore(response.cursor !== undefined && !response.locked);
        } catch (error) {
            console.error("Failed to load more:", error);
        } finally {
            setLoadingMore(false);
        }
    }, [data, loadingMore, hasMore, filters, session?.access_token]);

    // Infinite scroll observer
    const observer = useRef<IntersectionObserver | null>(null);
    const lastElementRef = useCallback((node: HTMLDivElement) => {
        if (loadingMore) return;
        if (observer.current) observer.current.disconnect();

        observer.current = new IntersectionObserver(entries => {
            if (entries[0].isIntersecting) {
                if (hasMore) {
                    handleLoadMore();
                }
            }
        });

        if (node) observer.current.observe(node);
    }, [loadingMore, hasMore, handleLoadMore]);

    return (
        <div className="min-h-screen bg-zinc-950 text-zinc-100 p-4 md:p-8 pb-24">
            <div className="max-w-7xl mx-auto space-y-8">

                {/* Header */}
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div>
                        <h1 className="text-3xl font-bold text-white mb-1">Discover</h1>
                        <p className="text-zinc-400">Learn Chinese with authentic videos</p>
                    </div>
                </div>

                {/* New Controls */}
                <CatalogControls
                    filters={filters}
                    onFilterChange={(newFilters) => setFilters(prev => ({ ...prev, ...newFilters }))}
                />

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
                            isAuthenticated={!!session}
                        />

                        {/* Infinite Scroll Sentinel */}
                        <div ref={lastElementRef} className="mt-8 h-10 flex items-center justify-center">
                            {loadingMore && (
                                <div className="flex items-center gap-2 text-zinc-500">
                                    <RefreshCw className="w-5 h-5 animate-spin" />
                                    <span className="text-sm">Loading more videos...</span>
                                </div>
                            )}
                            {!hasMore && allItems.length > 0 && (
                                <p className="text-zinc-600 text-sm">You've reached the end</p>
                            )}
                        </div>
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
