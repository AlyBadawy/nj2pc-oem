import { NavLink, Outlet } from 'react-router-dom'
import {
  Radio,
  User,
  Boxes,
  Car,
  Siren,
  FilePlus2,
  Users,
  UserPlus,
  Settings2,
  ScrollText,
  LogOut,
} from 'lucide-react'
import { hasPermission, useAuth } from '@/lib/auth-context'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { cn } from '@/lib/utils'

type NavItem = { to: string; label: string; icon: typeof User }

export function AppLayout() {
  const { user, logout } = useAuth()

  const mySpaceItems: NavItem[] = [
    { to: '/', label: 'Account Settings', icon: User },
    { to: '/resources', label: 'Resources', icon: Boxes },
    { to: '/vehicles', label: 'Vehicles', icon: Car },
  ]

  const operationsItems: NavItem[] = [
    { to: '/incidents', label: 'Incidents', icon: Siren },
    ...(hasPermission(user, 'INCIDENT_CREATE')
      ? [{ to: '/incidents/new', label: 'Create Incident', icon: FilePlus2 }]
      : []),
    ...(hasPermission(user, 'OPERATOR_LIST') ? [{ to: '/operators', label: 'Operators', icon: Users }] : []),
    ...(hasPermission(user, 'OPERATOR_CREATE')
      ? [{ to: '/operators/new', label: 'Register Operator', icon: UserPlus }]
      : []),
  ]

  const adminItems: NavItem[] = [
    ...(hasPermission(user, 'RESOURCE_TYPE_MANAGE')
      ? [{ to: '/resource-types', label: 'Resource Types', icon: Settings2 }]
      : []),
    ...(hasPermission(user, 'LOG_VIEW') ? [{ to: '/audit-log', label: 'Audit Log', icon: ScrollText }] : []),
  ]

  const navGroups = [
    { heading: 'My Space', items: mySpaceItems },
    { heading: 'Operations', items: operationsItems },
    { heading: 'Administration', items: adminItems },
  ].filter((group) => group.items.length > 0)

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
        <nav className="flex-1 px-2 py-3 flex flex-col gap-1 overflow-y-auto">
          {navGroups.map((group, index) => (
            <div key={group.heading} className={cn('flex flex-col gap-1', index > 0 && 'pt-3 mt-2 border-t')}>
              {index > 0 && (
                <div className="px-3 pb-1 text-xs font-semibold uppercase tracking-wide text-sidebar-foreground/50">
                  {group.heading}
                </div>
              )}
              {group.items.map(({ to, label, icon: Icon }) => (
                <NavLink
                  key={to}
                  to={to}
                  end={to === '/'}
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
            </div>
          ))}
        </nav>
      </aside>
      <div className="flex flex-col min-h-svh">
        <header className="flex items-center justify-end px-6 py-3 border-b">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="icon">
                <User className="size-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuLabel>
                <div className="font-medium">{user?.callsign}</div>
                <div className="text-xs text-muted-foreground font-normal">
                  {user?.admin ? 'Admin' : 'Operator'}
                </div>
              </DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={logout}>
                <LogOut className="size-4" />
                Logout
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </header>
        <main className="flex-1 p-6 overflow-y-auto">
          <Outlet />
        </main>
      </div>
    </div>
  )
}
