import { NavLink, Outlet } from 'react-router-dom'
import {
  Radio,
  LayoutDashboard,
  Users,
  Siren,
  Boxes,
  RadioTower,
  ShieldCheck,
  LogOut,
} from 'lucide-react'
import { useAuth } from '@/lib/auth-context'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

const navItems = [
  { to: '/', label: 'Dashboard', icon: LayoutDashboard, end: true },
  { to: '/operators', label: 'Operators', icon: Users },
  { to: '/incidents', label: 'Incidents', icon: Siren },
  { to: '/resources', label: 'Resources', icon: Boxes },
  { to: '/comms-plans', label: 'Comms Plans', icon: RadioTower },
]

const adminNavItems = [{ to: '/roles', label: 'Roles', icon: ShieldCheck }]

export function AppLayout() {
  const { user, logout } = useAuth()
  const isAdmin = user?.role === 'ADMIN'

  return (
    <div className="min-h-svh grid grid-cols-[220px_1fr]">
      <aside className="border-r bg-sidebar text-sidebar-foreground flex flex-col">
        <div className="flex items-center gap-2 px-4 py-4 border-b">
          <Radio className="size-6 text-primary" />
          <div>
            <div className="font-semibold leading-tight">NJ2PC-OEM</div>
            <div className="text-xs text-muted-foreground leading-tight">Incident Management</div>
          </div>
        </div>
        <nav className="flex-1 px-2 py-3 flex flex-col gap-1">
          {navItems.map(({ to, label, icon: Icon, end }) => (
            <NavLink
              key={to}
              to={to}
              end={end}
              className={({ isActive }) =>
                cn(
                  'flex items-center gap-2 rounded-md px-3 py-2 text-sm font-medium transition-colors',
                  isActive
                    ? 'bg-sidebar-accent text-sidebar-accent-foreground'
                    : 'text-sidebar-foreground/80 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground',
                )
              }
            >
              <Icon className="size-4" />
              {label}
            </NavLink>
          ))}
          {isAdmin &&
            adminNavItems.map(({ to, label, icon: Icon }) => (
              <NavLink
                key={to}
                to={to}
                className={({ isActive }) =>
                  cn(
                    'flex items-center gap-2 rounded-md px-3 py-2 text-sm font-medium transition-colors',
                    isActive
                      ? 'bg-sidebar-accent text-sidebar-accent-foreground'
                      : 'text-sidebar-foreground/80 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground',
                  )
                }
              >
                <Icon className="size-4" />
                {label}
              </NavLink>
            ))}
        </nav>
        <div className="px-4 py-3 border-t text-sm">
          <div className="font-medium">{user?.username}</div>
          <div className="text-xs text-muted-foreground mb-2">{user?.role}</div>
          <Button variant="outline" size="sm" className="w-full" onClick={logout}>
            <LogOut className="size-4" />
            Log out
          </Button>
        </div>
      </aside>
      <main className="p-6 overflow-y-auto">
        <Outlet />
      </main>
    </div>
  )
}
