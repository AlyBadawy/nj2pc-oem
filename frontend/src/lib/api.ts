import axios from 'axios'

const TOKEN_STORAGE_KEY = 'nj2pc-oem-token'
const API_BASE_URL = import.meta.env.VITE_API_URL ?? 'http://localhost:8080'

export const api = axios.create({
  baseURL: API_BASE_URL,
})

/** Absolute URL for a relative API path — needed for plain `<img src>` requests, which
 * don't go through the axios instance (and so don't carry its baseURL or auth header). */
export function apiUrl(path: string): string {
  return `${API_BASE_URL}${path}`
}

api.interceptors.request.use((config) => {
  const token = localStorage.getItem(TOKEN_STORAGE_KEY)
  if (token) {
    config.headers.Authorization = `Bearer ${token}`
  }
  return config
})

api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem(TOKEN_STORAGE_KEY)
      if (window.location.pathname !== '/login') {
        window.location.assign('/login')
      }
    }
    return Promise.reject(error)
  },
)

export { TOKEN_STORAGE_KEY }
