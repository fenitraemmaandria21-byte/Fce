import { useEffect, useState } from 'react'
import { RefreshCw, Search } from 'lucide-react'

import AlerteErreur from '@/components/AlerteErreur'
import Pagination from '@/components/Pagination'
import SectionListe from '@/components/SectionListe'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { useApi } from '@/hooks/useApi'

// Page de liste paginée avec recherche, filtres et actions par ligne.
// filtres : [{ cle, valeur, options:[{valeur,libelle}], onChanger, largeur }]
export default function PageTable({
  titre,
  description,
  endpoint,
  colonnes,
  params = {},
  filtres = [],
  recherche = true,
  placeholderRecherche = 'Rechercher…',
  messageVide = 'Aucune donnée.',
  actions = null,
  rendreActions = null,
  aideErreur,
  libelleNombre = 'élément(s)',
  apiRef = null,
}) {
  const [rechercheSaisie, setRechercheSaisie] = useState('')
  const [rechercheActive, setRechercheActive] = useState('')
  const [page, setPage] = useState(1)

  useEffect(() => {
    const minuteur = setTimeout(() => {
      setRechercheActive(rechercheSaisie)
      setPage(1)
    }, 300)
    return () => clearTimeout(minuteur)
  }, [rechercheSaisie])

  const paramsFiltres = {}
  for (const filtre of filtres) {
    if (filtre.valeur && filtre.valeur !== 'toutes') {
      paramsFiltres[filtre.cle] = filtre.valeur
    }
  }

  const { chargement, donnees, erreur, message, recharger } = useApi(endpoint, {
    page,
    limit: 20,
    ...(rechercheActive ? { search: rechercheActive } : {}),
    ...params,
    ...paramsFiltres,
  })

  const pagination = donnees?.pagination
  const lignes = donnees?.donnees || []

  // Expose le rechargement au parent (ex. après un enregistrement dans un dialogue).
  useEffect(() => {
    if (apiRef) apiRef.current = recharger
  }, [recharger, apiRef])

  const colonnesAffichees = rendreActions
    ? [
        ...colonnes,
        {
          titre: 'Actions',
          align: 'right',
          rendre: (ligne) => <div className="flex justify-end">{rendreActions(ligne)}</div>,
        },
      ]
    : colonnes

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="space-y-1">
          <h1 className="text-2xl font-semibold">{titre}</h1>
          {description && (
            <p className="text-sm text-muted-foreground">{description}</p>
          )}
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {actions}
          <Button variant="outline" size="sm" onClick={recharger} disabled={chargement}>
            <RefreshCw className={chargement ? 'animate-spin' : undefined} />
            Actualiser
          </Button>
        </div>
      </div>

      {(recherche || filtres.length > 0) && (
        <div className="flex flex-wrap items-center gap-2">
          {recherche && (
            <div className="relative">
              <Search className="absolute left-2.5 top-2.5 size-4 text-muted-foreground" />
              <Input
                className="w-64 pl-8"
                placeholder={placeholderRecherche}
                value={rechercheSaisie}
                onChange={(e) => setRechercheSaisie(e.target.value)}
              />
            </div>
          )}
          {filtres.map((filtre) => (
            <Select
              key={filtre.cle}
              value={filtre.valeur}
              onValueChange={(v) => {
                filtre.onChanger?.(v)
                setPage(1)
              }}
            >
              <SelectTrigger className={filtre.largeur || 'w-44'}>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {filtre.options.map((option) => (
                  <SelectItem key={option.valeur} value={option.valeur}>
                    {option.libelle}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          ))}
        </div>
      )}

      {erreur && (
        <AlerteErreur
          message={message}
          aide={aideErreur}
          onReessayer={recharger}
        />
      )}

      <Card>
        <CardContent className="p-0">
          <SectionListe
            colonnes={colonnesAffichees}
            chargement={chargement}
            lignes={lignes}
            messageVide={erreur ? 'Données indisponibles.' : messageVide}
          />
        </CardContent>
      </Card>

      {pagination && !erreur && (
        <Pagination
          pagination={pagination}
          chargement={chargement}
          page={page}
          setPage={setPage}
          libelle={libelleNombre}
        />
      )}
    </div>
  )
}
