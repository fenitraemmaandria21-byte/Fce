import { Badge } from '@/components/ui/badge'

const nf = new Intl.NumberFormat('fr-FR')

// Montant en ariary : 12500 → "12 500 Ar".
export function formatArgent(montant) {
  if (montant === null || montant === undefined) return '—'
  return `${nf.format(montant)} Ar`
}

export function formatNombre(valeur) {
  if (valeur === null || valeur === undefined) return '—'
  return nf.format(valeur)
}

// Valeurs du référentiel non validées par la FCE.
const MARQUEURS = new Set(['CONFIGURATION_A_VALIDER', 'REGLE_A_CONFIRMER'])

// Affiche un marqueur « À valider » pour les données non officielles.
export function Marqueur({ valeur }) {
  if (valeur === null || valeur === undefined || valeur === '') return '—'
  if (MARQUEURS.has(valeur)) {
    return (
      <Badge variant="secondary" className="bg-amber-100 text-amber-800">
        À valider
      </Badge>
    )
  }
  return <Badge variant="outline">{valeur}</Badge>
}

export const LIBELLES_CLASSE = {
  PREMIERE_CLASSE: '1re classe',
  RESERVATION_RESIDENT: 'Réservation résident',
  RESERVATION_NON_RESIDENT: 'Réservation non-résident',
}

export const LIBELLES_TYPE_LOCATION = {
  DRAISINE: 'Draisine',
  MACHINE: 'Machine',
  BATIMENT: 'Bâtiment',
  TERRAIN: 'Terrain',
}

export const LIBELLES_FORMULE = {
  MOINS_6H: 'Moins de 6 heures',
  JOURNEE: 'Journée (06:30 – 18:00)',
}

export const LIBELLES_CATEGORIE = {
  ADULTE: 'Adulte',
  ENFANT: 'Enfant',
}

export const LIBELLES_ROLE = {
  SUPERADMIN: 'Super administrateur',
  ADMIN: 'Administrateur',
  AGENT: 'Agent',
}

export const LIBELLES_STATUT = {
  VENDU: 'Vendu',
  ANNULE: 'Annulé',
  ENREGISTRE: 'Enregistré',
  FACTURE: 'Facturé',
  ARRIVE: 'Arrivé',
  REMIS: 'Remis',
  EN_ATTENTE: 'En attente',
  RECUE: 'Reçue',
  ANOMALIE: 'Anomalie',
  VALIDEE: 'Validée',
  REFUSEE: 'Refusée',
}

export const LIBELLES_TYPE_IDENTITE = {
  CIN: 'CIN',
  PASSEPORT: 'Passeport',
}

// Libellés métier des paramètres système — masquent la clé technique.
export const LIBELLES_PARAMETRE = {
  CAPACITE_DRAISINE: 'Capacité draisine',
  CAPACITE_MACHINE: 'Capacité machine',
  DEMI_TARIF_BILLET: 'Demi-tarif billet',
  REGLE_ANNULATION_BILLET: 'Règle annulation billet',
  NUMEROTATION_BILLET: 'Numérotation des billets',
  CAPACITE_MAX_TRAIN_MARCHANDISES: 'Capacité train marchandises',
  TARIF_BATIMENT_TERRAIN: 'Tarifs patrimoine (bâtiments/terrains)',
  TARIF_ARRET_PK102: 'Tarif arrêt PK102',
  TARIF_ARRET_PK115: 'Tarif arrêt PK115',
  TARIF_ARRET_PK123: 'Tarif arrêt PK123',
}

// Variante shadcn d'un badge de statut (bonne lisibilité sans couleur "destructive").
const VARIANT_STATUT = {
  ANNULE: 'destructive',
  REFUSEE: 'destructive',
  ANOMALIE: 'destructive',
  VALIDEE: 'default',
  RECUE: 'default',
  REMIS: 'default',
  FACTURE: 'default',
}

export function BadgeStatut({ statut }) {
  if (!statut) return '—'
  return (
    <Badge variant={VARIANT_STATUT[statut] || 'secondary'}>
      {LIBELLES_STATUT[statut] || statut}
    </Badge>
  )
}

export function BadgeRole({ role }) {
  if (!role) return '—'
  return <Badge variant={role === 'SUPERADMIN' ? 'default' : 'outline'}>{LIBELLES_ROLE[role] || role}</Badge>
}

// Badge « À valider » (donnée non officielle ou montant non configuré).
export function BadgeAValider() {
  return (
    <Badge variant="secondary" className="bg-amber-100 text-amber-800">
      À valider
    </Badge>
  )
}

// Durée lisible entre deux dates : "2 j 3 h", "3 h 30", "45 min".
export function formatDuree(debut, fin) {
  if (!debut || !fin) return null
  const ms = new Date(fin).getTime() - new Date(debut).getTime()
  if (!Number.isFinite(ms) || ms < 0) return null
  const totalMinutes = Math.round(ms / 60000)
  const jours = Math.floor(totalMinutes / 1440)
  const heures = Math.floor((totalMinutes % 1440) / 60)
  const minutes = totalMinutes % 60
  const parties = []
  if (jours) parties.push(`${jours} j`)
  if (heures) parties.push(`${heures} h`)
  if (minutes && !jours) parties.push(`${minutes} min`)
  return parties.length ? parties.join(' ') : '0 min'
}

// Échéance calculée d'une location : à venir / en cours / terminée.
export function BadgeEcheance({ debut, fin, statut }) {
  if (statut === 'REFUSEE') return null
  if (!fin) {
    return (
      <Badge variant="outline" className="text-muted-foreground">
        Fin non définie
      </Badge>
    )
  }
  const finDate = new Date(fin).getTime()
  if (!Number.isFinite(finDate)) return null
  const maintenant = Date.now()
  const debutDate = debut ? new Date(debut).getTime() : null
  if (finDate < maintenant) {
    return (
      <Badge variant="secondary" className="bg-slate-200 text-slate-700">
        Terminée
      </Badge>
    )
  }
  if (debutDate && debutDate <= maintenant) {
    return (
      <Badge variant="secondary" className="bg-emerald-100 text-emerald-800">
        En cours
      </Badge>
    )
  }
  return (
    <Badge variant="secondary" className="bg-sky-100 text-sky-800">
      À venir
    </Badge>
  )
}

// Date ISO → "12/03/2026" (ou avec heure si demandé).
export function formatDate(valeur, avecHeure = false) {
  if (!valeur) return '—'
  const date = new Date(valeur)
  if (Number.isNaN(date.getTime())) return '—'
  return new Intl.DateTimeFormat('fr-FR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    ...(avecHeure ? { hour: '2-digit', minute: '2-digit' } : {}),
  }).format(date)
}

// Date ISO → champ <input type="date"> (YYYY-MM-DD, heure locale).
export function versChampDate(valeur) {
  if (!valeur) return ''
  const date = new Date(valeur)
  if (Number.isNaN(date.getTime())) return ''
  const offset = date.getTimezoneOffset()
  return new Date(date.getTime() - offset * 60000).toISOString().slice(0, 10)
}
