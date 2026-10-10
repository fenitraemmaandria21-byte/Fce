import { Eye, Pencil, Plus, Printer, Trash2 } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import { toast } from 'react-toastify'
import { z } from 'zod'

import BranDocument from '@/components/BranDocument'
import DialogueFormulaire from '@/components/DialogueFormulaire'
import PageTable from '@/components/PageTable'
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
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet'
import { Skeleton } from '@/components/ui/skeleton'
import { useApi } from '@/hooks/useApi'
import { confirmerSuppression } from '@/lib/confirmation'
import api, { messageApi } from '@/services/api'
import { BadgeStatut, LIBELLES_STATUT, formatArgent, formatDate, formatNombre } from '@/lib/affichage'
import { useAuth } from '@/context/AuthContext'

const LIGNE_VIDE = {
  categorie: '',
  designation: '',
  quantite: '',
  unite: '',
  poids: '',
  marque: '',
  observation: '',
}

const ENVOI_VIDE = {
  expediteurNom: '',
  expediteurContact: '',
  destinataireNom: '',
  destinataireContact: '',
  gareOrigineId: 'aucune',
  gareDestinationId: 'aucune',
  nombreColis: '1',
  dateEnvoi: '',
  observations: '',
  lignes: [{ ...LIGNE_VIDE }],
}

const ligneSchema = z.object({
  categorie: z.string().trim().min(1, 'Catégorie requise'),
  designation: z.string().trim().min(1, 'Désignation requise'),
  quantite: z.string().optional(),
  unite: z.string().trim().max(30).optional(),
  poids: z.string().optional(),
  marque: z.string().trim().max(120).optional(),
  observation: z.string().trim().max(500).optional(),
})

const envoiSchema = z.object({
  expediteurNom: z.string().trim().min(1, "Nom de l'expéditeur requis").max(120),
  expediteurContact: z.string().trim().max(120).optional(),
  destinataireNom: z.string().trim().min(1, 'Nom du destinataire requis').max(120),
  destinataireContact: z.string().trim().max(120).optional(),
  gareOrigineId: z.string().optional(),
  gareDestinationId: z.string().optional(),
  nombreColis: z
    .string()
    .min(1, 'Nombre de colis requis')
    .refine((v) => /^\d+$/.test(v) && Number(v) > 0, 'Nombre de colis invalide'),
  dateEnvoi: z.string().optional(),
  observations: z.string().trim().max(1000).optional(),
  lignes: z.array(ligneSchema).min(1, 'Au moins une ligne de marchandise requise').max(100),
})

const STATUTS = ['ENREGISTRE', 'FACTURE', 'ARRIVE', 'REMIS']

