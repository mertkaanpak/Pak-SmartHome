import { Route, Routes } from 'react-router-dom'
import { BottomNav } from './components/BottomNav.jsx'
import { HomeView } from './views/HomeView.jsx'
import { RoomsView } from './views/RoomsView.jsx'
import { CamerasView } from './views/CamerasView.jsx'
import { ScenesView } from './views/ScenesView.jsx'
import { MoreView } from './views/MoreView.jsx'

export default function App() {
  return (
    <div className="shell">
      <Routes>
        <Route path="/" element={<HomeView />} />
        <Route path="/raeume" element={<RoomsView />} />
        <Route path="/kameras" element={<CamerasView />} />
        <Route path="/szenen" element={<ScenesView />} />
        <Route path="/mehr" element={<MoreView />} />
        <Route path="*" element={<HomeView />} />
      </Routes>
      <BottomNav />
    </div>
  )
}
