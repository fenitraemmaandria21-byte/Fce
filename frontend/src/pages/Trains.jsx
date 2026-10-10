import { useState } from 'react'
import { Pencil, Plus, Trash2 } from 'lucide-react'
import { toast } from 'react-toastify'
import { z } from 'zod'

import AlerteErreur from '@/components/AlerteErreur'
import DialogueFormulaire from '@/components/DialogueFormulaire'
import SectionListe from '@/components/SectionListe'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { useApi } from '@/hooks/useApi'
import { confirmerSuppression } from '@/lib/confirmation'
import api, { messageApi } from '@/services/api'

const JOURS = ['lundi', 'mardi', 'mercredi', 'jeudi', 'vendredi', 'samedi', 'dimanche']

const modificationSchema = z.object({
  numero: z.string().trim().min(1, 'Le numéro est requis').max(10),
  origine: z.string().trim().min(1, 'L’origine est requise').max(120),
  destination: z.string().trim().min(1, 'La destination est requise').max(120),
  jours: z.array(z.string()).min(1, 'Sélectionnez au moins un jour'),
})

function BoutonJour({ jour, actif, onBasculer }) {
  return (
    <Button
      type="button"
      variant={actif ? 'default' : 'outline'}
      size="sm"
      onClick={() => onBasculer(jour)}
    >
      {jour}
    </Button>
  )
}

export default function Trains() {
  const { chargement, donnees, erreur, message, recharger } = useApi('/trains')
  const lignes = donnees?.donnees || []

  const [dialogueOuvert, setDialogueOuvert] = useState(false)
  const [enEdition, setEnEdition] = useState(null)
  const [formulaire, setFormulaire] = useState({})
  const [erreurs, setErreurs] = useState({})
  const [enCours, setEnCours] = useState(false)
  const [erreurGlobale, setErreurGlobale] = useState(null)

  const ouvrirCreation = () => {
    setEnEdition(null)
    setFormulaire({ numero: '', origine: '', destination: '', jours: [] })
    setErreurs({})
    setErreurGlobale(null)
    setDialogueOuvert(true)
  }

  const ouvrirEdition = (train) => {
    setEnEdition(train)
    setFormulaire({
      numero: train.numero,
      origine: train.origine,
      destination: train.destination,
      jours: train.jours || [],
    })
    setErreurs({})
    setErreurGlobale(null)
    setDialogueOuvert(true)
  }

  const modifierChamp = (cle, valeur) => {
    setFormulaire((f) => ({ ...f, [cle]: valeur }))
    setErreurs((e) => ({ ...e, [cle]: undefined }))
  }

  const basculerJour = (jour) => {
    setFormulaire((f) => {
      const jours = f.jours || []
      return {
        ...f,
        jours: jours.includes(jour)
          ? jours.filter((j) => j !== jour)
          : [...jours, jour],
      }
    })
    setErreurs((e) => ({ ...e, jours: undefined }))
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
      if (enEdition) {
        await api.put(`/trains/${enEdition.id}`, resultat.data)
      } else {
        await api.post('/trains', resultat.data)
      }
      toast.success(enEdition ? 'Train modifié.' : 'Train créé.')
      setDialogueOuvert(false)
      recharger()
    } catch (e) {
      setErreurGlobale(messageApi(e, 'Enregistrement impossible'))
    } finally {
      setEnCours(false)
    }
  }

  const supprimer = async (train) => {
    if (!(await confirmerSuppression(`Supprimer le train ${train.numero} ?`))) return
    try {
      await api.delete(`/trains/${train.id}`)
      toast.success('Train supprimé.')
      recharger()
    } catch (e) {
      toast.error(messageApi(e, 'Suppression impossible'))
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="space-y-1">
          <h1 className="text-2xl font-semibold">Trains</h1>
          <p className="text-sm text-muted-foreground">
            Trains réguliers de la ligne et jours de circulation (données officielles FCE).
          </p>
        </div>
        <Button onClick={ouvrirCreation}>
          <Plus />
          Ajouter un train
        </Button>
      </div>

      {erreur && <AlerteErreur message={message} onReessayer={recharger} />}

      <Card>
        <CardContent className="p-0">
          <SectionListe
            colonnes={[
              { titre: 'Numéro', cle: 'numero' },
              { titre: 'Origine', cle: 'origine' },
              { titre: 'Destination', cle: 'destination' },
              {
                titre: 'Jours',
                rendre: (l) => (
                  <span className="flex flex-wrap gap-1">
                    {(l.jours || []).map((jour) => (
                      <Badge key={jour} variant="outline">
                        {jour}
                      </Badge>
                    ))}
                  </span>
                ),
              },
            ]}
            chargement={chargement}
            lignes={lignes}
            messageVide={erreur ? 'Données indisponibles.' : 'Aucun train dans le référentiel.'}
            rendreActions={(l) => (
              <div className="flex justify-end gap-1">
                <Button variant="ghost" size="sm" title="Modifier" onClick={() => ouvrirEdition(l)}>
                  <Pencil />
                </Button>
                <Button variant="ghost" size="sm" title="Supprimer" onClick={() => supprimer(l)}>
                  <Trash2 />
                </Button>
              </div>
            )}
          />
        </CardContent>
      </Card>

      <DialogueFormulaire
        ouvert={dialogueOuvert}
        onFermer={() => setDialogueOuvert(false)}
        titre={enEdition ? `Modifier le train ${enEdition.numero}` : 'Ajouter un train'}
        description="Numéro, trajet et jours de circulation. Un numéro déjà utilisé sera refusé."
        messageErreur={erreurGlobale}
        enCours={enCours}
        onSoumettre={soumettre}
        libelleValider="Enregistrer"
      >
        <div className="grid grid-cols-3 gap-4">
          <div className="space-y-2">
            <Label htmlFor="train-numero">Numéro</Label>
            <Input
              id="train-numero"
              value={formulaire.numero}
              onChange={(e) => modifierChamp('numero', e.target.value)}
              placeholder="4451"
            />
            {erreurs.numero && <p className="text-sm text-destructive">{erreurs.numero}</p>}
          </div>
          <div className="space-y-2">
            <Label htmlFor="train-origine">Origine</Label>
            <Input
              id="train-origine"
              value={formulaire.origine}
              onChange={(e) => modifierChamp('origine', e.target.value)}
              placeholder="Fianarantsoa"
            />
            {erreurs.origine && <p className="text-sm text-destructive">{erreurs.origine}</p>}
          </div>
          <div className="space-y-2">
            <Label htmlFor="train-destination">Destination</Label>
            <Input
              id="train-destination"
              value={formulaire.destination}
              onChange={(e) => modifierChamp('destination', e.target.value)}
              placeholder="Manakara"
            />
            {erreurs.destination && (
              <p className="text-sm text-destructive">{erreurs.destination}</p>
            )}
          </div>
        </div>
        <div className="space-y-2">
          <Label>Jours de circulation</Label>
          <div className="flex flex-wrap gap-1">
            {JOURS.map((jour) => (
              <BoutonJour
                key={jour}
                jour={jour}
                actif={(formulaire.jours || []).includes(jour)}
                onBasculer={basculerJour}
              />
            ))}
          </div>
          {erreurs.jours && <p className="text-sm text-destructive">{erreurs.jours}</p>}
        </div>
      </DialogueFormulaire>
    </div>
  )
}