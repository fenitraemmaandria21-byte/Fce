import { useState } from 'react'
import { ClipboardCheck, RefreshCw } from 'lucide-react'
import { toast } from 'react-toastify'

import AlerteErreur from '@/components/AlerteErreur'
import SectionListe from '@/components/SectionListe'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { useAuth } from '@/context/AuthContext'
import { useApi } from '@/hooks/useApi'
import { formatArgent, formatDate } from '@/lib/affichage'
import { confirmerAction } from '@/lib/confirmation'
import api, { messageApi } from '@/services/api'

const PERIODES = [
  { valeur: 'aujourdhui', libelle: "Aujourd'hui" },
  { valeur: 'semaine', libelle: 'Cette semaine' },
  { valeur: 'mois', libelle: 'Ce mois' },
  { valeur: 'annee', libelle: 'Cette année' },
]

function BadgeStatutCaisse({ statut }) {
  if (statut === 'CLOTUREE') return <Badge variant="default">Clôturée</Badge>
  if (statut === 'OUVERTE') return <Badge variant="secondary">Ouverte</Badge>
  return (
    <Badge variant="outline" className="text-muted-foreground">
      Non comptée
    </Badge>
  )
}

// Couleur de l'écart : manquant (rouge) / excédent (ambre) / nul (vert).
function classeEcart(ecart) {
  if (ecart === null || ecart === undefined) return 'text-muted-foreground'
  if (ecart < 0) return 'text-destructive'
  if (ecart > 0) return 'text-amber-600 dark:text-amber-400'
  return 'text-emerald-600 dark:text-emerald-400'
}

function LigneInfo({ libelle, valeur, className }) {
  return (
    <div className="grid grid-cols-[11rem_1fr] items-center gap-3 text-sm">
      <dt className="text-muted-foreground">{libelle}</dt>
      <dd className={className || 'font-medium'}>{valeur}</dd>
    </div>
  )
}

function ZoneTexte({ className, ...props }) {
  return (
    <textarea
      data-slot="textarea"
      className={`w-full min-w-0 rounded-lg border border-input bg-transparent px-2.5 py-1.5 text-sm transition-colors outline-none placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 disabled:cursor-not-allowed disabled:opacity-50 ${className || ''}`}
      {...props}
    />
  )
}

function CarteTotal({ titre, valeur }) {
  return (
    <Card>
      <CardContent className="space-y-1 p-4">
        <p className="text-xs text-muted-foreground">{titre}</p>
        <p className="text-lg font-semibold">{formatArgent(valeur)}</p>
      </CardContent>
    </Card>
  )
}

