import { NavLink, Outlet } from 'react-router-dom'
import {
  Radio,
  User,
  Boxes,
  Car,
  Siren,
  Users,
  Settings2,
  ScrollText,
  RadioTower,
  Wifi,
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

type NavItem = { to: string; label: string; icon: typeof User; disabled?: boolean }

export function AppLayout() {
  const { user, logout } = useAuth()

  const mySpaceItems: NavItem[] = [
    { to: '/', label: 'Account Settings', icon: User },
    { to: '/resources', label: 'My Gear & Equipment', icon: Boxes },
    { to: '/vehicles', label: 'My Vehicles', icon: Car },
  ]

  const operationsItems: NavItem[] = [
    { to: '/incidents', label: 'Incidents', icon: Siren },
    { to: '/comms-plans', label: 'Comms Plans', icon: RadioTower },
    ...(hasPermission(user, 'OPERATOR_LIST') ? [{ to: '/operators', label: 'Operators', icon: Users }] : []),
    ...(hasPermission(user, 'RESOURCE_MANAGE_ALL')
      ? [{ to: '/all-resources', label: 'Gear & Equipment', icon: Boxes }]
      : []),
    ...(hasPermission(user, 'RESOURCE_MANAGE_ALL')
      ? [{ to: '/all-vehicles', label: 'Vehicles', icon: Car }]
      : []),
  ]

  // Placeholder group — no AREDN mesh feature exists yet, this just reserves the spot in nav.
  const meshItems: NavItem[] = [{ to: '', label: 'Coming Soon', icon: Wifi, disabled: true }]

  const adminItems: NavItem[] = [
    // Gated on RESOURCE_TYPE_MANAGE since Equipment Types is the only settings tile today;
    // widen this to an OR of every tile's permission as more tiles are added to /settings.
    ...(hasPermission(user, 'RESOURCE_TYPE_MANAGE')
      ? [{ to: '/settings', label: 'Settings', icon: Settings2 }]
      : []),
    ...(hasPermission(user, 'LOG_VIEW') ? [{ to: '/audit-log', label: 'Audit Log', icon: ScrollText }] : []),
  ]

  const navGroups = [
    { heading: 'My Space', items: mySpaceItems },
    { heading: 'Operations', items: operationsItems },
    { heading: 'AREDN Mesh', items: meshItems },
    { heading: 'Administration', items: adminItems },
  ].filter((group) => group.items.length > 0)

  return (
    <div className="h-svh grid grid-cols-[220px_1fr]">
      <aside className="border-r bg-sidebar text-sidebar-foreground flex flex-col overflow-y-auto">
        <div className="flex items-center gap-2 px-4 py-4 border-b">
          <Radio className="size-6 text-primary" />
          <div>
            <div className="font-semibold leading-tight">NJ2PC-OEM</div>
            <div className="text-xs text-sidebar-foreground/60 leading-tight">Incident Management</div>
          </div>
        </div>
        <nav className="flex-1 px-2 py-3 flex flex-col gap-1 overflow-y-auto">
          {navGroups.map((group, index) => (
            <div key={group.heading} className={cn('flex flex-col gap-1', index > 0 && 'pt-3 mt-2 border-t')}>
              {index > 0 && (
                <div className="px-3 pb-1 text-xs font-semibold uppercase tracking-wide text-sidebar-foreground/65">
                  {group.heading}
                </div>
              )}
              {group.items.map(({ to, label, icon: Icon, disabled }) =>
                disabled ? (
                  <div
                    key={label}
                    title="Coming soon"
                    className="flex items-center gap-2 rounded-md px-3 py-2 text-sm font-medium text-sidebar-foreground/40 cursor-not-allowed"
                  >
                    <Icon className="size-4" />
                    {label}
                  </div>
                ) : (
                  <NavLink
                    key={to}
                    to={to}
                    end={to === '/'}
                    className={({ isActive }) =>
                      cn(
                        'flex items-center gap-2 rounded-md px-3 py-2 text-sm font-medium transition-colors',
                        isActive
                          ? 'bg-sidebar-accent text-sidebar-accent-foreground'
                          : 'text-sidebar-foreground/90 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground',
                      )
                    }
                  >
                    <Icon className="size-4" />
                    {label}
                  </NavLink>
                ),
              )}
            </div>
          ))}
        </nav>
      </aside>
      <div className="flex flex-col h-svh min-w-0 overflow-hidden">
        <header className="flex items-center justify-end px-6 py-3 border-b shrink-0">
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
