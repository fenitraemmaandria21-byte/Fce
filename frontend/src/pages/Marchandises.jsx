import { Eye, Plus, Trash2 } from 'lucide-react'
import { useRef, useState } from 'react'
import { z } from 'zod'

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
import api, { messageApi } from '@/services/api'
import { BadgeStatut, formatArgent, formatDate, formatNombre } from '@/lib/affichage'

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
  const [statut, setStatut] = useState('tous')
  const [gareFiltre, setGareFiltre] = useState('toutes')
  const [creationOuverte, setCreationOuverte] = useState(false)
  const [formulaire, setFormulaire] = useState(ENVOI_VIDE)
  const [erreurs, setErreurs] = useState({})
  const [enCours, setEnCours] = useState(false)
  const [erreurGlobale, setErreurGlobale] = useState(null)
  const [detail, setDetail] = useState(null)
  const [detailComplet, setDetailComplet] = useState(null)
  const [detailChargement, setDetailChargement] = useState(false)
  const [detailErreur, setDetailErreur] = useState(null)
  const rechargerRef = useRef(null)

  const gares = useApi('/gares', { limit: 100 })
  const gareListe = gares.donnees?.donnees || []

  const ouvrirCreation = () => {
    setFormulaire(ENVOI_VIDE)
    setErreurs({})
    setErreurGlobale(null)
    setCreationOuverte(true)
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
      await api.post('/marchandises', {
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
      })
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
            titre="Nouvel envoi"
            description="Le poids total et la référence seront complétés par le système."
            messageErreur={erreurGlobale}
            enCours={enCours}
            onSoumettre={soumettre}
            libelleValider="Créer l’envoi"
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
              ...STATUTS.map((s) => ({ valeur: s, libelle: s })),
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
          { titre: 'Référence', rendre: (l) => <span className="font-medium">{l.reference || '—'}</span> },
          { titre: 'Date', rendre: (l) => formatDate(l.dateEnvoi) },
          { titre: 'Expéditeur', cle: 'expediteurNom' },
          { titre: 'Destinataire', cle: 'destinataireNom' },
          { titre: 'Colis', rendre: (l) => formatNombre(l.nombreColis) },
          {
            titre: 'Poids (kg)',
            rendre: (l) => (l.poidsTotal != null ? formatNombre(Number(l.poidsTotal)) : '—'),
          },
          { titre: 'Lignes', rendre: (l) => formatNombre(l.nombreLignes) },
          { titre: 'Dest.', rendre: (l) => (l.gareDestination?.code ? <Badge variant="outline">{l.gareDestination.code}</Badge> : '—') },
          { titre: 'Statut', rendre: (l) => <BadgeStatut statut={l.statut} /> },
        ]}
        rendreActions={(l) => (
          <Button variant="ghost" size="sm" title="Détails" onClick={() => ouvrirDetail(l)}>
            <Eye />
          </Button>
        )}
      />

      <Sheet
        open={!!detail}
        onOpenChange={(ouverture) => {
          if (!ouverture) setDetail(null)
        }}
      >
        <SheetContent className="w-full overflow-y-auto sm:max-w-lg">
          <SheetHeader>
            <SheetTitle>Envoi {detail?.reference || ''}</SheetTitle>
            <SheetDescription>Détail complet de l’envoi et de son suivi.</SheetDescription>
          </SheetHeader>

          {detailErreur && <p className="text-sm font-medium text-destructive">{detailErreur}</p>}

          {detailChargement ? (
            <div className="space-y-3 py-4">
              {[0, 1, 2, 3].map((i) => (
                <Skeleton key={i} className="h-4 w-full" />
              ))}
            </div>
          ) : detailComplet ? (
            <div className="space-y-6 py-4 text-sm">
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
    </div>
  )
}