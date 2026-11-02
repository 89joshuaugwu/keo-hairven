export default function Loading() {
  return (
    <main className="admin-products-content" aria-busy="true">
      <div className="admin-overview-skeleton-title" />
      <div className="admin-overview-skeleton-notice" />
      <div className="admin-products-panel">
        {[0,1,2].map((item) => <div className="admin-product-row" key={item}><div className="admin-product-thumb" /><div className="admin-product-main"><b>Loading product…</b></div></div>)}
      </div>
    </main>
  );
}
