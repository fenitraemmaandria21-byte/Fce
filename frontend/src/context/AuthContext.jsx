import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react'

import Celebration from '@/components/Celebration'
import api, { CLE_TOKEN, messageApi } from '@/services/api'

const AuthContext = createContext(null)

const CLE_CONFETTIS = 'fce_confettis_premiere_connexion'

export function AuthProvider({ children }) {
  const [utilisateur, setUtilisateur] = useState(null)
  const [chargement, setChargement] = useState(true)
  const [celebrer, setCelebrer] = useState(false)

  useEffect(() => {
    let actif = true
    if (!localStorage.getItem(CLE_TOKEN)) {
      setChargement(false)
      return undefined
    }
    api
      .get('/auth/me')
      .then((r) => {
        if (actif) setUtilisateur(r.data)
      })
      .catch(() => {
        localStorage.removeItem(CLE_TOKEN)
        if (actif) setUtilisateur(null)
      })
      .finally(() => {
        if (actif) setChargement(false)
      })
    return () => {
      actif = false
    }
  }, [])

  const connexion = useCallback(async (email, motDePasse) => {
    try {
      const { data } = await api.post('/auth/login', { email, motDePasse })
      localStorage.setItem(CLE_TOKEN, data.token)
      setUtilisateur(data.utilisateur)
      if (!localStorage.getItem(CLE_CONFETTIS)) {
        localStorage.setItem(CLE_CONFETTIS, '1')
        setCelebrer(true)
      }
      return data.utilisateur
    } catch (erreur) {
      throw new Error(messageApi(erreur, 'Connexion impossible'))
    }
  }, [])

  const deconnexion = useCallback(async () => {
    try {
      await api.post('/auth/logout')
    } catch {
      // JWT stateless : on nettoie le client même si l'appel échoue.
    }
    localStorage.removeItem(CLE_TOKEN)
    setUtilisateur(null)
  }, [])

  const valeur = useMemo(
    () => ({ utilisateur, chargement, connexion, deconnexion }),
    [utilisateur, chargement, connexion, deconnexion]
  )

  return (
    <AuthContext.Provider value={valeur}>
      {celebrer && <Celebration duree={5000} />}
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const contexte = useContext(AuthContext)
  if (!contexte) {
    throw new Error('useAuth doit être utilisé dans <AuthProvider>')
  }
  return contexte
}
