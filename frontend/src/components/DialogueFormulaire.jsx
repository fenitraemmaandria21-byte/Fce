import { Loader2 } from 'lucide-react'

import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'

// Dialogue de formulaire standard : titre, erreur globale, annuler/valider.
export default function DialogueFormulaire({
  ouvert,
  onOuvrir,
  onFermer,
  libelleOuvrir = null,
  titre,
  description,
  children,
  messageErreur = null,
  valide = true,
  enCours = false,
  onSoumettre,
  libelleValider = 'Enregistrer',
  large = false,
}) {
  return (
    <Dialog
      open={ouvert}
      onOpenChange={(ouverture) => {
        if (!ouverture && !enCours) onFermer()
      }}
    >
      {libelleOuvrir && (
        <DialogTrigger asChild>
          <Button onClick={onOuvrir}>{libelleOuvrir}</Button>
        </DialogTrigger>
      )}
      <DialogContent
        className={`max-h-[90vh] overflow-y-auto ${large ? 'sm:max-w-4xl' : 'sm:max-w-2xl'}`}
      >
        <DialogHeader>
          <DialogTitle>{titre}</DialogTitle>
          {description && <DialogDescription>{description}</DialogDescription>}
        </DialogHeader>
        <form
          className="space-y-4"
          onSubmit={(e) => {
            e.preventDefault()
            if (valide && !enCours) onSoumettre?.()
          }}
        >
          <div className="space-y-4">{children}</div>
          {messageErreur && (
            <p className="text-sm font-medium text-destructive">{messageErreur}</p>
          )}
          <DialogFooter>
            <Button type="button" variant="outline" onClick={onFermer} disabled={enCours}>
              Annuler
            </Button>
            <Button type="submit" disabled={!valide || enCours}>
              {enCours ? (
                <>
                  <Loader2 className="mr-1 animate-spin" />
                  Envoi…
                </>
              ) : (
                libelleValider
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
