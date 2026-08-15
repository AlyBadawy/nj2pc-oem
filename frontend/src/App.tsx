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
import { IncidentOperators } from '@/pages/IncidentOperators'
import { IncidentGear } from '@/pages/IncidentGear'
import { IncidentMessageLogs } from '@/pages/IncidentMessageLogs'
import { IncidentCommsPlan } from '@/pages/IncidentCommsPlan'
import { IncidentMesh } from '@/pages/IncidentMesh'
import { DeployGear } from '@/pages/DeployGear'
import { MeshScan } from '@/pages/MeshScan'
import { MeshSessionDetail } from '@/pages/MeshSessionDetail'
import { Resources } from '@/pages/Resources'
import { AllResources } from '@/pages/AllResources'
import { ResourceCreate } from '@/pages/ResourceCreate'
import { ResourceView } from '@/pages/ResourceView'
import { ResourceEdit } from '@/pages/ResourceEdit'
import { ResourceTypes } from '@/pages/ResourceTypes'
import { OperatorRoles } from '@/pages/OperatorRoles'
import { Vehicles } from '@/pages/Vehicles'
import { AllVehicles } from '@/pages/AllVehicles'
import { VehicleCreate } from '@/pages/VehicleCreate'
import { VehicleEdit } from '@/pages/VehicleEdit'
import { AuditLog } from '@/pages/AuditLog'
import { CommsPlans } from '@/pages/CommsPlans'
import { CommsPlanCreate } from '@/pages/CommsPlanCreate'
import { CommsPlanDetail } from '@/pages/CommsPlanDetail'
import { Settings } from '@/pages/Settings'
import { PermissionDetails } from '@/pages/PermissionDetails'

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
            <Route path="incidents/:id/operators" element={<IncidentOperators />} />
            <Route path="incidents/:id/gear" element={<IncidentGear />} />
            <Route path="incidents/:id/logs" element={<IncidentMessageLogs />} />
            <Route path="incidents/:id/comms-plan" element={<IncidentCommsPlan />} />
            <Route path="incidents/:id/mesh" element={<IncidentMesh />} />
            <Route path="incidents/:id/deploy" element={<DeployGear />} />
            <Route path="incidents/:id/mesh/scan" element={<MeshScan />} />
            <Route path="incidents/:id/mesh/:sessionId" element={<MeshSessionDetail />} />
            <Route path="resources" element={<Resources />} />
            <Route path="all-resources" element={<AllResources />} />
            <Route path="resources/new" element={<ResourceCreate />} />
            <Route path="all-resources/new" element={<ResourceCreate forOthers />} />
            <Route path="resources/:id" element={<ResourceView />} />
            <Route path="resources/:id/edit" element={<ResourceEdit />} />
            <Route path="resource-types" element={<ResourceTypes />} />
            <Route path="operator-roles" element={<OperatorRoles />} />
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
            <Route path="permission-details" element={<PermissionDetails />} />
          </Route>
        </Route>
      </Routes>
      <Toaster />
    </>
  )
}

export default App
