import { useState } from "react";
import { Search, SlidersHorizontal, X, Check } from "lucide-react";
import { type CatalogFilters, type Genre, type HSKLevel, type DurationBucket, getGenreLabel, getDurationBucketLabel, getHSKLevelLabel } from "@/types/catalog";

interface CatalogControlsProps {
    filters: CatalogFilters;
    onFilterChange: (filters: Partial<CatalogFilters>) => void;
}

const genres: Genre[] = ["anime", "gaming", "vlog", "news", "tech", "comedy", "education", "music", "variety", "documentary", "general"];
const durationBuckets: DurationBucket[] = ["<=3m", "3-10m", "10-30m", "30-60m", "60m+"];
const hskLevels: HSKLevel[] = [1, 2, 3, 4, 5, 6];

export const CatalogControls = ({ filters, onFilterChange }: CatalogControlsProps) => {
    const [isFilterOpen, setIsFilterOpen] = useState(false);
    const [searchQuery, setSearchQuery] = useState(filters.query);

    const handleSearchSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        onFilterChange({ query: searchQuery });
    };

    const toggleSelection = <T,>(current: T[], item: T): T[] => {
        return current.includes(item)
            ? current.filter((i) => i !== item)
            : [...current, item];
    };

    const activeFilterCount =
        filters.genres.length +
        filters.difficulty.length +
        filters.duration.length;

    // Helper classes
    const getInactiveClass = () => "bg-zinc-800 border-zinc-700 text-zinc-300";
    const getActiveClass = (color: string) => {
        switch (color) {
            case 'emerald': return "bg-emerald-500/20 border-emerald-500 text-emerald-400";
            case 'blue': return "bg-blue-500/20 border-blue-500 text-blue-400";
            case 'purple': return "bg-purple-500/20 border-purple-500 text-purple-300";
            default: return "bg-zinc-100 text-zinc-900";
        }
    };

    return (
        <div className="space-y-4 mb-6 sticky top-0 bg-zinc-950/95 backdrop-blur z-30 py-4 -mx-4 px-4 border-b border-zinc-800/50">
            {/* 1. Search Bar (Same as before) */}
            <div className="flex gap-3">
                <form onSubmit={handleSearchSubmit} className="relative flex-1">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-400" />
                    <input
                        type="text"
                        placeholder="Search videos..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="w-full bg-zinc-900 border border-zinc-800 rounded-lg py-3 pl-10 pr-4 text-sm text-zinc-100 placeholder:text-zinc-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/50"
                    />
                </form>

                <button
                    onClick={() => setIsFilterOpen(true)}
                    className={`flex items-center justify-center w-12 rounded-lg border transition-colors ${activeFilterCount > 0
                            ? "bg-emerald-500/20 border-emerald-500 text-emerald-400"
                            : "bg-zinc-800 border-zinc-700 text-zinc-200"
                        }`}
                >
                    <SlidersHorizontal className="w-5 h-5" />
                    {activeFilterCount > 0 && (
                        <span className="ml-1 text-xs font-bold">{activeFilterCount}</span>
                    )}
                </button>
            </div>

            {/* 2. Full Screen Filter Modal */}
            {isFilterOpen && (
                <div className="fixed inset-0 z-50 flex flex-col bg-zinc-950 h-[100dvh]"> {/* Fixed full viewport height */}

                    {/* Header - Fixed Height */}
                    <div className="flex items-center justify-between p-4 border-b border-zinc-800 shrink-0">
                        <h2 className="text-xl font-bold text-white">Filters</h2>
                        <button
                            onClick={() => setIsFilterOpen(false)}
                            className="p-2 text-zinc-400 hover:text-white bg-zinc-900 rounded-full"
                        >
                            <X className="w-6 h-6" />
                        </button>
                    </div>

                    {/* Content - Grows to fill space (flex-1) */}
                    <div className="flex-1 overflow-y-auto p-5 space-y-8">

                        {/* Difficulty Section */}
                        <div>
                            <h3 className="text-xs font-bold text-zinc-500 mb-3 uppercase tracking-wider">Difficulty (HSK)</h3>
                            <div className="grid grid-cols-3 gap-3">
                                {hskLevels.map((level) => (
                                    <button
                                        key={level}
                                        onClick={() => onFilterChange({ difficulty: toggleSelection(filters.difficulty, level) })}
                                        className={`px-3 py-3 rounded-lg text-sm border font-medium flex items-center justify-center gap-2 ${filters.difficulty.includes(level) ? getActiveClass('emerald') : getInactiveClass()
                                            }`}
                                    >
                                        {getHSKLevelLabel(level)}
                                    </button>
                                ))}
                            </div>
                        </div>

                        {/* Duration Section - Changed to flex-wrap for better visibility */}
                        <div>
                            <h3 className="text-xs font-bold text-zinc-500 mb-3 uppercase tracking-wider">Duration</h3>
                            <div className="flex flex-wrap gap-2">
                                {durationBuckets.map((bucket) => (
                                    <button
                                        key={bucket}
                                        onClick={() => onFilterChange({ duration: toggleSelection(filters.duration, bucket) })}
                                        className={`px-4 py-2.5 rounded-lg text-sm border font-medium ${filters.duration.includes(bucket) ? getActiveClass('blue') : getInactiveClass()
                                            }`}
                                    >
                                        {getDurationBucketLabel(bucket)}
                                    </button>
                                ))}
                            </div>
                        </div>

                        {/* Genres Section */}
                        <div>
                            <h3 className="text-xs font-bold text-zinc-500 mb-3 uppercase tracking-wider">Genres</h3>
                            <div className="grid grid-cols-2 gap-3">
                                {genres.map((genre) => (
                                    <button
                                        key={genre}
                                        onClick={() => onFilterChange({ genres: toggleSelection(filters.genres, genre) })}
                                        className={`px-3 py-3 rounded-lg text-sm border font-medium text-left flex items-center justify-between ${filters.genres.includes(genre) ? getActiveClass('purple') : getInactiveClass()
                                            }`}
                                    >
                                        <span>{getGenreLabel(genre)}</span>
                                        {filters.genres.includes(genre) && <Check className="w-4 h-4" />}
                                    </button>
                                ))}
                            </div>
                        </div>
                    </div>

                    {/* Footer - Fixed Height at bottom */}
                    <div className="p-4 border-t border-zinc-800 bg-zinc-950 pb-8 shrink-0">
                        <div className="flex gap-3">
                            <button
                                onClick={() => {
                                    onFilterChange({ genres: [], difficulty: [], duration: [], query: "" });
                                    setSearchQuery("");
                                }}
                                className="flex-1 py-3.5 bg-zinc-800 text-white rounded-xl font-semibold border border-zinc-700"
                            >
                                Reset
                            </button>
                            <button
                                onClick={() => setIsFilterOpen(false)}
                                className="flex-[2] py-3.5 bg-emerald-500 text-zinc-950 rounded-xl font-bold shadow-lg shadow-emerald-900/20"
                            >
                                Show Results
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};
