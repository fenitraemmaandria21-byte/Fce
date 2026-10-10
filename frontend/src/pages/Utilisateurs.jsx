import { Eye, EyeOff, Pencil, Plus, UserRound } from 'lucide-react'
import { useState, useRef } from 'react'
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
import api, { messageApi } from '@/services/api'
import { BadgeRole, formatDate } from '@/lib/affichage'

const ROLES = ['SUPERADMIN', 'ADMIN', 'AGENT']

const creationSchema = z.object({
  email: z.email('Adresse e-mail invalide'),
  nom: z.string().trim().min(2, 'Nom requis (2 caractères min.)').max(120),
  motDePasse: z.string().min(8, 'Mot de passe : 8 caractères minimum'),
  role: z.enum(['SUPERADMIN', 'ADMIN', 'AGENT']),
})

const modificationSchema = z.object({
  email: z.email('Adresse e-mail invalide'),
  nom: z.string().trim().min(2, 'Nom requis (2 caractères min.)').max(120),
  role: z.enum(['SUPERADMIN', 'ADMIN', 'AGENT']),
  motDePasse: z.string().min(8, 'Mot de passe : 8 caractères minimum').or(z.literal('')),
})

const VALEUR_VIDE = { email: '', nom: '', motDePasse: '', role: 'AGENT' }

