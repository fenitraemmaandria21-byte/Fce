import { Download } from 'lucide-react'
import { useState } from 'react'

import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'

import SectionListe from '@/components/SectionListe'
import { useApi } from '@/hooks/useApi'
import {
  BadgeStatut,
  LIBELLES_CLASSE,
  LIBELLES_STATUT,
  LIBELLES_TYPE_LOCATION,
  formatArgent,
  formatNombre,
} from '@/lib/affichage'
import { exporterXlsx } from '@/lib/exporterExcel'

const PERIODES = [
  { valeur: 'aujourdhui', libelle: 'Aujourd’hui' },
  { valeur: 'semaine', libelle: 'Cette semaine' },
  { valeur: 'mois', libelle: 'Ce mois-ci' },
  { valeur: 'annee', libelle: 'Cette année' },
]

function InfoStat({ libelle, valeur, note }) {
  return (
    <div className="rounded-lg border border-foreground/20 p-4">
      <p className="text-sm text-muted-foreground">{libelle}</p>
      <p className="mt-1 text-2xl font-semibold tabular-nums">{valeur}</p>
      {note && <p className="text-xs text-muted-foreground">{note}</p>}
    </div>
  )
}

function TitreCarte({ enfants, couleur }) {
  return (
    <CardTitle className="flex items-center gap-2 text-base">
      <span className={`size-2.5 shrink-0 rounded-full ${couleur}`} />
      {enfants}
    </CardTitle>
  )
}

function LigneVide({ donnees, message }) {
  if (donnees?.length > 0) return null
  return (
    <p className="py-4 text-center text-sm text-muted-foreground">
      {message || 'Aucune donnée pour cette période.'}
    </p>
  )
}

function Tableau({ lignes, colonnes }) {
  return (
    <SectionListe
      chargement={false}
      lignes={lignes}
      colonnes={colonnes}
      messageVide="Aucune donnée pour cette période."
    />
  )
}

function formaterMois(valeur) {
  const d = new Date(`${valeur}T00:00:00`)
  if (Number.isNaN(d.getTime())) return valeur
  return new Intl.DateTimeFormat('fr-FR', { month: 'long', year: 'numeric' }).format(d)
}

