import { Plus, Printer, Trash2 } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import { toast } from 'react-toastify'
import { z } from 'zod'

import BranDocument from '@/components/BranDocument'
import DialogueFormulaire from '@/components/DialogueFormulaire'
import PageTable from '@/components/PageTable'
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
import { useAuth } from '@/context/AuthContext'
import { useApi } from '@/hooks/useApi'
import api, { messageApi } from '@/services/api'
import { formatArgent, formatDate, formatNombre } from '@/lib/affichage'

const LIGNE_VIDE = { designation: '', montant: '', observation: '' }
const BRAN_VIDE = { envoiId: 'aucun', lignes: [{ ...LIGNE_VIDE }] }

const ligneBranSchema = z.object({
  designation: z.string().trim().max(255).optional(),
  montant: z
    .string()
    .min(1, 'Montant requis')
    .refine((v) => /^\d+$/.test(v) && Number(v) > 0, 'Montant invalide'),
  observation: z.string().trim().max(500).optional(),
})

const branSchema = z.object({
  envoiId: z.string().optional(),
  lignes: z.array(ligneBranSchema).min(1, 'Au moins une ligne BRAN requise').max(50),
})

export default function Bran() {
  const { utilisateur } = useAuth()
  const peutCreer = utilisateur && ['SUPERADMIN', 'ADMIN'].includes(utilisateur.role)

  const [creationOuverte, setCreationOuverte] = useState(false)
  const [formulaire, setFormulaire] = useState(BRAN_VIDE)
  const [erreurs, setErreurs] = useState({})
  const [enCours, setEnCours] = useState(false)
  const [erreurGlobale, setErreurGlobale] = useState(null)
  const [aImprimer, setAImprimer] = useState(null)
  const rechargerRef = useRef(null)

  useEffect(() => {
    if (!aImprimer) return undefined
    const minuteur = setTimeout(() => {
      window.print()
      setAImprimer(null)
    }, 150)
    return () => clearTimeout(minuteur)
  }, [aImprimer])

  const envois = useApi('/marchandises', { limit: 100 })

  const ouvrirCreation = () => {
    setFormulaire(BRAN_VIDE)
    setErreurs({})
    setErreurGlobale(null)
    setCreationOuverte(true)
  }

  const modifierLigne = (index, cle, valeur) => {
    setFormulaire((f) => {
      const lignes = f.lignes.map((ligne, i) => (i === index ? { ...ligne, [cle]: valeur } : ligne))
      return { ...f, lignes }
    })
  }

  const ajouterLigne = () => {
    setFormulaire((f) => ({ ...f, lignes: [...f.lignes, { ...LIGNE_VIDE }] }))
  }

  const retirerLigne = (index) => {
    setFormulaire((f) => ({ ...f, lignes: f.lignes.filter((_, i) => i !== index) }))
  }

  const imprimer = async (l) => {
    try {
      const { data } = await api.get(`/bran/${l.id}`)
      setAImprimer(data)
    } catch (erreur) {
      toast.error(messageApi(erreur, 'Impression impossible'))
    }
  }

  const soumettre = async () => {
    const resultat = branSchema.safeParse(formulaire)
    if (!resultat.success) {
      const suivantes = {}
      for (const probleme of resultat.error.issues) {
        if (!suivantes[probleme.path[0]]) suivantes[probleme.path[0]] = probleme.message
      }
      setErreurs(suivantes)
      setErreurGlobale(null)
      return
    }
    setEnCours(true)
    setErreurGlobale(null)
    try {
      const { envoiId, lignes } = resultat.data
      const { data } = await api.post('/bran', {
        lignes: lignes.map((l) => ({
          designation: l.designation || null,
          montant: Number(l.montant),
          observation: l.observation || null,
        })),
        ...(envoiId && envoiId !== 'aucun' ? { envoiId } : {}),
      })
      toast.success('BRAN créé.')
      setCreationOuverte(false)
      rechargerRef.current?.()
      imprimer(data)
    } catch (erreur) {
      setErreurGlobale(messageApi(erreur, 'Enregistrement impossible'))
    } finally {
      setEnCours(false)
    }
  }

  return (
    <>
      <PageTable
      titre="BRAN"
      description="Bordereau de renseignements automatiques numériques. Numéro généré automatiquement (BRAN-<année>-<séquence>)."
      endpoint="/bran"
      libelleNombre="bordereau(x)"
      placeholderRecherche="Rechercher (n° BRAN, référence envoi)…"
      messageVide="Aucun BRAN."
      apiRef={rechargerRef}
      actions={
        peutCreer ? (
          <DialogueFormulaire
            ouvert={creationOuverte}
            onOuvrir={ouvrirCreation}
            onFermer={() => setCreationOuverte(false)}
            libelleOuvrir={
              <>
                <Plus />
                Nouveau BRAN
              </>
            }
            titre="Nouveau BRAN"
            description="Le total est calculé à partir des lignes. Réservé aux SUPERADMIN et ADMIN."
            messageErreur={erreurGlobale}
            enCours={enCours}
            onSoumettre={soumettre}
            libelleValider="Créer le BRAN"
            large
          >
            <div className="space-y-2">
              <Label>Envoi associé (optionnel)</Label>
              <Select
                value={formulaire.envoiId}
                onValueChange={(v) =>
                  setFormulaire((f) => ({ ...f, envoiId: v }))
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="aucun">Aucun</SelectItem>
                  {(envois.donnees?.donnees || []).map((e) => (
                    <SelectItem key={e.id} value={e.id}>
                      {e.reference || 'Sans référence'} — {e.destinataireNom}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-3">
              <Label>Lignes</Label>
              {erreurs.lignes && (
                <p className="text-sm text-destructive">{erreurs.lignes}</p>
              )}
              {formulaire.lignes.map((ligne, index) => (
                <Card key={index}>
                  <CardContent className="grid grid-cols-1 gap-3 pt-4 sm:grid-cols-[1fr_10rem_auto]">
                    <div className="space-y-1.5">
                      <Label className="text-xs">Désignation</Label>
                      <Input
                        value={ligne.designation}
                        onChange={(e) => modifierLigne(index, 'designation', e.target.value)}
                        placeholder="Désignation de la prestation"
                      />
                    </div>
                    <div className="space-y-1.5">
                      <Label className="text-xs">Montant (Ar)</Label>
                      <Input
                        type="number"
                        min="1"
                        value={ligne.montant}
                        onChange={(e) => modifierLigne(index, 'montant', e.target.value)}
                        placeholder="0"
                      />
                    </div>
                    <div className="flex items-end pb-px">
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        className="text-destructive"
                        disabled={formulaire.lignes.length <= 1}
                        onClick={() => retirerLigne(index)}
                      >
                        <Trash2 />
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
              <Button type="button" variant="outline" size="sm" onClick={ajouterLigne}>
                Ajouter une ligne
              </Button>
            </div>
          </DialogueFormulaire>
        ) : null
      }
      colonnes={[
        { titre: 'N°', align: 'right', rendre: (l) => <span className="font-medium tabular-nums">{l.numero || '—'}</span> },
        { titre: 'Date', rendre: (l) => formatDate(l.dateBran) },
        {
          titre: 'Envoi',
          tronquer: true,
          titreInfo: (l) =>
            l.envoi ? `${l.envoi.reference || ''} (${l.envoi.expediteurNom})` : '',
          rendre: (l) =>
            l.envoi ? (
              <span>
                {l.envoi.reference || '—'}{' '}
                <span className="text-muted-foreground">({l.envoi.expediteurNom})</span>
              </span>
            ) : (
              '—'
            ),
        },
        {
          titre: 'Montant total',
          align: 'right',
          rendre: (l) => <span className="font-medium tabular-nums">{formatArgent(l.montantTotal)}</span>,
        },
        { titre: 'Lignes', align: 'right', rendre: (l) => <Badge variant="outline">{formatNombre(l.lignes?.length || 0)}</Badge> },
      ]}
      rendreActions={(l) => (
        <div className="flex justify-end gap-1">
          <Button variant="ghost" size="sm" title="Imprimer le BRAN" onClick={() => imprimer(l)}>
            <Printer className="size-4" />
          </Button>
        </div>
      )}
    />
    {aImprimer && (
      <div className="zone-impression fixed left-[-10000px] top-0">
        <BranDocument bran={aImprimer} />
      </div>
    )}
    </>
  )
}