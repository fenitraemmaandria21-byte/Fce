import { useState } from 'react'
import {
  Car,
  Coins,
  Container,
  MapPin,
  Pencil,
  Settings,
  Signpost,
  TrainFront,
  Trash2,
} from 'lucide-react'
import { toast } from 'react-toastify'
import { z } from 'zod'

import AlerteErreur from '@/components/AlerteErreur'
import DialogueFormulaire from '@/components/DialogueFormulaire'
import SectionListe from '@/components/SectionListe'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { useApi } from '@/hooks/useApi'
import { LIBELLES_PARAMETRE, Marqueur, formatDate } from '@/lib/affichage'
import Gares from '@/pages/Gares'
import Arrets from '@/pages/Arrets'
import Tarifs from '@/pages/Tarifs'
import Trains from '@/pages/Trains'
import Voitures from '@/pages/Voitures'
import Wagons from '@/pages/Wagons'
import { confirmerSuppression } from '@/lib/confirmation'
import api, { messageApi } from '@/services/api'

const modificationSchema = z.object({
  valeur: z.string().trim().min(1, 'La valeur est requise'),
})

function ParametresSysteme() {
  const { chargement, donnees, erreur, message, recharger } = useApi('/parametres')
  const lignes = donnees?.donnees || []

  const [dialogueOuvert, setDialogueOuvert] = useState(false)
  const [enEdition, setEnEdition] = useState(null)
  const [formulaire, setFormulaire] = useState({ valeur: '' })
  const [erreurs, setErreurs] = useState({})
  const [enCours, setEnCours] = useState(false)
  const [erreurGlobale, setErreurGlobale] = useState(null)

  const ouvrirEdition = (parametre) => {
    setEnEdition(parametre)
    setFormulaire({ valeur: parametre.valeur })
    setErreurs({})
    setErreurGlobale(null)
    setDialogueOuvert(true)
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
      await api.put(`/parametres/${encodeURIComponent(enEdition.cle)}`, resultat.data)
      toast.success('Paramètre modifié.')
      setDialogueOuvert(false)
      recharger()
    } catch (e) {
      setErreurGlobale(messageApi(e, 'Enregistrement impossible'))
    } finally {
      setEnCours(false)
    }
  }

  const supprimer = async (parametre) => {
    const libelle = LIBELLES_PARAMETRE[parametre.cle] || parametre.cle
    if (!(await confirmerSuppression(`Supprimer le paramètre « ${libelle} » ?`))) return
    try {
      await api.delete(`/parametres/${encodeURIComponent(parametre.cle)}`)
      toast.success('Paramètre supprimé.')
      recharger()
    } catch (e) {
      toast.error(messageApi(e, 'Suppression impossible'))
    }
  }

  const colonnes = [
    {
      titre: 'Paramètre',
      rendre: (l) => (
        <span className="font-medium">
          {LIBELLES_PARAMETRE[l.cle] || l.cle}
        </span>
      ),
    },
    { titre: 'Valeur', rendre: (l) => <Marqueur valeur={l.valeur} /> },
    { titre: 'Description', cle: 'description', tronquer: true, largeur: 'max-w-[22rem]' },
    {
      titre: 'Modifié le',
      tronquer: true,
      largeur: 'max-w-[18rem]',
      titreInfo: (l) =>
        `${formatDate(l.updatedAt, true)}${l.modifiePar?.nom ? ` par ${l.modifiePar.nom}` : ''}`,
      rendre: (l) => {
        const auteur = l.modifiePar?.nom ? `par ${l.modifiePar.nom}` : ''
        return (
          <div className="text-sm">
            <span className="text-muted-foreground">{formatDate(l.updatedAt, true)}</span>
            {auteur && <span className="ml-1 text-muted-foreground">{auteur}</span>}
          </div>
        )
      },
    },
  ]

  return (
    <div className="space-y-6">
      {erreur && (
        <AlerteErreur message={message} onReessayer={recharger} />
      )}

      <Card>
        <CardContent className="p-0">
          <SectionListe
            colonnes={colonnes}
            chargement={chargement}
            lignes={lignes}
            messageVide={erreur ? 'Données indisponibles.' : 'Aucun paramètre.'}
            rendreActions={(l) => (
              <div className="flex justify-end gap-1">
                <Button
                  variant="ghost"
                  size="sm"
                  title="Modifier"
                  onClick={() => ouvrirEdition(l)}
                >
                  <Pencil />
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  title="Supprimer"
                  onClick={() => supprimer(l)}
                >
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
        titre={
          enEdition
            ? `Modifier ${LIBELLES_PARAMETRE[enEdition.cle] || enEdition.cle}`
            : 'Modifier le paramètre'
        }
        description="La valeur est utilisée par le moteur de calcul de la plateforme."
        messageErreur={erreurGlobale}
        enCours={enCours}
        onSoumettre={soumettre}
        libelleValider="Enregistrer"
      >
        <div className="space-y-2">
          <Label htmlFor="param-valeur">Valeur</Label>
          <Input
            id="param-valeur"
            value={formulaire.valeur}
            onChange={(e) => {
              setFormulaire({ valeur: e.target.value })
              setErreurs((err) => ({ ...err, valeur: undefined }))
            }}
            placeholder="Valeur du paramètre"
          />
          {erreurs.valeur && <p className="text-sm text-destructive">{erreurs.valeur}</p>}
        </div>
      </DialogueFormulaire>
    </div>
  )
}

export default function Parametres() {
  return (
    <div className="space-y-4">
      <div className="space-y-1">
        <h1 className="text-2xl font-semibold">Paramètres &amp; référentiels</h1>
        <p className="text-sm text-muted-foreground">
          Paramètres système et données de référence de la plateforme (réserver l'équipe
          FCE pour modifier).
        </p>
      </div>

      <Tabs defaultValue="parametres" orientation="vertical" className="gap-5">
        <TabsList className="h-fit w-52 shrink-0 flex-col items-stretch gap-1 rounded-xl border border-foreground/20 bg-card p-2 shadow-sm">
          <TabsTrigger value="parametres" className="h-auto justify-start gap-2 px-3 py-2">
            <Settings />
            Paramètres
          </TabsTrigger>
          <TabsTrigger value="gares" className="h-auto justify-start gap-2 px-3 py-2">
            <MapPin />
            Gares
          </TabsTrigger>
          <TabsTrigger value="arrets" className="h-auto justify-start gap-2 px-3 py-2">
            <Signpost />
            Arrêts
          </TabsTrigger>
          <TabsTrigger value="tarifs" className="h-auto justify-start gap-2 px-3 py-2">
            <Coins />
            Tarifs
          </TabsTrigger>
          <TabsTrigger value="trains" className="h-auto justify-start gap-2 px-3 py-2">
            <TrainFront />
            Trains
          </TabsTrigger>
          <TabsTrigger value="voitures" className="h-auto justify-start gap-2 px-3 py-2">
            <Car />
            Voitures
          </TabsTrigger>
          <TabsTrigger value="wagons" className="h-auto justify-start gap-2 px-3 py-2">
            <Container />
            Wagons
          </TabsTrigger>
        </TabsList>

        <TabsContent value="parametres" className="min-w-0">
          <ParametresSysteme />
        </TabsContent>
        <TabsContent value="gares" className="min-w-0">
          <Gares />
        </TabsContent>
        <TabsContent value="arrets" className="min-w-0">
          <Arrets />
        </TabsContent>
        <TabsContent value="tarifs" className="min-w-0">
          <Tarifs />
        </TabsContent>
        <TabsContent value="trains" className="min-w-0">
          <Trains />
        </TabsContent>
        <TabsContent value="voitures" className="min-w-0">
          <Voitures />
        </TabsContent>
        <TabsContent value="wagons" className="min-w-0">
          <Wagons />
        </TabsContent>
      </Tabs>
    </div>
  )
}