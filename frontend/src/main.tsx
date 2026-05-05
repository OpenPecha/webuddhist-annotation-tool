import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import "./index.css";
import "./diplomatic_style.css";
import App from "./App.tsx";
import { Auth0Provider } from "@auth0/auth0-react";
import { AccessTokenFetchBridge } from "./components/AccessTokenFetchBridge";

// Create a client
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 3,
      staleTime: 5 * 60 * 1000, // 5 minutes
      gcTime: 10 * 60 * 1000, // 10 minutes
    },
  },
});

const rootElement = document.getElementById("root");
if (!rootElement) throw new Error("Failed to find the root element");

const root = createRoot(rootElement);

root.render(
  <StrictMode>
     <Auth0Provider
      domain={import.meta.env.VITE_AUTH0_DOMAIN}
      clientId={import.meta.env.VITE_AUTH0_CLIENT_ID}
      authorizationParams={{
        redirect_uri: window.location.origin,
        scope: 'openid profile email',
        audience: import.meta.env.VITE_AUTH0_AUDIENCE,
      }}
      cacheLocation='localstorage'
      useRefreshTokens={true}
      useRefreshTokensFallback={true}
    >
      <AccessTokenFetchBridge />
      <QueryClientProvider client={queryClient}>
        <App />
      </QueryClientProvider>
    </Auth0Provider>
  </StrictMode>
);
