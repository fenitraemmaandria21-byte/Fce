import axios from 'axios'

export const CLE_TOKEN = 'fce_token'

const api = axios.create({
  baseURL: '/api',
  headers: { 'Content-Type': 'application/json' },
})

api.interceptors.request.use((config) => {
  const token = localStorage.getItem(CLE_TOKEN)
  if (token) {
    config.headers.Authorization = `Bearer ${token}`
  }
  return config
})

// Événement émis après toute mutation réussie : permet au centre de
// notifications de rafraîchir immédiatement son compteur, sans rechargement.
export const EVENEMENT_NOTIFICATIONS = 'fce:notifications-rafraichir'

api.interceptors.response.use(
  (reponse) => {
    const methode = (reponse.config?.method || '').toLowerCase()
    if (
      ['post', 'put', 'patch', 'delete'].includes(methode) &&
      typeof window !== 'undefined'
    ) {
      window.dispatchEvent(new Event(EVENEMENT_NOTIFICATIONS))
    }
    return reponse
  },
  (erreur) => {
    if (erreur.response?.status === 401) {
      localStorage.removeItem(CLE_TOKEN)
      if (!window.location.pathname.startsWith('/login')) {
        window.location.assign('/login')
      }
    }
    return Promise.reject(erreur)
  }
)

// Extrait le message d'erreur affichable depuis une réponse API.
export function messageApi(erreur, fallback = "Une erreur est survenue") {
  const data = erreur?.response?.data
  if (data?.message) return data.message
  if (erreur?.code === 'ERR_NETWORK') return "API injoignable — le serveur backend ne répond pas."
  return fallback
}

export default api
