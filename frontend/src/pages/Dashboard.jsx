import { useEffect, useState } from 'react'

import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import api, { messageApi } from '@/services/api'

const nf = new Intl.NumberFormat('fr-FR')

function CarteIndicateur({ titre, valeur, format = 'nombre' }) {
  const affiche =
    format === 'argent' ? `${nf.format(valeur)} Ar` : nf.format(valeur)
  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-medium text-muted-foreground">{titre}</CardTitle>
      </CardHeader>
      <CardContent>
        <p className="text-2xl font-semibold tabular-nums">{affiche}</p>
      </CardContent>
    </Card>
  )
}

export default function Dashboard() {
  const [etat, setEtat] = useState({ statut: 'chargement' })

  useEffect(() => {
    let actif = true
    api
      .get('/dashboard')
      .then((r) => {
        if (actif) setEtat({ statut: 'ok', donnees: r.data })
      })
      .catch((e) => {
        if (actif) setEtat({ statut: 'erreur', erreur: e })
      })
    return () => {
      actif = false
    }
  }, [])

  if (etat.statut === 'chargement') {
    return (
      <div className="space-y-4">
        <Skeleton className="h-8 w-64" />
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {[0, 1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-28" />
          ))}
        </div>
        <Skeleton className="h-48" />
      </div>
    )
  }

  if (etat.statut === 'erreur') {
    return (
      <div className="space-y-4">
        <h1 className="text-2xl font-semibold">Tableau de bord</h1>
        <Alert variant="destructive">
          <AlertTitle>Données indisponibles</AlertTitle>
          <AlertDescription>
            {messageApi(
              etat.erreur,
              'Impossible de charger le tableau de bord.'
            )}
            {' '}
            Démarrez PostgreSQL (docker compose up -d), appliquez les migrations
            (npx prisma migrate dev) puis lancez le seed (npm run prisma:seed).
          </AlertDescription>
        </Alert>
      </div>
    )
  }

  const { indicateurs, activiteRecente } = etat.donnees
  const activite = Array.isArray(activiteRecente) ? activiteRecente : []

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold">Tableau de bord</h1>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <CarteIndicateur titre="Billets vendus" valeur={indicateurs.billetsVendus} />
        <CarteIndicateur
          titre="Recette billetterie"
          valeur={indicateurs.recetteBillets}
          format="argent"
        />
        <CarteIndicateur titre="Envois de marchandises" valeur={indicateurs.nombreEnvois} />
        <CarteIndicateur titre="Poids expédié (kg)" valeur={indicateurs.poidsTotalKg} />
        <CarteIndicateur titre="Arrivages" valeur={indicateurs.nombreArrivages} />
        <CarteIndicateur titre="Locations" valeur={indicateurs.nombreLocations} />
        <CarteIndicateur
          titre="Recette locations"
          valeur={indicateurs.recetteLocations}
          format="argent"
        />
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Activité récente</CardTitle>
        </CardHeader>
        <CardContent>
          {activite.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              Aucune activité enregistrée.
            </p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Date</TableHead>
                  <TableHead>Utilisateur</TableHead>
                  <TableHead>Action</TableHead>
                  <TableHead>Entité</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {activite.map((ligne) => (
                  <TableRow key={ligne.id}>
                    <TableCell className="whitespace-nowrap">
                      {new Date(ligne.createdAt).toLocaleString('fr-FR')}
                    </TableCell>
                    <TableCell>{ligne.utilisateur?.nom || '—'}</TableCell>
                    <TableCell>{ligne.action}</TableCell>
                    <TableCell>{ligne.entite}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
