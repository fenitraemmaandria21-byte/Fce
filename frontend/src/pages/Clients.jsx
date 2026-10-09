import PageTable from '@/components/PageTable'
import { formatDate, formatNombre } from '@/lib/affichage'

// Clients personnes physiques et morales liés aux locations (table `clients`).
export default function Clients() {
  return (
    <PageTable
      titre="Clients"
      description="Clients enregistrés via les demandes de location."
      endpoint="/clients"
      placeholderRecherche="Rechercher un client…"
      messageVide="Aucun client enregistré."
      libelleNombre="client(s)"
      colonnes={[
        { titre: 'Nom', cle: 'nom' },
        { titre: 'Contact', cle: 'contact' },
        { titre: 'Adresse', cle: 'adresse' },
        {
          titre: 'Locations',
          align: 'right',
          rendre: (l) => formatNombre(l.nbLocations),
        },
        {
          titre: 'Créé le',
          rendre: (l) => formatDate(l.createdAt),
        },
      ]}
    />
  )
}