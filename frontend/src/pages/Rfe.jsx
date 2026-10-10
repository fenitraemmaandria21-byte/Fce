import { Plus, Printer } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import { toast } from 'react-toastify'
import { z } from 'zod'

import DialogueFormulaire from '@/components/DialogueFormulaire'
import PageTable from '@/components/PageTable'
import RfeDocument from '@/components/RfeDocument'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
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
import { formatArgent, formatDate } from '@/lib/affichage'

const rfeSchema = z.object({
  locationId: z.string().min(1, 'Location requise'),
})

export default function Rfe() {
  const { utilisateur } = useAuth()
  const peutCreer = utilisateur && ['SUPERADMIN', 'ADMIN'].includes(utilisateur.role)

  const [creationOuverte, setCreationOuverte] = useState(false)
  const [locationId, setLocationId] = useState('')
  const [erreurChamp, setErreurChamp] = useState(null)
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

  const locations = useApi('/locations', { limit: 100, statut: 'VALIDEE' })
  const locationsFacturables = (locations.donnees?.donnees || []).filter(
    (l) => l.montant != null
  )

  const ouvrirCreation = () => {
    setLocationId('')
    setErreurChamp(null)
    setErreurGlobale(null)
    setCreationOuverte(true)
  }

  const imprimer = async (id) => {
    try {
      const { data } = await api.get(`/rfe/${id}`)
      setAImprimer(data)
    } catch (erreur) {
      toast.error(messageApi(erreur, 'Impression impossible'))
    }
  }

  const soumettre = async () => {
    const resultat = rfeSchema.safeParse({ locationId })
    if (!resultat.success) {
      setErreurChamp(resultat.error.issues[0]?.message || 'Location requise')
      return
    }
    setEnCours(true)
    setErreurGlobale(null)
    try {
      const { data } = await api.post('/rfe', resultat.data)
      toast.success('RFE créé.')
      setCreationOuverte(false)
      rechargerRef.current?.()
      imprimer(data.id)
    } catch (erreur) {
      setErreurGlobale(messageApi(erreur, 'Création impossible'))
    } finally {
      setEnCours(false)
    }
  }

  return (
    <>
    <PageTable
      titre="RFE"
      description="Relevé de fin d’exploitation : facturation liée à une location validée. Numéros générés automatiquement (RFE/FAC/REC-<année>-<séquence>)."
      endpoint="/rfe"
      libelleNombre="relevé(s)"
      placeholderRecherche="Rechercher (n° RFE, facture, reçu, client)…"
      messageVide="Aucun RFE."
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
                Créer un RFE
              </>
            }
            titre="Créer un RFE"
            description="Seules les locations validées avec tarif configuré sont facturables. Une seule facturation possible par location. Réservé aux SUPERADMIN et ADMIN."
            messageErreur={erreurGlobale}
            enCours={enCours}
            onSoumettre={soumettre}
            libelleValider="Créer le RFE"
          >
            <div className="space-y-2">
              <Label>Location validée</Label>
              <Select value={locationId} onValueChange={(v) => { setLocationId(v); setErreurChamp(null) }}>
                <SelectTrigger>
                  <SelectValue placeholder="Choisir une location" />
                </SelectTrigger>
                <SelectContent>
                  {locationsFacturables.length === 0 ? (
                    <SelectItem value="__aucune__" disabled>
                      Aucune location facturable (avec montant)
                    </SelectItem>
                  ) : (
                    locationsFacturables.map((l) => (
                      <SelectItem key={l.id} value={l.id}>
                        {l.client?.nom} — {formatArgent(l.montant)}
                      </SelectItem>
                    ))
                  )}
                </SelectContent>
              </Select>
              {erreurChamp && <p className="text-sm text-destructive">{erreurChamp}</p>}
              {locationsFacturables.length === 0 && (
                <p className="text-xs text-muted-foreground">
                  Validez d’abord une location avec tarif dans l’écran « Locations ».
                </p>
              )}
            </div>
          </DialogueFormulaire>
        ) : null
      }
      colonnes={[
        { titre: 'N°', align: 'right', rendre: (l) => <span className="font-medium tabular-nums">{l.numero || '—'}</span> },
        { titre: 'Date', rendre: (l) => formatDate(l.dateRfe) },
        { titre: 'Client', tronquer: true, titreInfo: (l) => l.location?.client?.nom, rendre: (l) => l.location?.client?.nom || '—' },
        { titre: 'Zone', rendre: (l) => (l.location?.zone?.code ? <Badge variant="outline">{l.location.zone.code}</Badge> : '—') },
        { titre: 'Montant', align: 'right', rendre: (l) => <span className="font-medium tabular-nums">{formatArgent(l.montant)}</span> },
        { titre: 'N° facture', align: 'right', rendre: (l) => <span className="tabular-nums">{l.factureNumero || '—'}</span> },
        { titre: 'N° reçu', align: 'right', rendre: (l) => <span className="tabular-nums">{l.recuNumero || '—'}</span> },
      ]}
      rendreActions={(l) => (
        <div className="flex justify-end gap-1">
          <Button variant="ghost" size="sm" title="Imprimer le RFE" onClick={() => imprimer(l.id)}>
            <Printer className="size-4" />
          </Button>
        </div>
      )}
    />
    {aImprimer && (
      <div className="zone-impression fixed left-[-10000px] top-0">
        <RfeDocument rfe={aImprimer} />
      </div>
    )}
    </>
  )
}