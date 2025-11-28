import type { CatalogItem } from "@/types/catalog";
import { CatalogCard } from "./CatalogCard";

interface CatalogGridProps {
    items: CatalogItem[];
    isAuthenticated: boolean;
    onLockedItemClick?: () => void;
}

export const CatalogGrid = ({ items, isAuthenticated, onLockedItemClick }: CatalogGridProps) => {
    return (
        <div className="grid grid-cols-1 landscape:grid-cols-2 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 sm:gap-6">
            {items.map((item) => (
                <CatalogCard
                    key={item.video_hash}
                    item={item}
                    isAuthenticated={isAuthenticated}
                    onLockedItemClick={onLockedItemClick}
                />
            ))}
        </div>
    );
};
