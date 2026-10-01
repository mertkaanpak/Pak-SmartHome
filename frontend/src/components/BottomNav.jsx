import { NavLink } from 'react-router-dom'
import { IconCamera, IconHome, IconMore, IconRooms, IconScenes } from './icons.jsx'

const ITEMS = [
  { to: '/', label: 'Home', icon: IconHome, end: true },
  { to: '/raeume', label: 'Räume', icon: IconRooms },
  { to: '/kameras', label: 'Kameras', icon: IconCamera },
  { to: '/szenen', label: 'Szenen', icon: IconScenes },
  { to: '/mehr', label: 'Mehr', icon: IconMore },
]

// Mobile Bottom-Navigation; ab 900px wird sie per CSS zur Seitenleiste.
export function BottomNav() {
  return (
    <nav className="bottom-nav" aria-label="Hauptnavigation">
      {ITEMS.map(({ to, label, icon: ItemIcon, end }) => (
        <NavLink
          key={to}
          to={to}
          end={end}
          className={({ isActive }) => (isActive ? 'active' : undefined)}
        >
          <ItemIcon size={21} />
          {label}
        </NavLink>
      ))}
    </nav>
  )
}
