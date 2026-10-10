import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react'

import Celebration from '@/components/Celebration'
import api, { CLE_TOKEN, messageApi } from '@/services/api'

const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const [utilisateur, setUtilisateur] = useState(null)
  const [chargement, setChargement] = useState(true)
  const [celebrations, setCelebrations] = useState(0)

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
      setCelebrations((n) => n + 1)
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
      {celebrations > 0 && <Celebration key={celebrations} duree={5000} />}
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
