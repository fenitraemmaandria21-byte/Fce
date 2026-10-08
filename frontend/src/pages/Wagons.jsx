import PageListe from '@/components/PageListe'
import { Badge } from '@/components/ui/badge'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { useState } from 'react'

function EnTete({ serie, setSerie }) {
  return (
    <div className="flex items-center gap-2">
      <Select value={serie} onValueChange={setSerie}>
        <SelectTrigger className="w-44">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="toutes">Toutes les séries</SelectItem>
          <SelectItem value="100">Série 100</SelectItem>
          <SelectItem value="400">Série 400</SelectItem>
        </SelectContent>
      </Select>
    </div>
  )
}

export default function Wagons() {
  const [serie, setSerie] = useState('toutes')

  return (
    <PageListe
      titre="Wagons"
      description="Parc de wagons de marchandises (séries 100 et 400)."
      endpoint="/wagons"
      params={serie === 'toutes' ? {} : { serie }}
      messageVide="Aucun wagon pour cette série."
      actions={<EnTete serie={serie} setSerie={setSerie} />}
      colonnes={[
        { titre: 'Code', cle: 'code' },
        { titre: 'Type', rendre: (l) => <Badge variant="outline">{l.typeWagon}</Badge> },
        { titre: 'Série', cle: 'serie' },
        { titre: 'Capacité', rendre: (l) => `${l.capaciteTonnes} t` },
      ]}
    />
  )
}
