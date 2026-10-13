import { Loader2 } from 'lucide-react'
import { useEffect, useState } from 'react'

import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { LIBELLES_CLASSE } from '@/lib/affichage'
import api, { messageApi } from '@/services/api'

// Plan visuel d'une voiture : places disponibles, occupées et sélectionnée.
// Les places déjà vendues (billets VENDU de la voiture à la date) sont
// désactivées. La disposition est une grille 2 + couloir + 2.
const PLACES_PAR_RANGEE = 4

function ClassePlace({ numero, occupee, selectionnee, onChoisir }) {
  const base =
    'flex h-8 items-center justify-center rounded-md border text-xs tabular-nums transition-colors'
  let style = 'border-border bg-background hover:border-primary hover:bg-primary/10'
  if (occupee) {
    style = 'cursor-not-allowed border-transparent bg-muted text-muted-foreground/50 line-through'
  } else if (selectionnee) {
    style = 'border-primary bg-primary font-semibold text-primary-foreground'
  }

  return (
    <button
      type="button"
      disabled={occupee}
      onClick={() => !occupee && onChoisir(String(numero))}
      className={`${base} ${style}`}
      title={occupee ? `Place ${numero} occupée` : `Place ${numero} disponible`}
      aria-label={`Place ${numero}`}
    >
      {numero}
    </button>
  )
}

export default function PlanPlaces({
  ouvert,
  onFermer,
  voiture,
  dateVoyage,
  placeSelectionnee,
  onChoisir,
}) {
  const [chargement, setChargement] = useState(false)
  const [erreur, setErreur] = useState(null)
  const [occupation, setOccupation] = useState(null)

  useEffect(() => {
    if (!ouvert || !voiture?.id || !dateVoyage) return undefined
    let ignore = false
    setChargement(true)
    setErreur(null)
    api
      .get('/billets/occupation', {
        params: { voitureId: voiture.id, dateVoyage },
      })
      .then(({ data }) => {
        if (!ignore) setOccupation(data)
      })
      .catch((e) => {
        if (!ignore) setErreur(messageApi(e, 'Plan des places indisponible'))
      })
      .finally(() => {
        if (!ignore) setChargement(false)
      })
    return () => {
      ignore = true
    }
  }, [ouvert, voiture?.id, dateVoyage])

  const capacite = occupation?.voiture?.places ?? voiture?.places ?? 0
  const occupees = new Set(occupation?.placesOccupees || [])
  const nbRangees = capacite ? Math.ceil(capacite / PLACES_PAR_RANGEE) : 0
  const selection = placeSelectionnee ? String(placeSelectionnee) : null
  const nbOccupees = occupees.size

  const choisir = (numero) => {
    onChoisir(numero)
    onFermer()
  }

  return (
    <Dialog open={ouvert} onOpenChange={(o) => !o && onFermer()}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>
            Plan de la voiture {voiture?.code || ''}
            {voiture?.classe ? ` — ${LIBELLES_CLASSE[voiture.classe] || voiture.classe}` : ''}
          </DialogTitle>
          <DialogDescription>
            {dateVoyage
              ? `Places à la date du ${new Date(dateVoyage).toLocaleDateString('fr-FR')}.`
              : 'Sélectionnez d’abord une date de voyage.'}
          </DialogDescription>
        </DialogHeader>

        <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-xs">
          <span className="flex items-center gap-1.5">
            <span className="size-3 rounded border border-border bg-background" />
            Disponible
          </span>
          <span className="flex items-center gap-1.5">
            <span className="size-3 rounded bg-muted" />
            Occupée
          </span>
          <span className="flex items-center gap-1.5">
            <span className="size-3 rounded bg-primary" />
            Sélectionnée
          </span>
          {capacite > 0 && (
            <span className="ml-auto text-muted-foreground">
              {capacite - nbOccupees} libre(s) · {nbOccupees} occupée(s)
            </span>
          )}
        </div>

        <div className="max-h-[55vh] overflow-y-auto pr-1">
          {chargement && (
            <div className="flex items-center justify-center gap-2 py-10 text-sm text-muted-foreground">
              <Loader2 className="size-4 animate-spin" />
              Chargement des places…
            </div>
          )}
          {!chargement && erreur && (
            <p className="py-6 text-center text-sm text-destructive">{erreur}</p>
          )}
          {!chargement && !erreur && nbRangees === 0 && (
            <p className="py-6 text-center text-sm text-muted-foreground">
              Aucune place à afficher pour cette voiture.
            </p>
          )}
          {!chargement && !erreur && nbRangees > 0 && (
            <div className="space-y-1.5">
              {Array.from({ length: nbRangees }, (_, rangee) => {
                const debut = rangee * PLACES_PAR_RANGEE
                const numeros = [1, 2, 3, 4]
                  .map((offset) => debut + offset)
                  .filter((n) => n <= capacite)
                const cellule = (numero, colonne) =>
                  numero === undefined ? (
                    <span key={colonne} />
                  ) : (
                    <ClassePlace
                      key={colonne}
                      numero={numero}
                      occupee={occupees.has(numero)}
                      selectionnee={selection === String(numero)}
                      onChoisir={choisir}
                    />
                  )
                return (
                  <div key={rangee} className="grid grid-cols-5 items-center gap-1.5">
                    {cellule(numeros[0], 0)}
                    {cellule(numeros[1], 1)}
                    <span className="text-center text-xs text-muted-foreground">{rangee + 1}</span>
                    {cellule(numeros[2], 2)}
                    {cellule(numeros[3], 3)}
                  </div>
                )
              })}
            </div>
          )}
        </div>

        <DialogFooter>
          <Button type="button" variant="outline" onClick={onFermer}>
            Fermer
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
