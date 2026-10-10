import { Trash2 } from 'lucide-react'
import { toast } from 'react-toastify'

import PageTable from '@/components/PageTable'
import { Button } from '@/components/ui/button'
import { formatDate, formatNombre } from '@/lib/affichage'
import { confirmerSuppression } from '@/lib/confirmation'
import api, { messageApi } from '@/services/api'

// Clients personnes physiques et morales liés aux locations (table `clients`).
export default function Clients() {
  const apiRef = { current: null }

  const supprimer = async (client) => {
    if (!(await confirmerSuppression(`Supprimer le client « ${client.nom} » ?`))) return
    try {
      await api.delete(`/clients/${client.id}`)
      toast.success('Client supprimé.')
      apiRef.current?.()
    } catch (e) {
      toast.error(messageApi(e, 'Suppression impossible'))
    }
  }

  return (
    <>
      <PageTable
        titre="Clients"
        description="Clients enregistrés via les demandes de location."
        endpoint="/clients"
        placeholderRecherche="Rechercher un client…"
        messageVide="Aucun client enregistré."
        libelleNombre="client(s)"
        apiRef={apiRef}
        rendreActions={(l) =>
          l.nbLocations > 0 ? null : (
            <Button
              variant="ghost"
              size="sm"
              title="Supprimer (uniquement sans location)"
              onClick={() => supprimer(l)}
            >
              <Trash2 />
            </Button>
          )
        }
        colonnes={[
          { titre: 'Nom', cle: 'nom', tronquer: true },
          { titre: 'Contact', cle: 'contact', tronquer: true },
          { titre: 'Adresse', cle: 'adresse', tronquer: true },
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
    </>
  )
}