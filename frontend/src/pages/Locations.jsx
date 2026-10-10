import { Check, Pencil, Plus, Trash2, X } from 'lucide-react'
import { useRef, useState } from 'react'
import { toast } from 'react-toastify'
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
import { confirmerSuppression, demanderMotif } from '@/lib/confirmation'
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
  const [edition, setEdition] = useState(null)
  const rechargerRef = useRef(null)

  const zones = useApi('/zones')
  const zoneListe = zones.donnees?.donnees || []

  const versDatetimeLocal = (iso) => {
    if (!iso) return ''
    const d = new Date(iso)
    const pad = (n) => String(n).padStart(2, '0')
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`
  }

  const ouvrirCreation = () => {
    setEdition(null)
    setFormulaire(LOCATION_VIDE)
    setErreurs({})
    setErreurGlobale(null)
    setCreationOuverte(true)
  }

  const ouvrirEdition = async (l) => {
    setErreurs({})
    setErreurGlobale(null)
    try {
      const { data } = await api.get(`/locations/${l.id}`)
      setEdition(data)
      setFormulaire({
        type: data.type || 'DRAISINE',
        client_nom: data.client?.nom || '',
        client_contact: data.client?.contact || '',
        client_adresse: data.client?.adresse || '',
        zoneId: data.zoneId || '',
        depart: data.depart || '',
        formule: data.formule || 'aucune',
        allerRetour: data.allerRetour ? 'oui' : 'non',
        personnes: String(data.personnes ?? 1),
        dateDebut: versDatetimeLocal(data.dateDebut),
        dateFin: data.dateFin ? versDatetimeLocal(data.dateFin) : '',
        observations: data.observations || '',
      })
      setCreationOuverte(true)
    } catch (erreur) {
      toast.error(messageApi(erreur, 'Chargement de la location impossible'))
    }
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
      const corps = {
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
      }
      if (edition) {
        await api.put(`/locations/${edition.id}`, corps)
      } else {
        await api.post('/locations', corps)
      }
      toast.success(edition ? 'Location modifiée.' : 'Demande de location créée.')
      setEdition(null)
      setCreationOuverte(false)
      rechargerRef.current?.()
    } catch (erreur) {
      setErreurGlobale(messageApi(erreur, 'Enregistrement impossible'))
    } finally {
      setEnCours(false)
    }
  }

  const decider = async (ligne, statut) => {
    const valide = statut === 'VALIDEE'
    const motif = await demanderMotif({
      titre: valide ? 'Valider la location' : 'Refuser la location',
      texte: `${ligne.client?.nom || 'Client'} — ${LIBELLES_TYPE_LOCATION[ligne.type] || ligne.type}${ligne.montant != null ? ` (${formatArgent(ligne.montant)})` : ''}`,
      libelleConfirmer: valide ? 'Valider' : 'Refuser',
      couleurConfirmer: valide ? '#16a34a' : '#dc2626',
    })
    if (motif === null) return
    setEnCours(true)
    try {
      await api.patch(`/locations/${ligne.id}/statut`, {
        statut,
        ...(motif ? { motif } : {}),
      })
      toast.success(valide ? 'Location validée.' : 'Location refusée.')
      rechargerRef.current?.()
    } catch (erreur) {
      toast.error(messageApi(erreur, 'Décision impossible'))
    } finally {
      setEnCours(false)
    }
  }

  const supprimer = async (l) => {
    if (!(await confirmerSuppression(`Supprimer la location de ${l.client?.nom || 'ce client'} ?`))) return
    setEnCours(true)
    try {
      await api.delete(`/locations/${l.id}`)
      toast.success('Location supprimée.')
      rechargerRef.current?.()
    } catch (erreur) {
      toast.error(messageApi(erreur, 'Suppression impossible'))
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
            titre={edition ? 'Modifier la location' : 'Nouvelle demande de location'}
            description={
              formulaire.type === 'BATIMENT' || formulaire.type === 'TERRAIN'
                ? 'Montant appliqué automatiquement : bâtiment 8 000 000 Ar ; terrain 5 000 000 Ar.'
                : 'Le montant est calculé d’après le tarif FCE et les options choisies.'
            }
            messageErreur={erreurGlobale}
            enCours={enCours}
            onSoumettre={soumettre}
            libelleValider={edition ? 'Enregistrer' : 'Créer la demande'}
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
                {l.client?.adresse && (
                  <span className="block text-xs text-muted-foreground">{l.client.adresse}</span>
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
          { titre: 'Personnes', align: 'right', rendre: (l) => `${l.personnes}` },
          { titre: 'Début', rendre: (l) => formatDate(l.dateDebut, true) },
          {
            titre: 'Montant',
            align: 'right',
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
        rendreActions={(l) => (
          <div className="flex justify-end gap-1">
            {peutValider && l.statut === 'EN_ATTENTE' && (
              <>
                <Button
                  variant="ghost"
                  size="sm"
                  className="text-fce-700"
                  title="Valider"
                  onClick={() => decider(l, 'VALIDEE')}
                >
                  <Check />
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  className="text-destructive"
                  title="Refuser"
                  onClick={() => decider(l, 'REFUSEE')}
                >
                  <X />
                </Button>
              </>
            )}
            {peutValider && (
              <Button
                variant="ghost"
                size="sm"
                className="text-destructive"
                title="Supprimer la location"
                onClick={() => supprimer(l)}
              >
                <Trash2 className="size-4" />
              </Button>
            )}
            {peutValider && l.statut === 'EN_ATTENTE' && (
              <Button
                variant="ghost"
                size="sm"
                title="Modifier la location"
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
                <p className="font-medium">{l.client?.nom || 'Client inconnu'}</p>
                {l.client?.contact && (
                  <p className="text-sm text-muted-foreground">{l.client.contact}</p>
                )}
              </div>
              <BadgeStatut statut={l.statut} />
            </div>
            <div className="grid grid-cols-2 gap-2 text-sm">
              <div>
                <p className="text-xs text-muted-foreground">Type</p>
                <p>{LIBELLES_TYPE_LOCATION[l.type] || l.type}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Zone</p>
                <p>{l.zone?.code || '—'}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Formule</p>
                <p>
                  {l.depart
                    ? `${l.depart}${l.formule ? ` — ${afficherFormule(l)}` : ''}`
                    : afficherFormule(l)}
                </p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Personnes</p>
                <p>{l.personnes}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Début</p>
                <p>{formatDate(l.dateDebut, true)}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Montant</p>
                <p className="tabular-nums">
                  {l.montant != null ? (
                    formatArgent(l.montant)
                  ) : (
                    <Badge variant="secondary" className="bg-amber-100 text-amber-800">
                      À valider
                    </Badge>
                  )}
                </p>
              </div>
            </div>
            {actions && <div className="mt-auto flex justify-end">{actions}</div>}
          </div>
        )}
      />
    </div>
  )
}