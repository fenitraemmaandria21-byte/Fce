import { Link } from 'react-router-dom'
import {
  BarChart3,
  KeyRound,
  LayoutDashboard,
  Mail,
  MapPin,
  MessageSquare,
  Package,
  PackageCheck,
  Phone,
  ShieldCheck,
  Ticket,
  Truck,
} from 'lucide-react'

import { Button } from '@/components/ui/button'
import ThemeToggle from '@/components/ThemeToggle'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { useAuth } from '@/context/AuthContext'

const ANNEE_COURANTE = new Date().getFullYear()

const SERVICES = [
  {
    icon: Ticket,
    titre: 'Billetterie voyageurs',
    texte:
      'Vente et annulation de billets, impression du ticket, suivi des classes et catégories.',
  },
  {
    icon: Package,
    titre: 'Fret & marchandises',
    texte:
      'Envois, arrivages et suivi du transport des marchandises jusqu’à la remise.',
  },
  {
    icon: PackageCheck,
    titre: 'Documents BRAN / RFE',
    texte:
      'Génération et impression des bordereaux de route et reçus de facturation.',
  },
  {
    icon: Truck,
    titre: 'Locations & patrimoine',
    texte:
      'Locations de draisines, machines, bâtiments et terrains, avec échéances et validation.',
  },
  {
    icon: BarChart3,
    titre: 'Pilotage & statistiques',
    texte:
      'Tableaux de bord, statistiques d’activité et journal complet des opérations.',
  },
  {
    icon: ShieldCheck,
    titre: 'Sécurité par rôle',
    texte:
      'Accès contrôlé (agent, administrateur, superadministrateur) et traçabilité des actions.',
  },
]

const CONTACTS = [
  { icon: Phone, libelle: 'Téléphone', valeur: '+261 38 16 867 60', lien: 'tel:+261381686760' },
  { icon: Mail, libelle: 'E-mail', valeur: 'contact.fce@fce.mg', lien: 'mailto:contact.fce@fce.mg' },
  {
    icon: MapPin,
    libelle: 'Adresse',
    valeur: '01 Avenue du Général Leclerc, Antarandolo, Fianarantsoa',
  },
]

