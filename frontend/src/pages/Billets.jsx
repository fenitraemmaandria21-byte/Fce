import { Pencil, Plus, Printer, Trash2 } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import { toast } from 'react-toastify'
import { z } from 'zod'

import DialogueFormulaire from '@/components/DialogueFormulaire'
import PageTable from '@/components/PageTable'
import TicketBillet from '@/components/TicketBillet'
import { Button } from '@/components/ui/button'
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
import { confirmerAction, confirmerSuppression } from '@/lib/confirmation'
import api, { messageApi } from '@/services/api'
import {
  BadgeStatut,
  LIBELLES_CATEGORIE,
  LIBELLES_CLASSE,
  formatArgent,
  formatDate,
} from '@/lib/affichage'

const CLASSES = [
  { valeur: 'PREMIERE_CLASSE', libelle: '1re classe' },
  { valeur: 'RESERVATION_RESIDENT', libelle: 'Réservation résident' },
  { valeur: 'RESERVATION_NON_RESIDENT', libelle: 'Réservation non-résident' },
]

const VENTE_VIDE = {
  voyageurNom: '',
  voyageurIdentite: '',
  typeIdentite: 'CIN',
  categorie: 'ADULTE',
  destinationId: '',
  classe: 'PREMIERE_CLASSE',
  dateVoyage: '',
  trainId: 'aucun',
  voitureId: 'aucune',
  place: '',
}

const venteSchema = z
  .object({
    voyageurNom: z.string().trim().min(2, 'Nom du voyageur requis').max(120),
    voyageurIdentite: z.string().trim().min(1, 'Numéro de pièce requis').max(40),
    typeIdentite: z.enum(['CIN', 'PASSEPORT']),
    categorie: z.enum(['ADULTE', 'ENFANT']),
    destinationId: z.string().min(1, 'Gare de destination requise'),
    classe: z.enum(['PREMIERE_CLASSE', 'RESERVATION_RESIDENT', 'RESERVATION_NON_RESIDENT']),
    dateVoyage: z.string().min(1, 'Date de voyage requise'),
    trainId: z.string().optional(),
    voitureId: z.string().optional(),
    place: z.string().trim().max(20).optional(),
  })
  .superRefine((valeur, ctx) => {
    if (valeur.classe === 'RESERVATION_RESIDENT' && valeur.typeIdentite !== 'CIN') {
      ctx.addIssue({
        code: 'custom',
        path: ['typeIdentite'],
        message: 'Réservation résident : CIN obligatoire',
      })
    }
    if (valeur.classe === 'RESERVATION_NON_RESIDENT' && valeur.typeIdentite !== 'PASSEPORT') {
      ctx.addIssue({
        code: 'custom',
        path: ['typeIdentite'],
        message: 'Réservation non-résident : passeport obligatoire',
      })
    }
  })

