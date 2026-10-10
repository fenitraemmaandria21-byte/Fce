import { useEffect, useState } from 'react'
import { ChevronLeft, ChevronRight, Pencil, Search, Trash2 } from 'lucide-react'
import { toast } from 'react-toastify'
import { z } from 'zod'

import AlerteErreur from '@/components/AlerteErreur'
import DialogueFormulaire from '@/components/DialogueFormulaire'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
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
import { confirmerSuppression } from '@/lib/confirmation'
import api, { messageApi } from '@/services/api'

const ZONES = ['Z1', 'Z2', 'Z3', 'Z4']

const modificationSchema = z.object({
  code: z.string().trim().min(1, 'Le code est requis').max(10),
  nom: z.string().trim().max(120).optional(),
  pk: z.coerce.number().int('Le PK doit être un entier').positive('Le PK doit être positif'),
})

function LignesChargement() {
  return (
    <TableBody>
      {[0, 1, 2, 3, 4].map((i) => (
        <TableRow key={i}>
          <TableCell><Skeleton className="h-4 w-20" /></TableCell>
          <TableCell><Skeleton className="h-4 w-12" /></TableCell>
          <TableCell><Skeleton className="h-4 w-32" /></TableCell>
          <TableCell><Skeleton className="h-4 w-12" /></TableCell>
          <TableCell><Skeleton className="h-4 w-16" /></TableCell>
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

  const [dialogueOuvert, setDialogueOuvert] = useState(false)
  const [enEdition, setEnEdition] = useState(null)
  const [formulaire, setFormulaire] = useState({})
  const [erreurs, setErreurs] = useState({})
  const [enCours, setEnCours] = useState(false)
  const [erreurGlobale, setErreurGlobale] = useState(null)

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

  const ouvrirEdition = (gare) => {
    setEnEdition(gare)
    setFormulaire({
      code: gare.code,
      nom: gare.nom || '',
      pk: String(gare.pk),
    })
    setErreurs({})
    setErreurGlobale(null)
    setDialogueOuvert(true)
  }

  const modifierChamp = (cle, valeur) => {
    setFormulaire((f) => ({ ...f, [cle]: valeur }))
    setErreurs((e) => ({ ...e, [cle]: undefined }))
  }

  const soumettre = async () => {
    const resultat = modificationSchema.safeParse(formulaire)
    if (!resultat.success) {
      const suivantes = {}
      for (const probleme of resultat.error.issues) {
        suivantes[probleme.path[0]] = probleme.message
      }
      setErreurs(suivantes)
      setErreurGlobale(null)
      return
    }
    setEnCours(true)
    setErreurGlobale(null)
    try {
      const charge = { ...resultat.data }
      if (!charge.nom) charge.nom = null
      await api.put(`/gares/${enEdition.id}`, charge)
      toast.success('Gare modifiée.')
      setDialogueOuvert(false)
      recharger()
    } catch (e) {
      setErreurGlobale(messageApi(e, 'Enregistrement impossible'))
    } finally {
      setEnCours(false)
    }
  }

  const supprimer = async (gare) => {
    if (!(await confirmerSuppression(`Supprimer la gare ${gare.code} (${gare.nom || 'sans nom'}) ?`))) return
    try {
      await api.delete(`/gares/${gare.id}`)
      toast.success('Gare supprimée.')
      recharger()
    } catch (e) {
      toast.error(messageApi(e, 'Suppression impossible'))
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <p className="text-sm text-muted-foreground">
          Gares de la ligne (Fianarantsoa → Manakara). Modifier ou supprimer est réservé
          au superadministrateur.
        </p>
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
                <TableHead className="text-right">PK</TableHead>
                <TableHead>Nom</TableHead>
                <TableHead>Zone</TableHead>
                <TableHead className="w-20 text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            {chargement ? (
              <LignesChargement />
            ) : (
              <TableBody>
                {gares.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={5} className="h-24 text-center text-muted-foreground">
                      Aucune gare ne correspond à la recherche.
                    </TableCell>
                  </TableRow>
                ) : (
                  gares.map((gare) => (
                    <TableRow key={gare.id}>
                      <TableCell className="font-medium">{gare.code}</TableCell>
                      <TableCell className="text-right tabular-nums">{gare.pk}</TableCell>
                      <TableCell>{gare.nom || <span className="text-muted-foreground">—</span>}</TableCell>
                      <TableCell>
                        <Badge variant="outline">{gare.zone?.code || '—'}</Badge>
                      </TableCell>
                      <TableCell>
                        <div className="flex justify-end gap-1">
                          <Button
                            variant="ghost"
                            size="sm"
                            title="Modifier"
                            onClick={() => ouvrirEdition(gare)}
                          >
                            <Pencil />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            title="Supprimer"
                            onClick={() => supprimer(gare)}
                          >
                            <Trash2 />
                          </Button>
                        </div>
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

      <DialogueFormulaire
        ouvert={dialogueOuvert}
        onFermer={() => setDialogueOuvert(false)}
        titre={enEdition ? `Modifier ${enEdition.code}` : 'Modifier la gare'}
        description="Renseignez le nom officiel de la gare ; le code et le PK doivent rester uniques."
        messageErreur={erreurGlobale}
        enCours={enCours}
        onSoumettre={soumettre}
        libelleValider="Enregistrer"
      >
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="gare-code">Code</Label>
            <Input
              id="gare-code"
              value={formulaire.code}
              onChange={(e) => modifierChamp('code', e.target.value.toUpperCase())}
              placeholder="FIA"
            />
            {erreurs.code && <p className="text-sm text-destructive">{erreurs.code}</p>}
          </div>
          <div className="space-y-2">
            <Label htmlFor="gare-pk">PK</Label>
            <Input
              id="gare-pk"
              type="number"
              value={formulaire.pk}
              onChange={(e) => modifierChamp('pk', e.target.value)}
              placeholder="480"
            />
            {erreurs.pk && <p className="text-sm text-destructive">{erreurs.pk}</p>}
          </div>
        </div>
        <div className="space-y-2">
          <Label htmlFor="gare-nom">Nom</Label>
          <Input
            id="gare-nom"
            value={formulaire.nom}
            onChange={(e) => modifierChamp('nom', e.target.value)}
            placeholder="Nom officiel de la gare"
          />
          {erreurs.nom && <p className="text-sm text-destructive">{erreurs.nom}</p>}
        </div>
      </DialogueFormulaire>
    </div>
  )
}