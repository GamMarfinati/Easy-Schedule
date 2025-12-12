import React, { createContext, useContext, ReactNode } from 'react';
import { Auth0Provider, useAuth0, User } from '@auth0/auth0-react';

interface AuthContextType {
  user: User | undefined;
  isLoading: boolean;
  isAuthenticated: boolean;
  login: () => Promise<void>;
  logout: () => void;
  getAccessToken: () => Promise<string>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const domain = import.meta.env.VITE_AUTH0_DOMAIN;
  const clientId = import.meta.env.VITE_AUTH0_CLIENT_ID;
  const audience = import.meta.env.VITE_AUTH0_AUDIENCE;

  if (!domain || !clientId) {
    console.error("Auth0 domain or client ID missing in environment variables");
    return <>{children}</>; // Render children anyway to avoid crashing dev if not configured yet
  }

  return (
    <Auth0Provider
      domain={domain}
      clientId={clientId}
      authorizationParams={{
        redirect_uri: window.location.origin,
        audience: audience,
      }}
    >
      <AuthContextWrapper>{children}</AuthContextWrapper>
    </Auth0Provider>
  );
};

const AuthContextWrapper = ({ children }: { children: ReactNode }) => {
  const {
    user,
    isLoading,
    isAuthenticated,
    loginWithRedirect,
    logout: auth0Logout,
    getAccessTokenSilently,
  } = useAuth0();

  const login = async () => {
    await loginWithRedirect();
  };

  const logout = () => {
    auth0Logout({ logoutParams: { returnTo: window.location.origin } });
  };

  const getAccessToken = async () => {
    try {
      return await getAccessTokenSilently();
    } catch (error) {
      console.error("Error getting access token", error);
      return "";
    }
  };

  return (
    <AuthContext.Provider
      value={{ user, isLoading, isAuthenticated, login, logout, getAccessToken }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    // If used outside provider (e.g. before config is set), return mock/empty
    // This allows the app to at least render if config is missing
    const { loginWithRedirect } = useAuth0(); // Try to get from Auth0 directly if possible or fail gracefully
    return {
        user: undefined,
        isLoading: false,
        isAuthenticated: false,
        login: async () => {}, 
        logout: () => {},
        getAccessToken: async () => ""
    }
  }
  return context;
};
