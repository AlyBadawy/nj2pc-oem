import { NavLink, Outlet } from 'react-router-dom'
import { Radio, Users, UserPlus, User, LogOut } from 'lucide-react'
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

export function AppLayout() {
  const { user, logout } = useAuth()

  const navItems = [
    { to: '/', label: 'Account Settings', icon: User },
    ...(hasPermission(user, 'OPERATOR_LIST') ? [{ to: '/operators', label: 'Operators', icon: Users }] : []),
    ...(user?.admin ? [{ to: '/operators/new', label: 'Register Operator', icon: UserPlus }] : []),
  ]

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
          {navItems.map(({ to, label, icon: Icon }) => (
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
