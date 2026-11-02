export default function Loading() {
  return (
    <main className="admin-content-content" aria-busy="true">
      <div className="admin-content-head"><div><div className="eyebrow">KEO HAIRVEN</div><h1>Make the website yours</h1></div></div>
      <div className="admin-content-grid">
        <div className="admin-content-left">
          <div className="admin-content-loading-card" />
          <div className="admin-content-loading-card is-tall" />
        </div>
        <div className="admin-content-right"><div className="admin-content-loading-card is-media" /></div>
      </div>
    </main>
  );
}