export default function Billets() {
  const { utilisateur } = useAuth()
  const peutAnnuler = utilisateur && ['SUPERADMIN', 'ADMIN'].includes(utilisateur.role)

  const [statut, setStatut] = useState('tous')
  const [classe, setClasse] = useState('toutes')
  const [venteOuverte, setVenteOuverte] = useState(false)
  const [formulaire, setFormulaire] = useState(VENTE_VIDE)
  const [erreurs, setErreurs] = useState({})
  const [enCours, setEnCours] = useState(false)
  const [erreurGlobale, setErreurGlobale] = useState(null)
  const [edition, setEdition] = useState(null)
  const [aImprimer, setAImprimer] = useState(null)
  const rechargerRef = useRef(null)

  useEffect(() => {
    if (!aImprimer) return undefined
    const minuteur = setTimeout(() => {
      window.print()
      setAImprimer(null)
    }, 150)
    return () => clearTimeout(minuteur)
  }, [aImprimer])

  const gares = useApi('/gares', { limit: 100 })
  const trains = useApi('/trains')
  const voitures = useApi('/voitures')

  const versDateInput = (iso) => (iso ? new Date(iso).toISOString().slice(0, 10) : '')

  const ouvrirVente = () => {
    setEdition(null)
    setFormulaire(VENTE_VIDE)
    setErreurs({})
    setErreurGlobale(null)
    setVenteOuverte(true)
  }

  const ouvrirEdition = async (l) => {
    setErreurs({})
    setErreurGlobale(null)
    try {
      const { data } = await api.get(`/billets/${l.id}`)
      setEdition(data)
      setFormulaire({
        voyageurNom: data.voyageurNom || '',
        voyageurIdentite: data.voyageurIdentite || '',
        typeIdentite: data.typeIdentite || 'CIN',
        categorie: data.categorie || 'ADULTE',
        destinationId: data.destinationId || data.destination?.id || '',
        classe: data.classe || 'PREMIERE_CLASSE',
        dateVoyage: versDateInput(data.dateVoyage),
        trainId: data.trainId || 'aucun',
        voitureId: data.voitureId || 'aucune',
        place: data.place || '',
      })
      setVenteOuverte(true)
    } catch (erreur) {
      toast.error(messageApi(erreur, 'Chargement du billet impossible'))
    }
  }

  const modifierChamp = (cle, valeur) => {
    setFormulaire((f) => ({ ...f, [cle]: valeur }))
    setErreurs((e) => ({ ...e, [cle]: undefined }))
  }

  const soumettreVente = async () => {
    const resultat = venteSchema.safeParse(formulaire)
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
      const { dateVoyage, trainId, voitureId, place, ...reste } = resultat.data
      const corps = {
        ...reste,
        dateVoyage: new Date(dateVoyage).toISOString(),
        ...(trainId && trainId !== 'aucun' ? { trainId } : {}),
        ...(voitureId && voitureId !== 'aucune' ? { voitureId } : {}),
        ...(place ? { place } : {}),
      }
      if (edition) {
        await api.put(`/billets/${edition.id}`, corps)
        toast.success('Billet modifié.')
      } else {
        await api.post('/billets', corps)
        toast.success('Billet vendu.')
      }
      setEdition(null)
      setVenteOuverte(false)
      rechargerRef.current?.()
    } catch (erreur) {
      setErreurGlobale(messageApi(erreur, 'Vente impossible'))
    } finally {
      setEnCours(false)
    }
  }

  const imprimer = async (l) => {
    try {
      const { data } = await api.get(`/billets/${l.id}`)
      setAImprimer(data)
    } catch (erreur) {
      toast.error(messageApi(erreur, 'Impression impossible'))
    }
  }

  const annuler = async (billet) => {
    const confirme = await confirmerAction({
      titre: 'Annuler le billet',
      texte: `Billet ${billet.numero || ''} de ${billet.voyageurNom} (${formatArgent(billet.tarif)}). Le billet passera au statut « Annulé » et sera exclu des recettes.`,
      libelleConfirmer: 'Confirmer l’annulation',
      icone: 'warning',
      couleurConfirmer: '#dc2626',
    })
    if (!confirme) return
    setEnCours(true)
    try {
      await api.post(`/billets/${billet.id}/annuler`)
      toast.success('Billet annulé.')
      rechargerRef.current?.()
    } catch (erreur) {
      toast.error(messageApi(erreur, 'Annulation impossible'))
    } finally {
      setEnCours(false)
    }
  }

  const supprimer = async (l) => {
    if (!(await confirmerSuppression(`Supprimer le billet ${l.numero || ''} de ${l.voyageurNom} ?`))) return
    setEnCours(true)
    try {
      await api.delete(`/billets/${l.id}`)
      toast.success('Billet supprimé.')
      rechargerRef.current?.()
    } catch (erreur) {
      toast.error(messageApi(erreur, 'Suppression impossible'))
    } finally {
      setEnCours(false)
    }
  }

  const facturetarif = (l) => {
    if (l.tarif === null || l.tarif === undefined) return formatArgent(null)
    return formatArgent(l.tarif)
  }

  return (
    <div className="space-y-4">
      <PageTable
        titre="Billetterie"
        description="Vente de billets : la zone est déduite automatiquement de la destination. Enfant : demi-tarif (6 250 Ar). Numéro généré automatiquement (FCE-<année>-<séquence>)."
        endpoint="/billets"
        libelleNombre="billet(s)"
        placeholderRecherche="Rechercher (n°, voyageur, pièce)…"
        messageVide="Aucun billet."
        apiRef={rechargerRef}
        actions={
          <DialogueFormulaire
            ouvert={venteOuverte}
            onOuvrir={ouvrirVente}
            onFermer={() => setVenteOuverte(false)}
            libelleOuvrir={
              <>
                <Plus />
                Vendre un billet
              </>
            }
            titre={edition ? 'Modifier le billet' : 'Vendre un billet'}
            description="Tarif appliqué automatiquement d’après la destination, le type de voyageur et la classe."
            messageErreur={erreurGlobale}
            enCours={enCours}
            onSoumettre={soumettreVente}
            libelleValider={edition ? 'Enregistrer' : 'Vendre'}
          >
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label>Nom du voyageur</Label>
                <Input
                  value={formulaire.voyageurNom}
                  onChange={(e) => modifierChamp('voyageurNom', e.target.value)}
                  placeholder="Nom et prénom"
                />
                {erreurs.voyageurNom && (
                  <p className="text-sm text-destructive">{erreurs.voyageurNom}</p>
                )}
              </div>
              <div className="space-y-2">
                <Label>Catégorie</Label>
                <Select
                  value={formulaire.categorie}
                  onValueChange={(v) => modifierChamp('categorie', v)}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {Object.entries(LIBELLES_CATEGORIE).map(([v, l]) => (
                      <SelectItem key={v} value={v}>
                        {l}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {formulaire.categorie === 'ENFANT' && (
                  <p className="text-xs text-muted-foreground">
                    Enfant : demi-tarif appliqué (6 250 Ar).
                  </p>
                )}
              </div>
              <div className="space-y-2">
                <Label>Gare de destination</Label>
                <Select
                  value={formulaire.destinationId}
                  onValueChange={(v) => modifierChamp('destinationId', v)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Choisir une gare" />
                  </SelectTrigger>
                  <SelectContent>
                    {(gares.donnees?.donnees || []).map((g) => (
                      <SelectItem key={g.id} value={g.id}>
                        {g.code} — {g.nom || 'gare'}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {erreurs.destinationId && (
                  <p className="text-sm text-destructive">{erreurs.destinationId}</p>
                )}
              </div>
              <div className="space-y-2">
                <Label>Classe</Label>
                <Select
                  value={formulaire.classe}
                  onValueChange={(v) => modifierChamp('classe', v)}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {CLASSES.map((c) => (
                      <SelectItem key={c.valeur} value={c.valeur}>
                        {c.libelle}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Pièce d’identité</Label>
                <Select
                  value={formulaire.typeIdentite}
                  onValueChange={(v) => modifierChamp('typeIdentite', v)}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="CIN">CIN</SelectItem>
                    <SelectItem value="PASSEPORT">Passeport</SelectItem>
                  </SelectContent>
                </Select>
                {erreurs.typeIdentite && (
                  <p className="text-sm text-destructive">{erreurs.typeIdentite}</p>
                )}
              </div>
              <div className="space-y-2">
                <Label>Numéro de la pièce</Label>
                <Input
                  value={formulaire.voyageurIdentite}
                  onChange={(e) => modifierChamp('voyageurIdentite', e.target.value)}
                  placeholder="N° CIN ou passeport"
                />
                {erreurs.voyageurIdentite && (
                  <p className="text-sm text-destructive">{erreurs.voyageurIdentite}</p>
                )}
              </div>
              <div className="space-y-2">
                <Label>Date de voyage</Label>
                <Input
                  type="date"
                  value={formulaire.dateVoyage}
                  onChange={(e) => modifierChamp('dateVoyage', e.target.value)}
                />
                {erreurs.dateVoyage && (
                  <p className="text-sm text-destructive">{erreurs.dateVoyage}</p>
                )}
              </div>
              <div className="space-y-2">
                <Label>Train (optionnel)</Label>
                <Select
                  value={formulaire.trainId}
                  onValueChange={(v) => modifierChamp('trainId', v)}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="aucun">Aucun</SelectItem>
                    {(trains.donnees?.donnees || []).map((t) => (
                      <SelectItem key={t.id} value={t.id}>
                        {t.numero} — {t.origine} → {t.destination}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <p className="text-xs text-muted-foreground">
                  L’API refuse les trains qui ne circulent pas ce jour-là.
                </p>
              </div>
              <div className="space-y-2">
                <Label>Voiture (optionnel)</Label>
                <Select
                  value={formulaire.voitureId}
                  onValueChange={(v) => modifierChamp('voitureId', v)}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="aucune">Non affectée</SelectItem>
                    {(voitures.donnees?.donnees || []).map((v) => (
                      <SelectItem key={v.id} value={v.id}>
                        {v.code} ({v.places} places)
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </DialogueFormulaire>
        }
        filtres={[
          {
            cle: 'statut',
            valeur: statut,
            onChanger: setStatut,
            largeur: 'w-36',
            options: [
              { valeur: 'tous', libelle: 'Tous les statuts' },
              { valeur: 'VENDU', libelle: 'Vendus' },
              { valeur: 'ANNULE', libelle: 'Annulés' },
            ],
          },
          {
            cle: 'classe',
            valeur: classe,
            onChanger: setClasse,
            largeur: 'w-52',
            options: [
              { valeur: 'toutes', libelle: 'Toutes les classes' },
              ...CLASSES.map((c) => ({ valeur: c.valeur, libelle: c.libelle })),
            ],
          },
        ]}
        colonnes={[
          {
            titre: 'N°',
            align: 'right',
            rendre: (l) => <span className="font-medium tabular-nums">{l.numero || '—'}</span>,
          },
          {
            titre: 'Voyageur',
            tronquer: true,
            titreInfo: (l) => [l.voyageurNom, l.voyageurIdentite].filter(Boolean).join(' '),
            rendre: (l) => (
              <span>
                {l.voyageurNom}{' '}
                <span className="text-muted-foreground">({l.voyageurIdentite})</span>
              </span>
            ),
          },
          {
            titre: 'Destination',
            rendre: (l) => (
              <span>
                {l.destination?.code}{' '}
                <span className="text-muted-foreground">{l.zone?.code}</span>
              </span>
            ),
          },
          {
            titre: 'Classe',
            rendre: (l) => LIBELLES_CLASSE[l.classe] || l.classe,
          },
          {
            titre: 'Tarif',
            align: 'right',
            rendre: (l) => <span className="tabular-nums">{facturetarif(l)}</span>,
          },
          {
            titre: 'Date voyage',
            rendre: (l) => formatDate(l.dateVoyage),
          },
          {
            titre: 'Statut',
            rendre: (l) => <BadgeStatut statut={l.statut} />,
          },
        ]}
        rendreActions={(l) => (
          <div className="flex justify-end gap-1">
            <Button
              variant="ghost"
              size="sm"
              title="Imprimer le ticket"
              onClick={() => imprimer(l)}
            >
              <Printer className="size-4" />
            </Button>
            {peutAnnuler && l.statut === 'VENDU' && (
              <Button
                variant="ghost"
                size="sm"
                className="text-destructive"
                title="Annuler le billet"
                onClick={() => annuler(l)}
              >
                Annuler
              </Button>
            )}
            {peutAnnuler && (
              <Button
                variant="ghost"
                size="sm"
                className="text-destructive"
                title="Supprimer le billet"
                onClick={() => supprimer(l)}
              >
                <Trash2 className="size-4" />
              </Button>
            )}
            {peutAnnuler && l.statut !== 'ANNULE' && (
              <Button
                variant="ghost"
                size="sm"
                title="Modifier le billet"
                onClick={() => ouvrirEdition(l)}
              >
                <Pencil className="size-4" />
              </Button>
            )}
          </div>
        )}
        rendreCarte={(l, actions) => (
          <div className="flex h-full flex-col gap-3">
            <div className="flex items-start justify-between gap-2">
              <div>
                <p className="font-medium tabular-nums">{l.numero || '—'}</p>
                <p className="text-sm">
                  {l.voyageurNom}{' '}
                  <span className="text-muted-foreground">({l.voyageurIdentite})</span>
                </p>
              </div>
              <BadgeStatut statut={l.statut} />
            </div>
            <div className="grid grid-cols-2 gap-2 text-sm">
              <div>
                <p className="text-xs text-muted-foreground">Destination</p>
                <p>
                  {l.destination?.code}{' '}
                  <span className="text-muted-foreground">{l.zone?.code}</span>
                </p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Classe</p>
                <p>{LIBELLES_CLASSE[l.classe] || l.classe}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Date voyage</p>
                <p>{formatDate(l.dateVoyage)}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Tarif</p>
                <p className="tabular-nums">{facturetarif(l)}</p>
              </div>
            </div>
            {actions && <div className="mt-auto flex justify-end">{actions}</div>}
          </div>
        )}
      />
      {aImprimer && (
        <div id="ticket-impression" className="zone-impression fixed left-[-10000px] top-0">
          <TicketBillet billet={aImprimer} />
        </div>
      )}
    </div>
  )
}