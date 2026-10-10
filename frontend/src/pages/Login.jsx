import { useState } from 'react'
import { Navigate, useNavigate } from 'react-router-dom'
import { Loader2, ShieldCheck, BarChart3, FileText } from 'lucide-react'
import { z } from 'zod'

import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { useAuth } from '@/context/AuthContext'

const connexionSchema = z.object({
  email: z.email('Adresse e-mail invalide'),
  motDePasse: z.string().min(1, 'Mot de passe requis'),
})

const ANNEE_COURANTE = new Date().getFullYear()

export default function Login() {
  const { utilisateur, connexion } = useAuth()
  const navigate = useNavigate()

  const [email, setEmail] = useState('')
  const [motDePasse, setMotDePasse] = useState('')
  const [erreurs, setErreurs] = useState({})
  const [erreurServeur, setErreurServeur] = useState(null)
  const [enCours, setEnCours] = useState(false)

  if (utilisateur) return <Navigate to="/" replace />

  async function soumettre(evenement) {
    evenement.preventDefault()
    setErreurServeur(null)

    const validation = connexionSchema.safeParse({ email, motDePasse })
    if (!validation.success) {
      const champs = {}
      for (const issue of validation.error.issues) {
        champs[issue.path[0]] = issue.message
      }
      setErreurs(champs)
      return
    }
    setErreurs({})
    setEnCours(true)
    try {
      await connexion(email, motDePasse)
      navigate('/', { replace: true })
    } catch (erreur) {
      setErreurServeur(erreur.message)
    } finally {
      setEnCours(false)
    }
  }

  return (
    <div className="flex min-h-screen">
      <aside className="relative hidden w-1/2 flex-col justify-between overflow-hidden bg-slate-900 p-10 text-slate-100 lg:flex">
        <img
          src="/train.jpg"
          alt="Train FCE"
          className="absolute inset-0 h-full w-full object-cover"
        />
        <div className="absolute inset-0 bg-gradient-to-b from-slate-950/75 via-slate-900/60 to-slate-950/85" />
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(34,197,94,0.25),transparent_60%)]" />

        <div className="relative space-y-6">
          <h1 className="text-3xl font-bold leading-tight">
            Pilotage des opérations ferroviaires
          </h1>
          <p className="max-w-md text-sm leading-relaxed text-slate-400">
            Billetterie, marchandises, locations, rapports BRAN/RFE, statistiques et
            journal d'activité — un seul outil pour toute la flotte de la FCE.
          </p>
          <ul className="space-y-3 text-sm">
            <li className="flex items-center gap-3">
              <ShieldCheck className="size-4 shrink-0 text-fce-500" />
              Accès sécurisé par rôle (agent, administrateur, superadministrateur)
            </li>
            <li className="flex items-center gap-3">
              <BarChart3 className="size-4 shrink-0 text-fce-500" />
              Tableaux de bord et statistiques en temps réel
            </li>
            <li className="flex items-center gap-3">
              <FileText className="size-4 shrink-0 text-fce-500" />
              Journalisation complète des opérations
            </li>
          </ul>
        </div>

        <p className="relative text-xs text-slate-300">
          © {ANNEE_COURANTE} Fitadia – Compagnie Ferroviaire Express (FCE)
        </p>
      </aside>

      <main className="flex flex-1 items-center justify-center bg-slate-50 p-4">
        <Card className="w-full max-w-md border-slate-200 shadow-sm">
          <CardHeader className="space-y-3">
            <span className="grid h-16 place-items-center overflow-hidden rounded-xl bg-white p-1 ring-1 ring-slate-200 lg:hidden">
              <img src="/logo.jpg" alt="Logo FCE" className="h-full w-auto object-contain" />
            </span>
            <div>
              <CardTitle className="text-2xl">Connexion</CardTitle>
              <CardDescription>
                Accédez à la plateforme avec votre compte.
              </CardDescription>
            </div>
          </CardHeader>
          <CardContent>
            <form onSubmit={soumettre} className="space-y-4" noValidate>
              {erreurServeur && (
                <Alert variant="destructive">
                  <AlertTitle>Connexion refusée</AlertTitle>
                  <AlertDescription>{erreurServeur}</AlertDescription>
                </Alert>
              )}

            <div className="space-y-2">
              <Label htmlFor="email">Adresse e-mail</Label>
              <Input
                id="email"
                type="email"
                autoComplete="email"
                placeholder="prenom.nom@fce.mg"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                aria-invalid={Boolean(erreurs.email)}
              />
              {erreurs.email && <p className="text-sm text-destructive">{erreurs.email}</p>}
            </div>

            <div className="space-y-2">
              <Label htmlFor="motDePasse">Mot de passe</Label>
              <Input
                id="motDePasse"
                type="password"
                autoComplete="current-password"
                value={motDePasse}
                onChange={(e) => setMotDePasse(e.target.value)}
                aria-invalid={Boolean(erreurs.motDePasse)}
              />
              {erreurs.motDePasse && (
                <p className="text-sm text-destructive">{erreurs.motDePasse}</p>
              )}
            </div>

            <Button type="submit" className="w-full" disabled={enCours}>
              {enCours && <Loader2 className="animate-spin" />}
              Se connecter
            </Button>

            <p className="text-xs text-muted-foreground">
              Les comptes d’accès sont créés et gérés par l’administrateur de la
              plateforme. Toute tentative échoue tant que la base de données n’est
              pas disponible.
            </p>
          </form>
        </CardContent>
      </Card>
      </main>
    </div>
  )
}
