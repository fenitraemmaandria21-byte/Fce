import { RefreshCw } from 'lucide-react'

import AlerteErreur from '@/components/AlerteErreur'
import SectionListe from '@/components/SectionListe'
import { Button } from '@/components/ui/button'
import { useApi } from '@/hooks/useApi'

// Page de liste standard : titre + états (chargement/erreur/vide) + tableau.
export default function PageListe({
  titre,
  description,
  endpoint,
  params = {},
  colonnes,
  messageVide = 'Aucune donnée.',
  aideErreur,
  actions,
  rendreActions,
}) {
  const { chargement, donnees, erreur, message, recharger } = useApi(endpoint, params)
  const lignes = donnees?.donnees || []

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="space-y-1">
          <h1 className="text-2xl font-semibold">{titre}</h1>
          {description && (
            <p className="text-sm text-muted-foreground">{description}</p>
          )}
        </div>
        <div className="flex items-center gap-2">
          {actions}
          <Button variant="outline" size="sm" onClick={recharger} disabled={chargement}>
            <RefreshCw className={chargement ? 'animate-spin' : undefined} />
            Actualiser
          </Button>
        </div>
      </div>

      {erreur && (
        <AlerteErreur message={message} aide={aideErreur} onReessayer={recharger} />
      )}

      <SectionListe
        colonnes={colonnes}
        chargement={chargement}
        lignes={lignes}
        messageVide={erreur ? 'Données indisponibles.' : messageVide}
        rendreActions={rendreActions}
      />
    </div>
  )
}
