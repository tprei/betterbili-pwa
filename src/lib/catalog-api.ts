// API Client for Catalog Backend Communication
// Handles communication with the subtitle-saas catalog search endpoint

import type { CatalogItem, CatalogResponse, CatalogFilters, CatalogStats } from '@/types/catalog';

const API_BASE_URL = import.meta.env.VITE_API_URL; // Use VITE_API_URL instead of VITE_API_BASE_URL

// Determine which base URL to use based on environment
const getEffectiveApiBaseUrl = (): string => {
    // In development, use the local proxy or direct URL
    return API_BASE_URL || 'http://localhost:8080/api/v1';
};

if (!API_BASE_URL) {
    console.warn('VITE_API_URL not configured, using default');
}

interface CatalogSearchParams {
    q?: string;
    genre?: string[];
    difficulty?: number[];
    duration?: string[];
    popularity?: string[];
    creator?: string[];
    sort?: string;
    cursor?: string;
    limit?: number;
}

/**
 * Transform frontend filters to backend API parameters
 */
function transformFiltersToParams(filters: CatalogFilters): CatalogSearchParams {
    const params: CatalogSearchParams = {};

    if (filters.query.trim()) {
        params.q = filters.query.trim();
    }

    if (filters.genres.length > 0) {
        params.genre = filters.genres;
    }

    if (filters.difficulty.length > 0) {
        params.difficulty = filters.difficulty;
    }

    if (filters.duration.length > 0) {
        params.duration = filters.duration;
    }

    if (filters.popularity.length > 0) {
        params.popularity = filters.popularity;
    }

    if (filters.creators.length > 0) {
        params.creator = filters.creators;
    }

    // Map frontend sort options to backend
    const sortMapping: Record<string, string> = {
        'trending': 'trending',
        'new': 'newest',
        'newest': 'newest',           // ADDED
        'views': 'views',             // ADDED
        'popularity': 'views',        // ADDED
        'popularity.desc': 'popularity.desc',
        'duration_asc': 'duration.asc',
        'duration.asc': 'duration.asc',
        'duration_desc': 'duration.desc',
        'duration.desc': 'duration.desc',
    };
    params.sort = sortMapping[filters.sort] || 'trending';

    return params;
}

/**
 * Build query string from parameters
 */
function buildQueryString(params: CatalogSearchParams): string {
    const searchParams = new URLSearchParams();

    Object.entries(params).forEach(([key, value]) => {
        if (value === undefined || value === null) return;

        if (Array.isArray(value)) {
            if (value.length > 0) {
                searchParams.append(key, value.join(','));
            }
        } else {
            searchParams.append(key, String(value));
        }
    });

    return searchParams.toString();
}

/**
 * Catalog API Error
 */
export class CatalogApiError extends Error {
    public status?: number;
    public code?: string;

    constructor(
        message: string,
        status?: number,
        code?: string
    ) {
        super(message);
        this.status = status;
        this.code = code;
        this.name = 'CatalogApiError';
    }
}

/**
 * Catalog API Client
 */
export class CatalogApiClient {
    private baseUrl: string;

    constructor(baseUrl: string = getEffectiveApiBaseUrl()) {
        this.baseUrl = baseUrl;
    }

    /**
     * Search catalog with filters and pagination
     */
    async searchCatalog(
        filters: CatalogFilters,
        cursor?: string,
        limit: number = 24,
        authToken?: string
    ): Promise<CatalogResponse> {
        if (!this.baseUrl) {
            throw new CatalogApiError('API base URL not configured');
        }

        try {
            const params = transformFiltersToParams(filters);
            params.cursor = cursor;
            params.limit = limit;

            const queryString = buildQueryString(params);
            const url = `${this.baseUrl}/catalog/search${queryString ? `?${queryString}` : ''}`;

            console.log('Catalog API request:', url);

            const headers: Record<string, string> = {
                'Content-Type': 'application/json',
            };

            // Add authentication header if token is provided
            if (authToken) {
                headers['Authorization'] = `Bearer ${authToken}`;
            }

            const response = await fetch(url, {
                method: 'GET',
                headers,
            });

            if (!response.ok) {
                const errorText = await response.text();
                console.error('Catalog API error response:', {
                    status: response.status,
                    statusText: response.statusText,
                    body: errorText
                });
                throw new CatalogApiError(
                    `Catalog API error: ${response.status} ${response.statusText} - ${errorText}`,
                    response.status,
                    response.status.toString()
                );
            }

            const data = await response.json();

            console.log('Catalog API response:', data);

            // Transform response to match frontend types
            return this.transformResponse(data);
        } catch (error) {
            if (error instanceof CatalogApiError) {
                throw error;
            }

            console.error('Catalog API request failed:', error);

            // Fallback to mock data if API fails (for demo purposes)
            console.warn('Falling back to mock data');
            return this.getMockData();
        }
    }

    /**
     * Fetch lightweight catalog stats for landing page badges
     */
    async fetchCatalogStats(): Promise<CatalogStats> {
        if (!this.baseUrl) {
            throw new CatalogApiError('API base URL not configured');
        }

        try {
            const response = await fetch(`${this.baseUrl}/catalog/stats`, {
                method: 'GET',
                headers: {
                    'Accept': 'application/json',
                },
            });

            if (!response.ok) {
                const errorBody = await response.text();
                throw new CatalogApiError(
                    `Catalog stats error: ${response.status} ${response.statusText} - ${errorBody}`,
                    response.status,
                    response.status.toString()
                );
            }

            const data = await response.json();
            if (typeof data?.total_videos !== 'number') {
                throw new CatalogApiError('Catalog stats response missing total_videos');
            }

            return { total_videos: data.total_videos };
        } catch (error) {
            if (error instanceof CatalogApiError) {
                throw error;
            }

            console.error('Catalog stats fetch failed:', error);
            throw new CatalogApiError(
                `Failed to fetch catalog stats: ${error instanceof Error ? error.message : 'Unknown error'}`
            );
        }
    }

