import {
  LayoutDashboard,
  LifeBuoy,
  LogOut,
  Package,
  PackageCheck,
  Settings,
  Ticket,
  Truck,
  User,
  Users,
} from 'lucide-react'
import { NavLink } from 'react-router-dom'

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

const MENU = [
  {
    label: 'Pilotage',
    items: [{ titre: 'Tableau de bord', url: '/', icon: LayoutDashboard }],
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
    label: 'Administration',
    items: [
      {
        titre: 'Utilisateurs',
        url: '/utilisateurs',
        icon: Users,
        roles: ['SUPERADMIN', 'ADMIN'],
      },
      { titre: 'Clients', url: '/clients', icon: User },
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
                          end={item.url === '/'}
                          className={({ isActive }) => (isActive ? 'bg-sidebar-accent' : undefined)}
                        >
                          <item.icon />
                          <span>{item.titre}</span>
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
              <span className="grid size-7 shrink-0 place-items-center rounded-full bg-fce-100 text-xs font-semibold text-fce-700 group-data-[collapsible=icon]:hidden">
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
