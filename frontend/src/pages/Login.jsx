import { useState } from 'react'
import { Navigate, useNavigate } from 'react-router-dom'
import { Loader2, TrainFront } from 'lucide-react'
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
    <div className="flex min-h-screen items-center justify-center bg-slate-100 p-4">
      <Card className="w-full max-w-md shadow-lg">
        <CardHeader className="space-y-3">
          <span className="grid size-12 place-items-center rounded-lg bg-fce-600 text-lg font-bold text-white">
            <TrainFront className="size-6" />
          </span>
          <CardTitle className="text-2xl">FCE-SI</CardTitle>
          <CardDescription>
            Plateforme de gestion des opérations de transport ferroviaire — Connexion
          </CardDescription>
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
              Le compte initial est créé par le seed (variables SEED_SUPERADMIN_EMAIL et
              SEED_SUPERADMIN_MOTDEPASSE). Toute tentative échoue tant que la base de
              données n’est pas disponible.
            </p>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}
