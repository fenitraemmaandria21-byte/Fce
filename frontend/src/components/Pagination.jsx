import { ChevronLeft, ChevronRight } from 'lucide-react'

import { Button } from '@/components/ui/button'

// Contrôles de pagination standard ({page, limite, total, pages}).
export default function Pagination({ pagination, chargement, page, setPage, libelle = 'élément(s)' }) {
  if (!pagination) return null

  return (
    <div className="flex flex-wrap items-center justify-between gap-3">
      <p className="text-sm tabular-nums text-muted-foreground">
        {pagination.total} {libelle} — page {pagination.page} / {pagination.pages}
      </p>
      <div className="flex gap-2">
        <Button
          variant="outline"
          size="sm"
          disabled={chargement || pagination.page <= 1}
          onClick={() => setPage((p) => p - 1)}
        >
          <ChevronLeft />
          Précédent
        </Button>
        <Button
          variant="outline"
          size="sm"
          disabled={chargement || pagination.page >= pagination.pages}
          onClick={() => setPage((p) => p + 1)}
        >
          Suivant
          <ChevronRight />
        </Button>
      </div>
    </div>
  )
}
