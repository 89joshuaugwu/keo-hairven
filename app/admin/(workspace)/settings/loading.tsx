export default function Loading() {
  return (
    <main className="admin-settings-content" aria-busy="true">
      <div className="admin-settings-skeleton admin-settings-skeleton-head" />
      <div className="admin-settings-grid">
        <div className="admin-settings-skeleton admin-settings-skeleton-form" />
        <div className="admin-settings-skeleton admin-settings-skeleton-preview" />
      </div>
    </main>
  );
}
