import { Pencil, Plus, Trash2 } from 'lucide-react'
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
import { confirmerAction, confirmerSuppression } from '@/lib/confirmation'
import api, { messageApi } from '@/services/api'
import { BadgeStatut, formatDate } from '@/lib/affichage'

const STATUTS = ['EN_ATTENTE', 'RECUE', 'ANOMALIE']

const ARRIVAGE_VIDE = {
  envoiId: '',
  trainId: 'aucun',
  gareId: 'aucune',
  dateArrivage: '',
  statut: 'EN_ATTENTE',
  observations: '',
}

const arrivageSchema = z.object({
  envoiId: z.string().min(1, 'Envoi requis'),
  trainId: z.string().optional(),
  gareId: z.string().optional(),
  dateArrivage: z.string().min(1, "Date d'arrivage requise"),
  statut: z.enum(['EN_ATTENTE', 'RECUE', 'ANOMALIE']),
  observations: z.string().trim().max(1000).optional(),
})

export default function Arrivages() {
  const { utilisateur } = useAuth()
  const peutGerer = utilisateur && ['SUPERADMIN', 'ADMIN'].includes(utilisateur.role)

  const [statut, setStatut] = useState('tous')
  const [creationOuverte, setCreationOuverte] = useState(false)
  const [formulaire, setFormulaire] = useState(ARRIVAGE_VIDE)
  const [erreurs, setErreurs] = useState({})
  const [enCours, setEnCours] = useState(false)
  const [erreurGlobale, setErreurGlobale] = useState(null)
  const [edition, setEdition] = useState(null)
  const rechargerRef = useRef(null)

  const envois = useApi('/marchandises', { limit: 100 })
  const trains = useApi('/trains')
  const gares = useApi('/gares', { limit: 100 })

  const ouvrirCreation = () => {
    setEdition(null)
    setFormulaire(ARRIVAGE_VIDE)
    setErreurs({})
    setErreurGlobale(null)
    setCreationOuverte(true)
  }

  const ouvrirEdition = (l) => {
    setEdition(l)
    setFormulaire({
      envoiId: l.envoiId,
      trainId: l.train?.id || 'aucun',
      gareId: l.gare?.id || 'aucune',
      dateArrivage: l.dateArrivage ? new Date(l.dateArrivage).toISOString().slice(0, 10) : '',
      statut: l.statut,
      observations: l.observations || '',
    })
    setErreurs({})
    setErreurGlobale(null)
    setCreationOuverte(true)
  }

  const modifierChamp = (cle, valeur) => {
    setFormulaire((f) => ({ ...f, [cle]: valeur }))
    setErreurs((e) => ({ ...e, [cle]: undefined }))
  }

  const soumettre = async () => {
    const resultat = arrivageSchema.safeParse(formulaire)
    if (!resultat.success) {
      const suivantes = {}
      for (const probleme of resultat.error.issues) {
        suivantes[probleme.path[0]] = probleme.message
      }
      setErreurs(suivantes)
      setErreurGlobale(null)
      return
    }
    const versRecue =
      resultat.data.statut === 'RECUE' && (!edition || edition.statut !== 'RECUE')
    if (versRecue) {
      const confirme = await confirmerAction({
        titre: 'Confirmer la réception',
        texte: 'Cet arrivage « Reçue » fera passer l’envoi associé au statut ARRIVE.',
        libelleConfirmer: 'Confirmer',
        icone: 'question',
      })
      if (!confirme) return
    }
    setEnCours(true)
    setErreurGlobale(null)
    try {
      const { dateArrivage, trainId, gareId, ...reste } = resultat.data
      const corps = {
        ...reste,
        dateArrivage: new Date(dateArrivage).toISOString(),
        ...(trainId && trainId !== 'aucun' ? { trainId } : {}),
        ...(gareId && gareId !== 'aucune' ? { gareId } : {}),
      }
      if (edition) {
        await api.put(`/arrivages/${edition.id}`, corps)
      } else {
        await api.post('/arrivages', corps)
      }
      toast.success(edition ? 'Arrivage modifié.' : 'Arrivage enregistré.')
      setEdition(null)
      setCreationOuverte(false)
      rechargerRef.current?.()
    } catch (erreur) {
      setErreurGlobale(messageApi(erreur, "Enregistrement impossible"))
    } finally {
      setEnCours(false)
    }
  }

  const supprimer = async (l) => {
    if (!(await confirmerSuppression(`Supprimer l’arrivage du ${formatDate(l.dateArrivage)} ?`))) return
    setEnCours(true)
    try {
      await api.delete(`/arrivages/${l.id}`)
      toast.success('Arrivage supprimé.')
      rechargerRef.current?.()
    } catch (erreur) {
      toast.error(messageApi(erreur, 'Suppression impossible'))
    } finally {
      setEnCours(false)
    }
  }

  return (
    <div className="space-y-4">
      <PageTable
      titre="Arrivages"
      description="Réception des marchandises. Un arrivage « Reçue » fait passer l’envoi au statut ARRIVE."
      endpoint="/arrivages"
      libelleNombre="arrivage(s)"
      placeholderRecherche="Rechercher (référence, expéditeur, destinataire)…"
      messageVide="Aucun arrivage."
      apiRef={rechargerRef}
      actions={
        <DialogueFormulaire
          ouvert={creationOuverte}
          onOuvrir={ouvrirCreation}
          onFermer={() => setCreationOuverte(false)}
          libelleOuvrir={
            <>
              <Plus />
              Enregistrer un arrivage
            </>
          }
          titre={edition ? "Modifier l'arrivage" : 'Enregistrer un arrivage'}
          description={
            edition
              ? "La réception (statut « Reçue ») fait passer l'envoi au statut ARRIVE."
              : "La réception (statut « Reçue ») fait passer l'envoi au statut ARRIVE."
          }
          messageErreur={erreurGlobale}
          enCours={enCours}
          onSoumettre={soumettre}
          libelleValider="Enregistrer"
        >
          <div className="space-y-2">
            <Label>Envoi</Label>
            <Select
              value={formulaire.envoiId}
              onValueChange={(v) => modifierChamp('envoiId', v)}
              disabled={!!edition}
            >
              <SelectTrigger disabled={!!edition}>
                <SelectValue placeholder="Choisir un envoi" />
              </SelectTrigger>
              <SelectContent>
                {(envois.donnees?.donnees || []).map((e) => (
                  <SelectItem key={e.id} value={e.id}>
                    {e.reference || 'Sans référence'} — {e.destinataireNom}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {erreurs.envoiId && (
              <p className="text-sm text-destructive">{erreurs.envoiId}</p>
            )}
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label>Date d’arrivage</Label>
              <Input
                type="date"
                value={formulaire.dateArrivage}
                onChange={(e) => modifierChamp('dateArrivage', e.target.value)}
              />
              {erreurs.dateArrivage && (
                <p className="text-sm text-destructive">{erreurs.dateArrivage}</p>
              )}
            </div>
            <div className="space-y-2">
              <Label>Statut</Label>
              <Select value={formulaire.statut} onValueChange={(v) => modifierChamp('statut', v)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {STATUTS.map((s) => (
                    <SelectItem key={s} value={s}>
                      {s}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Train (optionnel)</Label>
              <Select value={formulaire.trainId} onValueChange={(v) => modifierChamp('trainId', v)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="aucun">Aucun</SelectItem>
                  {(trains.donnees?.donnees || []).map((t) => (
                    <SelectItem key={t.id} value={t.id}>
                      {t.numero}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Gare (optionnelle)</Label>
              <Select value={formulaire.gareId} onValueChange={(v) => modifierChamp('gareId', v)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="aucune">Non précisée</SelectItem>
                  {(gares.donnees?.donnees || []).map((g) => (
                    <SelectItem key={g.id} value={g.id}>
                      {g.code} — {g.nom || 'gare'}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-2">
            <Label>Observations</Label>
            <Input
              value={formulaire.observations}
              onChange={(e) => modifierChamp('observations', e.target.value)}
              placeholder="Anomalies, remarques…"
            />
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
            { valeur: 'EN_ATTENTE', libelle: 'En attente' },
            { valeur: 'RECUE', libelle: 'Reçue' },
            { valeur: 'ANOMALIE', libelle: 'Anomalie' },
          ],
        },
      ]}
      colonnes={[
        { titre: 'Date', rendre: (l) => formatDate(l.dateArrivage) },
        { titre: 'Envoi', rendre: (l) => <span className="font-medium">{l.envoi?.reference || '—'}</span> },
        { titre: 'Destinataire', rendre: (l) => l.envoi?.destinataireNom || '—' },
        { titre: 'Train', rendre: (l) => (l.train?.numero ? <Badge variant="outline">{l.train.numero}</Badge> : '—') },
        { titre: 'Gare', rendre: (l) => (l.gare?.code ? <Badge variant="outline">{l.gare.code}</Badge> : '—') },
        { titre: 'Statut', rendre: (l) => <BadgeStatut statut={l.statut} /> },
      ]}
      rendreActions={(l) => (
        <div className="flex justify-end gap-1">
          {peutGerer && (
            <Button
              variant="ghost"
              size="sm"
              title="Modifier"
              onClick={() => ouvrirEdition(l)}
            >
              <Pencil className="size-4" />
            </Button>
          )}
          {peutGerer && (
            <Button
              variant="ghost"
              size="sm"
              className="text-destructive"
              title="Supprimer l’arrivage"
              onClick={() => supprimer(l)}
            >
              <Trash2 className="size-4" />
            </Button>
          )}
        </div>
      )}
      rendreCarte={(l, actions) => (
        <div className="flex h-full flex-col gap-3">
          <div className="flex items-start justify-between gap-2">
            <div>
              <p className="font-medium">{l.envoi?.reference || '—'}</p>
              <p className="text-sm text-muted-foreground">{l.envoi?.destinataireNom || '—'}</p>
            </div>
            <BadgeStatut statut={l.statut} />
          </div>
          <div className="grid grid-cols-2 gap-2 text-sm">
            <div>
              <p className="text-xs text-muted-foreground">Date d’arrivage</p>
              <p>{formatDate(l.dateArrivage)}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Train</p>
              <p>{l.train?.numero || '—'}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Gare</p>
              <p>{l.gare?.code || '—'}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Envoi</p>
              <p className="truncate">{l.envoi?.reference || '—'}</p>
            </div>
          </div>
          {l.observations && (
            <p className="text-sm text-muted-foreground">{l.observations}</p>
          )}
          {actions && <div className="mt-auto flex justify-end">{actions}</div>}
        </div>
      )}
    />
    </div>
  )
}