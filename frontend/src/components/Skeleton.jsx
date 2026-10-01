// Strukturtreuer Ladezustand: gleiche Kartenmaße wie das echte Dashboard,
// damit beim Laden nichts springt.
export function DeviceListSkeleton({ count = 4 }) {
  return (
    <div className="card-list" aria-hidden="true">
      {Array.from({ length: count }, (_, i) => (
        <div key={i} className="skeleton" style={{ height: 118, '--i': i }} />
      ))}
    </div>
  )
}
