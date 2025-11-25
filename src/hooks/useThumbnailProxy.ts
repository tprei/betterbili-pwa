import { useMemo } from "react";

interface UseThumbnailProxyOptions {
    originalUrl: string;
    fallbackUrl?: string;
}

interface UseThumbnailProxyResult {
    proxyUrl: string | null;
    isLoading: boolean;
    error: string | null;
    retry: () => void;
}

export const useThumbnailProxy = ({
    originalUrl,
}: UseThumbnailProxyOptions): UseThumbnailProxyResult => {
    // Just compute the URL – no network call needed
    const proxyUrl = useMemo(() => {
        if (!originalUrl) return null;
        // For PWA, we might need to point to the full backend URL if running locally
        // But for now let's assume relative path works if proxy is set up in Vite
        // OR use the full URL if we know the backend address
        // We need to strip /api/v1 from backendUrl if the proxy endpoint is at root or elsewhere
        // Actually, let's just use the original URL for now if we don't have a proxy
        // Or better, use a placeholder if it's http (mixed content)

        if (originalUrl.startsWith('http:')) {
            return originalUrl.replace('http:', 'https:');
        }
        return originalUrl;
    }, [originalUrl]);

    const retry = () => { };

    return {
        proxyUrl,
        isLoading: false,
        error: null,
        retry,
    };
};