export default function Utilisateurs() {
  const { utilisateur: moi } = useAuth()
  const estSuperadmin = moi?.role === 'SUPERADMIN'

  const [roleFiltre, setRoleFiltre] = useState('toutes')
  const [statutFiltre, setStatutFiltre] = useState('tous')

  const [dialogueOuvert, setDialogueOuvert] = useState(false)
  const [enEdition, setEnEdition] = useState(null)
  const [formulaire, setFormulaire] = useState(VALEUR_VIDE)
  const [erreurs, setErreurs] = useState({})
  const [enCours, setEnCours] = useState(false)
  const [erreurGlobale, setErreurGlobale] = useState(null)
  const rechargerRef = useRef(null)

  const ouvrirCreation = () => {
    setEnEdition(null)
    setFormulaire(VALEUR_VIDE)
    setErreurs({})
    setErreurGlobale(null)
    setDialogueOuvert(true)
  }

  const ouvrirEdition = (utilisateur) => {
    setEnEdition(utilisateur)
    setFormulaire({
      email: utilisateur.email,
      nom: utilisateur.nom,
      role: utilisateur.role,
      motDePasse: '',
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
    const schema = enEdition ? modificationSchema : creationSchema
    const resultat = schema.safeParse(formulaire)
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
      const charge = { ...resultat.data }
      if (enEdition && !charge.motDePasse) delete charge.motDePasse
      if (enEdition) {
        await api.put(`/users/${enEdition.id}`, charge)
      } else {
        await api.post('/users', charge)
      }
      toast.success(enEdition ? 'Utilisateur modifié.' : 'Utilisateur créé.')
      setDialogueOuvert(false)
      rechargerRef.current?.()
    } catch (erreur) {
      setErreurGlobale(messageApi(erreur, "Enregistrement impossible"))
    } finally {
      setEnCours(false)
    }
  }

  const basculerStatut = async (utilisateur) => {
    try {
      await api.patch(`/users/${utilisateur.id}/status`, { actif: !utilisateur.actif })
      toast.success(utilisateur.actif ? 'Utilisateur désactivé.' : 'Utilisateur réactivé.')
      rechargerRef.current?.()
    } catch (erreur) {
      toast.error(messageApi(erreur, 'Changement de statut impossible'))
    }
  }

  const colonnes = [
    { titre: 'Nom', tronquer: true, titreInfo: (u) => u.nom, rendre: (u) => <span className="font-medium">{u.nom}</span> },
    { titre: 'E-mail', tronquer: true, largeur: 'max-w-[18rem]', titreInfo: (u) => u.email, rendre: (u) => <span className="text-muted-foreground">{u.email}</span> },
    { titre: 'Rôle', rendre: (u) => <BadgeRole role={u.role} /> },
    {
      titre: 'Statut',
      rendre: (u) => (
        <Badge variant={u.actif ? 'default' : 'secondary'}>
          {u.actif ? 'Actif' : 'Désactivé'}
        </Badge>
      ),
    },
    { titre: 'Créé le', rendre: (u) => formatDate(u.createdAt) },
  ]

  return (
    <div className="space-y-4">
      <PageTable
        titre="Utilisateurs"
        description="Comptes de la plateforme et leurs rôles. Lecture : SUPERADMIN et ADMIN. Création, modification et activation : SUPERADMIN uniquement."
        endpoint="/users"
        libelleNombre="utilisateur(s)"
        apiRef={rechargerRef}
        placeholderRecherche="Rechercher (nom, e-mail)…"
        messageVide="Aucun utilisateur."
        actions={
          estSuperadmin ? (
            <DialogueFormulaire
              ouvert={dialogueOuvert}
              onOuvrir={ouvrirCreation}
              onFermer={() => setDialogueOuvert(false)}
              libelleOuvrir={
                <>
                  <Plus />
                  Nouvel utilisateur
                </>
              }
              titre={enEdition ? 'Modifier l’utilisateur' : 'Nouvel utilisateur'}
              description={
                enEdition
                  ? 'Laissez le mot de passe vide pour le conserver.'
                  : 'Le mot de passe doit contenir au moins 8 caractères.'
              }
              messageErreur={erreurGlobale}
              enCours={enCours}
              onSoumettre={soumettre}
              libelleValider={enEdition ? 'Enregistrer' : 'Créer'}
            >
              <div className="space-y-2">
                <Label htmlFor="user-nom">Nom</Label>
                <Input
                  id="user-nom"
                  value={formulaire.nom}
                  onChange={(e) => modifierChamp('nom', e.target.value)}
                  placeholder="Nom complet"
                />
                {erreurs.nom && <p className="text-sm text-destructive">{erreurs.nom}</p>}
              </div>
              <div className="space-y-2">
                <Label htmlFor="user-email">E-mail</Label>
                <Input
                  id="user-email"
                  type="email"
                  value={formulaire.email}
                  onChange={(e) => modifierChamp('email', e.target.value)}
                  placeholder="prenom.nom@fce.mg"
                />
                {erreurs.email && (
                  <p className="text-sm text-destructive">{erreurs.email}</p>
                )}
              </div>
              <div className="space-y-2">
                <Label>Rôle</Label>
                <Select
                  value={formulaire.role}
                  onValueChange={(v) => modifierChamp('role', v)}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {ROLES.map((r) => (
                      <SelectItem key={r} value={r}>
                        {r}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {erreurs.role && <p className="text-sm text-destructive">{erreurs.role}</p>}
              </div>
              <div className="space-y-2">
                <Label htmlFor="user-mdp">
                  {enEdition ? 'Nouveau mot de passe' : 'Mot de passe'}
                </Label>
                <Input
                  id="user-mdp"
                  type="password"
                  value={formulaire.motDePasse}
                  onChange={(e) => modifierChamp('motDePasse', e.target.value)}
                  placeholder={enEdition ? 'Laisser vide pour ne pas changer' : '8 caractères min.'}
                />
                {erreurs.motDePasse && (
                  <p className="text-sm text-destructive">{erreurs.motDePasse}</p>
                )}
              </div>
            </DialogueFormulaire>
          ) : null
        }
        filtres={[
          {
            cle: 'role',
            valeur: roleFiltre,
            onChanger: setRoleFiltre,
            libelle: 'Tous les rôles',
            largeur: 'w-40',
            options: [
              { valeur: 'toutes', libelle: 'Tous les rôles' },
              ...ROLES.map((r) => ({ valeur: r, libelle: r })),
            ],
          },
          {
            cle: 'actif',
            valeur: statutFiltre,
            onChanger: setStatutFiltre,
            largeur: 'w-36',
            options: [
              { valeur: 'tous', libelle: 'Tous les statuts' },
              { valeur: 'true', libelle: 'Actifs' },
              { valeur: 'false', libelle: 'Désactivés' },
            ],
          },
        ]}
        colonnes={colonnes}
        rendreActions={
          estSuperadmin
            ? (u) => (
                <div className="flex gap-1">
                  <Button
                    variant="ghost"
                    size="sm"
                    title="Modifier"
                    onClick={() => ouvrirEdition(u)}
                  >
                    <Pencil />
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    title={u.actif ? 'Désactiver' : 'Réactiver'}
                    onClick={() => basculerStatut(u)}
                  >
                    {u.actif ? <EyeOff /> : <Eye />}
                  </Button>
                  {u.id === moi?.id && (
                    <Badge variant="outline" className="ml-1 gap-1">
                      <UserRound /> Vous
                    </Badge>
                  )}
                </div>
              )
            : null
        }
      />
    </div>
  )
}
