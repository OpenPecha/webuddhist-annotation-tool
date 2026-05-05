import {
  getRegisteredAccessToken,
  setAccessTokenGetter as registerGetter,
} from "./fetchWithAccessToken"

export {
  setAccessTokenGetter,
  fetchWithAccessToken,
  outlinerFetch,
  getRegisteredAccessToken,
} from "./fetchWithAccessToken"

/**
 * @deprecated Prefer `setAccessTokenGetter` from `@/lib/fetchWithAccessToken`. Registers the same resolver without extras.
 */
export const setAuthTokenGetter = (
  tokenGetter: (() => Promise<string>) | null
) => {
  if (!tokenGetter) {
    registerGetter(null)
    return
  }
  registerGetter(async () => {
    try {
      return await tokenGetter()
    } catch {
      return null
    }
  })
}

/**
 * Content-Type only. Bearer tokens are added by `fetchWithAccessToken` for HTTP calls.
 * @param _includeAuth Deprecated; ignored. Auth is centralized on the fetch wrapper.
 */
export const getAuthHeaders = async (
  contentType: "json" | "multipart" | "none" = "json",
  _includeAuth?: boolean
): Promise<Record<string, string>> => {
  const headers: Record<string, string> = {}
  if (contentType === "json") {
    headers["Content-Type"] = "application/json"
  }
  return headers
}

export const getAccessToken = (): Promise<string | null> =>
  getRegisteredAccessToken()
