export default function Loading() {
  return (
    <main className="admin-media-content" aria-busy="true">
      <div className="admin-media-head"><div><div className="eyebrow">KEO HAIRVEN</div><h1>Your photo &amp; video library</h1></div></div>
      <div className="admin-media-loading-toolbar" />
      <div className="admin-media-grid">
        {[0,1,2,3,4,5].map((item) => <div className="admin-media-loading-card" key={item}><div /><span /><span /></div>)}
      </div>
    </main>
  );
}
