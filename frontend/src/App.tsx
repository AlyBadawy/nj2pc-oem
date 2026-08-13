import { Routes, Route } from 'react-router-dom'
import { Toaster } from '@/components/ui/sonner'
import { AppLayout } from '@/components/AppLayout'
import { ProtectedRoute } from '@/routes/ProtectedRoute'
import { Login } from '@/pages/Login'
import { AccountSettings } from '@/pages/AccountSettings'
import { Operators } from '@/pages/Operators'
import { OperatorCreate } from '@/pages/OperatorCreate'
import { OperatorView } from '@/pages/OperatorView'
import { OperatorEdit } from '@/pages/OperatorEdit'
import { Incidents } from '@/pages/Incidents'
import { IncidentCreate } from '@/pages/IncidentCreate'
import { IncidentDetail } from '@/pages/IncidentDetail'
import { IncidentEdit } from '@/pages/IncidentEdit'
import { Resources } from '@/pages/Resources'
import { AllResources } from '@/pages/AllResources'
import { ResourceCreate } from '@/pages/ResourceCreate'
import { ResourceEdit } from '@/pages/ResourceEdit'
import { ResourceTypes } from '@/pages/ResourceTypes'
import { Vehicles } from '@/pages/Vehicles'
import { AllVehicles } from '@/pages/AllVehicles'
import { VehicleCreate } from '@/pages/VehicleCreate'
import { VehicleEdit } from '@/pages/VehicleEdit'
import { AuditLog } from '@/pages/AuditLog'
import { CommsPlans } from '@/pages/CommsPlans'
import { CommsPlanCreate } from '@/pages/CommsPlanCreate'
import { CommsPlanDetail } from '@/pages/CommsPlanDetail'
import { Settings } from '@/pages/Settings'

function App() {
  return (
    <>
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route element={<ProtectedRoute />}>
          <Route element={<AppLayout />}>
            <Route index element={<AccountSettings />} />
            <Route path="operators" element={<Operators />} />
            <Route path="operators/new" element={<OperatorCreate />} />
            <Route path="operators/:id" element={<OperatorView />} />
            <Route path="operators/:id/edit" element={<OperatorEdit />} />
            <Route path="incidents" element={<Incidents />} />
            <Route path="incidents/new" element={<IncidentCreate />} />
            <Route path="incidents/:id" element={<IncidentDetail />} />
            <Route path="incidents/:id/edit" element={<IncidentEdit />} />
            <Route path="resources" element={<Resources />} />
            <Route path="all-resources" element={<AllResources />} />
            <Route path="resources/new" element={<ResourceCreate />} />
            <Route path="all-resources/new" element={<ResourceCreate forOthers />} />
            <Route path="resources/:id/edit" element={<ResourceEdit />} />
            <Route path="resource-types" element={<ResourceTypes />} />
            <Route path="vehicles" element={<Vehicles />} />
            <Route path="all-vehicles" element={<AllVehicles />} />
            <Route path="vehicles/new" element={<VehicleCreate />} />
            <Route path="all-vehicles/new" element={<VehicleCreate forOthers />} />
            <Route path="vehicles/:operatorId/:id/edit" element={<VehicleEdit />} />
            <Route path="audit-log" element={<AuditLog />} />
            <Route path="comms-plans" element={<CommsPlans />} />
            <Route path="comms-plans/new" element={<CommsPlanCreate />} />
            <Route path="comms-plans/:id" element={<CommsPlanDetail />} />
            <Route path="settings" element={<Settings />} />
          </Route>
        </Route>
      </Routes>
      <Toaster />
    </>
  )
}

export default App
