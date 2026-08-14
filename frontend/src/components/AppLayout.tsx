import { useState } from 'react'
import { NavLink, Outlet } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
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
  MapPin,
  LogOut,
  Menu,
} from 'lucide-react'
import { api } from '@/lib/api'
import type { Incident } from '@/lib/types'
import { hasPermission, useAuth } from '@/lib/auth-context'
import { Button } from '@/components/ui/button'
import { Sheet, SheetContent, SheetTitle } from '@/components/ui/sheet'
import { cn } from '@/lib/utils'

type NavItem = { to: string; label: string; icon: typeof User; disabled?: boolean; neverActive?: boolean }
type NavGroup = { heading: string; items: NavItem[] }

function SidebarBrand() {
  return (
    <div className="flex items-center gap-2 px-4 py-4 border-b">
      <Radio className="size-6 text-primary" />
      <div>
        <div className="font-semibold leading-tight">0Y-AuxComs</div>
        <div className="text-xs text-sidebar-foreground/60 leading-tight">Incident Management</div>
      </div>
    </div>
  )
}

function navLinkClassName({ isActive }: { isActive: boolean }, neverActive?: boolean) {
  return cn(
    'flex items-center gap-2 rounded-md px-3 py-2 text-sm font-medium transition-colors',
    isActive && !neverActive
      ? 'bg-sidebar-accent text-sidebar-accent-foreground'
      : 'text-sidebar-foreground/90 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground',
  )
}

function NavGroupBlock({ group, bordered, onNavigate }: { group: NavGroup; bordered: boolean; onNavigate?: () => void }) {
  return (
    <div className={cn('flex flex-col gap-1', bordered && 'pt-3 mt-2 border-t')}>
      {bordered && (
        <div className="px-3 pb-1 text-xs font-semibold uppercase tracking-wide text-sidebar-foreground/65">
          {group.heading}
        </div>
      )}
      {group.items.map(({ to, label, icon: Icon, disabled, neverActive }) =>
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
            key={label}
            to={to}
            end={to === '/'}
            onClick={onNavigate}
            className={(state) => navLinkClassName(state, neverActive)}
          >
            <Icon className="size-4" />
            {label}
          </NavLink>
        ),
      )}
    </div>
  )
}

/** Every active incident the operator can edit, each with its own quick links straight into that
 * incident's mesh scan / gear deployment flows — replaces the old static "Go to an Incident"
 * placeholder, which just dumped you on the incident list to find your way in manually. Incidents
 * the operator can't edit are left out since Scan/Deploy both require edit access and would just
 * bounce them back out with an error. */
function MeshNavSection({ onNavigate }: { onNavigate?: () => void }) {
  const { data: incidents } = useQuery({
    queryKey: ['incidents'],
    queryFn: async () => (await api.get<Incident[]>('/api/incidents')).data,
  })
  const activeIncidents = (incidents ?? []).filter((i) => i.status === 'ACTIVE' && i.canEdit)

  return (
    <div className="flex flex-col gap-1 pt-3 mt-2 border-t">
      <div className="px-3 pb-1 text-xs font-semibold uppercase tracking-wide text-sidebar-foreground/65">
        AREDN Mesh
      </div>
      {activeIncidents.length === 0 ? (
        <p className="px-3 py-1 text-xs text-sidebar-foreground/50">No active incidents</p>
      ) : (
        activeIncidents.map((incident) => (
          <div key={incident.id} className="flex flex-col gap-0.5 mb-1.5">
            <div className="px-3 pt-1 text-xs font-medium text-sidebar-foreground/70 truncate" title={incident.name}>
              {incident.name}
            </div>
            <NavLink to={`/incidents/${incident.id}/mesh/scan`} onClick={onNavigate} className={(state) => cn(navLinkClassName(state), 'ml-2 py-1.5')}>
              <Wifi className="size-4" />
              Scan AREDN Mesh
            </NavLink>
            <NavLink to={`/incidents/${incident.id}/deploy`} onClick={onNavigate} className={(state) => cn(navLinkClassName(state), 'ml-2 py-1.5')}>
              <MapPin className="size-4" />
              Deploy Gear
            </NavLink>
          </div>
        ))
      )}
    </div>
  )
}

