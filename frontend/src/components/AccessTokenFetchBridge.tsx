import { useAuth0 } from "@auth0/auth0-react"
import { useEffect } from "react"
import { setAccessTokenGetter } from "@/lib/fetchWithAccessToken"

/**
 * Registers the Auth0 token resolver (and 401 refresh/logout) for `fetchWithAccessToken`.
 * Mount once under `Auth0Provider`.
 */
export function AccessTokenFetchBridge() {
  const { isAuthenticated, getAccessTokenSilently, logout } = useAuth0()

  useEffect(() => {
    if (!isAuthenticated) {
      setAccessTokenGetter(null)
      return
    }

    const resolveToken = async (): Promise<string | null> => {
      try {
        const token = await getAccessTokenSilently()
        return token ?? null
      } catch {
        return null
      }
    }

    const refreshToken = async (): Promise<void> => {
      await getAccessTokenSilently({ cacheMode: "off" })
    }

    const handleLogout = (): void => {
      logout({ logoutParams: { returnTo: window.location.origin } })
    }

    setAccessTokenGetter(resolveToken, {
      refreshToken,
      logout: handleLogout,
    })

    return () => {
      setAccessTokenGetter(null)
    }
  }, [isAuthenticated, getAccessTokenSilently, logout])

  return null
}
