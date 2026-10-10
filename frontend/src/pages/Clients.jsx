import { useState } from 'react'
import { Eye, Pencil, Plus, Trash2 } from 'lucide-react'
import { toast } from 'react-toastify'
import { z } from 'zod'

import DialogueFormulaire from '@/components/DialogueFormulaire'
import PageTable from '@/components/PageTable'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { useAuth } from '@/context/AuthContext'
import { formatDate, formatNombre } from '@/lib/affichage'
import { confirmerSuppression } from '@/lib/confirmation'
import api, { messageApi } from '@/services/api'

const clientSchema = z.object({
  nom: z.string().trim().min(2, 'Nom requis (2 caractères min.)').max(120),
  contact: z.string().trim().max(120).optional().or(z.literal('')),
  adresse: z.string().trim().max(255).optional().or(z.literal('')),
})

const CLIENT_VIDE = { nom: '', contact: '', adresse: '' }

function LigneInfo({ libelle, valeur }) {
  return (
    <div className="grid grid-cols-[10rem_1fr] gap-3 text-sm">
      <dt className="text-muted-foreground">{libelle}</dt>
      <dd className="font-medium">{valeur}</dd>
    </div>
  )
}

// Gestion des clients (personnes physiques et morales) liés aux locations.
export default function Clients() {
  const { utilisateur } = useAuth()
  const peutGerer = utilisateur && ['SUPERADMIN', 'ADMIN'].includes(utilisateur.role)

  const apiRef = { current: null }

  const [dialogueOuvert, setDialogueOuvert] = useState(false)
  const [enEdition, setEnEdition] = useState(null)
  const [formulaire, setFormulaire] = useState(CLIENT_VIDE)
  const [erreurs, setErreurs] = useState({})
  const [enCours, setEnCours] = useState(false)
  const [erreurGlobale, setErreurGlobale] = useState(null)

  const [detail, setDetail] = useState(null)
  const [detailChargement, setDetailChargement] = useState(false)

  const ouvrirCreation = () => {
    setEnEdition(null)
    setFormulaire(CLIENT_VIDE)
    setErreurs({})
    setErreurGlobale(null)
    setDialogueOuvert(true)
  }

  const ouvrirEdition = (client) => {
    setEnEdition(client)
    setFormulaire({
      nom: client.nom || '',
      contact: client.contact || '',
      adresse: client.adresse || '',
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
    const resultat = clientSchema.safeParse(formulaire)
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
        await api.put(`/clients/${enEdition.id}`, resultat.data)
        toast.success('Client modifié.')
      } else {
        await api.post('/clients', resultat.data)
        toast.success('Client créé.')
      }
      setDialogueOuvert(false)
      apiRef.current?.()
    } catch (e) {
      setErreurGlobale(messageApi(e, 'Enregistrement impossible'))
    } finally {
      setEnCours(false)
    }
  }

  const supprimer = async (client) => {
    if (!(await confirmerSuppression(`Supprimer le client « ${client.nom} » ?`))) return
    try {
      await api.delete(`/clients/${client.id}`)
      toast.success('Client supprimé.')
      apiRef.current?.()
    } catch (e) {
      toast.error(messageApi(e, 'Suppression impossible'))
    }
  }

  const ouvrirDetail = async (client) => {
    setDetailChargement(true)
    setDetail({ id: client.id, nom: client.nom })
    try {
      const { data } = await api.get(`/clients/${client.id}`)
      setDetail(data)
    } catch (e) {
      toast.error(messageApi(e, 'Chargement du détail impossible'))
      setDetail(null)
    } finally {
      setDetailChargement(false)
    }
  }

  return (
    <>
      <PageTable
        titre="Clients"
        description="Fiches clients (personnes physiques et morales) liées aux locations."
        endpoint="/clients"
        placeholderRecherche="Rechercher un client (nom, contact, adresse)…"
        messageVide="Aucun client enregistré."
        libelleNombre="client(s)"
        apiRef={apiRef}
        actions={
          peutGerer ? (
            <Button onClick={ouvrirCreation}>
              <Plus />
              Nouveau client
            </Button>
          ) : null
        }
        rendreActions={(l) => (
          <div className="flex justify-end gap-1">
            <Button variant="ghost" size="sm" title="Détails" onClick={() => ouvrirDetail(l)}>
              <Eye />
            </Button>
            {peutGerer && (
              <Button
                variant="ghost"
                size="sm"
                title="Modifier"
                onClick={() => ouvrirEdition(l)}
              >
                <Pencil />
              </Button>
            )}
            {peutGerer && (
              <span
                title={
                  l.nbLocations > 0
                    ? 'Suppression impossible : ce client a des locations.'
                    : 'Supprimer'
                }
              >
                <Button
                  variant="ghost"
                  size="sm"
                  className="text-destructive"
                  title="Supprimer (uniquement sans location)"
                  disabled={l.nbLocations > 0}
                  onClick={() => supprimer(l)}
                >
                  <Trash2 />
                </Button>
              </span>
            )}
          </div>
        )}
        colonnes={[
          { titre: 'Nom', cle: 'nom', tronquer: true },
          { titre: 'Contact', cle: 'contact', tronquer: true },
          { titre: 'Adresse', cle: 'adresse', tronquer: true },
          {
            titre: 'Locations',
            align: 'right',
            rendre: (l) => formatNombre(l.nbLocations),
          },
          {
            titre: 'Créé le',
            rendre: (l) => formatDate(l.createdAt),
          },
        ]}
      />

      <DialogueFormulaire
        ouvert={dialogueOuvert}
        onFermer={() => setDialogueOuvert(false)}
        titre={enEdition ? 'Modifier le client' : 'Nouveau client'}
        description="Renseignez le nom du client, et si besoin son contact et son adresse."
        messageErreur={erreurGlobale}
        enCours={enCours}
        onSoumettre={soumettre}
        libelleValider={enEdition ? 'Enregistrer' : 'Créer le client'}
      >
        <div className="space-y-2">
          <Label htmlFor="client-nom">Nom</Label>
          <Input
            id="client-nom"
            value={formulaire.nom}
            onChange={(e) => modifierChamp('nom', e.target.value)}
            placeholder="Rakoto Jean / Société X"
          />
          {erreurs.nom && <p className="text-sm text-destructive">{erreurs.nom}</p>}
        </div>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="client-contact">Contact</Label>
            <Input
              id="client-contact"
              value={formulaire.contact}
              onChange={(e) => modifierChamp('contact', e.target.value)}
              placeholder="034 00 000 00"
            />
            {erreurs.contact && (
              <p className="text-sm text-destructive">{erreurs.contact}</p>
            )}
          </div>
          <div className="space-y-2">
            <Label htmlFor="client-adresse">Adresse</Label>
            <Input
              id="client-adresse"
              value={formulaire.adresse}
              onChange={(e) => modifierChamp('adresse', e.target.value)}
              placeholder="Ville / quartier"
            />
            {erreurs.adresse && (
              <p className="text-sm text-destructive">{erreurs.adresse}</p>
            )}
          </div>
        </div>
      </DialogueFormulaire>

      <Dialog
        open={Boolean(detail)}
        onOpenChange={(ouverture) => {
          if (!ouverture) setDetail(null)
        }}
      >
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>{detail?.nom || 'Client'}</DialogTitle>
            <DialogDescription>Fiche détaillée du client.</DialogDescription>
          </DialogHeader>
          {detailChargement ? (
            <p className="py-4 text-sm text-muted-foreground">Chargement…</p>
          ) : (
            <dl className="space-y-3">
              <LigneInfo libelle="Nom" valeur={detail?.nom || '—'} />
              <LigneInfo libelle="Contact" valeur={detail?.contact || '—'} />
              <LigneInfo libelle="Adresse" valeur={detail?.adresse || '—'} />
              <LigneInfo
                libelle="Locations"
                valeur={formatNombre(detail?.nbLocations ?? 0)}
              />
              <LigneInfo libelle="Créé le" valeur={formatDate(detail?.createdAt)} />
              <LigneInfo libelle="Modifié le" valeur={formatDate(detail?.updatedAt)} />
            </dl>
          )}
        </DialogContent>
      </Dialog>
    </>
  )
}
