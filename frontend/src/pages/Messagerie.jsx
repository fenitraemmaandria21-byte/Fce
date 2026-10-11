import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import {
  ArrowLeft,
  Download,
  Eraser,
  FileText,
  LogOut,
  MessageSquare,
  Paperclip,
  Plus,
  Search,
  Send,
  Trash2,
  Users,
  X,
} from 'lucide-react'
import { toast } from 'react-toastify'

import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { useAuth } from '@/context/AuthContext'
import { formatDate, LIBELLES_ROLE } from '@/lib/affichage'
import { confirmerAction, confirmerSuppression } from '@/lib/confirmation'
import api, { messageApi } from '@/services/api'

const DELAI_RAFRAICHISSEMENT = 7000

function initiales(nom) {
  if (!nom) return '?'
  return nom
    .split(/\s+/)
    .slice(0, 2)
    .map((m) => m.charAt(0).toUpperCase())
    .join('')
}

function formatTaille(octets) {
  if (!octets && octets !== 0) return ''
  if (octets < 1024) return `${octets} o`
  if (octets < 1024 * 1024) return `${(octets / 1024).toFixed(0)} Ko`
  return `${(octets / (1024 * 1024)).toFixed(1)} Mo`
}

function apercuContenu(dernier) {
  if (!dernier) return 'Aucun message'
  const texte = dernier.contenu?.trim()
  const pieces = dernier.nbPiecesJointes ? `📎 ${dernier.nbPiecesJointes}` : ''
  if (texte && pieces) return `${texte}  ${pieces}`
  if (texte) return texte
  return pieces || 'Message'
}

function titreConversation(conversation, moiId) {
  if (conversation.sujet) return conversation.sujet
  const autres = (conversation.participants || []).filter((p) => p.id !== moiId)
  if (autres.length === 0) return 'Conversation'
  if (autres.length === 1) return autres[0].nom
  return autres.map((p) => p.nom.split(' ')[0]).join(', ')
}

