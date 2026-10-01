import { Route, Routes } from 'react-router-dom'
import { BottomNav } from './components/BottomNav.jsx'
import { DevicesProvider } from './state/DevicesContext.jsx'
import { useAuth } from './state/AuthContext.jsx'
import { AuthView } from './views/AuthView.jsx'
import { HomeView } from './views/HomeView.jsx'
import { RoomsView } from './views/RoomsView.jsx'
import { CamerasView } from './views/CamerasView.jsx'
import { ScenesView } from './views/ScenesView.jsx'
import { EventsView } from './views/EventsView.jsx'
import { AutomationsView } from './views/AutomationsView.jsx'
import { MoreView } from './views/MoreView.jsx'

export default function App() {
  const { state } = useAuth()

  // Beim Start kurz gar nichts rendern statt eines aufblitzenden Logins
  if (state === 'loading') return null

  if (state !== 'authed') return <AuthView />

  return (
    <DevicesProvider>
      <div className="shell">
        <Routes>
          <Route path="/" element={<HomeView />} />
          <Route path="/raeume" element={<RoomsView />} />
          <Route path="/kameras" element={<CamerasView />} />
          <Route path="/szenen" element={<ScenesView />} />
          <Route path="/ereignisse" element={<EventsView />} />
          <Route path="/automationen" element={<AutomationsView />} />
          <Route path="/mehr" element={<MoreView />} />
          <Route path="*" element={<HomeView />} />
        </Routes>
        <BottomNav />
      </div>
    </DevicesProvider>
  )
}
