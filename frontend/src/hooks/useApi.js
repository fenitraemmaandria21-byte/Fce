import { useCallback, useEffect, useState } from 'react'

import api, { messageApi } from '@/services/api'

// Hook générique d'appel API : { chargement, donnees, erreur, message, recharger }.
export function useApi(url, params = {}) {
  const cleParams = JSON.stringify(params)
  const [etat, setEtat] = useState({ chargement: true, donnees: null, erreur: null })

  const charger = useCallback(async () => {
    setEtat((precedent) => ({ ...precedent, chargement: true, erreur: null }))
    try {
      const { data } = await api.get(url, { params: JSON.parse(cleParams) })
      setEtat({ chargement: false, donnees: data, erreur: null })
    } catch (erreur) {
      setEtat({ chargement: false, donnees: null, erreur })
    }
  }, [url, cleParams])

  useEffect(() => {
    charger()
  }, [charger])

  return {
    chargement: etat.chargement,
    donnees: etat.donnees,
    erreur: etat.erreur,
    message: etat.erreur ? messageApi(etat.erreur) : null,
    recharger: charger,
  }
}
