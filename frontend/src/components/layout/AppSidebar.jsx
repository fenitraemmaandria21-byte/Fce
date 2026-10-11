import {
  History,
  Home,
  LayoutDashboard,
  LifeBuoy,
  LogOut,
  MessageSquare,
  Package,
  PackageCheck,
  Settings,
  Ticket,
  Truck,
  Users,
  Wallet,
} from 'lucide-react'
import { useEffect, useState } from 'react'
import { NavLink } from 'react-router-dom'

import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarRail,
} from '@/components/ui/sidebar'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { useAuth } from '@/context/AuthContext'
import api from '@/services/api'

const MENU = [
  {
    label: 'Pilotage',
    items: [
      { titre: 'Accueil', url: '/accueil', icon: Home, end: true },
      { titre: 'Tableau de bord', url: '/tableau-de-bord', icon: LayoutDashboard, end: true },
      { titre: 'Caisse', url: '/caisse', icon: Wallet },
    ],
  },
  {
    label: 'Exploitation',
    items: [
      { titre: 'Billets', url: '/billets', icon: Ticket },
      { titre: 'Marchandises', url: '/marchandises', icon: Package },
      { titre: 'Arrivages', url: '/arrivages', icon: PackageCheck },
      { titre: 'Locations', url: '/locations', icon: Truck },
    ],
  },
  {
    label: 'Communication',
    items: [{ titre: 'Messagerie', url: '/messagerie', icon: MessageSquare, badge: 'messagerie' }],
  },
  {
    label: 'Administration',
    items: [
      {
        titre: 'Utilisateurs',
        url: '/utilisateurs',
        icon: Users,
        roles: ['SUPERADMIN', 'ADMIN'],
      },
      { titre: 'Journal', url: '/journal', icon: History, roles: ['SUPERADMIN', 'ADMIN'] },
      { titre: 'Paramètres', url: '/parametres', icon: Settings, roles: ['SUPERADMIN'] },
    ],
  },
  {
    label: 'Assistance',
    items: [{ titre: 'Comment utiliser ?', url: '/aide', icon: LifeBuoy }],
  },
]

const LIBELLES_ROLE = {
  SUPERADMIN: 'Super administrateur',
  ADMIN: 'Administrateur',
  AGENT: 'Agent',
}

export default function AppSidebar() {
  const { utilisateur, deconnexion } = useAuth()
  const role = utilisateur?.role
  const [nonLus, setNonLus] = useState(0)

  useEffect(() => {
    let actif = true
    const charger = () => {
      api
        .get('/messagerie/non-lus')
        .then((r) => {
          if (actif) setNonLus(r.data?.total || 0)
        })
        .catch(() => {})
    }
    charger()
    const minuterie = setInterval(charger, 15000)
    return () => {
      actif = false
      clearInterval(minuterie)
    }
  }, [])

  return (
    <Sidebar collapsible="icon">
      <SidebarHeader>
        <div className="flex items-center justify-center">
          <span className="group/logo grid h-12 w-12 shrink-0 place-items-center overflow-hidden rounded-lg bg-white p-1 shadow-sm ring-1 ring-sidebar-border transition-[width,height,padding,border-radius] duration-300 ease-out group-data-[collapsible=icon]:size-9 group-data-[collapsible=icon]:rounded-md group-data-[collapsible=icon]:p-1">
            <img
              src="/logo.jpg"
              alt="Logo FCE"
              className="h-full w-full object-contain transition-transform duration-300 ease-out group-data-[collapsible=icon]:scale-90 group-hover/logo:scale-105"
            />
          </span>
        </div>
      </SidebarHeader>

      <SidebarContent>
        {MENU.map((groupe) => {
          const items = groupe.items.filter(
            (item) => !item.roles || (role && item.roles.includes(role))
          )
          if (items.length === 0) return null
          return (
            <SidebarGroup key={groupe.label}>
              <SidebarGroupLabel>{groupe.label}</SidebarGroupLabel>
              <SidebarGroupContent>
                <SidebarMenu>
                  {items.map((item) => (
                    <SidebarMenuItem key={item.url}>
                      <SidebarMenuButton asChild tooltip={item.titre}>
                        <NavLink
                          to={item.url}
                          end={item.end || item.url === '/'}
                          className={({ isActive }) => (isActive ? 'bg-sidebar-accent' : undefined)}
                        >
                          <item.icon />
                          <span>{item.titre}</span>
                          {item.badge === 'messagerie' && nonLus > 0 && (
                            <Badge className="ml-auto bg-fce-600 text-white group-data-[collapsible=icon]:hidden">
                              {nonLus}
                            </Badge>
                          )}
                        </NavLink>
                      </SidebarMenuButton>
                    </SidebarMenuItem>
                  ))}
                </SidebarMenu>
              </SidebarGroupContent>
            </SidebarGroup>
          )
        })}
      </SidebarContent>

      <SidebarFooter>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="ghost"
              className="h-12 w-full justify-start gap-2 px-2 group-data-[collapsible=icon]:size-8 group-data-[collapsible=icon]:justify-center"
            >
              <span className="grid size-7 shrink-0 place-items-center rounded-full bg-fce-100 text-xs font-semibold text-fce-700 group-data-[collapsible=icon]:hidden dark:bg-fce-500/15 dark:text-fce-500">
                {(utilisateur?.nom || '?').charAt(0).toUpperCase()}
              </span>
              <span className="truncate text-left group-data-[collapsible=icon]:hidden">
                <span className="block truncate text-sm font-medium">{utilisateur?.nom}</span>
                <span className="block truncate text-xs text-muted-foreground">
                  {LIBELLES_ROLE[role] || role}
                </span>
              </span>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent side="right" align="start" className="w-56">
            <DropdownMenuLabel className="truncate">{utilisateur?.email}</DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={deconnexion}>
              <LogOut />
              Se déconnecter
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </SidebarFooter>

      <SidebarRail />
    </Sidebar>
  )
}
