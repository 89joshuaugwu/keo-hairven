export default function Loading() {
  return <main className="admin-gallery-content" aria-busy="true"><div className="admin-gallery-head"><div><div className="eyebrow">KEO HAIRVEN</div><h1>Share your beautiful work</h1></div></div><div className="admin-gallery-loading-grid">{[0,1,2].map((item) => <div className="admin-gallery-loading-card" key={item}><div /><span /><span /><span /></div>)}</div></main>;
}
