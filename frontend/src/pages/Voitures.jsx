import { useState } from 'react'
import { Pencil, Trash2 } from 'lucide-react'
import { toast } from 'react-toastify'
import { z } from 'zod'

import AlerteErreur from '@/components/AlerteErreur'
import DialogueFormulaire from '@/components/DialogueFormulaire'
import SectionListe from '@/components/SectionListe'
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
import { useApi } from '@/hooks/useApi'
import { LIBELLES_CLASSE, formatNombre } from '@/lib/affichage'
import { confirmerSuppression } from '@/lib/confirmation'
import api, { messageApi } from '@/services/api'

const modificationSchema = z.object({
  code: z.string().trim().min(1, 'Le code est requis').max(20),
  places: z.coerce.number().int('Le nombre de places doit être un entier').positive('Le nombre de places doit être positif'),
  classe: z.enum(['PREMIERE_CLASSE', 'RESERVATION_RESIDENT', 'RESERVATION_NON_RESIDENT'], 'Classe invalide'),
})

export default function Voitures() {
  const { chargement, donnees, erreur, message, recharger } = useApi('/voitures')
  const lignes = donnees?.donnees || []

  const [dialogueOuvert, setDialogueOuvert] = useState(false)
  const [enEdition, setEnEdition] = useState(null)
  const [formulaire, setFormulaire] = useState({})
  const [erreurs, setErreurs] = useState({})
  const [enCours, setEnCours] = useState(false)
  const [erreurGlobale, setErreurGlobale] = useState(null)

  const ouvrirEdition = (voiture) => {
    setEnEdition(voiture)
    setFormulaire({
      code: voiture.code,
      places: String(voiture.places),
      classe: voiture.classe,
    })
    setErreurs({})
    setErreurGlobale(null)
    setDialogueOuvert(true)
  }

  const modifierChamp = (cle, valeur) => {
    setFormulaire((f) => ({ ...f, [cle]: valeur }))
    setErreurs((e) => ({ ...e, [cle]: undefined }))
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
      await api.put(`/voitures/${enEdition.id}`, resultat.data)
      toast.success('Voiture modifiée.')
      setDialogueOuvert(false)
      recharger()
    } catch (e) {
      setErreurGlobale(messageApi(e, 'Enregistrement impossible'))
    } finally {
      setEnCours(false)
    }
  }

  const supprimer = async (voiture) => {
    if (!(await confirmerSuppression(`Supprimer la voiture ${voiture.code} ?`))) return
    try {
      await api.delete(`/voitures/${voiture.id}`)
      toast.success('Voiture supprimée.')
      recharger()
    } catch (e) {
      toast.error(messageApi(e, 'Suppression impossible'))
    }
  }

  return (
    <div className="space-y-6">
      <div className="space-y-1">
        <h1 className="text-2xl font-semibold">Voitures</h1>
        <p className="text-sm text-muted-foreground">
          Parc de voitures voyageurs. L’affectation aux trains reste à confirmer tant qu’elle
          n’est pas validée.
        </p>
      </div>

      {erreur && <AlerteErreur message={message} onReessayer={recharger} />}

      <Card>
        <CardContent className="p-0">
          <SectionListe
            colonnes={[
              { titre: 'Code', cle: 'code' },
              { titre: 'Places', align: 'right', rendre: (l) => formatNombre(l.places) },
              { titre: 'Classe', rendre: (l) => LIBELLES_CLASSE[l.classe] || l.classe },
              {
                titre: 'Train affecté',
                rendre: (l) =>
                  l.train?.numero ? (
                    <span className="font-medium">{l.train.numero}</span>
                  ) : (
                    <span className="text-muted-foreground">Non affectée</span>
                  ),
              },
            ]}
            chargement={chargement}
            lignes={lignes}
            messageVide={erreur ? 'Données indisponibles.' : 'Aucune voiture dans le parc.'}
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
        titre={enEdition ? `Modifier la voiture ${enEdition.code}` : 'Modifier la voiture'}
        description="Code, nombre de places et classe. L’affectation à un train reste à valider."
        messageErreur={erreurGlobale}
        enCours={enCours}
        onSoumettre={soumettre}
        libelleValider="Enregistrer"
      >
        <div className="grid grid-cols-3 gap-4">
          <div className="space-y-2">
            <Label htmlFor="voiture-code">Code</Label>
            <Input
              id="voiture-code"
              value={formulaire.code}
              onChange={(e) => modifierChamp('code', e.target.value)}
              placeholder="BT506"
            />
            {erreurs.code && <p className="text-sm text-destructive">{erreurs.code}</p>}
          </div>
          <div className="space-y-2">
            <Label htmlFor="voiture-places">Places</Label>
            <Input
              id="voiture-places"
              type="number"
              value={formulaire.places}
              onChange={(e) => modifierChamp('places', e.target.value)}
              placeholder="88"
            />
            {erreurs.places && <p className="text-sm text-destructive">{erreurs.places}</p>}
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
                {Object.keys(LIBELLES_CLASSE).map((classe) => (
                  <SelectItem key={classe} value={classe}>
                    {LIBELLES_CLASSE[classe]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {erreurs.classe && <p className="text-sm text-destructive">{erreurs.classe}</p>}
          </div>
        </div>
      </DialogueFormulaire>
    </div>
  )
}