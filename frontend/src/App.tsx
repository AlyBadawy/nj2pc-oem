import { Routes, Route } from 'react-router-dom'
import { Toaster } from '@/components/ui/sonner'
import { AppLayout } from '@/components/AppLayout'
import { ProtectedRoute } from '@/routes/ProtectedRoute'
import { Login } from '@/pages/Login'
import { AccountSettings } from '@/pages/AccountSettings'
import { Operators } from '@/pages/Operators'
import { Incidents } from '@/pages/Incidents'
import { IncidentCreate } from '@/pages/IncidentCreate'
import { IncidentDetail } from '@/pages/IncidentDetail'
import { Resources } from '@/pages/Resources'
import { CommsPlans } from '@/pages/CommsPlans'
import { CommsPlanDetail } from '@/pages/CommsPlanDetail'
import { Roles } from '@/pages/Roles'

function App() {
  return (
    <>
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route element={<ProtectedRoute />}>
          <Route element={<AppLayout />}>
            <Route index element={<AccountSettings />} />
            <Route path="operators" element={<Operators />} />
            <Route path="incidents" element={<Incidents />} />
            <Route path="incidents/new" element={<IncidentCreate />} />
            <Route path="incidents/:id" element={<IncidentDetail />} />
            <Route path="resources" element={<Resources />} />
            <Route path="comms-plans" element={<CommsPlans />} />
            <Route path="comms-plans/:id" element={<CommsPlanDetail />} />
            <Route path="roles" element={<Roles />} />
          </Route>
        </Route>
      </Routes>
      <Toaster />
    </>
  )
}

export default App
