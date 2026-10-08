import {
  BarChart3,
  Car,
  Coins,
  Container,
  FileCheck2,
  FileText,
  LayoutDashboard,
  LogOut,
  MapPin,
  Package,
  PackageCheck,
  ScrollText,
  Settings,
  Signpost,
  Ticket,
  TrainFront,
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
    items: [
      { titre: 'Tableau de bord', url: '/', icon: LayoutDashboard },
      { titre: 'Statistiques', url: '/statistiques', icon: BarChart3 },
      {
        titre: 'Journal d’activité',
        url: '/journal',
        icon: ScrollText,
        roles: ['SUPERADMIN', 'ADMIN'],
      },
    ],
  },
  {
    label: 'Référentiels',
    items: [
      { titre: 'Gares', url: '/gares', icon: MapPin },
      { titre: 'Arrêts', url: '/arrets', icon: Signpost },
      { titre: 'Tarifs', url: '/tarifs', icon: Coins },
      { titre: 'Trains', url: '/trains', icon: TrainFront },
      { titre: 'Voitures', url: '/voitures', icon: Car },
      { titre: 'Wagons', url: '/wagons', icon: Container },
    ],
  },
  {
    label: 'Exploitation',
    items: [
      { titre: 'Billets', url: '/billets', icon: Ticket },
      { titre: 'Envois de marchandises', url: '/marchandises', icon: Package },
      { titre: 'Arrivages', url: '/arrivages', icon: PackageCheck },
      { titre: 'Locations', url: '/locations', icon: Truck },
    ],
  },
  {
    label: 'Documents',
    items: [
      { titre: 'BRAN', url: '/bran', icon: FileText },
      { titre: 'RFE', url: '/rfe', icon: FileCheck2 },
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
        <div className="flex items-center gap-2 px-1 py-1">
          <span className="grid size-8 shrink-0 place-items-center rounded-md bg-fce-600 text-sm font-bold text-white">
            F
          </span>
          <span className="truncate text-sm font-semibold group-data-[collapsible=icon]:hidden">
            FCE-SI
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
