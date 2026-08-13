import { useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { Boxes, ChevronRight, Lock } from 'lucide-react'
import { hasPermission, useAuth } from '@/lib/auth-context'
import { cn } from '@/lib/utils'
import type { Permission } from '@/lib/types'

interface SettingsTile {
  to: string
  title: string
  description: string
  icon: typeof Boxes
  permission: Permission
}

const tiles: SettingsTile[] = [
  {
    to: '/resource-types',
    title: 'Equipment Types',
    description: 'Manage the categories available when logging gear and equipment.',
    icon: Boxes,
    permission: 'RESOURCE_TYPE_MANAGE',
  },
]

export function Settings() {
  const { user } = useAuth()
  const navigate = useNavigate()
  const canAccessAny = tiles.some((tile) => hasPermission(user, tile.permission))

  useEffect(() => {
    if (!canAccessAny) {
      navigate('/', { replace: true })
    }
  }, [canAccessAny, navigate])

  if (!canAccessAny) return null

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold">Settings</h1>
        <p className="text-muted-foreground text-sm">App-wide configuration.</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {tiles.map((tile) => {
          const allowed = hasPermission(user, tile.permission)
          const Icon = tile.icon
          return (
            <div
              key={tile.to}
              role="link"
              tabIndex={allowed ? 0 : -1}
              aria-disabled={!allowed}
              title={allowed ? tile.title : 'You do not have permission to manage this'}
              onClick={() => allowed && navigate(tile.to)}
              onKeyDown={(e) => {
                if (allowed && e.key === 'Enter') navigate(tile.to)
              }}
              className={cn(
                'flex flex-col gap-3 rounded-xl border p-4 text-left transition-colors',
                allowed
                  ? 'cursor-pointer bg-card hover:bg-accent'
                  : 'cursor-not-allowed opacity-50 bg-card',
              )}
            >
              <div className="flex items-center justify-between">
                <div className="flex size-9 items-center justify-center rounded-lg bg-credential-blue-tint text-credential-blue">
                  <Icon className="size-5" />
                </div>
                {allowed ? (
                  <ChevronRight className="size-4 text-muted-foreground" />
                ) : (
                  <Lock className="size-4 text-muted-foreground" />
                )}
              </div>
              <div>
                <div className="font-medium text-credential-green">{tile.title}</div>
                <p className="text-sm text-muted-foreground mt-0.5">{tile.description}</p>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
