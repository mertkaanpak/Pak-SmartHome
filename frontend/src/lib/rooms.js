// Geräte nach Raum gruppieren; Geräte ohne Raum zuletzt.
export function groupByRoom(devices) {
  const groups = new Map()
  for (const device of devices) {
    const key = device.room ?? ''
    if (!groups.has(key)) groups.set(key, [])
    groups.get(key).push(device)
  }
  return [...groups.entries()]
    .map(([room, list]) => ({ room: room || null, devices: list }))
    .sort((a, b) => (a.room ?? '￿').localeCompare(b.room ?? '￿', 'de'))
}
