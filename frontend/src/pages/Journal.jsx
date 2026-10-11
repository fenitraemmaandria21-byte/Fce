import { useEffect, useState } from 'react'
import { Activity, Search } from 'lucide-react'

import Pagination from '@/components/Pagination'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { useApi } from '@/hooks/useApi'
import { formatDate } from '@/lib/affichage'

const LIBELLES_ACTION = {
  CONNEXION: 'Connexion',
  AMORCAGE_SUPERADMIN: 'Amorçage superadministrateur',
  CREATION_BILLET: 'Création billet',
  MODIFICATION_BILLET: 'Modification billet',
  ANNULATION_BILLET: 'Annulation billet',
  SUPPRESSION_BILLET: 'Suppression billet',
  CREATION_ENVOI: 'Création envoi',
  MODIFICATION_ENVOI: 'Modification envoi',
  SUPPRESSION_ENVOI: 'Suppression envoi',
  CREATION_ARRIVAGE: 'Création arrivage',
  MODIFICATION_ARRIVAGE: 'Modification arrivage',
  SUPPRESSION_ARRIVAGE: 'Suppression arrivage',
  CREATION_LOCATION: 'Création location',
  MODIFICATION_LOCATION: 'Modification location',
  VALIDATION_LOCATION: 'Validation location',
  REFUS_LOCATION: 'Refus location',
  SUPPRESSION_LOCATION: 'Suppression location',
  CREATION_CLIENT: 'Création client',
  MODIFICATION_CLIENT: 'Modification client',
  SUPPRESSION_CLIENT: 'Suppression client',
  CREATION_UTILISATEUR: 'Création utilisateur',
  MODIFICATION_UTILISATEUR: 'Modification utilisateur',
  CREATION_BRAN: 'Création BRAN',
  CREATION_RFE: 'Création RFE',
  ENVOI_MESSAGE: 'Message envoyé',
  CREATION_PARAMETRE: 'Création paramètre',
  MODIFICATION_PARAMETRE: 'Modification paramètre',
  SUPPRESSION_PARAMETRE: 'Suppression paramètre',
}

// Couleur selon la nature de l'action.
function classesAction(action) {
  if (action.startsWith('SUPPRESSION') || action.startsWith('REFUS'))
    return 'bg-red-100 text-red-800 dark:bg-red-500/15 dark:text-red-300'
  if (action.startsWith('CREATION') || action.startsWith('VALIDATION') || action.startsWith('AMORCAGE'))
    return 'bg-fce-100 text-fce-700 dark:bg-fce-500/15 dark:text-fce-500'
  if (action.startsWith('MODIFICATION')) return 'bg-amber-100 text-amber-800 dark:bg-amber-500/15 dark:text-amber-300'
  return ''
}

function resumeDetails(details) {
  if (!details || typeof details !== 'object') return '—'
  const parties = Object.entries(details).map(([cle, valeur]) => {
    const texte = Array.isArray(valeur) ? valeur.join(', ') : String(valeur)
    return `${cle} : ${texte}`
  })
  if (parties.length === 0) return '—'
  const texte = parties.join(' · ')
  return texte.length > 80 ? `${texte.slice(0, 79)}…` : texte
}

export default function Journal() {
  const [page, setPage] = useState(1)
  const [texte, setTexte] = useState('')
  const [recherche, setRecherche] = useState('')

  useEffect(() => {
    const minuterie = setTimeout(() => {
      setRecherche(texte.trim())
      setPage(1)
    }, 300)
    return () => clearTimeout(minuterie)
  }, [texte])

  const { donnees, chargement, message } = useApi('/journal', {
    page,
    limit: 20,
    ...(recherche ? { search: recherche } : {}),
  })

  const lignes = donnees?.donnees || []
  const pagination = donnees?.pagination

  return (
    <div className="flex flex-1 flex-col gap-4">
      <div className="flex items-start gap-3">
        <span className="grid size-11 shrink-0 place-items-center rounded-xl bg-fce-100 text-fce-700 dark:bg-fce-500/15 dark:text-fce-500">
          <Activity className="size-6" />
        </span>
        <div>
          <h1 className="text-xl font-semibold">Journal d’activité</h1>
          <p className="text-sm text-muted-foreground">
            Historique des connexions et des opérations réalisées sur la plateforme.
          </p>
        </div>
      </div>

      <div className="relative max-w-sm">
        <Search className="pointer-events-none absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          value={texte}
          onChange={(e) => setTexte(e.target.value)}
          placeholder="Rechercher (action, entité, utilisateur)…"
          className="pl-8"
        />
      </div>

      <Card>
        <CardContent className="p-0">
          {chargement && lignes.length === 0 ? (
            <p className="p-6 text-sm text-muted-foreground">Chargement…</p>
          ) : message ? (
            <p className="p-6 text-sm text-destructive">{message}</p>
          ) : lignes.length === 0 ? (
            <p className="p-6 text-center text-sm text-muted-foreground">Aucune activité.</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-44">Date</TableHead>
                  <TableHead className="w-56">Utilisateur</TableHead>
                  <TableHead>Action</TableHead>
                  <TableHead className="hidden md:table-cell">Détails</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {lignes.map((entree) => (
                  <TableRow key={entree.id}>
                    <TableCell className="whitespace-nowrap text-muted-foreground">
                      {formatDate(entree.createdAt, true)}
                    </TableCell>
                    <TableCell className="font-medium">
                      {entree.utilisateur?.nom || 'Système'}
                    </TableCell>
                    <TableCell>
                      <Badge variant="secondary" className={classesAction(entree.action)}>
                        {LIBELLES_ACTION[entree.action] || entree.action}
                      </Badge>
                      <span className="ml-2 text-xs text-muted-foreground">{entree.entite}</span>
                    </TableCell>
                    <TableCell className="hidden max-w-md truncate text-xs text-muted-foreground md:table-cell">
                      {resumeDetails(entree.details)}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <Pagination
        pagination={pagination}
        chargement={chargement}
        page={page}
        setPage={setPage}
        libelle="entrée(s)"
      />
    </div>
  )
}
