import { Badge } from '@/components/ui/badge'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'

// Gabarit des pages de module : aucune donnée affichée tant que le branchement
// API/écrans réels n'est pas réalisé (phases 5 à 7). Jamais de données fictives.
export function PageModule({ titre, description, endpoint, roles }) {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-4">
        <h1 className="text-2xl font-semibold">{titre}</h1>
        <Badge variant="outline">En préparation</Badge>
      </div>
      <Card>
        <CardHeader>
          <CardTitle className="text-base">{titre}</CardTitle>
          <CardDescription>{description}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3 text-sm text-muted-foreground">
          <p>
            L’écran de consultation et de gestion sera branché aux étapes suivantes
            (phases 5 à 7). Aucune donnée de démonstration n’est affichée : les données
            affichées proviendront exclusivement de la base FCE alimentée par le seed.
          </p>
          <p>
            Endpoint : <code className="rounded bg-muted px-1.5 py-0.5">{endpoint}</code>
            {roles ? ` — rôles autorisés : ${roles.join(', ')}` : ''}
          </p>
        </CardContent>
      </Card>
    </div>
  )
}

export const ClientsPage = () => (
  <PageModule
    titre="Clients"
    description="Clients personnes physiques et morales liés aux envois de marchandises."
    endpoint="API à définir"
  />
)
