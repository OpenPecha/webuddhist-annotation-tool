import { ApiError } from "./errors"
import { fetchWithAccessToken, getRegisteredAccessToken } from "../lib/fetchWithAccessToken"

export { ApiError, handleApiError, isValidationError } from "./errors"

const SERVER_URL =
  import.meta.env.VITE_SERVER_URL || "http://localhost:8000/v1"

type CustomHeaders = Record<string, string>

function getStorageToken(): string {
  return (
    localStorage.getItem("auth_token") ??
    localStorage.getItem("access_token") ??
    sessionStorage.getItem("auth_token") ??
    sessionStorage.getItem("access_token") ??
    ""
  )
}

/** JSON request headers (Content-Type only; Bearer via `fetchWithAccessToken`). */
export async function getHeaders(): Promise<CustomHeaders> {
  return { "Content-Type": "application/json" }
}

/** Multipart / FormData — do not set Content-Type (browser sets boundary). */
export async function getHeadersMultipart(): Promise<CustomHeaders> {
  return {}
}

/**
 * Returns a valid token for non-fetch use cases. Prefer API calls through `apiClient` / `fetchWithAccessToken`.
 */
export async function getAuthToken(): Promise<string> {
  const token = await getRegisteredAccessToken()
  if (token) return token
  const cached = getStorageToken()
  if (cached) return cached
  throw new Error(
    "No authentication token available. Make sure you are logged in."
  )
}

function buildQueryString(
  params: Record<string, string | number | boolean | undefined>
): string {
  return "?" + new URLSearchParams(
    Object.entries(params).reduce((acc, [key, value]) => {
      if (value !== undefined) acc[key] = String(value)
      return acc
    }, {} as Record<string, string>)
  ).toString()
}

/**
 * Central API client. All backend calls should go through apiClient or domain modules (textApi, etc.).
 */
class ApiClient {
  private readonly baseURL: string

  constructor(baseURL: string) {
    this.baseURL = baseURL
  }

  private async request<T>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<T> {
    const url = `${this.baseURL}${endpoint}`
    const headers = await getHeaders()
    const config: RequestInit = {
      ...options,
      headers: { ...headers, ...options.headers },
    }

    try {
      const response = await fetchWithAccessToken(url, config)

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}))
        const message =
          typeof errorData.detail === "string"
            ? errorData.detail
            : `HTTP error! status: ${response.status}`
        throw new ApiError(message, response.status)
      }

      if (response.status === 204) return {} as T

      return await response.json()
    } catch (error) {
      if (error instanceof ApiError) throw error
      throw new ApiError(
        error instanceof Error ? error.message : "An unknown error occurred"
      )
    }
  }

  async get<T>(
    endpoint: string,
    params?: Record<string, string | number | boolean | undefined>
  ): Promise<T> {
    const query = params ? buildQueryString(params) : ""
    return this.request<T>(`${endpoint}${query}`, { method: "GET" })
  }

  async post<T>(endpoint: string, data?: unknown): Promise<T> {
    if (data instanceof FormData) {
      const url = `${this.baseURL}${endpoint}`
      const headers = await getHeadersMultipart()
      try {
        const response = await fetchWithAccessToken(url, {
          method: "POST",
          body: data,
          headers,
        })
        if (!response.ok) {
          const errorData = await response.json().catch(() => ({}))
          const message =
            typeof errorData.detail === "string"
              ? errorData.detail
              : `HTTP error! status: ${response.status}`
          throw new ApiError(message, response.status)
        }
        if (response.status === 204) return {} as T
        return await response.json()
      } catch (error) {
        if (error instanceof ApiError) throw error
        throw new ApiError(
          error instanceof Error ? error.message : "An unknown error occurred"
        )
      }
    }
    return this.request<T>(endpoint, {
      method: "POST",
      body: data ? JSON.stringify(data) : undefined,
    })
  }

  async put<T>(endpoint: string, data?: unknown): Promise<T> {
    return this.request<T>(endpoint, {
      method: "PUT",
      body: data ? JSON.stringify(data) : undefined,
    })
  }

  async patch<T>(endpoint: string, data?: unknown): Promise<T> {
    return this.request<T>(endpoint, {
      method: "PATCH",
      body: data ? JSON.stringify(data) : undefined,
    })
  }

  async delete<T>(endpoint: string): Promise<T> {
    return this.request<T>(endpoint, { method: "DELETE" })
  }
}

export const apiClient = new ApiClient(SERVER_URL)

/** Re-export for API modules that need the shared authenticated fetch. */
export { fetchWithAccessToken, outlinerFetch } from "../lib/fetchWithAccessToken"
