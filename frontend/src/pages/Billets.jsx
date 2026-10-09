import { Plus } from 'lucide-react'
import { useRef, useState } from 'react'
import { z } from 'zod'

import DialogueFormulaire from '@/components/DialogueFormulaire'
import PageTable from '@/components/PageTable'
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
  const [aAnnuler, setAAnnuler] = useState(null)
  const [annulationErreur, setAnnulationErreur] = useState(null)
  const rechargerRef = useRef(null)

  const gares = useApi('/gares', { limit: 100 })
  const trains = useApi('/trains')
  const voitures = useApi('/voitures')

  const ouvrirVente = () => {
    setFormulaire(VENTE_VIDE)
    setErreurs({})
    setErreurGlobale(null)
    setVenteOuverte(true)
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
      await api.post('/billets', {
        ...reste,
        dateVoyage: new Date(dateVoyage).toISOString(),
        ...(trainId && trainId !== 'aucun' ? { trainId } : {}),
        ...(voitureId && voitureId !== 'aucune' ? { voitureId } : {}),
        ...(place ? { place } : {}),
      })
      setVenteOuverte(false)
      rechargerRef.current?.()
    } catch (erreur) {
      setErreurGlobale(messageApi(erreur, 'Vente impossible'))
    } finally {
      setEnCours(false)
    }
  }

  const annuler = async () => {
    setEnCours(true)
    setAnnulationErreur(null)
    try {
      await api.post(`/billets/${aAnnuler.id}/annuler`)
      setAAnnuler(null)
      rechargerRef.current?.()
    } catch (erreur) {
      setAnnulationErreur(messageApi(erreur, "Annulation impossible"))
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
        description="Vente de billets : la zone est déduite automatiquement de la destination. Enfant : demi-tarif non encore validé (signalé par l’API)."
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
            titre="Vendre un billet"
            description="Tarif appliqué automatiquement d’après la destination, le type de voyageur et la classe."
            messageErreur={erreurGlobale}
            enCours={enCours}
            onSoumettre={soumettreVente}
            libelleValider="Vendre"
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
                  <p className="text-xs text-amber-600">
                    Demi-tarif enfant non validé par la FCE — la vente sera refusée (CONFIGURATION_A_VALIDER).
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
          { titre: 'Classe', rendre: (l) => LIBELLES_CLASSE[l.classe] || l.classe },
          {
            titre: 'Tarif',
            align: 'right',
            rendre: (l) => <span className="tabular-nums">{facturetarif(l)}</span>,
          },
          { titre: 'Date voyage', rendre: (l) => formatDate(l.dateVoyage) },
          { titre: 'Statut', rendre: (l) => <BadgeStatut statut={l.statut} /> },
        ]}
        rendreActions={
          peutAnnuler
            ? (l) =>
                l.statut === 'VENDU' ? (
                  <Button
                    variant="ghost"
                    size="sm"
                    className="text-destructive"
                    title="Annuler le billet"
                    onClick={() => {
                      setAnnulationErreur(null)
                      setAAnnuler(l)
                    }}
                  >
                    Annuler
                  </Button>
                ) : null
            : null
        }
      />

      {aAnnuler && (
        <DialogueFormulaire
          ouvert
          onFermer={() => setAAnnuler(null)}
          titre="Annuler le billet"
          description={`Billet ${aAnnuler.numero || ''} de ${aAnnuler.voyageurNom} (${formatArgent(aAnnuler.tarif)}).`}
          messageErreur={annulationErreur}
          enCours={enCours}
          onSoumettre={annuler}
          libelleValider="Confirmer l’annulation"
        >
          <p className="text-sm text-muted-foreground">
            Le billet passera au statut « Annulé » et sera exclu des recettes.
            Cette action est enregistrée dans le journal.
          </p>
        </DialogueFormulaire>
      )}
    </div>
  )
}