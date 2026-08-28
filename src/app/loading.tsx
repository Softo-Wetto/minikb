export default function Loading() {
  return (
    <div role="status" aria-live="polite" aria-label="Loading page" className="space-y-4">
      <div className="surface-panel h-24 motion-safe:animate-pulse" />
      <div className="grid gap-4 lg:grid-cols-3">
        <div className="surface-card h-32 motion-safe:animate-pulse" />
        <div className="surface-card h-32 motion-safe:animate-pulse" />
        <div className="surface-card h-32 motion-safe:animate-pulse" />
      </div>
      <div className="surface-card h-72 motion-safe:animate-pulse" />
      <span className="sr-only">Loading page...</span>
    </div>
  );
}