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

api.interceptors.response.use(
  (reponse) => reponse,
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
