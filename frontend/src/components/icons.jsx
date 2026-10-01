// Konsistente SVG-Icons — einheitliche Strichstärke, Farbe erbt vom Text.
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

export const IconHome = (props) => (
  <Icon {...props}>
    <path d="M4 10.5 12 4l8 6.5" />
    <path d="M6 9.5V20h12V9.5" />
  </Icon>
)

export const IconRooms = (props) => (
  <Icon {...props}>
    <rect x="4" y="4" width="7" height="7" rx="1.5" />
    <rect x="13" y="4" width="7" height="7" rx="1.5" />
    <rect x="4" y="13" width="7" height="7" rx="1.5" />
    <rect x="13" y="13" width="7" height="7" rx="1.5" />
  </Icon>
)

export const IconCamera = (props) => (
  <Icon {...props}>
    <rect x="3" y="7" width="13" height="10" rx="2" />
    <path d="M16 11l5-3v8l-5-3" />
  </Icon>
)

export const IconScenes = (props) => (
  <Icon {...props}>
    <path d="M12 3v3M12 18v3M3 12h3M18 12h3M5.6 5.6l2.1 2.1M16.3 16.3l2.1 2.1M18.4 5.6l-2.1 2.1M7.7 16.3l-2.1 2.1" />
  </Icon>
)

export const IconMore = (props) => (
  <Icon {...props}>
    <circle cx="5" cy="12" r="1.3" fill="currentColor" stroke="none" />
    <circle cx="12" cy="12" r="1.3" fill="currentColor" stroke="none" />
    <circle cx="19" cy="12" r="1.3" fill="currentColor" stroke="none" />
  </Icon>
)

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

export const IconDevice = (props) => (
  <Icon {...props}>
    <rect x="5" y="4" width="14" height="16" rx="2" />
    <circle cx="12" cy="15" r="2" />
    <line x1="9" y1="8" x2="15" y2="8" />
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
    <rect x="7.5" y="7.5" width="9" height="9" rx="1.5" fill="currentColor" stroke="none" />
  </Icon>
)

export const IconStar = ({ filled, ...props }) => (
  <Icon {...props} fill={filled ? 'currentColor' : 'none'}>
    <path d="M12 3.6l2.5 5.1 5.6.8-4 4 1 5.6-5.1-2.7-5.1 2.7 1-5.6-4-4 5.6-.8z" />
  </Icon>
)

export const IconClose = (props) => (
  <Icon {...props}>
    <path d="M6 6l12 12M18 6L6 18" />
  </Icon>
)

export const IconChevronRight = (props) => (
  <Icon {...props}>
    <polyline points="9 6 15 12 9 18" />
  </Icon>
)

export const IconRefresh = (props) => (
  <Icon {...props}>
    <path d="M21 12a9 9 0 1 1-2.6-6.3" />
    <polyline points="21 3 21 9 15 9" />
  </Icon>
)

export const IconAlert = (props) => (
  <Icon {...props}>
    <path d="M12 4 2.8 19.5h18.4z" />
    <line x1="12" y1="10" x2="12" y2="14" />
    <circle cx="12" cy="17" r="0.4" fill="currentColor" stroke="none" />
  </Icon>
)

export const IconMoon = (props) => (
  <Icon {...props}>
    <path d="M20 13.5A8 8 0 0 1 10.5 4 8 8 0 1 0 20 13.5z" />
  </Icon>
)

export const IconSun = (props) => (
  <Icon {...props}>
    <circle cx="12" cy="12" r="4" />
    <path d="M12 2.5v2M12 19.5v2M2.5 12h2M19.5 12h2M5 5l1.4 1.4M17.6 17.6 19 19M19 5l-1.4 1.4M6.4 17.6 5 19" />
  </Icon>
)

export const IconLeave = (props) => (
  <Icon {...props}>
    <path d="M13 4H6a1.5 1.5 0 0 0-1.5 1.5v13A1.5 1.5 0 0 0 6 20h7" />
    <path d="M16 8.5 19.5 12 16 15.5" />
    <line x1="9.5" y1="12" x2="19.5" y2="12" />
  </Icon>
)

export const IconEdit = (props) => (
  <Icon {...props}>
    <path d="M14.5 5.5 18.5 9.5 8.5 19.5H4.5v-4z" />
    <path d="M12.5 7.5l4 4" />
  </Icon>
)

export const IconCheck = (props) => (
  <Icon {...props}>
    <polyline points="5 12.5 10 17.5 19 7" />
  </Icon>
)

export const IconTrash = (props) => (
  <Icon {...props}>
    <path d="M5 7h14M10 7V5h4v2M7 7l1 13h8l1-13" />
  </Icon>
)

export const IconClock = (props) => (
  <Icon {...props}>
    <circle cx="12" cy="12" r="8.5" />
    <polyline points="12 7.5 12 12 15 14" />
  </Icon>
)

export const IconBolt = (props) => (
  <Icon {...props}>
    <path d="M13 3 5.5 13.5h4.5L11 21l7.5-10.5H14z" />
  </Icon>
)

export const SCENE_ICONS = {
  scene: IconScenes,
  moon: IconMoon,
  sun: IconSun,
  leave: IconLeave,
}

export const TYPE_ICONS = {
  cover: IconBlinds,
  doorbell: IconBell,
  camera: IconCamera,
  unknown: IconDevice,
}

export const INTEGRATION_ICONS = {
  tuya: IconBlinds,
  ring: IconBell,
  onvif: IconCamera,
}
