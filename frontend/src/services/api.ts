import axios, { AxiosError } from "axios"

/**
 * Dynamic Backend URL Resolution
 * Handles:
 * 1. Explicit VITE_API_BASE_URL environment variable
 * 2. Runtime override via localStorage ('cognelearn_api_url')
 * 3. URL query parameter ?api_port=xxxx or ?api_url=xxxx
 * 4. Dynamic hostname detection with default port 8080
 */
export const getApiBaseUrl = (): string => {
  if (typeof window !== "undefined") {
    const urlParams = new URLSearchParams(window.location.search)
    
    // Check query override: ?api_url=http://localhost:8080
    const queryUrl = urlParams.get("api_url")
    if (queryUrl) {
      localStorage.setItem("cognelearn_api_url", queryUrl)
      return queryUrl
    }

    // Check query port override: ?api_port=8080
    const queryPort = urlParams.get("api_port")
    if (queryPort) {
      const computed = `${window.location.protocol}//${window.location.hostname}:${queryPort}`
      localStorage.setItem("cognelearn_api_url", computed)
      return computed
    }

    // Check localStorage saved override
    const stored = localStorage.getItem("cognelearn_api_url")
    if (stored) return stored
  }

  // Check Vite build/dev env variable
  if (import.meta.env.VITE_API_BASE_URL) {
    return import.meta.env.VITE_API_BASE_URL
  }

  // Fallback: Dynamic host with default port 8080
  if (typeof window !== "undefined") {
    return `${window.location.protocol}//${window.location.hostname}:8080`
  }

  return "http://localhost:8080"
}

export const api = axios.create({
  baseURL: getApiBaseUrl(),
  headers: {
    "Content-Type": "application/json",
  },
})

// Auto inject JWT token from localStorage
api.interceptors.request.use((config) => {
  const token = localStorage.getItem("cognelearn_token")
  if (token && config.headers) {
    config.headers.Authorization = `Bearer ${token}`
  }
  return config
})

// Normalize backend errors and handle expired tokens
api.interceptors.response.use(
  (response) => response,
  (error: AxiosError<{ error?: string | { message?: string } }>) => {
    let message = "An unexpected error occurred. Please try again."

    if (error.response?.data) {
      const data = error.response.data
      if (typeof data.error === "string") {
        message = data.error
      } else if (data.error?.message) {
        message = data.error.message
      }
    } else if (error.message) {
      message = error.message
    }

    // Auto logout on 401 Unauthorized for protected endpoints
    if (
      error.response?.status === 401 &&
      !error.config?.url?.includes("/auth/login") &&
      !error.config?.url?.includes("/auth/signup")
    ) {
      localStorage.removeItem("cognelearn_token")
      window.dispatchEvent(new Event("cognelearn_logout"))
    }

    return Promise.reject(new Error(message))
  }
)

export const setDynamicApiPort = (port: number | string) => {
  const host = typeof window !== "undefined" ? window.location.hostname : "localhost"
  const protocol = typeof window !== "undefined" ? window.location.protocol : "http:"
  const newUrl = `${protocol}//${host}:${port}`
  localStorage.setItem("cognelearn_api_url", newUrl)
  api.defaults.baseURL = newUrl
  return newUrl
}
