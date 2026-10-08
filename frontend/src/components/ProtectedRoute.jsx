import { Navigate } from 'react-router-dom'

import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { useAuth } from '@/context/AuthContext'

function Chargement() {
  return (
    <div className="flex min-h-screen flex-col gap-4 p-8">
      <Skeleton className="h-8 w-64" />
      <Skeleton className="h-4 w-96" />
      <Skeleton className="h-64 w-full" />
    </div>
  )
}

export function Interdit() {
  return (
    <div className="flex min-h-screen items-center justify-center p-6">
      <Card className="max-w-md">
        <CardHeader>
          <CardTitle>Accès refusé</CardTitle>
          <CardDescription>
            Votre rôle ne permet pas d’accéder à cette page. Contactez un administrateur.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Button asChild>
            <a href="/">Retour au tableau de bord</a>
          </Button>
        </CardContent>
      </Card>
    </div>
  )
}

// Garde d'authentification (+ rôles). L'autorité de sécurité reste le backend.
export default function ProtectedRoute({ roles, children }) {
  const { utilisateur, chargement } = useAuth()

  if (chargement) return <Chargement />
  if (!utilisateur) return <Navigate to="/login" replace />
  if (roles && !roles.includes(utilisateur.role)) return <Interdit />
  return children
}
