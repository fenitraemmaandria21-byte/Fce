import { useCallback, useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  Bell,
  BellOff,
  CalendarCheck,
  CalendarClock,
  CalendarX,
  CheckCheck,
  CheckCircle2,
  MessageSquare,
  Package,
  PackageCheck,
  Ticket,
} from 'lucide-react'

import { Button } from '@/components/ui/button'
import api, { EVENEMENT_NOTIFICATIONS } from '@/services/api'

const INTERVALLE = 30000

const ICONES = {
  BILLET: { icone: Ticket, classes: 'bg-fce-100 text-fce-700 dark:bg-fce-500/15 dark:text-fce-500' },
  ENVOI: { icone: Package, classes: 'bg-violet-100 text-violet-700 dark:bg-violet-500/15 dark:text-violet-300' },
  ARRIVAGE: { icone: PackageCheck, classes: 'bg-sky-100 text-sky-700 dark:bg-sky-500/15 dark:text-sky-300' },
  LOCATION_DEMANDE: { icone: CalendarClock, classes: 'bg-amber-100 text-amber-700 dark:bg-amber-500/15 dark:text-amber-300' },
  LOCATION_VALIDEE: { icone: CalendarCheck, classes: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-300' },
  LOCATION_REFUSEE: { icone: CalendarX, classes: 'bg-rose-100 text-rose-700 dark:bg-rose-500/15 dark:text-rose-300' },
  MESSAGE: { icone: MessageSquare, classes: 'bg-indigo-100 text-indigo-700 dark:bg-indigo-500/15 dark:text-indigo-300' },
}

const ICONE_DEFAUT = { icone: CheckCircle2, classes: 'bg-fce-100 text-fce-700 dark:bg-fce-500/15 dark:text-fce-500' }

// « il y a 5 min », « hier », « 12/03/2026 »…
function depuis(valeur) {
  const date = new Date(valeur)
  if (Number.isNaN(date.getTime())) return ''
  const secondes = Math.floor((Date.now() - date.getTime()) / 1000)
  if (secondes < 60) return 'à l’instant'
  const minutes = Math.floor(secondes / 60)
  if (minutes < 60) return `il y a ${minutes} min`
  const heures = Math.floor(minutes / 60)
  if (heures < 24) return `il y a ${heures} h`
  const jours = Math.floor(heures / 24)
  if (jours === 1) return 'hier'
  if (jours < 7) return `il y a ${jours} jours`
  return new Intl.DateTimeFormat('fr-FR', { day: '2-digit', month: '2-digit', year: 'numeric' }).format(date)
}

export default function NotificationsBell() {
  const navigate = useNavigate()
  const [ouvert, setOuvert] = useState(false)
  const [notifications, setNotifications] = useState([])
  const [nonLues, setNonLues] = useState(0)
  const conteneurRef = useRef(null)

  const charger = useCallback(async () => {
    try {
      const { data } = await api.get('/notifications')
      setNotifications(data.donnees || [])
      setNonLues(data.nonLues || 0)
    } catch {
      // silencieux : le centre de notifications ne doit pas gêner l'utilisateur
    }
  }, [])

  useEffect(() => {
    charger()
    const minuterie = setInterval(charger, INTERVALLE)
    const surFocus = () => charger()
    const surRafraichir = () => charger()
    window.addEventListener('focus', surFocus)
    window.addEventListener(EVENEMENT_NOTIFICATIONS, surRafraichir)
    return () => {
      clearInterval(minuterie)
      window.removeEventListener('focus', surFocus)
      window.removeEventListener(EVENEMENT_NOTIFICATIONS, surRafraichir)
    }
  }, [charger])

  useEffect(() => {
    if (!ouvert) return
    const surClic = (e) => {
      if (conteneurRef.current && !conteneurRef.current.contains(e.target)) setOuvert(false)
    }
    const surTouche = (e) => {
      if (e.key === 'Escape') setOuvert(false)
    }
    document.addEventListener('mousedown', surClic)
    document.addEventListener('keydown', surTouche)
    return () => {
      document.removeEventListener('mousedown', surClic)
      document.removeEventListener('keydown', surTouche)
    }
  }, [ouvert])

  const toutMarquerLues = () => {
    setNotifications((liste) => liste.map((n) => ({ ...n, lu: true })))
    setNonLues(0)
    api.post('/notifications/tout-lu').catch(() => charger())
  }

  const ouvrirNotification = (notification) => {
    setOuvert(false)
    if (!notification.lu) {
      setNotifications((liste) =>
        liste.map((n) => (n.id === notification.id ? { ...n, lu: true } : n))
      )
      setNonLues((n) => Math.max(0, n - 1))
      api.post(`/notifications/${notification.id}/lu`).catch(() => charger())
    }
    if (notification.lien) navigate(notification.lien)
  }

  return (
    <div ref={conteneurRef} className="relative">
      <Button
        variant="ghost"
        size="icon"
        onClick={() => setOuvert((precedent) => !precedent)}
        title="Notifications"
        aria-label="Notifications"
        aria-expanded={ouvert}
      >
        <Bell />
        {nonLues > 0 && (
          <span className="absolute -top-0.5 -right-0.5 grid h-4 min-w-4 place-items-center rounded-full bg-fce-600 px-1 text-[10px] font-semibold text-white">
            {nonLues > 99 ? '99+' : nonLues}
          </span>
        )}
      </Button>

      {ouvert && (
        <div className="absolute right-0 z-50 mt-2 w-80 overflow-hidden rounded-xl border bg-card shadow-lg sm:w-96">
          <div className="flex items-center justify-between border-b px-4 py-3">
            <div className="flex items-center gap-2">
              <span className="font-semibold">Notifications</span>
              {nonLues > 0 && (
                <span className="rounded-full bg-fce-100 px-2 py-0.5 text-xs font-medium text-fce-700 dark:bg-fce-500/15 dark:text-fce-500">
                  {nonLues} non lue{nonLues > 1 ? 's' : ''}
                </span>
              )}
            </div>
            {nonLues > 0 && (
              <Button variant="ghost" size="sm" onClick={toutMarquerLues} title="Tout marquer comme lu">
                <CheckCheck />
                <span className="hidden sm:inline">Tout lu</span>
              </Button>
            )}
          </div>

          <div className="max-h-96 overflow-y-auto">
            {notifications.length === 0 ? (
              <div className="flex flex-col items-center gap-2 px-4 py-10 text-center text-sm text-muted-foreground">
                <BellOff className="size-7" />
                Aucune notification pour le moment.
              </div>
            ) : (
              notifications.map((n) => {
                const visuel = ICONES[n.type] || ICONE_DEFAUT
                const Icone = visuel.icone
                return (
                  <button
                    key={n.id}
                    type="button"
                    onClick={() => ouvrirNotification(n)}
                    className={`flex w-full items-start gap-3 border-b px-4 py-3 text-left transition-colors last:border-b-0 hover:bg-muted/60 ${
                      n.lu ? '' : 'bg-fce-50/60 dark:bg-fce-500/10'
                    }`}
                  >
                    <span className={`grid size-9 shrink-0 place-items-center rounded-lg ${visuel.classes}`}>
                      <Icone className="size-4" />
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="flex items-start justify-between gap-2">
                        <span className="text-sm font-medium">{n.titre}</span>
                        {!n.lu && <span className="mt-1 size-2 shrink-0 rounded-full bg-fce-600" />}
                      </span>
                      {n.message && (
                        <span className="mt-0.5 block truncate text-xs text-muted-foreground">
                          {n.message}
                        </span>
                      )}
                      <span className="mt-1 block text-[11px] text-muted-foreground">
                        {depuis(n.date)}
                        {n.acteurNom ? ` · ${n.acteurNom}` : ''}
                      </span>
                    </span>
                  </button>
                )
              })
            )}
          </div>
        </div>
      )}
    </div>
  )
}