// Messagerie interne : conversations entre utilisateurs, fichiers et non-lus.
export default function Messagerie() {
  const { utilisateur } = useAuth()
  const moiId = utilisateur?.id

  const [conversations, setConversations] = useState([])
  const [chargementListe, setChargementListe] = useState(true)
  const [recherche, setRecherche] = useState('')

  const [activeId, setActiveId] = useState(null)
  const [fil, setFil] = useState(null)
  const [chargementFil, setChargementFil] = useState(false)

  const [texte, setTexte] = useState('')
  const [fichiers, setFichiers] = useState([])
  const [envoiEnCours, setEnvoiEnCours] = useState(false)

  const [annuaire, setAnnuaire] = useState([])
  const [nouvelleOuverte, setNouvelleOuverte] = useState(false)
  const [rechDestinataire, setRechDestinataire] = useState('')
  const [destinataires, setDestinataires] = useState([])
  const [sujet, setSujet] = useState('')
  const [premierMessage, setPremierMessage] = useState('')
  const [fichiersNouveaux, setFichiersNouveaux] = useState([])
  const [creationEnCours, setCreationEnCours] = useState(false)

  const finFilRef = useRef(null)
  const activeIdRef = useRef(null)

  const chargerConversations = useCallback(async () => {
    try {
      const { data } = await api.get('/messagerie/conversations')
      setConversations(data.donnees || [])
    } catch (e) {
      toast.error(messageApi(e, 'Chargement de la messagerie impossible'))
    } finally {
      setChargementListe(false)
    }
  }, [])

  const chargerFil = useCallback(async (id, { silencieux = false } = {}) => {
    if (!silencieux) setChargementFil(true)
    try {
      const { data } = await api.get(`/messagerie/conversations/${id}/messages`)
      if (activeIdRef.current !== id) return
      setFil(data)
      api.post(`/messagerie/conversations/${id}/lu`).catch(() => {})
    } catch (e) {
      if (!silencieux) toast.error(messageApi(e, 'Chargement de la conversation impossible'))
    } finally {
      if (!silencieux) setChargementFil(false)
    }
  }, [])

  const ouvrirConversation = useCallback(
    (id) => {
      activeIdRef.current = id
      setActiveId(id)
      setFil(null)
      chargerFil(id)
    },
    [chargerFil]
  )

  useEffect(() => {
    chargerConversations()
    api
      .get('/messagerie/utilisateurs')
      .then((r) => setAnnuaire(r.data.donnees || []))
      .catch(() => {})
  }, [chargerConversations])

  useEffect(() => {
    const minuterie = setInterval(() => {
      chargerConversations()
      if (activeIdRef.current && document.visibilityState === 'visible') {
        chargerFil(activeIdRef.current, { silencieux: true })
      }
    }, DELAI_RAFRAICHISSEMENT)
    return () => clearInterval(minuterie)
  }, [chargerConversations, chargerFil])

  useEffect(() => {
    if (finFilRef.current) {
      finFilRef.current.scrollIntoView({ behavior: 'smooth', block: 'end' })
    }
  }, [fil?.messages?.length, activeId])

  const conversationsFiltrees = useMemo(() => {
    const terme = recherche.trim().toLowerCase()
    if (!terme) return conversations
    return conversations.filter((c) => {
      const titre = titreConversation(c, moiId).toLowerCase()
      const apercu = (c.dernierMessage?.contenu || '').toLowerCase()
      return titre.includes(terme) || apercu.includes(terme)
    })
  }, [conversations, recherche, moiId])

  const conversationActive = conversations.find((c) => c.id === activeId)

  const envoyer = async () => {
    if (!texte.trim() && fichiers.length === 0) return
    if (!activeId) return
    setEnvoiEnCours(true)
    try {
      const fd = new FormData()
      fd.append('contenu', texte.trim())
      fichiers.forEach((f) => fd.append('fichiers', f))
      await api.post(`/messagerie/conversations/${activeId}/messages`, fd)
      setTexte('')
      setFichiers([])
      await chargerFil(activeId, { silencieux: true })
      await chargerConversations()
    } catch (e) {
      toast.error(messageApi(e, 'Envoi impossible'))
    } finally {
      setEnvoiEnCours(false)
    }
  }

  const creerConversation = async () => {
    if (destinataires.length === 0) {
      toast.error('Sélectionnez au moins un destinataire.')
      return
    }
    if (!premierMessage.trim() && fichiersNouveaux.length === 0) {
      toast.error('Saisissez un message ou joignez un fichier.')
      return
    }
    setCreationEnCours(true)
    try {
      const fd = new FormData()
      fd.append('destinataires', JSON.stringify(destinataires))
      if (sujet.trim()) fd.append('sujet', sujet.trim())
      fd.append('contenu', premierMessage.trim())
      fichiersNouveaux.forEach((f) => fd.append('fichiers', f))
      const { data } = await api.post('/messagerie/conversations', fd)
      const id = data.donnees.conversationId
      setNouvelleOuverte(false)
      setDestinataires([])
      setSujet('')
      setPremierMessage('')
      setFichiersNouveaux([])
      setRechDestinataire('')
      await chargerConversations()
      ouvrirConversation(id)
      toast.success('Message envoyé.')
    } catch (e) {
      toast.error(messageApi(e, 'Création de la conversation impossible'))
    } finally {
      setCreationEnCours(false)
    }
  }

  const supprimerMessage = async (message) => {
    if (!(await confirmerSuppression('Supprimer ce message ? Cette action est définitive.'))) return
    try {
      await api.delete(`/messagerie/messages/${message.id}`)
      await chargerFil(activeId, { silencieux: true })
      await chargerConversations()
      toast.success('Message supprimé.')
    } catch (e) {
      toast.error(messageApi(e, 'Suppression impossible'))
    }
  }

  const viderConversation = async () => {
    const ok = await confirmerAction({
      titre: 'Vider la conversation ?',
      texte: "L'historique sera masqué pour vous uniquement. Les autres participants le conservent.",
      libelleConfirmer: 'Vider',
    })
    if (!ok) return
    try {
      await api.post(`/messagerie/conversations/${activeId}/vider`)
      await chargerFil(activeId, { silencieux: true })
      await chargerConversations()
      toast.success('Conversation vidée.')
    } catch (e) {
      toast.error(messageApi(e, 'Action impossible'))
    }
  }

  const quitterConversation = async () => {
    const ok = await confirmerAction({
      titre: 'Quitter la conversation ?',
      texte: "La conversation disparaîtra de votre liste. Vous pourrez la recréer si besoin.",
      libelleConfirmer: 'Quitter',
    })
    if (!ok) return
    try {
      await api.delete(`/messagerie/conversations/${activeId}`)
      activeIdRef.current = null
      setActiveId(null)
      setFil(null)
      await chargerConversations()
      toast.success('Conversation quittée.')
    } catch (e) {
      toast.error(messageApi(e, 'Action impossible'))
    }
  }

  const telechargerPiece = async (piece) => {
    try {
      const { data } = await api.get(`/messagerie/fichiers/${piece.id}`, { responseType: 'blob' })
      const url = URL.createObjectURL(data)
      const lien = document.createElement('a')
      lien.href = url
      lien.download = piece.nom
      document.body.appendChild(lien)
      lien.click()
      lien.remove()
      URL.revokeObjectURL(url)
    } catch (e) {
      toast.error(messageApi(e, 'Téléchargement impossible'))
    }
  }

  const basculerDestinataire = (id) => {
    setDestinataires((precedent) =>
      precedent.includes(id) ? precedent.filter((x) => x !== id) : [...precedent, id]
    )
  }

  const ajouterParRole = (role) => {
    const ids = annuaire.filter((u) => u.role === role).map((u) => u.id)
    setDestinataires((precedent) => [...new Set([...precedent, ...ids])])
  }

  const annuaireFiltre = annuaire.filter((u) => {
    const terme = rechDestinataire.trim().toLowerCase()
    if (!terme) return true
    return (
      u.nom.toLowerCase().includes(terme) ||
      u.email.toLowerCase().includes(terme) ||
      (LIBELLES_ROLE[u.role] || '').toLowerCase().includes(terme)
    )
  })

  return (
    <div className="flex min-h-0 flex-1 flex-col gap-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-xl font-semibold">Messagerie</h1>
          <p className="text-sm text-muted-foreground">
            Échangez avec les autres utilisateurs. Vous pouvez joindre des fichiers et diffuser à
            plusieurs personnes.
          </p>
        </div>
        <Button onClick={() => setNouvelleOuverte(true)}>
          <Plus />
          Nouvelle conversation
        </Button>
      </div>

      <div className="grid min-h-0 flex-1 gap-4 md:grid-cols-[20rem_1fr]">
        <div
          className={`flex min-h-0 flex-col overflow-hidden rounded-xl border bg-card ${
            activeId ? 'hidden md:flex' : 'flex'
          }`}
        >
          <div className="border-b p-3">
            <div className="relative">
              <Search className="pointer-events-none absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                value={recherche}
                onChange={(e) => setRecherche(e.target.value)}
                placeholder="Rechercher…"
                className="pl-8"
              />
            </div>
          </div>
          <div className="min-h-0 flex-1 overflow-y-auto">
            {chargementListe ? (
              <p className="p-4 text-sm text-muted-foreground">Chargement…</p>
            ) : conversationsFiltrees.length === 0 ? (
              <div className="flex flex-col items-center gap-2 p-6 text-center text-sm text-muted-foreground">
                <MessageSquare className="size-8" />
                Aucune conversation.
              </div>
            ) : (
              conversationsFiltrees.map((c) => (
                <button
                  key={c.id}
                  type="button"
                  onClick={() => ouvrirConversation(c.id)}
                  className={`flex w-full items-start gap-3 border-b px-3 py-3 text-left transition-colors hover:bg-muted/60 ${
                    c.id === activeId ? 'bg-muted' : ''
                  }`}
                >
                  <span className="grid size-9 shrink-0 place-items-center rounded-full bg-fce-100 text-xs font-semibold text-fce-700">
                    {initiales(titreConversation(c, moiId))}
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="flex items-center justify-between gap-2">
                      <span className="truncate text-sm font-medium">
                        {titreConversation(c, moiId)}
                      </span>
                      {c.nbNonLus > 0 && (
                        <Badge className="bg-fce-600 text-white">{c.nbNonLus}</Badge>
                      )}
                    </span>
                    <span className="mt-0.5 flex items-center justify-between gap-2">
                      <span className="truncate text-xs text-muted-foreground">
                        {apercuContenu(c.dernierMessage)}
                      </span>
                      <span className="shrink-0 text-[11px] text-muted-foreground">
                        {c.dernierMessage ? formatDate(c.dernierMessage.createdAt, true) : ''}
                      </span>
                    </span>
                  </span>
                </button>
              ))
            )}
          </div>
        </div>

        <div
          className={`flex min-h-0 flex-col overflow-hidden rounded-xl border bg-card ${
            activeId ? 'flex' : 'hidden md:flex'
          }`}
        >
          {!activeId ? (
            <div className="flex flex-1 flex-col items-center justify-center gap-2 p-6 text-center text-sm text-muted-foreground">
              <MessageSquare className="size-10" />
              Sélectionnez une conversation ou créez-en une nouvelle.
            </div>
          ) : (
            <>
              <div className="flex items-center gap-2 border-b p-3">
                <Button
                  variant="ghost"
                  size="icon"
                  className="md:hidden"
                  onClick={() => {
                    activeIdRef.current = null
                    setActiveId(null)
                    setFil(null)
                  }}
                  title="Retour"
                >
                  <ArrowLeft />
                </Button>
                <div className="min-w-0 flex-1">
                  <p className="truncate font-medium">
                    {conversationActive
                      ? titreConversation(conversationActive, moiId)
                      : fil?.conversation?.sujet || 'Conversation'}
                  </p>
                  <p className="truncate text-xs text-muted-foreground">
                    {conversationActive?.participants
                      ?.filter((p) => p.id !== moiId)
                      .map((p) => p.nom)
                      .join(', ')}
                  </p>
                </div>
                <Button variant="ghost" size="sm" onClick={viderConversation} title="Vider">
                  <Eraser />
                  <span className="hidden sm:inline">Vider</span>
                </Button>
                <Button variant="ghost" size="sm" onClick={quitterConversation} title="Quitter">
                  <LogOut />
                  <span className="hidden sm:inline">Quitter</span>
                </Button>
              </div>

              <div className="min-h-0 flex-1 space-y-3 overflow-y-auto p-4">
                {chargementFil && !fil ? (
                  <p className="text-sm text-muted-foreground">Chargement…</p>
                ) : !fil || fil.messages.length === 0 ? (
                  <p className="py-6 text-center text-sm text-muted-foreground">
                    Aucun message. Écrivez le premier.
                  </p>
                ) : (
                  fil.messages.map((m) => {
                    const estMoi = m.expediteur?.id === moiId
                    return (
                      <div
                        key={m.id}
                        className={`flex flex-col ${estMoi ? 'items-end' : 'items-start'}`}
                      >
                        <div
                          className={`group max-w-[85%] rounded-2xl px-3 py-2 text-sm shadow-sm ${
                            estMoi
                              ? 'bg-fce-600 text-white'
                              : 'bg-muted text-foreground'
                          }`}
                        >
                          {!estMoi && (
                            <p className="mb-0.5 text-xs font-semibold opacity-80">
                              {m.expediteur?.nom}
                            </p>
                          )}
                          {m.contenu && <p className="whitespace-pre-wrap break-words">{m.contenu}</p>}
                          {m.piecesJointes?.length > 0 && (
                            <div className="mt-2 space-y-1">
                              {m.piecesJointes.map((p) => (
                                <button
                                  key={p.id}
                                  type="button"
                                  onClick={() => telechargerPiece(p)}
                                  className={`flex w-full items-center gap-2 rounded-lg px-2 py-1 text-left text-xs ${
                                    estMoi ? 'bg-white/15 hover:bg-white/25' : 'bg-background hover:bg-accent'
                                  }`}
                                >
                                  <FileText className="size-3.5 shrink-0" />
                                  <span className="min-w-0 flex-1 truncate">{p.nom}</span>
                                  <span className="shrink-0 opacity-70">{formatTaille(p.taille)}</span>
                                  <Download className="size-3.5 shrink-0" />
                                </button>
                              ))}
                            </div>
                          )}
                        </div>
                        <div className="mt-1 flex items-center gap-2 text-[11px] text-muted-foreground">
                          <span>{formatDate(m.createdAt, true)}</span>
                          {estMoi && (
                            <button
                              type="button"
                              onClick={() => supprimerMessage(m)}
                              className="opacity-0 transition-opacity group-hover:opacity-100 hover:text-destructive"
                              title="Supprimer ce message"
                            >
                              <Trash2 className="size-3.5" />
                            </button>
                          )}
                        </div>
                      </div>
                    )
                  })
                )}
                <div ref={finFilRef} />
              </div>

              <div className="border-t p-3">
                {fichiers.length > 0 && (
                  <div className="mb-2 flex flex-wrap gap-2">
                    {fichiers.map((f, i) => (
                      <span
                        key={`${f.name}-${i}`}
                        className="flex items-center gap-1 rounded-full bg-muted px-2 py-1 text-xs"
                      >
                        <Paperclip className="size-3" />
                        {f.name}
                        <button
                          type="button"
                          onClick={() => setFichiers((prev) => prev.filter((_, idx) => idx !== i))}
                        >
                          <X className="size-3" />
                        </button>
                      </span>
                    ))}
                  </div>
                )}
                <div className="flex items-end gap-2">
                  <label className="cursor-pointer rounded-md p-2 text-muted-foreground hover:bg-muted" title="Joindre un fichier">
                    <Paperclip className="size-4" />
                    <input
                      type="file"
                      multiple
                      className="hidden"
                      onChange={(e) => setFichiers((prev) => [...prev, ...Array.from(e.target.files)].slice(0, 5))}
                    />
                  </label>
                  <textarea
                    value={texte}
                    onChange={(e) => setTexte(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' && !e.shiftKey) {
                        e.preventDefault()
                        envoyer()
                      }
                    }}
                    rows={1}
                    placeholder="Écrivez un message…"
                    className="min-h-10 w-full flex-1 resize-none rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-xs outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50"
                  />
                  <Button onClick={envoyer} disabled={envoiEnCours || (!texte.trim() && fichiers.length === 0)}>
                    <Send />
                    Envoyer
                  </Button>
                </div>
              </div>
            </>
          )}
        </div>
      </div>

      <Dialog open={nouvelleOuverte} onOpenChange={setNouvelleOuverte}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Nouvelle conversation</DialogTitle>
            <DialogDescription>
              Choisissez un ou plusieurs destinataires. Pour plusieurs personnes, un groupe est créé.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3">
            <div className="space-y-2">
              <Label>Destinataires ({destinataires.length})</Label>
              <div className="flex flex-wrap gap-2">
                <Button type="button" variant="outline" size="sm" onClick={() => ajouterParRole('AGENT')}>
                  <Users />
                  Tous les agents
                </Button>
                <Button type="button" variant="outline" size="sm" onClick={() => ajouterParRole('ADMIN')}>
                  <Users />
                  Tous les admins
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setDestinataires(annuaire.map((u) => u.id))}
                >
                  <Users />
                  Tout le monde
                </Button>
              </div>
              <div className="relative">
                <Search className="pointer-events-none absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  value={rechDestinataire}
                  onChange={(e) => setRechDestinataire(e.target.value)}
                  placeholder="Rechercher un utilisateur…"
                  className="pl-8"
                />
              </div>
              <div className="max-h-48 overflow-y-auto rounded-md border">
                {annuaireFiltre.length === 0 ? (
                  <p className="p-3 text-sm text-muted-foreground">Aucun utilisateur.</p>
                ) : (
                  annuaireFiltre.map((u) => {
                    const coche = destinataires.includes(u.id)
                    return (
                      <label
                        key={u.id}
                        className="flex cursor-pointer items-center gap-3 border-b px-3 py-2 text-sm last:border-b-0 hover:bg-muted/60"
                      >
                        <input
                          type="checkbox"
                          checked={coche}
                          onChange={() => basculerDestinataire(u.id)}
                          className="size-4 accent-fce-600"
                        />
                        <span className="min-w-0 flex-1">
                          <span className="block truncate font-medium">{u.nom}</span>
                          <span className="block truncate text-xs text-muted-foreground">
                            {u.email} · {LIBELLES_ROLE[u.role] || u.role}
                          </span>
                        </span>
                      </label>
                    )
                  })
                )}
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="sujet-conversation">Sujet (optionnel)</Label>
              <Input
                id="sujet-conversation"
                value={sujet}
                onChange={(e) => setSujet(e.target.value)}
                placeholder="Ex. Réunion, information…"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="premier-message">Message</Label>
              <textarea
                id="premier-message"
                value={premierMessage}
                onChange={(e) => setPremierMessage(e.target.value)}
                rows={3}
                placeholder="Votre message…"
                className="w-full resize-none rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-xs outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50"
              />
            </div>

            <div className="flex items-center gap-2">
              <label className="flex cursor-pointer items-center gap-2 text-sm text-muted-foreground">
                <Paperclip className="size-4" />
                Joindre
                <input
                  type="file"
                  multiple
                  className="hidden"
                  onChange={(e) =>
                    setFichiersNouveaux((prev) => [...prev, ...Array.from(e.target.files)].slice(0, 5))
                  }
                />
              </label>
              {fichiersNouveaux.length > 0 && (
                <span className="text-xs text-muted-foreground">
                  {fichiersNouveaux.length} fichier(s)
                </span>
              )}
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setNouvelleOuverte(false)} disabled={creationEnCours}>
              Annuler
            </Button>
            <Button onClick={creerConversation} disabled={creationEnCours || destinataires.length === 0}>
              {creationEnCours ? 'Envoi…' : 'Envoyer'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
