import {
  BarChart3,
  Bell,
  FileText,
  Home,
  LifeBuoy,
  LogIn,
  MessageSquare,
  Moon,
  MousePointerClick,
  Package,
  PackageCheck,
  Printer,
  Rocket,
  ShieldCheck,
  Ticket,
  Truck,
  Users,
  Wallet,
} from 'lucide-react'

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'

const ETAPES = [
  {
    icon: LogIn,
    titre: '1. Se connecter',
    texte:
      'La page d’accueil présente la FCE et ses services. Cliquez sur Se connecter, saisissez votre e-mail et votre mot de passe, puis validez.',
  },
  {
    icon: MousePointerClick,
    titre: '2. Naviguer',
    texte:
      'Utilisez la barre latérale : Pilotage (Accueil, Tableau de bord), Exploitation, Communication, Administration. Le bouton ☰ replie le menu.',
  },
  {
    icon: Ticket,
    titre: '3. Saisir une opération',
    texte:
      'Chaque écran possède un bouton d’ajout, un filtre, un bouton Carte/Tableau et un bouton Actualiser.',
  },
  {
    icon: BarChart3,
    titre: '4. Suivre les résultats',
    texte:
      'Le Tableau de bord et les Statistiques résument l’activité par période.',
  },
]

const SECTIONS = [
  {
    icon: Moon,
    titre: 'Apparence (mode clair / sombre)',
    points: [
      'Le bouton en forme de soleil/lune de l’en-tête ouvre le menu Apparence.',
      'Clair, Sombre ou Système : « Système » suit automatiquement le réglage de votre appareil.',
      'Le choix est mémorisé sur cet appareil et s’applique à tous les écrans.',
    ],
  },
  {
    icon: Home,
    titre: 'Accueil et tableau de bord',
    points: [
      'Pilotage → Accueil : page de présentation de la FCE et de ses services.',
      'Pilotage → Tableau de bord : synthèse de l’activité, alertes et raccourcis.',
      'La page d’accueil est aussi visible avant connexion, avec un bouton Se connecter.',
    ],
  },
  {
    icon: Ticket,
    titre: 'Vendre un billet',
    points: [
      'Exploitation → Billets → Nouveau billet.',
      'Renseignez gare de départ, gare d’arrivée, classe, catégorie, voyageur(s).',
      'Validez : le billet passe en Vendu.',
      'Réimpression : icône Imprimer de la ligne.',
      'Un billet Annulé ne peut plus être modifié.',
    ],
  },
  {
    icon: Package,
    titre: 'Envoyer des marchandises',
    points: [
      'Exploitation → Marchandises → Nouvel envoi.',
      'Renseignez expéditeur, destinataire, nombre de colis et les lignes (nature, poids…).',
      'Le poids total est calculé automatiquement à partir des lignes.',
      'La suppression d’un envoi supprime aussi son BRAN ; elle est bloquée s’il possède des arrivages.',
    ],
  },
  {
    icon: PackageCheck,
    titre: 'Gérer les arrivages',
    points: [
      'Exploitation → Arrivages → créer un arrivage rattaché à l’envoi.',
      'Mettez à jour le statut au fil du transport.',
      'Générez puis imprimez le BRAN depuis la ligne quand nécessaire.',
    ],
  },
  {
    icon: Truck,
    titre: 'Locations et RFE',
    points: [
      'Exploitation → Locations → Nouvelle location.',
      'Choisissez le type : Draisine, Machine, Bâtiment ou Terrain.',
      'Indiquez la date de début et la date de fin (durée calculée, badge Échéance).',
      'Un administrateur Valide ou Refuse ; une fois Validée, le RFE peut être généré et imprimé.',
    ],
  },
  {
    icon: FileText,
    titre: 'Documents et impression',
    points: [
      'BRAN (marchandises) et RFE (locations) se génèrent depuis leur écran respectif.',
      'Impression : icône Imprimer de la ligne — seul le document est imprimé.',
      'Le ticket billet s’imprime depuis la liste des billets.',
    ],
  },
  {
    icon: Users,
    titre: 'Utilisateurs et administration',
    points: [
      'Administration → Utilisateurs : créer un compte, définir le rôle, activer/désactiver.',
      'Administration → Journal : historique des connexions et opérations (ADMIN/SUPERADMIN).',
      'Administration → Paramètres : réservé au SUPERADMIN.',
    ],
  },
  {
    icon: Wallet,
    titre: 'Caisse et recettes',
    points: [
      'Pilotage → Caisse : recettes par journée, calculées automatiquement sur la période choisie (aujourd’hui, semaine, mois, année).',
      'Les recettes attendues regroupent la billetterie (billets vendus), les locations validées et les bordereaux de marchandises.',
      'Sur une journée, « Comptage » : saisissez le montant réellement constaté pour obtenir l’écart, enregistrez ou clôturez.',
      'La consultation est ouverte à tous ; la saisie du comptage et la clôture sont réservées aux ADMIN/SUPERADMIN.',
      'Périmètre des recettes attendues à confirmer par le responsable métier.',
    ],
  },
  {
    icon: MessageSquare,
    titre: 'Messagerie interne',
    points: [
      'Communication → Messagerie : échangez avec les autres utilisateurs.',
      'Nouvelle conversation : choisissez un ou plusieurs destinataires (diffusion possible).',
      'Joignez des fichiers (images, PDF, Word/Excel, texte — 10 Mo max, 5 par message).',
      'Le badge du menu indique les messages non lus.',
      'Vous pouvez supprimer vos propres messages, vider une conversation ou la quitter.',
    ],
  },
  {
    icon: Bell,
    titre: 'Notifications et journal',
    points: [
      'La cloche de l’en-tête est alimentée automatiquement après chaque opération : billet vendu, envoi de marchandise, arrivage et demande de location (création, validation ou refus).',
      'Chaque notification indique l’opération, l’auteur et son ancienneté ; cliquer dessus ouvre l’écran correspondant.',
      'Le compteur affiche le nombre exact de notifications non lues (99+ au-delà). Il diminue à la lecture ; « Tout lu » le remet à zéro.',
      'Les notifications sont personnelles : chacun ne voit que les siennes, selon son rôle.',
      'Administration → Journal : historique complet des connexions et opérations (ADMIN/SUPERADMIN).',
    ],
  },
]

