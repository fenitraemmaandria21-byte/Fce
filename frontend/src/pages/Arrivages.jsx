import { Plus } from 'lucide-react'
import { useRef, useState } from 'react'
import { z } from 'zod'

import DialogueFormulaire from '@/components/DialogueFormulaire'
import PageTable from '@/components/PageTable'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { useApi } from '@/hooks/useApi'
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
  const [statut, setStatut] = useState('tous')
  const [creationOuverte, setCreationOuverte] = useState(false)
  const [formulaire, setFormulaire] = useState(ARRIVAGE_VIDE)
  const [erreurs, setErreurs] = useState({})
  const [enCours, setEnCours] = useState(false)
  const [erreurGlobale, setErreurGlobale] = useState(null)
  const rechargerRef = useRef(null)

  const envois = useApi('/marchandises', { limit: 100 })
  const trains = useApi('/trains')
  const gares = useApi('/gares', { limit: 100 })

  const ouvrirCreation = () => {
    setFormulaire(ARRIVAGE_VIDE)
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
    setEnCours(true)
    setErreurGlobale(null)
    try {
      const { dateArrivage, trainId, gareId, ...reste } = resultat.data
      await api.post('/arrivages', {
        ...reste,
        dateArrivage: new Date(dateArrivage).toISOString(),
        ...(trainId && trainId !== 'aucun' ? { trainId } : {}),
        ...(gareId && gareId !== 'aucune' ? { gareId } : {}),
      })
      setCreationOuverte(false)
      rechargerRef.current?.()
    } catch (erreur) {
      setErreurGlobale(messageApi(erreur, "Enregistrement impossible"))
    } finally {
      setEnCours(false)
    }
  }

  return (
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
          titre="Enregistrer un arrivage"
          description="La réception (statut « Reçue ») fait passer l’envoi au statut ARRIVE."
          messageErreur={erreurGlobale}
          enCours={enCours}
          onSoumettre={soumettre}
          libelleValider="Enregistrer"
        >
          <div className="space-y-2">
            <Label>Envoi</Label>
            <Select value={formulaire.envoiId} onValueChange={(v) => modifierChamp('envoiId', v)}>
              <SelectTrigger>
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
    />
  )
}