// Page d'accueil : présentation de la plateforme FCE.
// `publique` = affichée hors de l'application (avant connexion).
export default function Accueil({ publique = false }) {
  const { utilisateur } = useAuth()
  const connecte = Boolean(utilisateur)

  const ctaPrincipal = publique
    ? connecte
      ? { libelle: 'Ouvrir l’application', to: '/accueil', icon: LayoutDashboard }
      : { libelle: 'Se connecter', to: '/login', icon: KeyRound }
    : { libelle: 'Aller au tableau de bord', to: '/tableau-de-bord', icon: LayoutDashboard }

  return (
    <div className={publique ? 'flex min-h-screen flex-col' : 'flex flex-col gap-6'}>
      {publique && (
        <header className="flex items-center justify-between border-b bg-card px-4 py-3 sm:px-8">
          <div className="flex items-center gap-3">
            <span className="grid h-10 w-10 shrink-0 place-items-center overflow-hidden rounded-lg bg-white p-1 ring-1 ring-border">
              <img src="/logo.jpg" alt="Logo FCE" className="h-full w-full object-contain" />
            </span>
            <div className="leading-tight">
              <p className="font-semibold">FCE</p>
              <p className="text-xs text-muted-foreground">Fitadia Compagnie Express</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <ThemeToggle />
            <Button asChild size="sm" variant={connecte ? 'default' : 'outline'}>
              <Link to={connecte ? '/accueil' : '/login'}>
                {connecte ? 'Ouvrir l’application' : 'Se connecter'}
              </Link>
            </Button>
          </div>
        </header>
      )}

      <div className={publique ? 'flex flex-1 flex-col' : 'contents'}>
        {/* Bandeau d'accueil */}
        <section className="relative overflow-hidden rounded-xl bg-slate-900 text-slate-100">
          <img
            src="/train.jpg"
            alt="Train FCE"
            className="absolute inset-0 h-full w-full object-cover"
          />
          <div className="absolute inset-0 bg-gradient-to-b from-slate-950/80 via-slate-900/65 to-slate-950/90" />
          <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(34,197,94,0.25),transparent_60%)]" />

          <div className="relative flex flex-col gap-5 px-6 py-10 sm:px-10 sm:py-14">
            <div className="flex items-center gap-3">
              <span className="grid h-14 w-14 place-items-center overflow-hidden rounded-xl bg-white p-1.5 shadow-sm">
                <img src="/logo.jpg" alt="Logo FCE" className="h-full w-full object-contain" />
              </span>
              <div>
                <h1 className="text-2xl font-bold leading-tight sm:text-3xl">
                  Compagnie Ferroviaire Express
                </h1>
                <p className="text-sm text-slate-300">
                  Ligne Fianarantsoa – Manakara
                </p>
              </div>
            </div>

            {!publique && connecte && (
              <p className="text-sm text-slate-300">
                Bienvenue, <span className="font-medium text-white">{utilisateur.nom}</span>.
              </p>
            )}

            <p className="max-w-2xl text-sm leading-relaxed text-slate-300">
              Bienvenue sur la plateforme de pilotage des opérations ferroviaires de la FCE :
              billetterie, fret et marchandises, locations, documents officiels (BRAN/RFE),
              statistiques et messagerie interne — au même endroit.
            </p>

            <div className="flex flex-wrap gap-3">
              <Button asChild size="lg">
                <Link to={ctaPrincipal.to}>
                  <ctaPrincipal.icon />
                  {ctaPrincipal.libelle}
                </Link>
              </Button>
              {!publique && (
                <>
                  <Button asChild size="lg" variant="secondary">
                    <Link to="/messagerie">
                      <MessageSquare />
                      Messagerie
                    </Link>
                  </Button>
                  <Button
                    asChild
                    size="lg"
                    variant="outline"
                    className="border-white/40 bg-transparent text-white hover:bg-white/10"
                  >
                    <Link to="/aide">Comment utiliser ?</Link>
                  </Button>
                </>
              )}
              {publique && (
                <Button
                  asChild
                  size="lg"
                  variant="outline"
                  className="border-white/40 bg-transparent text-white hover:bg-white/10"
                >
                  <Link to="/aide">En savoir plus</Link>
                </Button>
              )}
            </div>
          </div>
        </section>

        {/* Présentation / services */}
        <section className="mt-6 space-y-4">
          <div className="space-y-1">
            <h2 className="text-lg font-semibold">Nos services</h2>
            <p className="text-sm text-muted-foreground">
              Tout ce qu’il faut pour gérer l’exploitation au quotidien.
            </p>
          </div>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {SERVICES.map((service) => (
              <Card key={service.titre}>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <span className="grid size-8 place-items-center rounded-lg bg-fce-100 text-fce-700 dark:bg-fce-500/15 dark:text-fce-500">
                      <service.icon className="size-4" />
                    </span>
                    {service.titre}
                  </CardTitle>
                  <CardDescription>{service.texte}</CardDescription>
                </CardHeader>
              </Card>
            ))}
          </div>
        </section>

        {/* Contact / coordonnées */}
        <section className="mt-6 mb-4">
          <Card>
            <CardHeader>
              <CardTitle>Contact</CardTitle>
              <CardDescription>
                Coordonnées de la FCE — Fitadia Compagnie Express.
              </CardDescription>
            </CardHeader>
            <CardContent className="grid gap-4 sm:grid-cols-3">
              {CONTACTS.map((item) => (
                <div key={item.libelle} className="flex items-start gap-3">
                  <span className="grid size-9 shrink-0 place-items-center rounded-lg bg-muted text-muted-foreground">
                    <item.icon className="size-4" />
                  </span>
                  <div>
                    <p className="text-xs text-muted-foreground">{item.libelle}</p>
                    <p className="text-sm font-medium">
                      {item.lien ? (
                        <a href={item.lien} className="hover:text-fce-700 hover:underline">
                          {item.valeur}
                        </a>
                      ) : (
                        item.valeur
                      )}
                    </p>
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>
        </section>
      </div>

      {publique && (
        <footer className="border-t bg-card px-4 py-4 text-center text-xs text-muted-foreground sm:px-8">
          © {ANNEE_COURANTE} Fitadia – Compagnie Ferroviaire Express (FCE). Tous droits réservés.
        </footer>
      )}
    </div>
  )
}
