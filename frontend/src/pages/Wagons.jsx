import { useState } from 'react'
import { Pencil, Trash2 } from 'lucide-react'
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { useApi } from '@/hooks/useApi'
import { confirmerSuppression } from '@/lib/confirmation'
import api, { messageApi } from '@/services/api'

const modificationSchema = z.object({
  code: z.string().trim().min(1, 'Le code est requis').max(30),
  typeWagon: z.string().trim().min(1, 'Le type est requis').max(20),
  serie: z.coerce.number().int('La série doit être un entier').positive('La série doit être positive'),
  capaciteTonnes: z.coerce.number().int('La capacité doit être un entier').positive('La capacité doit être positive'),
})

const TYPES_WAGON = ['K30', 'DKP15', 'DKP30']

export default function Wagons() {
  const [serie, setSerie] = useState('toutes')

  const { chargement, donnees, erreur, message, recharger } = useApi(
    '/wagons',
    serie === 'toutes' ? {} : { serie }
  )
  const lignes = donnees?.donnees || []

  const [dialogueOuvert, setDialogueOuvert] = useState(false)
  const [enEdition, setEnEdition] = useState(null)
  const [formulaire, setFormulaire] = useState({})
  const [erreurs, setErreurs] = useState({})
  const [enCours, setEnCours] = useState(false)
  const [erreurGlobale, setErreurGlobale] = useState(null)

  const ouvrirEdition = (wagon) => {
    setEnEdition(wagon)
    setFormulaire({
      code: wagon.code,
      typeWagon: wagon.typeWagon,
      serie: String(wagon.serie),
      capaciteTonnes: String(wagon.capaciteTonnes),
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
      await api.put(`/wagons/${enEdition.id}`, resultat.data)
      toast.success('Wagon modifié.')
      setDialogueOuvert(false)
      recharger()
    } catch (e) {
      setErreurGlobale(messageApi(e, 'Enregistrement impossible'))
    } finally {
      setEnCours(false)
    }
  }

  const supprimer = async (wagon) => {
    if (!(await confirmerSuppression(`Supprimer le wagon ${wagon.code} ?`))) return
    try {
      await api.delete(`/wagons/${wagon.id}`)
      toast.success('Wagon supprimé.')
      recharger()
    } catch (e) {
      toast.error(messageApi(e, 'Suppression impossible'))
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="space-y-1">
          <h1 className="text-2xl font-semibold">Wagons</h1>
          <p className="text-sm text-muted-foreground">
            Parc de wagons de marchandises (séries 100 et 400).
          </p>
        </div>
        <Select
          value={serie}
          onValueChange={setSerie}
        >
          <SelectTrigger className="w-44">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="toutes">Toutes les séries</SelectItem>
            <SelectItem value="100">Série 100</SelectItem>
            <SelectItem value="400">Série 400</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {erreur && <AlerteErreur message={message} onReessayer={recharger} />}

      <Card>
        <CardContent className="p-0">
          <SectionListe
            colonnes={[
              { titre: 'Code', cle: 'code' },
              { titre: 'Type', rendre: (l) => <Badge variant="outline">{l.typeWagon}</Badge> },
              { titre: 'Série', align: 'right', cle: 'serie' },
              { titre: 'Capacité', align: 'right', rendre: (l) => `${l.capaciteTonnes} t` },
            ]}
            chargement={chargement}
            lignes={lignes}
            messageVide={erreur ? 'Données indisponibles.' : 'Aucun wagon pour cette série.'}
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
        titre={enEdition ? `Modifier le wagon ${enEdition.code}` : 'Modifier le wagon'}
        description="Code, type, série et capacité de chargement. Un code déjà utilisé sera refusé."
        messageErreur={erreurGlobale}
        enCours={enCours}
        onSoumettre={soumettre}
        libelleValider="Enregistrer"
      >
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="wagon-code">Code</Label>
            <Input
              id="wagon-code"
              value={formulaire.code}
              onChange={(e) => modifierChamp('code', e.target.value)}
              placeholder="K30 122"
            />
            {erreurs.code && <p className="text-sm text-destructive">{erreurs.code}</p>}
          </div>
          <div className="space-y-2">
            <Label>Type</Label>
            <Select
              value={formulaire.typeWagon}
              onValueChange={(v) => modifierChamp('typeWagon', v)}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {TYPES_WAGON.map((type) => (
                  <SelectItem key={type} value={type}>
                    {type}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {erreurs.typeWagon && (
              <p className="text-sm text-destructive">{erreurs.typeWagon}</p>
            )}
          </div>
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="wagon-serie">Série</Label>
            <Input
              id="wagon-serie"
              type="number"
              value={formulaire.serie}
              onChange={(e) => modifierChamp('serie', e.target.value)}
              placeholder="100"
            />
            {erreurs.serie && <p className="text-sm text-destructive">{erreurs.serie}</p>}
          </div>
          <div className="space-y-2">
            <Label htmlFor="wagon-capacite">Capacité (tonnes)</Label>
            <Input
              id="wagon-capacite"
              type="number"
              value={formulaire.capaciteTonnes}
              onChange={(e) => modifierChamp('capaciteTonnes', e.target.value)}
              placeholder="25"
            />
            {erreurs.capaciteTonnes && (
              <p className="text-sm text-destructive">{erreurs.capaciteTonnes}</p>
            )}
          </div>
        </div>
      </DialogueFormulaire>
    </div>
  )
}