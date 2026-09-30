const LEVELS = { debug: 10, info: 20, warn: 30, error: 40 }
const threshold = LEVELS[process.env.LOG_LEVEL ?? 'info'] ?? LEVELS.info

function write(level, scope, message, extra) {
  if (LEVELS[level] < threshold) return
  const line = JSON.stringify({
    time: new Date().toISOString(),
    level,
    scope,
    message,
    ...extra,
  })
  if (level === 'warn' || level === 'error') process.stderr.write(line + '\n')
  else process.stdout.write(line + '\n')
}

// Strukturiertes Logging als JSON-Zeilen (eine pro Ereignis), pro Bereich
// ein eigener Scope (server, devices, tuya, …). LOG_LEVEL steuert die Menge.
export function createLogger(scope) {
  return {
    debug: (message, extra) => write('debug', scope, message, extra),
    info: (message, extra) => write('info', scope, message, extra),
    warn: (message, extra) => write('warn', scope, message, extra),
    error: (message, extra) => write('error', scope, message, extra),
  }
}
