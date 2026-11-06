import { lazy, Suspense } from 'react'
import { BrowserRouter, Route, Routes } from 'react-router-dom'
import { AuthProvider } from './lib/auth'
import { firebaseConfigured } from './lib/firebase'
import { SetupMissing } from './components/SetupMissing'
import PhonePage from './pages/phone/PhonePage'

const ScreenPage = lazy(() => import('./pages/screen/ScreenPage'))
const GobboPage = lazy(() => import('./pages/gobbo/GobboPage'))
const Preview = import.meta.env.DEV ? lazy(() => import('./pages/Preview')) : null
const AdminPage = lazy(() => import('./pages/admin/AdminPage'))

const Loading = () => <div className="min-h-full bg-stage grid place-items-center text-white/60">Caricamento…</div>

export default function App() {
  if (!firebaseConfigured) return <SetupMissing />
  return (
    <AuthProvider>
      <BrowserRouter>
        <Suspense fallback={<Loading />}>
          <Routes>
            <Route path="/" element={<PhonePage />} />
            <Route path="/schermo" element={<ScreenPage />} />
            {Preview && <Route path="/__preview/:name" element={<Preview />} />}
            <Route path="/gobbo" element={<GobboPage />} />
            <Route path="/admin" element={<AdminPage />} />
            <Route path="*" element={<PhonePage />} />
          </Routes>
        </Suspense>
      </BrowserRouter>
    </AuthProvider>
  )
}
