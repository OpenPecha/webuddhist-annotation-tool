import { useEffect, useCallback, useRef } from "react";
import { isTokenExpired } from "../utils/tokenUtils";
import { useAuth0 } from "@auth0/auth0-react";

/**
 * Custom hook to monitor token expiration and handle automatic logout
 */
export const useTokenExpiration = () => {
  const { logout, getAccessTokenSilently, isAuthenticated } = useAuth0();
  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const isCheckingRef = useRef(false);

  const checkTokenExpiration = useCallback(async () => {
    if (isCheckingRef.current || !isAuthenticated) return;

    isCheckingRef.current = true;

    try {
      // Try getToken first – it calls getAccessTokenSilently, which uses refresh token when access token is expired
      const currentToken = await getAccessTokenSilently();
      if (!currentToken) {
        logout();
        return;
      }
      if (isTokenExpired(currentToken)) {
        // Token is still expired after refresh attempt – refresh failed
        logout();
        return;
      }
    } catch (error) {
      console.error("Error checking token for expiration:", error);
      logout();
    } finally {
      isCheckingRef.current = false;
    }
  }, [getAccessTokenSilently, isAuthenticated]);

  const setupTokenExpirationCheck = useCallback(() => {
    // Clear any existing interval
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
    }

    if (!isAuthenticated) {
      return;
    }

    // Check immediately
    checkTokenExpiration();

    // Set up periodic checking every 30 seconds
    intervalRef.current = setInterval(() => {
      checkTokenExpiration();
    }, 30 * 1000);
  }, [checkTokenExpiration, isAuthenticated]);

  const checkTokenOnFocus = useCallback(() => {
    // Check token when window gains focus (user returns to tab)
    if (isAuthenticated) {
      checkTokenExpiration();
    }
  }, [checkTokenExpiration, isAuthenticated]);

  useEffect(() => {
    if (isAuthenticated) {
      setupTokenExpirationCheck();

      // Add event listener for window focus
      window.addEventListener("focus", checkTokenOnFocus);

      return () => {
        if (intervalRef.current) {
          clearInterval(intervalRef.current);
        }
        window.removeEventListener("focus", checkTokenOnFocus);
      };
    } else {
      // Clear interval if not authenticated
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    }
  }, [isAuthenticated, setupTokenExpirationCheck, checkTokenOnFocus]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, []);

  return {
    checkTokenExpiration,
  };
};
