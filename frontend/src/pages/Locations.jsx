import { Check, Plus, X } from 'lucide-react'
import { useRef, useState } from 'react'
import { z } from 'zod'

import DialogueFormulaire from '@/components/DialogueFormulaire'
import PageTable from '@/components/PageTable'
import { Badge } from '@/components/ui/badge'
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
  LIBELLES_FORMULE,
  LIBELLES_TYPE_LOCATION,
  formatArgent,
  formatDate,
} from '@/lib/affichage'

const TYPES = [
  { valeur: 'DRAISINE', libelle: 'Draisine' },
  { valeur: 'MACHINE', libelle: 'Machine' },
  { valeur: 'BATIMENT', libelle: 'Bâtiment' },
  { valeur: 'TERRAIN', libelle: 'Terrain' },
]

const DEPARTS_MACHINE = ['Fianarantsoa', 'Sahambavy']

const LOCATION_VIDE = {
  type: 'DRAISINE',
  client_nom: '',
  client_contact: '',
  client_adresse: '',
  zoneId: '',
  depart: '',
  formule: 'aucune',
  allerRetour: 'non',
  personnes: '1',
  dateDebut: '',
  dateFin: '',
  observations: '',
}

const locationSchema = z
  .object({
    type: z.enum(['DRAISINE', 'MACHINE', 'BATIMENT', 'TERRAIN']),
    client_nom: z.string().trim().min(2, 'Nom du client requis').max(120),
    client_contact: z.string().trim().max(120).optional(),
    client_adresse: z.string().trim().max(255).optional(),
    zoneId: z.string().optional(),
    depart: z.string().optional(),
    formule: z.string().optional(),
    allerRetour: z.enum(['oui', 'non']),
    personnes: z
      .string()
      .min(1, 'Nombre de personnes requis')
      .refine((v) => /^\d+$/.test(v) && Number(v) > 0, 'Nombre de personnes invalide'),
    dateDebut: z.string().min(1, 'Date de début requise'),
    dateFin: z.string().optional(),
    observations: z.string().trim().max(1000).optional(),
  })
  .superRefine((valeur, ctx) => {
    if (valeur.type === 'DRAISINE' && !valeur.zoneId) {
      ctx.addIssue({ code: 'custom', path: ['zoneId'], message: 'Zone requise pour la draisine' })
    }
    if (valeur.type === 'MACHINE') {
      if (!valeur.depart) {
        ctx.addIssue({ code: 'custom', path: ['depart'], message: 'Départ requis (Fianarantsoa ou Sahambavy)' })
      }
      if (!valeur.formule || valeur.formule === 'aucune') {
        ctx.addIssue({ code: 'custom', path: ['formule'], message: 'Formule requise' })
      }
      if (!valeur.dateFin) {
        ctx.addIssue({ code: 'custom', path: ['dateFin'], message: 'Date et heure de retour requises' })
      }
    }
  })

const statutSchema = z.object({
  statut: z.enum(['VALIDEE', 'REFUSEE']),
  motif: z.string().trim().max(500).optional(),
})