export default function Marchandises() {
  const { utilisateur } = useAuth()
  const peutSupprimer = utilisateur && ['SUPERADMIN', 'ADMIN'].includes(utilisateur.role)

  const raisonSuppression = (l) => {
    if (l._count?.arrivages > 0)
      return `Suppression impossible : ${l._count.arrivages} arrivage(s) lié(s) à cet envoi.`
    if (l.bran) return 'Supprimer l’envoi (le BRAN émis sera aussi supprimé)'
    return 'Supprimer l’envoi'
  }

  const [statut, setStatut] = useState('tous')
  const [gareFiltre, setGareFiltre] = useState('toutes')
  const [creationOuverte, setCreationOuverte] = useState(false)
  const [formulaire, setFormulaire] = useState(ENVOI_VIDE)
  const [erreurs, setErreurs] = useState({})
  const [enCours, setEnCours] = useState(false)
  const [erreurGlobale, setErreurGlobale] = useState(null)
  const [edition, setEdition] = useState(null)
  const [detail, setDetail] = useState(null)
  const [detailComplet, setDetailComplet] = useState(null)
  const [detailChargement, setDetailChargement] = useState(false)
  const [detailErreur, setDetailErreur] = useState(null)
  const [branDialogOuvert, setBranDialogOuvert] = useState(false)
  const [branEnvoi, setBranEnvoi] = useState(null)
  const [branLignes, setBranLignes] = useState([])
  const [branErreur, setBranErreur] = useState(null)
  const [branEnCours, setBranEnCours] = useState(false)
  const [branAImprimer, setBranAImprimer] = useState(null)
  const rechargerRef = useRef(null)

  useEffect(() => {
    if (!branAImprimer) return undefined
    const minuteur = setTimeout(() => {
      window.print()
      setBranAImprimer(null)
    }, 150)
    return () => clearTimeout(minuteur)
  }, [branAImprimer])

  const gares = useApi('/gares', { limit: 100 })
  const gareListe = gares.donnees?.donnees || []

  const ouvrirCreation = () => {
    setEdition(null)
    setFormulaire(ENVOI_VIDE)
    setErreurs({})
    setErreurGlobale(null)
    setCreationOuverte(true)
  }

  const ouvrirEdition = async (l) => {
    setErreurs({})
    setErreurGlobale(null)
    try {
      const { data } = await api.get(`/marchandises/${l.id}`)
      setEdition(data)
      setFormulaire({
        expediteurNom: data.expediteurNom || '',
        expediteurContact: data.expediteurContact || '',
        destinataireNom: data.destinataireNom || '',
        destinataireContact: data.destinataireContact || '',
        gareOrigineId: data.gareOrigineId || 'aucune',
        gareDestinationId: data.gareDestinationId || 'aucune',
        nombreColis: String(data.nombreColis ?? 1),
        dateEnvoi: data.dateEnvoi ? new Date(data.dateEnvoi).toISOString().slice(0, 10) : '',
        observations: data.observations || '',
        lignes:
          data.lignes && data.lignes.length > 0
            ? data.lignes.map((lg) => ({
                categorie: lg.categorie || '',
                designation: lg.designation || '',
                quantite: lg.quantite != null ? String(lg.quantite) : '',
                unite: lg.unite || '',
                poids: lg.poids != null ? String(lg.poids) : '',
                marque: lg.marque || '',
                observation: lg.observation || '',
              }))
            : [{ ...LIGNE_VIDE }],
      })
      setCreationOuverte(true)
    } catch (erreur) {
      toast.error(messageApi(erreur, 'Chargement de l’envoi impossible'))
    }
  }

  const modifierChamp = (cle, valeur) => {
    setFormulaire((f) => ({ ...f, [cle]: valeur }))
    setErreurs((e) => ({ ...e, [cle]: undefined }))
  }

  const modifierLigne = (index, cle, valeur) => {
    setFormulaire((f) => {
      const lignes = f.lignes.map((ligne, i) => (i === index ? { ...ligne, [cle]: valeur } : ligne))
      return { ...f, lignes }
    })
  }

  const ajouterLigne = () => {
    setFormulaire((f) => ({ ...f, lignes: [...f.lignes, { ...LIGNE_VIDE }] }))
  }

  const retirerLigne = (index) => {
    setFormulaire((f) => ({ ...f, lignes: f.lignes.filter((_, i) => i !== index) }))
  }

  const soumettre = async () => {
    const resultat = envoiSchema.safeParse(formulaire)
    if (!resultat.success) {
      const suivantes = {}
      for (const probleme of resultat.error.issues) {
        if (!suivantes[probleme.path[0]]) suivantes[probleme.path[0]] = probleme.message
      }
      setErreurs(suivantes)
      setErreurGlobale(null)
      return
    }
    setEnCours(true)
    setErreurGlobale(null)
    try {
      const { dateEnvoi, gareOrigineId, gareDestinationId, lignes, ...reste } = resultat.data
      const corps = {
        ...reste,
        lignes: lignes.map((l) => ({
          categorie: l.categorie,
          designation: l.designation,
          quantite: l.quantite ? Number(l.quantite) : null,
          unite: l.unite || null,
          poids: l.poids ? Number(l.poids) : null,
          marque: l.marque || null,
          observation: l.observation || null,
        })),
        ...(dateEnvoi ? { dateEnvoi: new Date(dateEnvoi).toISOString() } : {}),
        ...(gareOrigineId && gareOrigineId !== 'aucune' ? { gareOrigineId } : {}),
        ...(gareDestinationId && gareDestinationId !== 'aucune' ? { gareDestinationId } : {}),
      }
      if (edition) {
        await api.put(`/marchandises/${edition.id}`, corps)
      } else {
        await api.post('/marchandises', corps)
      }
      toast.success(edition ? 'Envoi modifié.' : 'Envoi créé.')
      setEdition(null)
      setCreationOuverte(false)
      rechargerRef.current?.()
    } catch (erreur) {
      setErreurGlobale(messageApi(erreur, 'Enregistrement impossible'))
    } finally {
      setEnCours(false)
    }
  }

  const ouvrirDetail = async (ligne) => {
    setDetail(ligne)
    setDetailComplet(null)
    setDetailErreur(null)
    setDetailChargement(true)
    try {
      const { data } = await api.get(`/marchandises/${ligne.id}`)
      setDetailComplet(data)
    } catch (erreur) {
      setDetailErreur(messageApi(erreur, 'Chargement du détail impossible'))
    } finally {
      setDetailChargement(false)
    }
  }

  const supprimerEnvoi = async (l) => {
    const avertissementBran = l.bran
      ? '\n\nLe BRAN émis pour cet envoi sera également supprimé.'
      : ''
    if (
      !(await confirmerSuppression(
        `Supprimer l’envoi ${l.reference || ''} ?${avertissementBran}`
      ))
    )
      return
    setEnCours(true)
    try {
      const { data } = await api.delete(`/marchandises/${l.id}`)
      toast.success(
        data?.branSupprime
          ? 'Envoi et BRAN supprimés.'
          : 'Envoi supprimé.'
      )
      rechargerRef.current?.()
    } catch (erreur) {
      toast.error(messageApi(erreur, 'Suppression impossible'))
    } finally {
      setEnCours(false)
    }
  }

  const imprimerBran = async (id) => {
    try {
      const { data } = await api.get(`/bran/${id}`)
      setBranAImprimer(data)
    } catch (erreur) {
      toast.error(messageApi(erreur, 'Impression impossible'))
    }
  }

  const gererBran = async (l) => {
    if (l.bran) {
      imprimerBran(l.bran.id)
      return
    }
    if (!peutSupprimer) {
      toast.info('Aucun BRAN pour cet envoi — génération réservée aux administrateurs.')
      return
    }
    try {
      const { data } = await api.get(`/marchandises/${l.id}`)
      setBranEnvoi(data)
      setBranLignes(
        (data.lignes || []).map((lg) => ({
          designation: [lg.categorie, lg.designation].filter(Boolean).join(' — '),
          montant: '',
        }))
      )
      setBranErreur(null)
      setBranDialogOuvert(true)
    } catch (erreur) {
      toast.error(messageApi(erreur, 'Chargement de l’envoi impossible'))
    }
  }

  const modifierBranLigne = (index, cle, valeur) => {
    setBranLignes((lignes) =>
      lignes.map((ligne, i) => (i === index ? { ...ligne, [cle]: valeur } : ligne))
    )
  }

  const soumettreBran = async () => {
    const lignes = branLignes.map((l) => ({
      designation: (l.designation || '').trim() || null,
      montant: Number(l.montant),
    }))
    if (lignes.length === 0 || lignes.some((l) => !Number.isFinite(l.montant) || l.montant <= 0)) {
      setBranErreur('Chaque ligne doit avoir un montant supérieur à 0.')
      return
    }
    setBranEnCours(true)
    setBranErreur(null)
    try {
      const { data } = await api.post('/bran', { envoiId: branEnvoi.id, lignes })
      toast.success('BRAN généré.')
      setBranDialogOuvert(false)
      rechargerRef.current?.()
      imprimerBran(data.id)
    } catch (erreur) {
      setBranErreur(messageApi(erreur, 'Génération impossible'))
    } finally {
      setBranEnCours(false)
    }
  }

  return (
    <div className="space-y-4">
      <PageTable
        titre="Envois de marchandises"
        description="Envois : expéditeur, destinataire, colis, gares et statut du processus (enregistré → facturé → arrivé → remis)."
        endpoint="/marchandises"
        libelleNombre="envoi(s)"
        placeholderRecherche="Rechercher (référence, expéditeur, destinataire)…"
        messageVide="Aucun envoi."
        apiRef={rechargerRef}
        actions={
          <DialogueFormulaire
            ouvert={creationOuverte}
            onOuvrir={ouvrirCreation}
            onFermer={() => setCreationOuverte(false)}
            libelleOuvrir={
              <>
                <Plus />
                Nouvel envoi
              </>
            }
            titre={edition ? 'Modifier l’envoi' : 'Nouvel envoi'}
            description="Le poids total est calculé automatiquement à partir des lignes."
            messageErreur={erreurGlobale}
            enCours={enCours}
            onSoumettre={soumettre}
            libelleValider={edition ? 'Enregistrer' : 'Créer l’envoi'}
            large
          >
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label>Expéditeur</Label>
                <Input
                  value={formulaire.expediteurNom}
                  onChange={(e) => modifierChamp('expediteurNom', e.target.value)}
                  placeholder="Nom"
                />
                {erreurs.expediteurNom && (
                  <p className="text-sm text-destructive">{erreurs.expediteurNom}</p>
                )}
              </div>
              <div className="space-y-2">
                <Label>Contact expéditeur</Label>
                <Input
                  value={formulaire.expediteurContact}
                  onChange={(e) => modifierChamp('expediteurContact', e.target.value)}
                  placeholder="Téléphone"
                />
              </div>
              <div className="space-y-2">
                <Label>Destinataire</Label>
                <Input
                  value={formulaire.destinataireNom}
                  onChange={(e) => modifierChamp('destinataireNom', e.target.value)}
                  placeholder="Nom"
                />
                {erreurs.destinataireNom && (
                  <p className="text-sm text-destructive">{erreurs.destinataireNom}</p>
                )}
              </div>
              <div className="space-y-2">
                <Label>Contact destinataire</Label>
                <Input
                  value={formulaire.destinataireContact}
                  onChange={(e) => modifierChamp('destinataireContact', e.target.value)}
                  placeholder="Téléphone"
                />
              </div>
              <div className="space-y-2">
                <Label>Gare d’origine (optionnelle)</Label>
                <Select
                  value={formulaire.gareOrigineId}
                  onValueChange={(v) => modifierChamp('gareOrigineId', v)}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="aucune">Non précisée</SelectItem>
                    {gareListe.map((g) => (
                      <SelectItem key={g.id} value={g.id}>
                        {g.code} — {g.nom || 'gare'}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Gare de destination (optionnelle)</Label>
                <Select
                  value={formulaire.gareDestinationId}
                  onValueChange={(v) => modifierChamp('gareDestinationId', v)}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="aucune">Non précisée</SelectItem>
                    {gareListe.map((g) => (
                      <SelectItem key={g.id} value={g.id}>
                        {g.code} — {g.nom || 'gare'}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Nombre de colis</Label>
                <Input
                  type="number"
                  min="1"
                  value={formulaire.nombreColis}
                  onChange={(e) => modifierChamp('nombreColis', e.target.value)}
                />
                {erreurs.nombreColis && (
                  <p className="text-sm text-destructive">{erreurs.nombreColis}</p>
                )}
              </div>
              <div className="space-y-2">
                <Label>Date d’envoi</Label>
                <Input
                  type="date"
                  value={formulaire.dateEnvoi}
                  onChange={(e) => modifierChamp('dateEnvoi', e.target.value)}
                />
              </div>
            </div>

            <div className="space-y-3">
              <Label>Lignes de marchandise</Label>
              {erreurs.lignes && (
                <p className="text-sm text-destructive">{erreurs.lignes}</p>
              )}
              {formulaire.lignes.map((ligne, index) => (
                <Card key={index}>
                  <CardContent className="space-y-3 pt-4">
                    <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                      <div className="space-y-1.5">
                        <Label className="text-xs">Catégorie</Label>
                        <Input
                          value={ligne.categorie}
                          onChange={(e) => modifierLigne(index, 'categorie', e.target.value)}
                          placeholder="Ex. Vêtements"
                        />
                      </div>
                      <div className="space-y-1.5">
                        <Label className="text-xs">Désignation</Label>
                        <Input
                          value={ligne.designation}
                          onChange={(e) => modifierLigne(index, 'designation', e.target.value)}
                          placeholder="Désignation du colis"
                        />
                      </div>
                      <div className="space-y-1.5">
                        <Label className="text-xs">Marque</Label>
                        <Input
                          value={ligne.marque}
                          onChange={(e) => modifierLigne(index, 'marque', e.target.value)}
                          placeholder="Marque"
                        />
                      </div>
                      <div className="space-y-1.5">
                        <Label className="text-xs">Quantité</Label>
                        <Input
                          type="number"
                          min="0"
                          value={ligne.quantite}
                          onChange={(e) => modifierLigne(index, 'quantite', e.target.value)}
                          placeholder="0"
                        />
                      </div>
                      <div className="space-y-1.5">
                        <Label className="text-xs">Unité</Label>
                        <Input
                          value={ligne.unite}
                          onChange={(e) => modifierLigne(index, 'unite', e.target.value)}
                          placeholder="Unité"
                        />
                      </div>
                      <div className="space-y-1.5">
                        <Label className="text-xs">Poids (kg)</Label>
                        <Input
                          type="number"
                          min="0"
                          step="0.001"
                          value={ligne.poids}
                          onChange={(e) => modifierLigne(index, 'poids', e.target.value)}
                          placeholder="0.000"
                        />
                      </div>
                    </div>
                    <div className="flex items-end justify-between gap-3">
                      <Input
                        value={ligne.observation}
                        onChange={(e) => modifierLigne(index, 'observation', e.target.value)}
                        placeholder="Observation"
                      />
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        className="text-destructive"
                        disabled={formulaire.lignes.length <= 1}
                        onClick={() => retirerLigne(index)}
                      >
                        <Trash2 />
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
              <Button type="button" variant="outline" size="sm" onClick={ajouterLigne}>
                Ajouter une ligne
              </Button>
            </div>
          </DialogueFormulaire>
        }
        filtres={[
          {
            cle: 'statut',
            valeur: statut,
            onChanger: setStatut,
            largeur: 'w-40',
            options: [
              { valeur: 'tous', libelle: 'Tous les statuts' },
              ...STATUTS.map((s) => ({ valeur: s, libelle: LIBELLES_STATUT[s] || s })),
            ],
          },
          {
            cle: 'gare',
            valeur: gareFiltre,
            onChanger: setGareFiltre,
            largeur: 'w-44',
            options: [
              { valeur: 'toutes', libelle: 'Toutes les gares' },
              ...gareListe.map((g) => ({ valeur: g.code, libelle: g.code })),
            ],
          },
        ]}
        colonnes={[
          {
            titre: 'Référence',
            rendre: (l) => <span className="font-medium">{l.reference || '—'}</span>,
          },
          {
            titre: 'Date',
            rendre: (l) => formatDate(l.dateEnvoi),
          },
          { titre: 'Expéditeur', cle: 'expediteurNom', tronquer: true },
          { titre: 'Destinataire', cle: 'destinataireNom', tronquer: true },
          {
            titre: 'Colis',
            align: 'right',
            rendre: (l) => formatNombre(l.nombreColis),
          },
          {
            titre: 'Poids (kg)',
            align: 'right',
            rendre: (l) => (l.poidsTotal != null ? formatNombre(Number(l.poidsTotal)) : '—'),
          },
          {
            titre: 'Lignes',
            align: 'right',
            rendre: (l) => formatNombre(l.nombreLignes),
          },
          {
            titre: 'Dest.',
            rendre: (l) => (l.gareDestination?.code ? <Badge variant="outline">{l.gareDestination.code}</Badge> : '—'),
          },
          {
            titre: 'Statut',
            rendre: (l) => <BadgeStatut statut={l.statut} />,
          },
        ]}
        rendreActions={(l) => (
          <div className="flex justify-end gap-1">
            <Button variant="ghost" size="sm" title="Détails" onClick={() => ouvrirDetail(l)}>
              <Eye />
            </Button>
            <Button
              variant="ghost"
              size="sm"
              title={l.bran ? 'Imprimer le BRAN' : 'Générer le BRAN'}
              onClick={() => gererBran(l)}
            >
              <Printer className="size-4" />
            </Button>
            {peutSupprimer && (
              <Button
                variant="ghost"
                size="sm"
                title="Modifier l’envoi"
                onClick={() => ouvrirEdition(l)}
              >
                <Pencil className="size-4" />
              </Button>
            )}
            {peutSupprimer && (
              <span title={raisonSuppression(l)}>
                <Button
                  variant="ghost"
                  size="sm"
                  className="text-destructive"
                  title={raisonSuppression(l)}
                  disabled={l._count?.arrivages > 0}
                  onClick={() => supprimerEnvoi(l)}
                >
                  <Trash2 className="size-4" />
                </Button>
              </span>
            )}
          </div>
        )}
        rendreCarte={(l, actions) => (
          <div className="flex h-full flex-col gap-3">
            <div className="flex items-start justify-between gap-2">
              <div>
                <p className="font-medium">{l.reference || '—'}</p>
                <p className="text-sm text-muted-foreground">{formatDate(l.dateEnvoi)}</p>
              </div>
              <BadgeStatut statut={l.statut} />
            </div>
            <div className="flex flex-wrap gap-2 text-sm">
              <span>
                <span className="text-muted-foreground">Exp. </span>
                {l.expediteurNom}
              </span>
              <span>
                <span className="text-muted-foreground">Dest. </span>
                {l.destinataireNom}
              </span>
            </div>
            <div className="grid grid-cols-3 gap-2 text-sm">
              <div>
                <p className="text-xs text-muted-foreground">Colis</p>
                <p>{formatNombre(l.nombreColis)}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Poids (kg)</p>
                <p>{l.poidsTotal != null ? formatNombre(Number(l.poidsTotal)) : '—'}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Dest.</p>
                <p>{l.gareDestination?.code || '—'}</p>
              </div>
            </div>
            {actions && <div className="mt-auto flex justify-end">{actions}</div>}
          </div>
        )}
      />

      <Sheet
        open={!!detail}
        onOpenChange={(ouverture) => {
          if (!ouverture) setDetail(null)
        }}
      >
        <SheetContent className="w-full overflow-y-auto sm:max-w-xl">
          <SheetHeader>
            <SheetTitle>Envoi {detail?.reference || ''}</SheetTitle>
            <SheetDescription>Détail complet de l’envoi et de son suivi.</SheetDescription>
          </SheetHeader>

          {detailErreur && (
            <p className="px-4 text-sm font-medium text-destructive">{detailErreur}</p>
          )}

          {detailChargement ? (
            <div className="space-y-3 px-4 py-4">
              {[0, 1, 2, 3].map((i) => (
                <Skeleton key={i} className="h-4 w-full" />
              ))}
            </div>
          ) : detailComplet ? (
            <div className="space-y-5 px-4 pb-6 pt-2 text-sm">
              <div className="space-y-1">
                <p className="text-muted-foreground">Expéditeur</p>
                <p className="font-medium">
                  {detailComplet.expediteurNom}
                  {detailComplet.expediteurContact && (
                    <span className="text-muted-foreground"> — {detailComplet.expediteurContact}</span>
                  )}
                </p>
              </div>
              <div className="space-y-1">
                <p className="text-muted-foreground">Destinataire</p>
                <p className="font-medium">
                  {detailComplet.destinataireNom}
                  {detailComplet.destinataireContact && (
                    <span className="text-muted-foreground"> — {detailComplet.destinataireContact}</span>
                  )}
                </p>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="rounded-md border p-3">
                  <p className="text-muted-foreground">Origine</p>
                  <p className="font-medium">{detailComplet.gareOrigine?.code || '—'}</p>
                </div>
                <div className="rounded-md border p-3">
                  <p className="text-muted-foreground">Destination</p>
                  <p className="font-medium">{detailComplet.gareDestination?.code || '—'}</p>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="rounded-md border p-3">
                  <p className="text-muted-foreground">Colis</p>
                  <p className="font-medium">{formatNombre(detailComplet.nombreColis)}</p>
                </div>
                <div className="rounded-md border p-3">
                  <p className="text-muted-foreground">Poids total</p>
                  <p className="font-medium">
                    {detailComplet.poidsTotal != null
                      ? `${formatNombre(Number(detailComplet.poidsTotal))} kg`
                      : '—'}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <BadgeStatut statut={detailComplet.statut} />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="rounded-md border p-3">
                  <p className="text-muted-foreground">Référence</p>
                  <p className="font-medium">{detailComplet.reference || '—'}</p>
                </div>
                <div className="rounded-md border p-3">
                  <p className="text-muted-foreground">Facture</p>
                  <p className="font-medium">{detailComplet.factureNumero || '—'}</p>
                </div>
              </div>

              {detailComplet.observations && (
                <div className="space-y-1">
                  <p className="text-muted-foreground">Observations</p>
                  <p>{detailComplet.observations}</p>
                </div>
              )}

              <div className="space-y-2">
                <p className="font-medium">Lignes</p>
                {(detailComplet.lignes || []).map((ligne) => (
                  <div key={ligne.id} className="rounded-md border p-3">
                    <p className="font-medium">
                      {ligne.designation}{' '}
                      {ligne.quantite != null && (
                        <span className="text-muted-foreground">
                          × {ligne.quantite} {ligne.unite || ''}
                        </span>
                      )}
                    </p>
                    <p className="text-muted-foreground">
                      {ligne.categorie} {ligne.marque ? `— ${ligne.marque}` : ''}{' '}
                      {ligne.poids != null ? `— ${ligne.poids} kg` : ''}
                    </p>
                  </div>
                ))}
              </div>

              {(detailComplet.arrivages || []).length > 0 && (
                <div className="space-y-2">
                  <p className="font-medium">Arrivages</p>
                  {detailComplet.arrivages.map((a) => (
                    <div key={a.id} className="rounded-md border p-3">
                      <p>
                        {formatDate(a.dateArrivage)}{' '}
                        {a.gare?.code ? `— ${a.gare.code}` : ''} — <BadgeStatut statut={a.statut} />
                      </p>
                      {a.observations && (
                        <p className="max-w-lg truncate text-muted-foreground" title={a.observations}>
                          {a.observations}
                        </p>
                      )}
                    </div>
                  ))}
                </div>
              )}

              {detailComplet.bran && (
                <div className="rounded-md border p-3">
                  <p className="font-medium">BRAN associé</p>
                  <p className="tabular-nums">{formatArgent(detailComplet.bran.montantTotal)}</p>
                </div>
              )}

              <p className="text-muted-foreground">
                Enregistré par {detailComplet.creePar?.nom || '—'} le{' '}
                {formatDate(detailComplet.createdAt, true)}.
              </p>
            </div>
          ) : null}
        </SheetContent>
      </Sheet>

      <DialogueFormulaire
        ouvert={branDialogOuvert}
        onFermer={() => setBranDialogOuvert(false)}
        titre="Générer le BRAN"
        description={`Envoi ${branEnvoi?.reference || ''} — saisir le montant de chaque ligne. Le BRAN sera imprimé automatiquement.`}
        messageErreur={branErreur}
        enCours={branEnCours}
        onSoumettre={soumettreBran}
        libelleValider="Générer et imprimer"
        large
      >
        <div className="space-y-3">
          {branLignes.map((ligne, index) => (
            <div key={index} className="grid grid-cols-1 gap-3 sm:grid-cols-[1fr_10rem]">
              <div className="space-y-1.5">
                <Label className="text-xs">Désignation</Label>
                <Input
                  value={ligne.designation}
                  onChange={(e) => modifierBranLigne(index, 'designation', e.target.value)}
                  placeholder="Désignation"
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Montant (Ar)</Label>
                <Input
                  type="number"
                  min="1"
                  value={ligne.montant}
                  onChange={(e) => modifierBranLigne(index, 'montant', e.target.value)}
                  placeholder="0"
                />
              </div>
            </div>
          ))}
        </div>
      </DialogueFormulaire>

      {branAImprimer && (
        <div className="zone-impression fixed left-[-10000px] top-0">
          <BranDocument bran={branAImprimer} />
        </div>
      )}
    </div>
  )
}