import { useEffect, useState } from 'react'
import { ChevronLeft, ChevronRight, Search } from 'lucide-react'

import AlerteErreur from '@/components/AlerteErreur'
import { Badge } from '@/components/ui/badge'
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
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { useApi } from '@/hooks/useApi'

const ZONES = ['Z1', 'Z2', 'Z3', 'Z4']

function LignesChargement() {
  return (
    <TableBody>
      {[0, 1, 2, 3, 4].map((i) => (
        <TableRow key={i}>
          <TableCell><Skeleton className="h-4 w-20" /></TableCell>
          <TableCell><Skeleton className="h-4 w-12" /></TableCell>
          <TableCell><Skeleton className="h-4 w-32" /></TableCell>
          <TableCell><Skeleton className="h-4 w-12" /></TableCell>
        </TableRow>
      ))}
    </TableBody>
  )
}

export default function Gares() {
  const [rechercheSaisie, setRechercheSaisie] = useState('')
  const [recherche, setRecherche] = useState('')
  const [zone, setZone] = useState('toutes')
  const [page, setPage] = useState(1)

  useEffect(() => {
    const minuteur = setTimeout(() => {
      setRecherche(rechercheSaisie)
      setPage(1)
    }, 300)
    return () => clearTimeout(minuteur)
  }, [rechercheSaisie])

  const { chargement, donnees, erreur, message, recharger } = useApi('/gares', {
    page,
    limit: 20,
    ...(recherche ? { search: recherche } : {}),
    ...(zone !== 'toutes' ? { zone } : {}),
  })

  const pagination = donnees?.pagination
  const gares = donnees?.donnees || []

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <h1 className="text-2xl font-semibold">Gares</h1>
        <div className="flex flex-wrap items-center gap-2">
          <div className="relative">
            <Search className="absolute left-2.5 top-2.5 size-4 text-muted-foreground" />
            <Input
              className="w-56 pl-8"
              placeholder="Rechercher (code, nom)…"
              value={rechercheSaisie}
              onChange={(e) => setRechercheSaisie(e.target.value)}
            />
          </div>
          <Select
            value={zone}
            onValueChange={(v) => {
              setZone(v)
              setPage(1)
            }}
          >
            <SelectTrigger className="w-36">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="toutes">Toutes les zones</SelectItem>
              {ZONES.map((z) => (
                <SelectItem key={z} value={z}>
                  {z}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {erreur && (
        <AlerteErreur
          message={message}
          aide="Démarrez PostgreSQL (docker compose up -d postgres), appliquez les migrations puis le seed."
          onReessayer={recharger}
        />
      )}

      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Code</TableHead>
                <TableHead>PK</TableHead>
                <TableHead>Nom</TableHead>
                <TableHead>Zone</TableHead>
              </TableRow>
            </TableHeader>
            {chargement ? (
              <LignesChargement />
            ) : (
              <TableBody>
                {gares.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={4} className="h-24 text-center text-muted-foreground">
                      Aucune gare ne correspond à la recherche.
                    </TableCell>
                  </TableRow>
                ) : (
                  gares.map((gare) => (
                    <TableRow key={gare.id}>
                      <TableCell className="font-medium">{gare.code}</TableCell>
                      <TableCell className="tabular-nums">{gare.pk}</TableCell>
                      <TableCell>{gare.nom || <span className="text-muted-foreground">—</span>}</TableCell>
                      <TableCell>
                        <Badge variant="outline">{gare.zone?.code || '—'}</Badge>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            )}
          </Table>
        </CardContent>
      </Card>

      {pagination && !erreur && (
        <div className="flex items-center justify-between">
          <p className="text-sm text-muted-foreground">
            {pagination.total} gare(s) — page {pagination.page} / {pagination.pages}
          </p>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              disabled={chargement || pagination.page <= 1}
              onClick={() => setPage((p) => p - 1)}
            >
              <ChevronLeft />
              Précédent
            </Button>
            <Button
              variant="outline"
              size="sm"
              disabled={chargement || pagination.page >= pagination.pages}
              onClick={() => setPage((p) => p + 1)}
            >
              Suivant
              <ChevronRight />
            </Button>
          </div>
        </div>
      )}
    </div>
  )
}
