import { useState } from "react";
import { Play, Tv, GamepadIcon, BookOpen, Music, GraduationCap, Mic, Sparkles, CheckCircle2, MinusCircle, AlertTriangle, BarChart2, Sprout, HelpCircle } from "lucide-react";
import { Link } from "react-router-dom";
import { cn } from "@/lib/utils";
import type { CatalogItem } from "@/types/catalog";
import { formatDuration, formatViews, getDurationBucketLabel, getHSKLevelLabel, isGreatForBeginners, getHSKCoverageGroups, getVideoQualityConfig, getGenreLabels } from "@/types/catalog";
import { useThumbnailProxy } from "@/hooks/useThumbnailProxy";

// Quality icon mapping
const qualityIcons = {
    excellent: Sparkles,
    good: CheckCircle2,
    fair: MinusCircle,
    needs_review: AlertTriangle,
};

// Stacked Progress Bar Component for HSK Coverage
interface StackedProgressBarProps {
    data: {
        beginner: number;
        intermediate: number;
        advanced: number;
        unknown: number;
    };
    className?: string;
}

const StackedProgressBar = ({ data, className }: StackedProgressBarProps) => {
    const total = data.beginner + data.intermediate + data.advanced + data.unknown;

    if (total === 0) return null;

    return (
        <div className={cn("h-2.5 w-full flex rounded-full overflow-hidden bg-zinc-800/50 ring-1 ring-zinc-700", className)}>
            {data.beginner > 0 && (
                <div
                    style={{ width: `${(data.beginner / total) * 100}% ` }}
                    className="bg-emerald-500"
                />
            )}
            {data.intermediate > 0 && (
                <div
                    style={{ width: `${(data.intermediate / total) * 100}% ` }}
                    className="bg-amber-500"
                />
            )}
            {data.advanced > 0 && (
                <div
                    style={{ width: `${(data.advanced / total) * 100}% ` }}
                    className="bg-rose-500"
                />
            )}
            {data.unknown > 0 && (
                <div
                    style={{ width: `${(data.unknown / total) * 100}% ` }}
                    className="bg-zinc-600/30"
                />
            )}
        </div>
    );
};

// Genre icon mapping
const genreIcons = {
    anime: <Tv className="w-3 h-3" />,
    gaming: <GamepadIcon className="w-3 h-3" />,
    vlog: <Mic className="w-3 h-3" />,
    news: <Tv className="w-3 h-3" />,
    tech: <BookOpen className="w-3 h-3" />,
    comedy: <Play className="w-3 h-3" />,
    education: <GraduationCap className="w-3 h-3" />,
    music: <Music className="w-3 h-3" />,
    variety: <Play className="w-3 h-3" />,
    documentary: <Tv className="w-3 h-3" />,
    general: <Play className="w-3 h-3" />,
};

// Genre color mapping
const genreColors = {
    anime: "bg-pink-500/20 text-pink-300 border-pink-500/30",
    gaming: "bg-purple-500/20 text-purple-300 border-purple-500/30",
    vlog: "bg-blue-500/20 text-blue-300 border-blue-500/30",
    news: "bg-red-500/20 text-red-300 border-red-500/30",
    tech: "bg-green-500/20 text-green-300 border-green-500/30",
    comedy: "bg-yellow-500/20 text-yellow-300 border-yellow-500/30",
    education: "bg-indigo-500/20 text-indigo-300 border-indigo-500/30",
    music: "bg-orange-500/20 text-orange-300 border-orange-500/30",
    variety: "bg-teal-500/20 text-teal-300 border-teal-500/30",
    documentary: "bg-zinc-500/20 text-zinc-300 border-zinc-500/30",
    general: "bg-slate-500/20 text-slate-300 border-slate-500/30",
};

// Difficulty color mapping
const difficultyColors = {
    1: "bg-emerald-500/20 text-emerald-300 border-emerald-500/30",
    2: "bg-emerald-500/20 text-emerald-300 border-emerald-500/30",
    3: "bg-amber-500/20 text-amber-300 border-amber-500/30",
    4: "bg-amber-500/20 text-amber-300 border-amber-500/30",
    5: "bg-rose-500/20 text-rose-300 border-rose-500/30",
    6: "bg-rose-500/20 text-rose-300 border-rose-500/30",
};

interface CatalogCardProps {
    item: CatalogItem;
    isAuthenticated: boolean;
    onLockedItemClick?: () => void;
}

