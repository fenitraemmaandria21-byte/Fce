import { useState } from 'react'
import { Pencil, Trash2 } from 'lucide-react'
import { toast } from 'react-toastify'
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
  LIBELLES_CATEGORIE_MARCHANDISE,
  LIBELLES_CLASSE,
  LIBELLES_FORMULE,
  LIBELLES_TYPE_LOCATION,
  formatArgent,
  formatTarifKg,
} from '@/lib/affichage'
import { confirmerSuppression } from '@/lib/confirmation'
import api, { messageApi } from '@/services/api'

const modificationSchema = z.object({
  montant: z.coerce
    .number({ message: 'Montant invalide' })
    .int('Le montant doit être un entier')
    .positive('Le montant doit être positif'),
})

const tarifKgSchema = z.object({
  tarifKg: z
    .string()
    .trim()
    .min(1, 'Le tarif est requis')
    .refine((v) => !Number.isNaN(Number.parseFloat(v)), 'Tarif invalide (nombre attendu)')
    .refine((v) => Number.parseFloat(v) >= 0, 'Le tarif doit être positif'),
})

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
  const tarifsMarchandise = useApi('/tarifs/marchandise')

  const [dialogue, setDialogue] = useState({ ouvert: false, type: null, ligne: null })
  const [formulaire, setFormulaire] = useState({ montant: '', tarifKg: '' })
  const [enCours, setEnCours] = useState(false)
  const [erreur, setErreur] = useState(null)

  const estMarchandise = dialogue.type === 'marchandise'
  const erreurGlobale =
    tarifsBillets.erreur || tarifsLocations.erreur || tarifsMarchandise.erreur
  const message = tarifsBillets.erreur
    ? tarifsBillets.message
    : tarifsLocations.erreur
      ? tarifsLocations.message
      : tarifsMarchandise.message

  const rechargerTout = () => {
    tarifsBillets.recharger()
    tarifsLocations.recharger()
    tarifsMarchandise.recharger()
  }

  const ouvrirEdition = (type, ligne) => {
    setDialogue({ ouvert: true, type, ligne })
    setFormulaire({
      montant: type === 'marchandise' ? '' : String(ligne.montant),
      tarifKg: type === 'marchandise' ? String(ligne.tarifKg) : '',
    })
    setErreur(null)
  }

  const soumettre = async () => {
    if (estMarchandise) {
      const resultat = tarifKgSchema.safeParse(formulaire)
      if (!resultat.success) {
        setErreur(resultat.error.issues[0]?.message || 'Tarif invalide')
        return
      }
      setEnCours(true)
      setErreur(null)
      try {
        await api.put(`/tarifs/marchandise/${dialogue.ligne.id}`, {
          tarifKg: Number.parseFloat(resultat.data.tarifKg),
        })
        toast.success('Tarif modifié.')
        setDialogue({ ouvert: false, type: null, ligne: null })
        tarifsMarchandise.recharger()
      } catch (e) {
        setErreur(messageApi(e, 'Enregistrement impossible'))
      } finally {
        setEnCours(false)
      }
      return
    }

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
      toast.success('Tarif modifié.')
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
        : type === 'location'
          ? `${LIBELLES_TYPE_LOCATION[ligne.type] || ligne.type}${ligne.cle ? ` / ${LIBELLES_FORMULE[ligne.cle] || ligne.cle}` : ''}`
          : `${LIBELLES_CATEGORIE_MARCHANDISE[ligne.categorie] || ligne.categorie} / ${ligne.zone?.code || '—'}`
    const valeur = type === 'marchandise' ? formatTarifKg(ligne.tarifKg) : formatArgent(ligne.montant)
    if (!(await confirmerSuppression(`Supprimer le tarif « ${descriptif} » (${valeur}) ?`))) return
    const endpoint =
      type === 'billet'
        ? `/tarifs/billets/${ligne.id}`
        : type === 'location'
          ? `/tarifs/locations/${ligne.id}`
          : `/tarifs/marchandise/${ligne.id}`
    try {
      await api.delete(endpoint)
      toast.success('Tarif supprimé.')
      tarifsBillets.recharger()
      tarifsLocations.recharger()
      tarifsMarchandise.recharger()
    } catch (e) {
      toast.error(messageApi(e, 'Suppression impossible'))
    }
  }

  return (
    <div className="space-y-6">
      <p className="text-sm text-muted-foreground">
        Tarifs officiels validés par la FCE, en ariary. Les montants non validés
        apparaissent comme « À valider » dans les pages concernées.
      </p>

      {erreurGlobale && <AlerteErreur message={message} onReessayer={rechargerTout} />}

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
          <CardTitle className="text-base">Tarifs marchandises (par catégorie et zone, Ar/kg)</CardTitle>
        </CardHeader>
        <CardContent>
          <SectionListe
            chargement={tarifsMarchandise.chargement}
            lignes={tarifsMarchandise.donnees?.donnees || []}
            messageVide={tarifsMarchandise.erreur ? 'Données indisponibles.' : 'Aucun tarif.'}
            colonnes={[
              { titre: 'Catégorie', rendre: (l) => LIBELLES_CATEGORIE_MARCHANDISE[l.categorie] || l.categorie },
              { titre: 'Zone', rendre: (l) => <Badge variant="outline">{l.zone?.code || '—'}</Badge> },
              { titre: 'Tarif', align: 'right', rendre: (l) => <span className="font-medium tabular-nums">{formatTarifKg(l.tarifKg)}</span> },
            ]}
            rendreActions={(l) => (
              <div className="flex justify-end gap-1">
                <BoutonModifier titre="Modifier le tarif" onModifier={() => ouvrirEdition('marchandise', l)} />
                <BoutonSupprimer titre="Supprimer le tarif" onSupprimer={() => supprimer('marchandise', l)} />
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

      <DialogueFormulaire
        ouvert={dialogue.ouvert}
        onFermer={() => setDialogue({ ouvert: false, type: null, ligne: null })}
        titre="Modifier le tarif"
        description={
          estMarchandise
            ? 'Tarif en ariary par kilogramme (Ar/kg). Valeur de référence validée par la FCE.'
            : 'Montant en ariary (Ar). Cette valeur est utilisée par les calculs de la plateforme.'
        }
        messageErreur={erreur}
        enCours={enCours}
        onSoumettre={soumettre}
        libelleValider="Enregistrer"
      >
        {estMarchandise ? (
          <div className="space-y-2">
            <Label htmlFor="tarif-marchandise">Tarif (Ar/kg)</Label>
            <Input
              id="tarif-marchandise"
              type="number"
              step="0.01"
              min="0"
              value={formulaire.tarifKg}
              onChange={(e) => setFormulaire((f) => ({ ...f, tarifKg: e.target.value }))}
              placeholder="166,67"
            />
            {dialogue.ligne && (
              <p className="text-sm text-muted-foreground">
                {LIBELLES_CATEGORIE_MARCHANDISE[dialogue.ligne.categorie] || dialogue.ligne.categorie}
                {' · '}
                Zone {dialogue.ligne.zone?.code || '—'}
              </p>
            )}
          </div>
        ) : (
          <div className="space-y-2">
            <Label htmlFor="tarif-montant">Montant (Ar)</Label>
            <Input
              id="tarif-montant"
              type="number"
              value={formulaire.montant}
              onChange={(e) => setFormulaire((f) => ({ ...f, montant: e.target.value }))}
              placeholder="25000"
            />
          </div>
        )}
      </DialogueFormulaire>
    </div>
  )
}