const ROLES = [
  { role: 'SUPERADMIN', droits: 'Tout, y compris Paramètres et Utilisateurs' },
  { role: 'ADMIN', droits: 'Validation, documents (BRAN/RFE), utilisateurs' },
  { role: 'AGENT', droits: 'Saisie courante (billets, marchandises, arrivages, locations)' },
]

const DEPANNAGE = [
  ['« API injoignable »', 'Vérifiez que le serveur (Docker) est démarré.'],
  ['Renvoyé à la connexion', 'Jeton expiré — reconnectez-vous.'],
  ['Bouton Supprimer inactif', 'Suppression interdite (arrivages liés, statut verrouillé…).'],
  ['Donnée « À valider »', 'Valeur du référentiel non encore confirmée.'],
]

export default function Aide() {
  return (
    <div className="space-y-6">
      <div className="flex items-start gap-3">
            <span className="grid size-11 shrink-0 place-items-center rounded-xl bg-fce-100 text-fce-700 dark:bg-fce-500/15 dark:text-fce-500">
          <LifeBuoy className="size-6" />
        </span>
        <div>
          <h1 className="text-2xl font-semibold">Comment utiliser l’application</h1>
          <p className="text-sm text-muted-foreground">
            Guide rapide de la plateforme FCE-SI : prise en main, exploitation et
            administration.
          </p>
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {ETAPES.map((etape) => (
          <Card key={etape.titre}>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <etape.icon className="size-4 text-fce-600" />
                {etape.titre}
              </CardTitle>
              <CardDescription>{etape.texte}</CardDescription>
            </CardHeader>
          </Card>
        ))}
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        {SECTIONS.map((section) => (
          <Card key={section.titre}>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <section.icon className="size-4 text-fce-600" />
                {section.titre}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ul className="list-disc space-y-1.5 pl-5 text-sm text-muted-foreground">
                {section.points.map((point) => (
                  <li key={point}>{point}</li>
                ))}
              </ul>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <ShieldCheck className="size-4 text-fce-600" />
              Rôles et droits
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {ROLES.map((ligne) => (
              <div key={ligne.role} className="flex items-start gap-3">
                <Badge variant="secondary" className="mt-0.5 shrink-0">
                  {ligne.role}
                </Badge>
                <span className="text-sm text-muted-foreground">{ligne.droits}</span>
              </div>
            ))}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <LifeBuoy className="size-4 text-fce-600" />
              Dépannage rapide
            </CardTitle>
          </CardHeader>
          <CardContent>
            <dl className="space-y-2 text-sm">
              {DEPANNAGE.map(([symptome, piste]) => (
                <div key={symptome} className="grid grid-cols-[1fr_1.4fr] gap-3">
                  <dt className="font-medium">{symptome}</dt>
                  <dd className="text-muted-foreground">{piste}</dd>
                </div>
              ))}
            </dl>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Rocket className="size-4 text-fce-600" />
            Première utilisation (base vide)
          </CardTitle>
          <CardDescription>
            Si aucun compte n’existe encore, l’écran de connexion affiche{' '}
            <strong>Première initialisation</strong>.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <ul className="list-disc space-y-1.5 pl-5 text-sm text-muted-foreground">
            <li>Renseignez le nom, l’e-mail et un mot de passe (8 caractères minimum).</li>
            <li>
              Saisissez le <strong>secret d’amorçage</strong> défini par la variable
              d’environnement <code>BOOTSTRAP_SECRET</code> sur le serveur.
            </li>
            <li>Cliquez sur Créer le superadministrateur — opération possible une seule fois.</li>
            <li>Ensuite, gérez les comptes via Administration → Utilisateurs.</li>
          </ul>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Printer className="size-4 text-fce-600" />
            Bonnes pratiques
          </CardTitle>
        </CardHeader>
        <CardContent>
          <ul className="list-disc space-y-1.5 pl-5 text-sm text-muted-foreground">
            <li>Rafraîchissez après une saisie si la liste semble figée.</li>
            <li>Les notifications (en haut à droite) disparaissent seules ; les survoler les met en pause.</li>
            <li>N’inventez jamais une donnée métier : les valeurs non confirmées sont marquées « À valider ».</li>
            <li>Déconnectez-vous via le menu utilisateur en quittant un poste partagé.</li>
          </ul>
        </CardContent>
      </Card>
    </div>
  )
}
