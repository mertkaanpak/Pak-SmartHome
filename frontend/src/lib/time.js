// Zeit-Formatierung für die Timeline (deutsch, ohne Bibliothek).
const dayFormat = new Intl.DateTimeFormat('de-DE', {
  weekday: 'long',
  day: 'numeric',
  month: 'long',
})
const timeFormat = new Intl.DateTimeFormat('de-DE', { hour: '2-digit', minute: '2-digit' })

export function formatTime(timestamp) {
  return timeFormat.format(new Date(timestamp))
}

export function dayLabel(timestamp) {
  const date = new Date(timestamp)
  const today = new Date()
  const yesterday = new Date(today)
  yesterday.setDate(today.getDate() - 1)
  const sameDay = (a, b) =>
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  if (sameDay(date, today)) return 'Heute'
  if (sameDay(date, yesterday)) return 'Gestern'
  return dayFormat.format(date)
}

// Ereignisse nach Tagen gruppieren (Eingabe: neueste zuerst)
export function groupByDay(events) {
  const groups = []
  for (const event of events) {
    const label = dayLabel(event.time)
    const last = groups[groups.length - 1]
    if (last && last.label === label) last.events.push(event)
    else groups.push({ label, events: [event] })
  }
  return groups
}