export const CatalogCard = ({ item }: CatalogCardProps) => {
    const [imageError, setImageError] = useState(false);

    // Use thumbnail proxy hook
    const { proxyUrl: thumbnailUrl } = useThumbnailProxy({
        originalUrl: item.thumbnail_url || "",
        fallbackUrl: undefined,
    });

    // Cleaned English title with fallback
    const englishTitle =
        (item.title_en || "")
            .replace(/_/g, " ")
            .trim() || item.title;

    // Enhanced metadata calculations
    const isBeginnerFriendly = isGreatForBeginners(item.difficulty);
    const hskCoverageGroups = getHSKCoverageGroups(item.difficulty?.hsk_coverage);
    const qualityConfig = getVideoQualityConfig(item.subtitle_quality?.tier);
    const QualityIconComponent = qualityIcons[item.subtitle_quality?.tier as keyof typeof qualityIcons] || HelpCircle;
    const genreLabels = getGenreLabels(item.genres);

    // For PWA, we link to the Watch page instead of opening Bilibili directly
    const watchUrl = `/watch/${item.video_hash}`;

    return (
        <Link to={watchUrl} className="block group">
            <div
                className="bg-zinc-900 border border-zinc-800 rounded-xl overflow-hidden transition-all duration-200 hover:shadow-xl hover:border-zinc-700 hover:scale-[1.02] flex flex-col h-full"
            >
                {/* Thumbnail Container */}
                <div className="relative aspect-video overflow-hidden bg-zinc-950">
                    {thumbnailUrl && !imageError ? (
                        <img
                            src={thumbnailUrl ?? ""}
                            alt={`${item.title} thumbnail`}
                            className="w-full h-full object-cover transition-transform duration-200 group-hover:scale-105"
                            onError={() => setImageError(true)}
                            loading="lazy"
                        />
                    ) : (
                        <div className="w-full h-full bg-zinc-900 flex flex-col items-center justify-center">
                            <Play className="w-12 h-12 text-zinc-700 mb-2" />
                            <span className="text-xs text-zinc-500 text-center px-2">
                                {item.channel}
                            </span>
                        </div>
                    )}

                    {/* NEW: Great for Beginners Badge */}
                    {isBeginnerFriendly && (
                        <div className="absolute top-2 left-2 z-10">
                            <div className="bg-emerald-500/90 text-white shadow-lg text-[10px] px-2 py-1 rounded-md flex items-center font-bold">
                                <Sprout className="w-3 h-3 mr-1" />
                                Beginner Friendly
                            </div>
                        </div>
                    )}

                    {/* UPDATED: Multi-Genre Display */}
                    {genreLabels.length > 0 && (
                        <div className="absolute top-2 right-2 flex flex-col gap-1 z-10">
                            {genreLabels.slice(0, 2).map((label, index) => {
                                const genreKey = item.genres[index].toLowerCase() as keyof typeof genreIcons;

                                return (
                                    <div
                                        key={`${label} -${index} `}
                                        className={cn(
                                            "backdrop-blur-md text-[10px] px-2 py-1 rounded-md flex items-center gap-1 font-medium",
                                            genreColors[genreKey] || "bg-zinc-800/80 text-white"
                                        )}
                                    >
                                        {genreIcons[genreKey]}
                                        {label}
                                    </div>
                                );
                            })}
                        </div>
                    )}

                    {/* Duration Badge */}
                    <div className="absolute bottom-2 right-2 bg-black/80 text-white text-xs px-1.5 py-0.5 rounded z-10 font-mono">
                        {formatDuration(item.duration_seconds)}
                    </div>
                </div>

                {/* Card Content */}
                <div className="p-4 space-y-3 flex-1 flex flex-col">
                    {/* Titles */}
                    <div className="space-y-1 flex-1">
                        <h3 className="font-bold text-base leading-tight line-clamp-2 text-zinc-100 group-hover:text-white transition-colors">
                            {englishTitle}
                        </h3>
                        <p className="text-xs text-zinc-400 line-clamp-2">
                            {item.title}
                        </p>
                    </div>

                    {/* Channel and Views */}
                    <div className="text-xs text-zinc-500 flex items-center gap-2">
                        <span>{item.channel}</span>
                        <span>•</span>
                        <span>{formatViews(item.popularity?.views)} views</span>
                    </div>

                    {/* Enhanced Badges */}
                    <div className="flex flex-wrap gap-2">
                        {/* Difficulty Level */}
                        {item.difficulty?.level && (
                            <div className={cn(
                                "px-2 py-1 rounded-full text-xs font-medium border transition-all duration-200",
                                difficultyColors[item.difficulty.level]
                            )}>
                                {getHSKLevelLabel(item.difficulty.level)}
                            </div>
                        )}

                        {/* Duration Bucket */}
                        <div className="px-2 py-1 rounded-full text-xs font-medium bg-blue-500/10 text-blue-400 border border-blue-500/20">
                            {getDurationBucketLabel(item.duration_bucket)}
                        </div>
                    </div>

                    {/* NEW: Metadata Footer with HSK Coverage and Quality Indicators */}
                    <div className="flex items-center justify-between mt-auto pt-3 border-t border-zinc-800">
                        {/* HSK Coverage */}
                        {item.difficulty?.level && (
                            <div className="flex items-center gap-1.5 px-2 py-1 rounded-full bg-zinc-800/50 text-xs font-medium w-full max-w-[120px]">
                                <BarChart2 className="w-3 h-3 opacity-70 text-zinc-400" />
                                <StackedProgressBar data={hskCoverageGroups} className="flex-1" />
                            </div>
                        )}

                        {/* Video Quality Indicator */}
                        {item.subtitle_quality?.tier && (
                            <div className="flex items-center gap-1.5 opacity-80" title={qualityConfig.label}>
                                <span className={qualityConfig.color}>
                                    <QualityIconComponent className="w-4 h-4" />
                                </span>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </Link>
    );
};
