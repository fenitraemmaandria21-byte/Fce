import { AlertTriangle } from 'lucide-react'

import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'

// Alerte d'erreur standard (base indisponible, réseau...).
export default function AlerteErreur({ titre = 'Données indisponibles', message, aide, onReessayer }) {
  return (
    <Alert variant="destructive">
      <AlertTriangle />
      <AlertTitle>{titre}</AlertTitle>
      <AlertDescription className="space-y-2">
        <p>{message}</p>
        {aide && <p className="text-xs opacity-80">{aide}</p>}
        {onReessayer && (
          <Button variant="outline" size="sm" onClick={onReessayer}>
            Réessayer
          </Button>
        )}
      </AlertDescription>
    </Alert>
  )
}
