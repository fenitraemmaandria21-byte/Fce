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
import { useApi } from '@/hooks/useApi'
import { Marqueur } from '@/lib/affichage'
import { confirmerSuppression } from '@/lib/confirmation'
import api, { messageApi } from '@/services/api'

const modificationSchema = z.object({
  libelle: z.string().trim().min(1, 'Le libellé est requis').max(200),
  pk: z.coerce.number().int('Le PK doit être un entier').positive('Le PK doit être supérieur à 0'),
  zoneGeographique: z.string().trim().min(1, 'La zone géographique est requise').max(20),
  zoneTarif: z.string().trim().min(1, 'La zone tarifaire est requise').max(20),
})

export default function Arrets() {
  const { chargement, donnees, erreur, message, recharger } = useApi('/arrets')
  const lignes = donnees?.donnees || []

  const [dialogueOuvert, setDialogueOuvert] = useState(false)
  const [enEdition, setEnEdition] = useState(null)
  const [formulaire, setFormulaire] = useState({})
  const [erreurs, setErreurs] = useState({})
  const [enCours, setEnCours] = useState(false)
  const [erreurGlobale, setErreurGlobale] = useState(null)

  const ouvrirEdition = (arret) => {
    setEnEdition(arret)
    setFormulaire({
      libelle: arret.libelle,
      pk: String(arret.pk),
      zoneGeographique: arret.zoneGeographique,
      zoneTarif: arret.zoneTarif,
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
      await api.put(`/arrets/${enEdition.id}`, resultat.data)
      toast.success('Arrêt modifié.')
      setDialogueOuvert(false)
      recharger()
    } catch (e) {
      setErreurGlobale(messageApi(e, 'Enregistrement impossible'))
    } finally {
      setEnCours(false)
    }
  }

  const supprimer = async (arret) => {
    if (!(await confirmerSuppression(`Supprimer l’arrêt « ${arret.libelle} » ?`))) return
    try {
      await api.delete(`/arrets/${arret.id}`)
      toast.success('Arrêt supprimé.')
      recharger()
    } catch (e) {
      toast.error(messageApi(e, 'Suppression impossible'))
    }
  }

  const colonnes = [
    { titre: 'PK', align: 'right', rendre: (l) => <span className="tabular-nums">{l.pk}</span> },
    { titre: 'Libellé', cle: 'libelle' },
    {
      titre: 'Zone géographique',
      rendre: (l) => <Marqueur valeur={l.zoneGeographique} />,
    },
    {
      titre: 'Zone tarifaire',
      rendre: (l) => <Marqueur valeur={l.zoneTarif} />,
    },
  ]

  return (
    <div className="space-y-6">
      <div className="space-y-1">
        <h1 className="text-2xl font-semibold">Arrêts</h1>
        <p className="text-sm text-muted-foreground">
          Arrêts facultatifs de la ligne FCE. Les zones non confirmées par la FCE restent
          marquées « À valider ».
        </p>
      </div>

      {erreur && (
        <AlerteErreur message={message} onReessayer={recharger} />
      )}

      <Card>
        <CardContent className="p-0">
          <SectionListe
            colonnes={colonnes}
            chargement={chargement}
            lignes={lignes}
            messageVide={erreur ? 'Données indisponibles.' : 'Aucun arrêt dans le référentiel.'}
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
        titre={enEdition ? `Modifier l’arrêt PK${enEdition.pk}` : 'Modifier l’arrêt'}
        description="Arrêt facultatif de la ligne. Un libellé ou un PK déjà utilisé sera refusé."
        messageErreur={erreurGlobale}
        enCours={enCours}
        onSoumettre={soumettre}
        libelleValider="Enregistrer"
      >
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="arret-pk">PK</Label>
            <Input
              id="arret-pk"
              type="number"
              value={formulaire.pk}
              onChange={(e) => modifierChamp('pk', e.target.value)}
              placeholder="67"
            />
            {erreurs.pk && <p className="text-sm text-destructive">{erreurs.pk}</p>}
          </div>
          <div className="space-y-2">
            <Label htmlFor="arret-zone-geo">Zone géographique</Label>
            <Input
              id="arret-zone-geo"
              value={formulaire.zoneGeographique}
              onChange={(e) => modifierChamp('zoneGeographique', e.target.value)}
              placeholder="Z2/3 ou À valider"
            />
            {erreurs.zoneGeographique && (
              <p className="text-sm text-destructive">{erreurs.zoneGeographique}</p>
            )}
          </div>
        </div>
        <div className="space-y-2">
          <Label htmlFor="arret-libelle">Libellé</Label>
          <Input
            id="arret-libelle"
            value={formulaire.libelle}
            onChange={(e) => modifierChamp('libelle', e.target.value)}
            placeholder="PK67 Tolongoina–Amboanjobe"
          />
          {erreurs.libelle && <p className="text-sm text-destructive">{erreurs.libelle}</p>}
        </div>
        <div className="space-y-2">
          <Label htmlFor="arret-zone-tarif">Zone tarifaire</Label>
          <Input
            id="arret-zone-tarif"
            value={formulaire.zoneTarif}
            onChange={(e) => modifierChamp('zoneTarif', e.target.value)}
            placeholder="Z3 ou À valider"
          />
          {erreurs.zoneTarif && (
            <p className="text-sm text-destructive">{erreurs.zoneTarif}</p>
          )}
        </div>
      </DialogueFormulaire>
    </div>
  )
}