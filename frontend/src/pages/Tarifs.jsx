import { useState } from 'react'
import { Pencil, Trash2 } from 'lucide-react'
import { z } from 'zod'

import AlerteErreur from '@/components/AlerteErreur'
import DialogueFormulaire from '@/components/DialogueFormulaire'
import SectionListe from '@/components/SectionListe'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { useApi } from '@/hooks/useApi'
import {
  LIBELLES_CLASSE,
  LIBELLES_FORMULE,
  LIBELLES_TYPE_LOCATION,
  formatArgent,
} from '@/lib/affichage'
import api, { messageApi } from '@/services/api'

const modificationSchema = z.object({
  montant: z.coerce
    .number({ message: 'Montant invalide' })
    .int('Le montant doit être un entier')
    .positive('Le montant doit être positif'),
})

function DialogueMontant({ ouvert, onFermer, titre, enCours, erreur, onSoumettre, formulaire, onChanger }) {
  return (
    <DialogueFormulaire
      ouvert={ouvert}
      onFermer={onFermer}
      titre={titre}
      description="Montant en ariary (Ar). Cette valeur est utilisée par les calculs de la plateforme."
      messageErreur={erreur}
      enCours={enCours}
      onSoumettre={onSoumettre}
      libelleValider="Enregistrer"
    >
      <div className="space-y-2">
        <Label htmlFor="tarif-montant">Montant (Ar)</Label>
        <Input
          id="tarif-montant"
          type="number"
          value={formulaire.montant}
          onChange={(e) => onChanger('montant', e.target.value)}
          placeholder="25000"
        />
      </div>
    </DialogueFormulaire>
  )
}

function BoutonModifier({ titre, onModifier }) {
  return (
    <Button variant="ghost" size="sm" title={titre} onClick={onModifier}>
      <Pencil />
    </Button>
  )
}

function BoutonSupprimer({ titre, onSupprimer }) {
  return (
    <Button variant="ghost" size="sm" title={titre} onClick={onSupprimer}>
      <Trash2 />
    </Button>
  )
}

