import { useEffect, useState } from 'react'
import { LayoutGrid, List, RefreshCw, Search } from 'lucide-react'

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
import { Skeleton } from '@/components/ui/skeleton'
import { useApi } from '@/hooks/useApi'

// Page de liste paginée avec recherche, filtres et actions par ligne.
// filtres : [{ cle, valeur, options:[{valeur,libelle}], onChanger, largeur }]
// rendreCarte : (ligne, actions) => JSX — affiche une vue « Carte » avec bascule.
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
  rendreCarte = null,
  aideErreur,
  libelleNombre = 'élément(s)',
  apiRef = null,
}) {
  const [rechercheSaisie, setRechercheSaisie] = useState('')
  const [rechercheActive, setRechercheActive] = useState('')
  const [page, setPage] = useState(1)
  const [vue, setVue] = useState('tableau')

  useEffect(() => {
    const minuteur = setTimeout(() => {
      setRechercheActive(rechercheSaisie)
      setPage(1)
    }, 300)
    return () => clearTimeout(minuteur)
  }, [rechercheSaisie])

  const paramsFiltres = {}
  for (const filtre of filtres) {
    if (filtre.valeur && filtre.valeur !== 'toutes' && filtre.valeur !== 'tous') {
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
        {!rendreCarte && (
          <div className="flex flex-wrap items-center gap-2">
            {actions}
            <Button variant="outline" size="sm" onClick={recharger} disabled={chargement}>
              <RefreshCw className={chargement ? 'animate-spin' : undefined} />
              Actualiser
            </Button>
          </div>
        )}
      </div>

      {(recherche || filtres.length > 0 || rendreCarte) && (
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
          {rendreCarte && (
            <div className="ml-auto flex items-center gap-2">
              {actions}
              <div
                className="flex items-center gap-1 rounded-md border border-foreground/20 p-1"
                role="group"
                aria-label="Mode d'affichage"
              >
                <Button
                  variant={vue === 'carte' ? 'default' : 'ghost'}
                  size="sm"
                  onClick={() => setVue('carte')}
                >
                  <LayoutGrid className="size-4" />
                  Carte
                </Button>
                <Button
                  variant={vue === 'tableau' ? 'default' : 'ghost'}
                  size="sm"
                  onClick={() => setVue('tableau')}
                >
                  <List className="size-4" />
                  Tableau
                </Button>
              </div>
            </div>
          )}
        </div>
      )}

      {erreur && (
        <AlerteErreur
          message={message}
          aide={aideErreur}
          onReessayer={recharger}
        />
      )}

      {vue === 'carte' && rendreCarte ? (
        <div>
          {chargement ? (
            <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
              {Array.from({ length: 6 }).map((_, i) => (
                <Card key={i}>
                  <CardContent className="space-y-3 p-4">
                    <div className="flex items-start justify-between gap-2">
                      <Skeleton className="h-5 w-2/3" />
                      <Skeleton className="h-5 w-20" />
                    </div>
                    <Skeleton className="h-4 w-full" />
                    <Skeleton className="h-4 w-4/5" />
                    <Skeleton className="h-4 w-3/5" />
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : lignes.length === 0 ? (
            <Card>
              <CardContent className="py-10 text-center text-sm text-muted-foreground">
                {erreur ? 'Données indisponibles.' : messageVide}
              </CardContent>
            </Card>
          ) : (
            <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
              {lignes.map((ligne) => (
                <Card key={ligne.id} className="h-full">
                  <CardContent className="flex h-full flex-col gap-3 p-4">
                    {rendreCarte(ligne, rendreActions && rendreActions(ligne))}
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </div>
      ) : (
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
      )}

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