export default function Statistiques({ sansTitre = false }) {
  const [periode, setPeriode] = useState('mois')

  const billeterie = useApi('/statistiques/billetterie', { periode })
  const marchandises = useApi('/statistiques/marchandises', { periode })
  const arrivages = useApi('/statistiques/arrivages', { periode })
  const location = useApi('/statistiques/location', { periode })
  const recettes = useApi('/statistiques/recettes', { periode })

  const appelReussi = (resultat) => !resultat.erreur && resultat.donnees != null

  const selecteurPeriode = (
    <Select value={periode} onValueChange={setPeriode}>
      <SelectTrigger className="w-44">
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        {PERIODES.map((p) => (
          <SelectItem key={p.valeur} value={p.valeur}>
            {p.libelle}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  )

  const exporter = () => {
    const feuilles = []
    if (appelReussi(billeterie) && billeterie.donnees.parClasse?.donnees?.length) {
      feuilles.push({
        titre: 'Billetterie',
        lignes: [
          ['Classe', 'Nombre', 'Montant (Ar)'],
          ...billeterie.donnees.parClasse.donnees.map((l) => [
            LIBELLES_CLASSE[l.classe] || l.classe,
            l.nombre,
            l.montant,
          ]),
        ],
      })
    }
    if (appelReussi(marchandises) && marchandises.donnees.parDestination?.donnees?.length) {
      feuilles.push({
        titre: 'Marchandises',
        lignes: [
          ['Destination', 'Nombre'],
          ...marchandises.donnees.parDestination.donnees.map((l) => [l.destination, l.nombre]),
        ],
      })
    }
    if (appelReussi(arrivages) && arrivages.donnees.parStatut?.donnees?.length) {
      feuilles.push({
        titre: 'Arrivages',
        lignes: [
          ['Statut', 'Nombre'],
          ...arrivages.donnees.parStatut.donnees.map((l) => [LIBELLES_STATUT[l.statut] || l.statut, l.nombre]),
        ],
      })
    }
    if (appelReussi(location) && location.donnees.parType?.donnees?.length) {
      feuilles.push({
        titre: 'Locations',
        lignes: [
          ['Type', 'Nombre', 'Montant (Ar)'],
          ...location.donnees.parType.donnees.map((l) => [
            LIBELLES_TYPE_LOCATION[l.type] || l.type,
            l.nombre,
            l.montant,
          ]),
        ],
      })
    }
    if (appelReussi(recettes) && recettes.donnees.parMois?.donnees?.length) {
      feuilles.push({
        titre: 'Recettes',
        lignes: [
          ['Mois', 'Billetterie (Ar)', 'Locations (Ar)', 'Total (Ar)'],
          ...recettes.donnees.parMois.donnees.map((l) => [
            formaterMois(l.mois),
            l.billets,
            l.locations,
            l.total,
          ]),
        ],
      })
    }
    exporterXlsx(`statistiques-${periode}.xlsx`, feuilles)
  }

  const aDesDonnees = (r) =>
    appelReussi(r) &&
    (r.donnees.parClasse?.donnees?.length ||
      r.donnees.parDestination?.donnees?.length ||
      r.donnees.parStatut?.donnees?.length ||
      r.donnees.parType?.donnees?.length ||
      r.donnees.parMois?.donnees?.length)

  const peutExporter =
    [billeterie, marchandises, arrivages, location, recettes].some(aDesDonnees)

  const boutonExport = (
    <Button variant="outline" size="sm" onClick={exporter} disabled={!peutExporter}>
      <Download /> Exporter en Excel
    </Button>
  )

  return (
    <div className="space-y-6">
      {sansTitre ? (
        <div className="flex flex-wrap items-center justify-end gap-3">
          {boutonExport}
          {selecteurPeriode}
        </div>
      ) : (
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="space-y-1">
            <h1 className="text-2xl font-semibold">Statistiques</h1>
            <p className="text-sm text-muted-foreground">
              Indicateurs réels (billets vendus, envois, arrivages, locations, recettes).
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            {boutonExport}
            {selecteurPeriode}
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <Card>
          <CardHeader>
            <TitreCarte couleur="bg-fce-500">Billetterie</TitreCarte>
          </CardHeader>
          <CardContent className="space-y-3">
            {appelReussi(billeterie) ? (
              <>
                <div className="grid grid-cols-2 gap-3">
                  <InfoStat libelle="Billets vendus" valeur={formatNombre(billeterie.donnees.total.nombre)} />
                  <InfoStat libelle="Recette" valeur={formatArgent(billeterie.donnees.total.montant)} />
                </div>
                <LigneVide donnees={billeterie.donnees.parClasse?.donnees} />
                <Tableau
                  lignes={billeterie.donnees.parClasse?.donnees || []}
                  colonnes={[
                    { titre: 'Classe', rendre: (l) => LIBELLES_CLASSE[l.classe] || l.classe },
                    { titre: 'Nombre', align: 'right', rendre: (l) => formatNombre(l.nombre) },
                    { titre: 'Montant', align: 'right', rendre: (l) => formatArgent(l.montant) },
                  ]}
                />
              </>
            ) : (
              <p className="text-sm text-muted-foreground">
                {billeterie.message || 'Données indisponibles.'}
              </p>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <TitreCarte couleur="bg-blue-500">Marchandises</TitreCarte>
          </CardHeader>
          <CardContent className="space-y-3">
            {appelReussi(marchandises) ? (
              <>
                <div className="grid grid-cols-3 gap-3">
                  <InfoStat libelle="Envois" valeur={formatNombre(marchandises.donnees.total.nombre)} />
                  <InfoStat libelle="Colis" valeur={formatNombre(marchandises.donnees.total.colisTotal)} />
                  <InfoStat libelle="Poids" valeur={`${formatNombre(marchandises.donnees.total.poidsTotal)} kg`} />
                </div>
                <LigneVide donnees={marchandises.donnees.parDestination?.donnees} />
                <Tableau
                  lignes={marchandises.donnees.parDestination?.donnees || []}
                  colonnes={[
                    { titre: 'Destination', cle: 'destination', tronquer: true },
                    { titre: 'Nombre', align: 'right', rendre: (l) => formatNombre(l.nombre) },
                  ]}
                />
              </>
            ) : (
              <p className="text-sm text-muted-foreground">
                {marchandises.message || 'Données indisponibles.'}
              </p>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <TitreCarte couleur="bg-fce-500">Arrivages</TitreCarte>
          </CardHeader>
          <CardContent className="space-y-3">
            {appelReussi(arrivages) ? (
              <>
                <InfoStat libelle="Arrivages" valeur={formatNombre(arrivages.donnees.total.nombre)} />
                <LigneVide donnees={arrivages.donnees.parStatut?.donnees} />
                <Tableau
                  lignes={arrivages.donnees.parStatut?.donnees || []}
                  colonnes={[
                    { titre: 'Statut', rendre: (l) => <BadgeStatut statut={l.statut} /> },
                    { titre: 'Nombre', align: 'right', rendre: (l) => formatNombre(l.nombre) },
                  ]}
                />
              </>
            ) : (
              <p className="text-sm text-muted-foreground">
                {arrivages.message || 'Données indisponibles.'}
              </p>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <TitreCarte couleur="bg-blue-500">Locations</TitreCarte>
          </CardHeader>
          <CardContent className="space-y-3">
            {appelReussi(location) ? (
              <>
                <div className="grid grid-cols-2 gap-3">
                  <InfoStat libelle="Demandes" valeur={formatNombre(location.donnees.total.nombre)} />
                  <InfoStat libelle="Recette validée" valeur={formatArgent(location.donnees.total.montant)} />
                </div>
                <LigneVide donnees={location.donnees.parType?.donnees} />
                <Tableau
                  lignes={location.donnees.parType?.donnees || []}
                  colonnes={[
                    { titre: 'Type', rendre: (l) => LIBELLES_TYPE_LOCATION[l.type] || l.type },
                    { titre: 'Nombre', align: 'right', rendre: (l) => formatNombre(l.nombre) },
                    { titre: 'Montant', align: 'right', rendre: (l) => formatArgent(l.montant) },
                  ]}
                />
              </>
            ) : (
              <p className="text-sm text-muted-foreground">
                {location.message || 'Données indisponibles.'}
              </p>
            )}
          </CardContent>
        </Card>

        <Card className="sm:col-span-2 lg:col-span-2">
          <CardHeader>
            <TitreCarte couleur="bg-fce-500">Recettes (billetterie + locations)</TitreCarte>
          </CardHeader>
          <CardContent className="space-y-3">
            {appelReussi(recettes) ? (
              <>
                <div className="grid grid-cols-3 gap-3">
                  <InfoStat libelle="Billetterie" valeur={formatArgent(recettes.donnees.total.billetterie)} />
                  <InfoStat libelle="Locations" valeur={formatArgent(recettes.donnees.total.location)} />
                  <InfoStat libelle="Cumul" valeur={formatArgent(recettes.donnees.total.cumul)} />
                </div>
                <LigneVide donnees={recettes.donnees.parMois?.donnees} />
                <Tableau
                  lignes={recettes.donnees.parMois?.donnees || []}
                  colonnes={[
                    { titre: 'Mois', rendre: (l) => formaterMois(l.mois) },
                    { titre: 'Billets', align: 'right', rendre: (l) => formatArgent(l.billets) },
                    { titre: 'Locations', align: 'right', rendre: (l) => formatArgent(l.locations) },
                    { titre: 'Total', align: 'right', rendre: (l) => <span className="font-medium tabular-nums">{formatArgent(l.total)}</span> },
                  ]}
                />
              </>
            ) : (
              <p className="text-sm text-muted-foreground">
                {recettes.message || 'Données indisponibles.'}
              </p>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}