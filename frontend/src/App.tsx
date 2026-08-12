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
          </Route>
        </Route>
      </Routes>
      <Toaster />
    </>
  )
}

export default App
