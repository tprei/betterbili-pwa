// Data Catalog Types for betterbili.com
// Aligned with backend CatalogSearchItem model

export interface CatalogItem {
    video_hash: string;
    title: string;
    title_en?: string;
    channel?: string;
    thumbnail_url?: string;
    duration_seconds: number;
    duration_bucket: DurationBucket;
    popularity: {
        views?: number;
        likes?: number;
        trending_score?: number;
    };
    difficulty: {
        score?: number;
        level?: HSKLevel;
        hsk_coverage?: Record<string, number>;
        speech_rate_cps?: number;
    };
    subtitle_quality: {
        tier?: "excellent" | "good" | "fair" | "needs_review";
        confidence_mean?: number;
        confidence_median?: number;
        has_pinyin: boolean;
        has_english: boolean;
        rubric_version?: string;
    };
    genres: Genre[];
    video_url: string;
    locked: boolean;
}

// Backend duration bucket values
export type DurationBucket = "<=3m" | "3-10m" | "10-30m" | "30-60m" | "60m+";
export type HSKLevel = 1 | 2 | 3 | 4 | 5 | 6;
export type Genre =
    | "anime"
    | "gaming"
    | "vlog"
    | "news"
    | "tech"
    | "comedy"
    | "education"
    | "music"
    | "variety"
    | "documentary"
    | "general";

// Backend sort options
export type SortOption = "trending" | "new" | "popularity.desc" | "duration.asc" | "duration.desc";

// Popularity bucket options for backend API
export type PopularityBucket = "<50k" | "50k-200k" | "200k-1m" | "1m+";

export interface CatalogFilters {
    query: string;
    genres: Genre[];
    difficulty: HSKLevel[];
    duration: DurationBucket[];
    popularity: PopularityBucket[];
    creators: string[];
    sort: SortOption;
}

// Backend API response structure
export interface CatalogFacetBucket {
    value: string;
    count: number;
}

export interface CatalogFacets {
    genres: CatalogFacetBucket[];
    difficulty: CatalogFacetBucket[];
    duration: CatalogFacetBucket[];
    popularity: CatalogFacetBucket[];
    creators: CatalogFacetBucket[];
}

export interface CatalogResponse {
    items: CatalogItem[];
    facets: CatalogFacets;
    cursor?: string; // For pagination
    visible_limit: number;
    locked: boolean; // Guest access indicator
    total_matches?: number;
}

export interface CatalogStats {
    total_videos: number;
}

export interface MockCatalogItem {
    id: string;
    title: string;
    title_en: string;
    channel: string;
    thumbnail_url: string;
    duration_seconds: number;
    views: number;
    difficulty: HSKLevel;
    genre: Genre;
    has_subtitles: boolean;
}

// Helper functions for display
export const formatDuration = (seconds: number): string => {
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);
    const remainingMinutes = minutes % 60;

    if (hours > 0) {
        return `${hours}h ${remainingMinutes}m`;
    }
    return `${minutes}m`;
};

export const formatViews = (views: number | null | undefined): string => {
    if (!views && views !== 0) return "—";
    if (views >= 1000000) {
        return `${(views / 1000000).toFixed(1)}M`;
    }
    if (views >= 1000) {
        return `${(views / 1000).toFixed(1)}k`;
    }
    return views.toString();
};

export const getDurationBucketLabel = (bucket: DurationBucket): string => {
    // Backend values are already in the correct format
    return bucket;
};

export const getGenreLabel = (genre: Genre): string => {
    const labels = {
        anime: "Anime",
        gaming: "Gaming",
        vlog: "Vlogs",
        news: "News",
        tech: "Science/Tech",
        comedy: "Comedy",
        education: "Education",
        music: "Music",
        variety: "Variety",
        documentary: "Documentary",
        general: "General",
    };
    return labels[genre];
};

export const getHSKLevelLabel = (level: HSKLevel): string => {
    const labels = {
        1: "HSK 1",
        2: "HSK 2",
        3: "HSK 3",
        4: "HSK 4",
        5: "HSK 5",
        6: "HSK 6",
    };
    return labels[level];
};

// Enhanced metadata utility functions

export type VideoQualityTier = "excellent" | "good" | "fair" | "needs_review";

export interface VideoQualityConfig {
    icon: string;
    color: string;
    label: string;
    bgColor: string;
}

export interface HSKCoverageData {
    hsk1: number;
    hsk2: number;
    hsk3: number;
    hsk4: number;
    hsk5: number;
    hsk6: number;
    unknown: number;
}

