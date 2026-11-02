export function AdminCollectionSkeleton({ page }: { page: "categories" | "trash" }) {
    const categories = page === "categories";
    return (
        <div className="admin-overview-content admin-collection-skeleton" aria-busy="true" aria-label={`Loading ${page}`}>
            <p className="admin-loading-status" role="status">Loading {page}?</p>
            <div className="admin-overview-skeleton-title" />
            <div className="admin-overview-skeleton-notice" />
            {Array.from({ length: categories ? 2 : 1 }, (_, panel) => (
                <div className="admin-collection-skeleton-panel" key={panel}>
                    {categories && <div className="admin-collection-skeleton-bar admin-overview-skeleton-notice" />}
                    {[0, 1, 2].map(row => (
                        <div className="admin-collection-skeleton-row" key={row}>
                            <div className="admin-overview-skeleton-notice" />
                            <div className="admin-overview-skeleton-notice" />
                        </div>
                    ))}
                </div>
            ))}
        </div>
    );
}