export default function Tarifs() {
  const tarifsBillets = useApi('/tarifs/billets')
  const tarifsLocations = useApi('/tarifs/locations')

  const [dialogue, setDialogue] = useState({ ouvert: false, type: null, ligne: null })
  const [formulaire, setFormulaire] = useState({ montant: '' })
  const [enCours, setEnCours] = useState(false)
  const [erreur, setErreur] = useState(null)

  const erreurGlobale = tarifsBillets.erreur || tarifsLocations.erreur
  const message = tarifsBillets.erreur ? tarifsBillets.message : tarifsLocations.message

  const ouvrirEdition = (type, ligne) => {
    setDialogue({ ouvert: true, type, ligne })
    setFormulaire({ montant: String(ligne.montant) })
    setErreur(null)
  }

  const soumettre = async () => {
    const resultat = modificationSchema.safeParse(formulaire)
    if (!resultat.success) {
      setErreur('Montant invalide : entier positif requis (en ariary)')
      return
    }
    setEnCours(true)
    setErreur(null)
    try {
      const endpoint =
        dialogue.type === 'billet'
          ? `/tarifs/billets/${dialogue.ligne.id}`
          : `/tarifs/locations/${dialogue.ligne.id}`
      await api.put(endpoint, resultat.data)
      setDialogue({ ouvert: false, type: null, ligne: null })
      tarifsBillets.recharger()
      tarifsLocations.recharger()
    } catch (e) {
      setErreur(messageApi(e, 'Enregistrement impossible'))
    } finally {
      setEnCours(false)
    }
  }

  const supprimer = async (type, ligne) => {
    const descriptif =
      type === 'billet'
        ? `${ligne.zone?.code || '—'} / ${LIBELLES_CLASSE[ligne.classe] || ligne.classe}`
        : `${LIBELLES_TYPE_LOCATION[ligne.type] || ligne.type}${ligne.cle ? ` / ${LIBELLES_FORMULE[ligne.cle] || ligne.cle}` : ''}`
    if (!window.confirm(`Supprimer le tarif « ${descriptif} » (${formatArgent(ligne.montant)}) ?`)) return
    const endpoint =
      type === 'billet'
        ? `/tarifs/billets/${ligne.id}`
        : `/tarifs/locations/${ligne.id}`
    try {
      await api.delete(endpoint)
      tarifsBillets.recharger()
      tarifsLocations.recharger()
    } catch (e) {
      setErreur(messageApi(e, 'Suppression impossible'))
    }
  }

  return (
    <div className="space-y-6">
      <p className="text-sm text-muted-foreground">
        Tarifs officiels validés par la FCE, en ariary. Les montants non validés
        apparaissent comme « À valider » dans les pages concernées.
      </p>

      {erreurGlobale && <AlerteErreur message={message} onReessayer={() => { tarifsBillets.recharger(); tarifsLocations.recharger(); }} />}

      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="text-base">Tarifs des billets (par zone et classe)</CardTitle>
        </CardHeader>
        <CardContent>
          <SectionListe
            chargement={tarifsBillets.chargement}
            lignes={tarifsBillets.donnees?.donnees || []}
            messageVide={tarifsBillets.erreur ? 'Données indisponibles.' : 'Aucun tarif.'}
            colonnes={[
              { titre: 'Zone', rendre: (l) => <Badge variant="outline">{l.zone?.code || '—'}</Badge> },
              { titre: 'Classe', rendre: (l) => LIBELLES_CLASSE[l.classe] || l.classe },
              { titre: 'Montant', align: 'right', rendre: (l) => <span className="font-medium tabular-nums">{formatArgent(l.montant)}</span> },
            ]}
            rendreActions={(l) => (
              <div className="flex justify-end gap-1">
                <BoutonModifier titre="Modifier le tarif" onModifier={() => ouvrirEdition('billet', l)} />
                <BoutonSupprimer titre="Supprimer le tarif" onSupprimer={() => supprimer('billet', l)} />
              </div>
            )}
          />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Tarifs de location (draisine, machine…)</CardTitle>
        </CardHeader>
        <CardContent>
          <SectionListe
            chargement={tarifsLocations.chargement}
            lignes={tarifsLocations.donnees?.donnees || []}
            messageVide={tarifsLocations.erreur ? 'Données indisponibles.' : 'Aucun tarif.'}
            colonnes={[
              { titre: 'Type', rendre: (l) => LIBELLES_TYPE_LOCATION[l.type] || l.type },
              { titre: 'Formule', rendre: (l) => (l.cle ? (LIBELLES_FORMULE[l.cle] || l.cle) : '—') },
              { titre: 'Zone', rendre: (l) => (l.zone?.code ? <Badge variant="outline">{l.zone.code}</Badge> : '—') },
              { titre: 'Montant', align: 'right', rendre: (l) => <span className="font-medium tabular-nums">{formatArgent(l.montant)}</span> },
            ]}
            rendreActions={(l) => (
              <div className="flex justify-end gap-1">
                <BoutonModifier titre="Modifier le tarif" onModifier={() => ouvrirEdition('location', l)} />
                <BoutonSupprimer titre="Supprimer le tarif" onSupprimer={() => supprimer('location', l)} />
              </div>
            )}
          />
        </CardContent>
      </Card>

      <DialogueMontant
        ouvert={dialogue.ouvert}
        onFermer={() => setDialogue({ ouvert: false, type: null, ligne: null })}
        titre="Modifier le tarif"
        enCours={enCours}
        erreur={erreur}
        onSoumettre={soumettre}
        formulaire={formulaire}
        onChanger={(cle, valeur) => setFormulaire((f) => ({ ...f, [cle]: valeur }))}
      />
    </div>
  )
}