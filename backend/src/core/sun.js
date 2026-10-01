// Sonnenauf-/-untergang nach dem vereinfachten NOAA-Verfahren
// (wie es auch verbreitete Bibliotheken à la suncalc verwenden).
// Genauigkeit wenige Minuten — für Rollladen-Automationen völlig ausreichend.
const RAD = Math.PI / 180
const DAY_MS = 86_400_000
const J1970 = 2440588
const J2000 = 2451545

const toJulian = (date) => date.valueOf() / DAY_MS - 0.5 + J1970
const fromJulian = (j) => new Date((j + 0.5 - J1970) * DAY_MS)

// Liefert { sunrise, sunset } als Date für den Kalendertag von `date`,
// oder null bei Polartag/-nacht (in Deutschland nie).
export function sunTimes(date, lat, lon) {
  const d = toJulian(date) - J2000
  const lw = -lon * RAD
  const phi = lat * RAD

  const n = Math.round(d - 0.0009 - lw / (2 * Math.PI))
  const ds = 0.0009 + lw / (2 * Math.PI) + n
  const M = (357.5291 + 0.98560028 * ds) * RAD
  const C = (1.9148 * Math.sin(M) + 0.02 * Math.sin(2 * M) + 0.0003 * Math.sin(3 * M)) * RAD
  const L = M + C + 102.9372 * RAD + Math.PI
  const Jnoon = J2000 + ds + 0.0053 * Math.sin(M) - 0.0069 * Math.sin(2 * L)
  const dec = Math.asin(Math.sin(L) * Math.sin(23.4397 * RAD))

  // -0.833°: Horizont inkl. Refraktion und Sonnenscheibe
  const h = -0.833 * RAD
  const cosH = (Math.sin(h) - Math.sin(phi) * Math.sin(dec)) / (Math.cos(phi) * Math.cos(dec))
  if (cosH < -1 || cosH > 1) return null

  const w = Math.acos(cosH)
  return {
    sunrise: fromJulian(Jnoon - w / (2 * Math.PI)),
    sunset: fromJulian(Jnoon + w / (2 * Math.PI)),
  }
}
