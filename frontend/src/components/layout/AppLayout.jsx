import { Fragment } from 'react'
import { Link, Outlet, useLocation } from 'react-router-dom'
import { LifeBuoy } from 'lucide-react'

import AppSidebar from '@/components/layout/AppSidebar'
import { BadgeRole } from '@/lib/affichage'
import { Button } from '@/components/ui/button'
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from '@/components/ui/breadcrumb'
import { Separator } from '@/components/ui/separator'
import { SidebarInset, SidebarProvider, SidebarTrigger } from '@/components/ui/sidebar'
import { TooltipProvider } from '@/components/ui/tooltip'
import { useAuth } from '@/context/AuthContext'

const LIBELLES_PAGES = {
  '/': 'Tableau de bord',
  '/statistiques': 'Statistiques',
  '/gares': 'Gares',
  '/arrets': 'Arrêts',
  '/tarifs': 'Tarifs',
  '/trains': 'Trains',
  '/voitures': 'Voitures',
  '/wagons': 'Wagons',
  '/billets': 'Billets',
  '/marchandises': 'Marchandises',
  '/arrivages': 'Arrivages',
  '/locations': 'Locations',
  '/bran': 'BRAN',
  '/rfe': 'RFE',
  '/utilisateurs': 'Utilisateurs',
  '/clients': 'Clients',
  '/parametres': 'Paramètres',
  '/aide': 'Comment utiliser ?',
}

function FilAriane() {
  const { pathname } = useLocation()
  const libelle = LIBELLES_PAGES[pathname] || 'Page introuvable'
  const estAccueil = pathname === '/'

  return (
    <Breadcrumb>
      <BreadcrumbList>
        <BreadcrumbItem>
          {estAccueil ? (
            <BreadcrumbPage>Tableau de bord</BreadcrumbPage>
          ) : (
            <BreadcrumbLink asChild>
              <Link to="/">Tableau de bord</Link>
            </BreadcrumbLink>
          )}
        </BreadcrumbItem>
        {!estAccueil && (
          <Fragment>
            <BreadcrumbSeparator />
            <BreadcrumbItem>
              <BreadcrumbPage>{libelle}</BreadcrumbPage>
            </BreadcrumbItem>
          </Fragment>
        )}
      </BreadcrumbList>
    </Breadcrumb>
  )
}

export default function AppLayout() {
  const { utilisateur } = useAuth()
  const { pathname } = useLocation()

  return (
    <TooltipProvider delayDuration={0}>
      <SidebarProvider>
        <AppSidebar />
        <SidebarInset>
          <header className="flex h-16 shrink-0 items-center gap-2 border-b px-4">
            <SidebarTrigger />
            <Separator orientation="vertical" className="mr-2 h-4" />
            <FilAriane />
            <div className="ml-auto flex items-center gap-2">
              <Button asChild variant="ghost" size="icon" title="Comment utiliser ?">
                <Link to="/aide" aria-label="Comment utiliser l’application">
                  <LifeBuoy />
                </Link>
              </Button>
              <BadgeRole role={utilisateur?.role} />
            </div>
          </header>
          <main className="flex flex-1 flex-col gap-6 p-6">
            <div key={pathname} className="animate-fade-up flex flex-1 flex-col gap-6">
              <Outlet />
            </div>
          </main>
        </SidebarInset>
      </SidebarProvider>
    </TooltipProvider>
  )
}