    /**
     * Transform backend response to frontend format
     */
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    private transformResponse(data: any): CatalogResponse {
        // Transform items to match frontend CatalogItem interface
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const items: CatalogItem[] = (data.items || []).map((item: any) => ({
            video_hash: item.video_hash,
            title: item.title,
            title_en: item.title_en,
            channel: item.channel,
            thumbnail_url: item.thumbnail_url,
            duration_seconds: item.duration_seconds,
            duration_bucket: item.duration_bucket,
            popularity: {
                views: item.popularity?.views,
                likes: item.popularity?.likes,
                trending_score: item.popularity?.trending_score,
            },
            difficulty: {
                score: item.difficulty?.score,
                level: item.difficulty?.level && [1, 2, 3, 4, 5, 6].includes(item.difficulty.level) ? item.difficulty.level : undefined,
                hsk_coverage: item.difficulty?.hsk_coverage,
                speech_rate_cps: item.difficulty?.speech_rate_cps,
            },
            subtitle_quality: {
                tier: item.subtitle_quality?.tier,
                confidence_mean: item.subtitle_quality?.confidence_mean,
                confidence_median: item.subtitle_quality?.confidence_median,
                has_pinyin: item.subtitle_quality?.has_pinyin ?? true,
                has_english: item.subtitle_quality?.has_english ?? true,
                rubric_version: item.subtitle_quality?.rubric_version,
            },
            genres: Array.isArray(item.genres) ? item.genres : [],
            video_url: item.video_url,
            locked: Boolean(item.locked),
        }));

        // Transform facets
        const facets = {
            genres: data.facets?.genres || [],
            difficulty: data.facets?.difficulty || [],
            duration: data.facets?.duration || [],
            popularity: data.facets?.popularity || [],
            creators: data.facets?.creators || [],
        };

        return {
            items,
            facets,
            cursor: data.cursor,
            visible_limit: data.visible_limit || 5,
            locked: Boolean(data.locked),
            total_matches: data.total_matches,
        };
    }

    /**
     * Check if API is available
     */
    async healthCheck(): Promise<boolean> {
        if (!this.baseUrl) return false;

        try {
            const response = await fetch(`${this.baseUrl}/health`, {
                method: 'GET',
            });
            return response.ok;
        } catch {
            return false;
        }
    }

    private getMockData(): CatalogResponse {
        return {
            items: [
                {
                    video_hash: "BV1b5411h7g7",
                    title: "【罗翔】我们为什么要读书？",
                    title_en: "Why do we read books?",
                    channel: "罗翔说刑法",
                    thumbnail_url: "http://i2.hdslb.com/bfs/archive/e0d6872652136203110034415842841575385615.jpg",
                    duration_seconds: 650,
                    duration_bucket: "10-30m",
                    popularity: { views: 1200000, likes: 85000 },
                    difficulty: { level: 4 },
                    subtitle_quality: { tier: "excellent", has_pinyin: true, has_english: true },
                    genres: ["education"],
                    video_url: "https://www.bilibili.com/video/BV1b5411h7g7",
                    locked: false
                },
                {
                    video_hash: "BV1xx411c7mD",
                    title: "【何同学】我做了一个自己打字的键盘...",
                    title_en: "I made a self-typing keyboard...",
                    channel: "老师好我叫何同学",
                    thumbnail_url: "http://i1.hdslb.com/bfs/archive/8844c97059714736636776104467576566415516.jpg",
                    duration_seconds: 480,
                    duration_bucket: "3-10m",
                    popularity: { views: 5000000, likes: 400000 },
                    difficulty: { level: 3 },
                    subtitle_quality: { tier: "good", has_pinyin: true, has_english: true },
                    genres: ["tech"],
                    video_url: "https://www.bilibili.com/video/BV1xx411c7mD",
                    locked: false
                },
                {
                    video_hash: "BV1GJ411x7h7",
                    title: "【李子柒】萝卜的一生",
                    title_en: "The life of a radish",
                    channel: "李子柒",
                    thumbnail_url: "http://i0.hdslb.com/bfs/archive/0146437156156516516516516516516516516516.jpg",
                    duration_seconds: 1200,
                    duration_bucket: "10-30m",
                    popularity: { views: 8000000, likes: 600000 },
                    difficulty: { level: 2 },
                    subtitle_quality: { tier: "excellent", has_pinyin: true, has_english: true },
                    genres: ["vlog"],
                    video_url: "https://www.bilibili.com/video/BV1GJ411x7h7",
                    locked: false
                }
            ],
            facets: {
                genres: [],
                difficulty: [],
                duration: [],
                popularity: [],
                creators: []
            },
            visible_limit: 24,
            locked: false,
            total_matches: 3
        };
    }
}

// Export singleton instance
export const catalogApi = new CatalogApiClient();

// Export convenience function
export const searchCatalog = (
    filters: CatalogFilters,
    cursor?: string,
    limit?: number,
    authToken?: string
) => catalogApi.searchCatalog(filters, cursor, limit, authToken);

export const fetchCatalogStats = () => catalogApi.fetchCatalogStats();