function SidebarNav({
  navGroups,
  trailingGroups,
  onNavigate,
}: {
  navGroups: NavGroup[]
  trailingGroups: NavGroup[]
  onNavigate?: () => void
}) {
  return (
    <nav className="flex-1 px-2 py-3 flex flex-col gap-1 overflow-y-auto">
      {navGroups.map((group, index) => (
        <NavGroupBlock key={group.heading} group={group} bordered={index > 0} onNavigate={onNavigate} />
      ))}
      <MeshNavSection onNavigate={onNavigate} />
      {trailingGroups.map((group) => (
        <NavGroupBlock key={group.heading} group={group} bordered onNavigate={onNavigate} />
      ))}
    </nav>
  )
}

function SidebarUserMenu({ onLogout }: { onLogout: () => void }) {
  const { user } = useAuth()
  return (
    <div className="border-t px-2 py-2 shrink-0">
      <div className="flex items-center gap-2 rounded-md px-3 py-2">
        <div className="flex size-8 shrink-0 items-center justify-center rounded-full bg-sidebar-accent">
          <User className="size-4" />
        </div>
        <div className="min-w-0 flex-1">
          <div className="truncate text-sm font-medium">{user?.callsign}</div>
          <div className="truncate text-xs text-sidebar-foreground/60">{user?.admin ? 'Admin' : 'Operator'}</div>
        </div>
        <Button variant="ghost" size="icon-sm" onClick={onLogout} aria-label="Logout" title="Logout">
          <LogOut className="size-4" />
        </Button>
      </div>
    </div>
  )
}

export function AppLayout() {
  const { user, logout } = useAuth()
  const [mobileNavOpen, setMobileNavOpen] = useState(false)

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

  const adminItems: NavItem[] = [
    // Gated on RESOURCE_TYPE_MANAGE since Equipment Types is the only settings tile today;
    // widen this to an OR of every tile's permission as more tiles are added to /settings.
    ...(hasPermission(user, 'RESOURCE_TYPE_MANAGE')
      ? [{ to: '/settings', label: 'Settings', icon: Settings2 }]
      : []),
    ...(hasPermission(user, 'LOG_VIEW') ? [{ to: '/audit-log', label: 'Audit Log', icon: ScrollText }] : []),
  ]

  const navGroups: NavGroup[] = [
    { heading: 'My Space', items: mySpaceItems },
    { heading: 'Operations', items: operationsItems },
  ].filter((group) => group.items.length > 0)

  const trailingGroups: NavGroup[] = [{ heading: 'Administration', items: adminItems }].filter(
    (group) => group.items.length > 0,
  )

  return (
    <div className="h-svh grid grid-cols-1 md:grid-cols-[220px_1fr]">
      <aside className="hidden md:flex border-r bg-sidebar text-sidebar-foreground flex-col overflow-y-auto">
        <SidebarBrand />
        <SidebarNav navGroups={navGroups} trailingGroups={trailingGroups} />
        <SidebarUserMenu onLogout={logout} />
      </aside>

      <Sheet open={mobileNavOpen} onOpenChange={setMobileNavOpen}>
        <SheetContent side="left" className="p-0 md:hidden flex flex-col">
          <SheetTitle>Navigation</SheetTitle>
          <SidebarBrand />
          <SidebarNav navGroups={navGroups} trailingGroups={trailingGroups} onNavigate={() => setMobileNavOpen(false)} />
          <SidebarUserMenu
            onLogout={() => {
              setMobileNavOpen(false)
              logout()
            }}
          />
        </SheetContent>
      </Sheet>

      <div className="flex flex-col h-svh min-w-0 overflow-hidden">
        <header className="flex items-center gap-2 px-4 py-3 border-b shrink-0 md:hidden">
          <Button
            variant="outline"
            size="icon"
            onClick={() => setMobileNavOpen(true)}
            aria-label="Open navigation"
          >
            <Menu className="size-4" />
          </Button>
        </header>
        <main className="flex-1 p-4 sm:p-6 overflow-y-auto overflow-x-hidden">
          <Outlet />
        </main>
      </div>
    </div>
  )
}