/**
 * Determines if content is great for beginners based on HSK level
 * Logic: HSK level 1-2 is considered beginner friendly
 */
export const isGreatForBeginners = (difficulty: CatalogItem['difficulty']): boolean => {
    if (!difficulty.level) return false;
    return difficulty.level <= 2;
};

/**
 * Transforms HSK coverage data for visualization
 * Returns ordered array of coverage data for progress bars
 */
export const getHSKCoverageData = (hskCoverage?: Record<string, number>): HSKCoverageData => {
    const defaultCoverage = {
        hsk1: 0, hsk2: 0, hsk3: 0, hsk4: 0, hsk5: 0, hsk6: 0, unknown: 0
    };

    if (!hskCoverage) return defaultCoverage;

    // Fix: Check for 'hsk1' keys (backend format) AND '1' keys (fallback)
    return {
        hsk1: hskCoverage['hsk1'] || hskCoverage['1'] || 0,
        hsk2: hskCoverage['hsk2'] || hskCoverage['2'] || 0,
        hsk3: hskCoverage['hsk3'] || hskCoverage['3'] || 0,
        hsk4: hskCoverage['hsk4'] || hskCoverage['4'] || 0,
        hsk5: hskCoverage['hsk5'] || hskCoverage['5'] || 0,
        hsk6: hskCoverage['hsk6'] || hskCoverage['6'] || 0,
        unknown: Object.entries(hskCoverage)
            .filter(([key]) => !['hsk1', 'hsk2', 'hsk3', 'hsk4', 'hsk5', 'hsk6', '1', '2', '3', '4', '5', '6'].includes(key))
            .reduce((sum, [, value]) => sum + value, 0)
    };
};

/**
 * Gets HSK coverage percentages for visualization
 * Groups levels into beginner, intermediate, advanced categories
 */
export const getHSKCoverageGroups = (hskCoverage?: Record<string, number>) => {
    const coverage = getHSKCoverageData(hskCoverage);

    return {
        beginner: coverage.hsk1 + coverage.hsk2, // HSK 1-2: Green
        intermediate: coverage.hsk3 + coverage.hsk4, // HSK 3-4: Yellow
        advanced: coverage.hsk5 + coverage.hsk6, // HSK 5-6: Orange
        unknown: coverage.unknown // Unknown: Gray
    };
};

/**
 * Gets color class for HSK level badges and progress bars
 */
export const getHSKColor = (level: number): string => {
    if (level <= 2) return "bg-emerald-500";
    if (level <= 4) return "bg-amber-500";
    return "bg-rose-500";
};

/**
 * Gets text color class for HSK level badges
 */
export const getHSKTextColor = (level: number): string => {
    if (level <= 2) return "text-emerald-700";
    if (level <= 4) return "text-amber-700";
    return "text-rose-700";
};

/**
 * Maps video quality tier to UI configuration
 */
export const getVideoQualityConfig = (tier?: VideoQualityTier): VideoQualityConfig => {
    const configs: Record<VideoQualityTier, VideoQualityConfig> = {
        excellent: {
            icon: "Sparkles",
            color: "text-emerald-500",
            label: "Excellent Quality",
            bgColor: "bg-emerald-50 border-emerald-200"
        },
        good: {
            icon: "CheckCircle2",
            color: "text-blue-500",
            label: "Good Quality",
            bgColor: "bg-blue-50 border-blue-200"
        },
        fair: {
            icon: "MinusCircle",
            color: "text-yellow-500",
            label: "Fair Quality",
            bgColor: "bg-yellow-50 border-yellow-200"
        },
        needs_review: {
            icon: "AlertTriangle",
            color: "text-orange-500",
            label: "Needs Review",
            bgColor: "bg-orange-50 border-orange-200"
        }
    };

    return configs[tier as VideoQualityTier] || {
        icon: "HelpCircle",
        color: "text-muted-foreground",
        label: "Unknown Quality",
        bgColor: "bg-muted border-muted-foreground/20"
    };
};

/**
 * Formats confidence score as percentage
 */
export const formatConfidence = (confidence?: number): string => {
    if (!confidence) return "0%";
    return `${Math.round(confidence * 100)}%`;
};

/**
 * Gets formatted genre labels for display (max 2)
 */
export const getGenreLabels = (genres: Genre[]): string[] => {
    // Fix: Add safety check for undefined/null genres
    if (!genres || !Array.isArray(genres)) return [];
    return genres.slice(0, 2).map(genre => getGenreLabel(genre));
};
