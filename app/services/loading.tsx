export default function Loading() {
  return (
    <main className="section service-list-section" aria-busy="true">
      <div className="service-loading-breadcrumb" style={{ marginBottom: 24, width: 120 }} />
      <div className="service-list">
        {[0, 1].map((item) => (
          <div className="service-row" key={item}>
            <div className="service-detail-loading-media" style={{ height: 520 }} />
            <div className="service-detail-loading-copy" style={{ paddingTop: 10 }}>
              <div style={{ width: '22%' }} />
              <div style={{ width: '72%' }} />
              <div style={{ width: '88%', height: 14, borderRadius: 999 }} />
              <div style={{ width: '26%', height: 34, borderRadius: 5 }} />
              <div style={{ width: '48%', height: 50, borderRadius: 8 }} />
            </div>
          </div>
        ))}
      </div>
    </main>
  );
}