export default function Locations() {
  const { utilisateur } = useAuth()
  const peutValider = utilisateur && ['SUPERADMIN', 'ADMIN'].includes(utilisateur.role)

  const [type, setType] = useState('tous')
  const [statutFiltre, setStatutFiltre] = useState('tous')
  const [creationOuverte, setCreationOuverte] = useState(false)
  const [formulaire, setFormulaire] = useState(LOCATION_VIDE)
  const [erreurs, setErreurs] = useState({})
  const [enCours, setEnCours] = useState(false)
  const [erreurGlobale, setErreurGlobale] = useState(null)
  const [decision, setDecision] = useState(null)
  const [decisionForm, setDecisionForm] = useState({ statut: 'VALIDEE', motif: '' })
  const [decisionErreur, setDecisionErreur] = useState(null)
  const rechargerRef = useRef(null)

  const zones = useApi('/zones')
  const zoneListe = zones.donnees?.donnees || []

  const ouvrirCreation = () => {
    setFormulaire(LOCATION_VIDE)
    setErreurs({})
    setErreurGlobale(null)
    setCreationOuverte(true)
  }

  const modifierChamp = (cle, valeur) => {
    setFormulaire((f) => ({ ...f, [cle]: valeur }))
    setErreurs((e) => ({ ...e, [cle]: undefined }))
  }

  const soumettre = async () => {
    const resultat = locationSchema.safeParse(formulaire)
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
      const {
        type,
        client_nom,
        client_contact,
        client_adresse,
        zoneId,
        depart,
        formule,
        allerRetour,
        personnes,
        dateDebut,
        dateFin,
        observations,
      } = resultat.data
      await api.post('/locations', {
        type,
        client: {
          nom: client_nom,
          contact: client_contact || null,
          adresse: client_adresse || null,
        },
        ...(zoneId ? { zoneId } : {}),
        ...(depart ? { depart } : {}),
        ...(formule && formule !== 'aucune' ? { formule } : {}),
        allerRetour: allerRetour === 'oui',
        personnes: Number(personnes),
        dateDebut: new Date(dateDebut).toISOString(),
        ...(dateFin ? { dateFin: new Date(dateFin).toISOString() } : {}),
        ...(observations ? { observations } : {}),
      })
      setCreationOuverte(false)
      rechargerRef.current?.()
    } catch (erreur) {
      setErreurGlobale(messageApi(erreur, 'Enregistrement impossible'))
    } finally {
      setEnCours(false)
    }
  }

  const ouvrirDecision = (ligne, statut) => {
    setDecision({ ligne, statut })
    setDecisionForm({ statut, motif: '' })
    setDecisionErreur(null)
  }

  const soumettreDecision = async () => {
    const resultat = statutSchema.safeParse(decisionForm)
    if (!resultat.success) {
      setDecisionErreur('Motif invalide (500 caractères max.)')
      return
    }
    setEnCours(true)
    setDecisionErreur(null)
    try {
      await api.patch(`/locations/${decision.ligne.id}/statut`, resultat.data)
      setDecision(null)
      rechargerRef.current?.()
    } catch (erreur) {
      setDecisionErreur(messageApi(erreur, 'Décision impossible'))
    } finally {
      setEnCours(false)
    }
  }

  const afficherFormule = (l) =>
    l.type === 'MACHINE'
      ? l.formule
        ? LIBELLES_FORMULE[l.formule] || l.formule
        : '—'
      : l.type === 'DRAISINE'
        ? l.allerRetour
          ? 'Aller-retour'
          : 'Aller simple'
        : '—'

  return (
    <div className="space-y-4">
      <PageTable
        titre="Locations"
        description="Location de draisines, machines, bâtiments et terrains. Tarifs non validés (bâtiment/terrain) affichés « à valider ». La validation/refus est réservée aux SUPERADMIN et ADMIN."
        endpoint="/locations"
        libelleNombre="location(s)"
        placeholderRecherche="Rechercher (client, observations)…"
        messageVide="Aucune location."
        apiRef={rechargerRef}
        actions={
          <DialogueFormulaire
            ouvert={creationOuverte}
            onOuvrir={ouvrirCreation}
            onFermer={() => setCreationOuverte(false)}
            libelleOuvrir={
              <>
                <Plus />
                Nouvelle location
              </>
            }
            titre="Nouvelle demande de location"
            description={
              formulaire.type === 'BATIMENT' || formulaire.type === 'TERRAIN'
                ? 'Aucun tarif validé pour ce type : le montant restera « à valider » (CONFIGURATION_A_VALIDER).'
                : 'Le montant est calculé d’après le tarif FCE et les options choisies.'
            }
            messageErreur={erreurGlobale}
            enCours={enCours}
            onSoumettre={soumettre}
            libelleValider="Créer la demande"
            large
          >
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label>Type de location</Label>
                <Select value={formulaire.type} onValueChange={(v) => modifierChamp('type', v)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {TYPES.map((t) => (
                      <SelectItem key={t.valeur} value={t.valeur}>
                        {t.libelle}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Nombre de personnes</Label>
                <Input
                  type="number"
                  min="1"
                  value={formulaire.personnes}
                  onChange={(e) => modifierChamp('personnes', e.target.value)}
                />
                {erreurs.personnes && (
                  <p className="text-sm text-destructive">{erreurs.personnes}</p>
                )}
                <p className="text-xs text-muted-foreground">
                  Capacités documentées : draisine 15, machine 19.
                </p>
              </div>
              <div className="space-y-2">
                <Label>Client</Label>
                <Input
                  value={formulaire.client_nom}
                  onChange={(e) => modifierChamp('client_nom', e.target.value)}
                  placeholder="Nom du client"
                />
                {erreurs.client_nom && (
                  <p className="text-sm text-destructive">{erreurs.client_nom}</p>
                )}
              </div>
              <div className="space-y-2">
                <Label>Contact client</Label>
                <Input
                  value={formulaire.client_contact}
                  onChange={(e) => modifierChamp('client_contact', e.target.value)}
                  placeholder="Téléphone"
                />
              </div>
              <div className="space-y-2">
                <Label>Adresse client</Label>
                <Input
                  value={formulaire.client_adresse}
                  onChange={(e) => modifierChamp('client_adresse', e.target.value)}
                  placeholder="Adresse"
                />
              </div>
              <div className="space-y-2">
                <Label>Date et heure de début</Label>
                <Input
                  type="datetime-local"
                  value={formulaire.dateDebut}
                  onChange={(e) => modifierChamp('dateDebut', e.target.value)}
                />
                {erreurs.dateDebut && (
                  <p className="text-sm text-destructive">{erreurs.dateDebut}</p>
                )}
              </div>

              {formulaire.type === 'DRAISINE' && (
                <>
                  <div className="space-y-2">
                    <Label>Zone tarifaire</Label>
                    <Select value={formulaire.zoneId} onValueChange={(v) => modifierChamp('zoneId', v)}>
                      <SelectTrigger>
                        <SelectValue placeholder="Choisir une zone" />
                      </SelectTrigger>
                      <SelectContent>
                        {zoneListe.map((z) => (
                          <SelectItem key={z.id} value={z.id}>
                            {z.code}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    {erreurs.zoneId && (
                      <p className="text-sm text-destructive">{erreurs.zoneId}</p>
                    )}
                  </div>
                  <div className="space-y-2">
                    <Label>Aller-retour</Label>
                    <Select
                      value={formulaire.allerRetour}
                      onValueChange={(v) => modifierChamp('allerRetour', v)}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="non">Aller simple</SelectItem>
                        <SelectItem value="oui">Aller-retour (tarif × 2)</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </>
              )}

              {formulaire.type === 'MACHINE' && (
                <>
                  <div className="space-y-2">
                    <Label>Départ</Label>
                    <Select value={formulaire.depart} onValueChange={(v) => modifierChamp('depart', v)}>
                      <SelectTrigger>
                        <SelectValue placeholder="Choisir un départ" />
                      </SelectTrigger>
                      <SelectContent>
                        {DEPARTS_MACHINE.map((d) => (
                          <SelectItem key={d} value={d}>
                            {d}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    {erreurs.depart && (
                      <p className="text-sm text-destructive">{erreurs.depart}</p>
                    )}
                  </div>
                  <div className="space-y-2">
                    <Label>Formule</Label>
                    <Select
                      value={formulaire.formule}
                      onValueChange={(v) => modifierChamp('formule', v)}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="aucune">Choisir</SelectItem>
                        <SelectItem value="MOINS_6H">Moins de 6 heures</SelectItem>
                        <SelectItem value="JOURNEE">Journée (06:30 – 18:00)</SelectItem>
                      </SelectContent>
                    </Select>
                    {erreurs.formule && (
                      <p className="text-sm text-destructive">{erreurs.formule}</p>
                    )}
                  </div>
                  <div className="space-y-2">
                    <Label>Date et heure de retour</Label>
                    <Input
                      type="datetime-local"
                      value={formulaire.dateFin}
                      onChange={(e) => modifierChamp('dateFin', e.target.value)}
                    />
                    {erreurs.dateFin && (
                      <p className="text-sm text-destructive">{erreurs.dateFin}</p>
                    )}
                  </div>
                </>
              )}

              <div className="space-y-2">
                <Label>Observations</Label>
                <Input
                  value={formulaire.observations}
                  onChange={(e) => modifierChamp('observations', e.target.value)}
                  placeholder="Remarques…"
                />
              </div>
            </div>
          </DialogueFormulaire>
        }
        filtres={[
          {
            cle: 'type',
            valeur: type,
            onChanger: setType,
            largeur: 'w-40',
            options: [
              { valeur: 'tous', libelle: 'Tous les types' },
              ...TYPES.map((t) => ({ valeur: t.valeur, libelle: t.libelle })),
            ],
          },
          {
            cle: 'statut',
            valeur: statutFiltre,
            onChanger: setStatutFiltre,
            largeur: 'w-40',
            options: [
              { valeur: 'tous', libelle: 'Tous les statuts' },
              { valeur: 'EN_ATTENTE', libelle: 'En attente' },
              { valeur: 'VALIDEE', libelle: 'Validée' },
              { valeur: 'REFUSEE', libelle: 'Refusée' },
            ],
          },
        ]}
        colonnes={[
          {
            titre: 'Client',
            rendre: (l) => (
              <span>
                {l.client?.nom}{' '}
                {l.client?.contact && (
                  <span className="text-muted-foreground">({l.client.contact})</span>
                )}
              </span>
            ),
          },
          { titre: 'Type', rendre: (l) => LIBELLES_TYPE_LOCATION[l.type] || l.type },
          { titre: 'Zone', rendre: (l) => (l.zone?.code ? <Badge variant="outline">{l.zone.code}</Badge> : '—') },
          {
            titre: 'Formule',
            rendre: (l) =>
              l.depart ? (
                <span>
                  {l.depart}
                  {l.formule || l.allerRetour ? ` — ${afficherFormule(l)}` : ''}
                </span>
              ) : (
                afficherFormule(l)
              ),
          },
          { titre: 'Personnes', rendre: (l) => `${l.personnes}` },
          { titre: 'Début', rendre: (l) => formatDate(l.dateDebut, true) },
          {
            titre: 'Montant',
            rendre: (l) =>
              l.montant != null ? (
                <span className="tabular-nums">{formatArgent(l.montant)}</span>
              ) : (
                <Badge variant="secondary" className="bg-amber-100 text-amber-800">
                  À valider
                </Badge>
              ),
          },
          { titre: 'Statut', rendre: (l) => <BadgeStatut statut={l.statut} /> },
        ]}
        rendreActions={
          peutValider
            ? (l) =>
                l.statut === 'EN_ATTENTE' ? (
                  <div className="flex gap-1">
                    <Button
                      variant="ghost"
                      size="sm"
                      className="text-emerald-700"
                      title="Valider"
                      onClick={() => ouvrirDecision(l, 'VALIDEE')}
                    >
                      <Check />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="text-destructive"
                      title="Refuser"
                      onClick={() => ouvrirDecision(l, 'REFUSEE')}
                    >
                      <X />
                    </Button>
                  </div>
                ) : null
            : null
        }
      />

      {decision && (
        <DialogueFormulaire
          ouvert
          onFermer={() => setDecision(null)}
          titre={decision.statut === 'VALIDEE' ? 'Valider la location' : 'Refuser la location'}
          description={`${decision.ligne.client?.nom} — ${LIBELLES_TYPE_LOCATION[decision.ligne.type]}${decision.ligne.montant != null ? ` (${formatArgent(decision.ligne.montant)})` : ''}`}
          messageErreur={decisionErreur}
          enCours={enCours}
          onSoumettre={soumettreDecision}
          libelleValider={decision.statut === 'VALIDEE' ? 'Valider' : 'Refuser'}
        >
          <div className="space-y-2">
            <Label>Motif (optionnel)</Label>
            <Input
              value={decisionForm.motif}
              onChange={(e) => setDecisionForm((f) => ({ ...f, motif: e.target.value }))}
              placeholder="Justification"
            />
          </div>
          <p className="text-xs text-muted-foreground">
            La décision est enregistrée dans le journal avec l’auteur.
          </p>
        </DialogueFormulaire>
      )}
    </div>
  )
}