// Journal de recettes : recettes par journée calculées automatiquement,
// avec comptage et clôture optionnels.
export default function Caisse() {
  const { utilisateur } = useAuth()
  const peutGerer = utilisateur && ['SUPERADMIN', 'ADMIN'].includes(utilisateur.role)

  const [periode, setPeriode] = useState('mois')
  const { chargement, donnees, erreur, message, recharger } = useApi('/caisse', { periode })

  const [detail, setDetail] = useState(null)
  const [montantSaisi, setMontantSaisi] = useState('')
  const [observationsSaisies, setObservationsSaisies] = useState('')
  const [enCours, setEnCours] = useState(false)

  const lignes = donnees?.donnees || []
  const totaux = lignes.reduce(
    (acc, l) => ({
      billetterie: acc.billetterie + (l.billetterie || 0),
      locations: acc.locations + (l.locations || 0),
      marchandises: acc.marchandises + (l.marchandises || 0),
      theorique: acc.theorique + (l.theorique || 0),
    }),
    { billetterie: 0, locations: 0, marchandises: 0, theorique: 0 },
  )

  const ouvrirDetail = (ligne) => {
    setDetail(ligne)
    setMontantSaisi(
      ligne.montantCompte === null || ligne.montantCompte === undefined
        ? ''
        : String(ligne.montantCompte),
    )
    setObservationsSaisies(ligne.observations || '')
  }

  const fermerDetail = () => setDetail(null)

  const montantCompte = () => (montantSaisi.trim() === '' ? null : Number(montantSaisi))

  const montantValide = () => {
    const m = montantCompte()
    if (m !== null && (!Number.isInteger(m) || m < 0)) {
      toast.error('Le montant compté doit être un entier positif.')
      return false
    }
    return true
  }

  const enregistrer = async () => {
    if (!montantValide()) return
    setEnCours(true)
    try {
      const corps = { montantCompte: montantCompte(), observations: observationsSaisies || null }
      if (detail.caisseId) {
        await api.put(`/caisse/${detail.caisseId}`, corps)
      } else {
        await api.post('/caisse', { date: detail.date, ...corps })
      }
      toast.success('Comptage enregistré.')
      fermerDetail()
      recharger()
    } catch (e) {
      toast.error(messageApi(e, 'Enregistrement impossible'))
    } finally {
      setEnCours(false)
    }
  }

  const cloturer = async () => {
    if (!montantValide()) return
    if (
      !(await confirmerAction({
        titre: 'Clôturer la journée de caisse',
        texte: `Confirmer la clôture de la caisse du ${formatDate(detail.date)} ? Cette action est définitive.`,
        libelleValider: 'Clôturer',
      }))
    ) {
      return
    }
    setEnCours(true)
    try {
      const corps = { montantCompte: montantCompte(), observations: observationsSaisies || null }
      let id = detail.caisseId
      if (!id) {
        const { data } = await api.post('/caisse', { date: detail.date, ...corps })
        id = data.donnees.caisseId
      }
      await api.post(`/caisse/${id}/cloturer`, corps)
      toast.success('Journée de caisse clôturée.')
      fermerDetail()
      recharger()
    } catch (e) {
      toast.error(messageApi(e, 'Clôture impossible'))
    } finally {
      setEnCours(false)
    }
  }

  const cloturee = detail?.statut === 'CLOTUREE'
  const peutEditer = peutGerer && !cloturee

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="space-y-1">
          <h1 className="text-2xl font-semibold">Caisse</h1>
          <p className="text-sm text-muted-foreground">
            Recettes par journée (billetterie, locations, marchandises), comptage et écart.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Select value={periode} onValueChange={setPeriode}>
            <SelectTrigger className="w-40">
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
          <Button variant="outline" size="sm" onClick={recharger} disabled={chargement}>
            <RefreshCw className={chargement ? 'animate-spin' : undefined} />
            Actualiser
          </Button>
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <CarteTotal titre="Total recettes" valeur={totaux.theorique} />
        <CarteTotal titre="Billetterie" valeur={totaux.billetterie} />
        <CarteTotal titre="Locations" valeur={totaux.locations} />
        <CarteTotal titre="Marchandises" valeur={totaux.marchandises} />
      </div>

      {erreur && <AlerteErreur message={message} onReessayer={recharger} />}

      <Card>
        <CardContent className="p-0">
          <SectionListe
            colonnes={[
              { titre: 'Date', rendre: (l) => formatDate(l.date) },
              { titre: 'Billetterie', align: 'right', rendre: (l) => formatArgent(l.billetterie) },
              { titre: 'Locations', align: 'right', rendre: (l) => formatArgent(l.locations) },
              {
                titre: 'Marchandises',
                align: 'right',
                rendre: (l) => formatArgent(l.marchandises),
              },
              { titre: 'Total', align: 'right', rendre: (l) => formatArgent(l.theorique) },
              {
                titre: 'Compté',
                align: 'right',
                rendre: (l) => (l.montantCompte === null ? '—' : formatArgent(l.montantCompte)),
              },
              {
                titre: 'Écart',
                align: 'right',
                rendre: (l) => <span className={classeEcart(l.ecart)}>{formatArgent(l.ecart)}</span>,
              },
              { titre: 'Statut', rendre: (l) => <BadgeStatutCaisse statut={l.statut} /> },
            ]}
            rendreActions={(l) => (
              <Button variant="ghost" size="sm" onClick={() => ouvrirDetail(l)}>
                <ClipboardCheck />
                {peutGerer ? 'Comptage' : 'Détail'}
              </Button>
            )}
            chargement={chargement}
            lignes={lignes}
            messageVide={message || 'Aucune recette sur cette période.'}
          />
        </CardContent>
      </Card>

      <Dialog
        open={Boolean(detail)}
        onOpenChange={(ouverture) => {
          if (!ouverture) fermerDetail()
        }}
      >
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Caisse du {detail?.date ? formatDate(detail.date) : '—'}</DialogTitle>
            <DialogDescription>
              Recettes attendues, comptage et écart de la journée.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <dl className="space-y-3">
              <LigneInfo libelle="Billetterie" valeur={formatArgent(detail?.billetterie)} />
              <LigneInfo libelle="Locations" valeur={formatArgent(detail?.locations)} />
              <LigneInfo libelle="Marchandises" valeur={formatArgent(detail?.marchandises)} />
              <LigneInfo libelle="Total attendu" valeur={formatArgent(detail?.theorique)} />
              <LigneInfo libelle="Statut" valeur={<BadgeStatutCaisse statut={detail?.statut} />} />
              {cloturee && (
                <>
                  <LigneInfo libelle="Montant compté" valeur={formatArgent(detail?.montantCompte)} />
                  <LigneInfo
                    libelle="Écart"
                    valeur={formatArgent(detail?.ecart)}
                    className={classeEcart(detail?.ecart)}
                  />
                  <LigneInfo libelle="Clôturée par" valeur={detail?.cloturePar || '—'} />
                  <LigneInfo libelle="Clôturée le" valeur={formatDate(detail?.clotureLe, true)} />
                </>
              )}
              {detail?.observations && (
                <LigneInfo libelle="Observations" valeur={detail.observations} />
              )}
            </dl>

            {peutEditer && (
              <div className="space-y-3 rounded-md border bg-muted/40 p-3">
                <p className="text-sm font-medium">Comptage de la journée</p>
                <div className="space-y-2">
                  <Label htmlFor="caisse-montant">Montant compté (Ar)</Label>
                  <Input
                    id="caisse-montant"
                    type="number"
                    min="0"
                    step="1"
                    value={montantSaisi}
                    onChange={(e) => setMontantSaisi(e.target.value)}
                    placeholder="Montant réellement constaté"
                  />
                </div>
                {montantSaisi.trim() !== '' && !Number.isNaN(Number(montantSaisi)) && (
                  <p
                    className={`text-sm ${classeEcart(Number(montantSaisi) - (detail?.theorique ?? 0))}`}
                  >
                    Écart : {formatArgent(Number(montantSaisi) - (detail?.theorique ?? 0))}
                  </p>
                )}
                <div className="space-y-2">
                  <Label htmlFor="caisse-obs">Observations</Label>
                  <ZoneTexte
                    id="caisse-obs"
                    value={observationsSaisies}
                    onChange={(e) => setObservationsSaisies(e.target.value)}
                    rows={2}
                  />
                </div>
                <div className="flex flex-wrap justify-end gap-2">
                  <Button variant="outline" onClick={enregistrer} disabled={enCours}>
                    Enregistrer le comptage
                  </Button>
                  <Button onClick={cloturer} disabled={enCours}>
                    Clôturer la journée
                  </Button>
                </div>
              </div>
            )}

            {!peutGerer && (
              <p className="text-sm text-muted-foreground">
                La saisie du comptage est réservée aux administrateurs.
              </p>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
