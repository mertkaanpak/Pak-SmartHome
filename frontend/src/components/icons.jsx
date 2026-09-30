// Konsistente SVG-Icons (statt Emojis) — Strichstärke und Stil einheitlich,
// Farbe erbt vom Text (currentColor).
function Icon({ children, size = 22, ...props }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      {...props}
    >
      {children}
    </svg>
  )
}

export const IconBlinds = (props) => (
  <Icon {...props}>
    <rect x="4" y="3" width="16" height="18" rx="2" />
    <line x1="4" y1="7.5" x2="20" y2="7.5" />
    <line x1="4" y1="12" x2="20" y2="12" />
    <line x1="9" y1="16.5" x2="15" y2="16.5" />
  </Icon>
)

export const IconBell = (props) => (
  <Icon {...props}>
    <path d="M18 10a6 6 0 0 0-12 0c0 5-2 6-2 6h16s-2-1-2-6" />
    <path d="M10.3 19a2 2 0 0 0 3.4 0" />
  </Icon>
)

export const IconCamera = (props) => (
  <Icon {...props}>
    <rect x="3" y="7" width="13" height="10" rx="2" />
    <path d="M16 11l5-3v8l-5-3" />
  </Icon>
)

export const IconUp = (props) => (
  <Icon {...props}>
    <polyline points="6 14 12 8 18 14" />
  </Icon>
)

export const IconDown = (props) => (
  <Icon {...props}>
    <polyline points="6 10 12 16 18 10" />
  </Icon>
)

export const IconStop = (props) => (
  <Icon {...props}>
    <rect x="7" y="7" width="10" height="10" rx="1.5" fill="currentColor" stroke="none" />
  </Icon>
)

export const IconDevice = (props) => (
  <Icon {...props}>
    <rect x="5" y="4" width="14" height="16" rx="2" />
    <circle cx="12" cy="15" r="2" />
    <line x1="9" y1="8" x2="15" y2="8" />
  </Icon>
)

export const IconRefresh = (props) => (
  <Icon {...props}>
    <path d="M21 12a9 9 0 1 1-2.6-6.3" />
    <polyline points="21 3 21 9 15 9" />
  </Icon>
)

export const INTEGRATION_ICONS = {
  tuya: IconBlinds,
  ring: IconBell,
  onvif: IconCamera,
}

export const TYPE_ICONS = {
  cover: IconBlinds,
  doorbell: IconBell,
  camera: IconCamera,
  unknown: IconDevice,
}
