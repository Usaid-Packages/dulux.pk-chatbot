import type { ReactNode } from 'react';
import { createContext, useContext, useState } from 'react';

import { ACCESS_TOKEN, AUTH_USER, REFRESH_TOKEN } from '#/constants';
import type { AuthUser } from '#/types/auth.types';
import { getLocalStorageItem, setLocalStorageItem, removeLocalStorageItem } from '#/utils/localStorage';

interface AuthContextType {
  token: string | null;
  refreshToken: string | null;
  user: AuthUser | null;
  logout: () => void;
  login: (authData: { token: string; refreshToken: string; user: AuthUser }) => void;
}

const AuthContext = createContext<AuthContextType | null>(null);

interface AuthProviderProps {
  children: ReactNode;
}

export function AuthProvider({ children }: AuthProviderProps) {
  const [token, setToken] = useState<string | null>(() => getLocalStorageItem<string>(ACCESS_TOKEN));
  const [refreshToken, setRefreshToken] = useState<string | null>(() => getLocalStorageItem<string>(REFRESH_TOKEN));
  const [user, setUser] = useState<AuthUser | null>(() => getLocalStorageItem<AuthUser>(AUTH_USER));

  const login = (authData: { token: string; refreshToken: string; user: AuthUser }) => {
    const { token: accessToken, refreshToken: latestRefreshToken, user: currentUser } = authData;
    setToken(accessToken);
    setRefreshToken(latestRefreshToken);
    setUser(currentUser);
    setLocalStorageItem(ACCESS_TOKEN, accessToken);
    setLocalStorageItem(REFRESH_TOKEN, latestRefreshToken);
    setLocalStorageItem(AUTH_USER, currentUser);
  };

  const logout = () => {
    setToken(null);
    setRefreshToken(null);
    setUser(null);
    removeLocalStorageItem(ACCESS_TOKEN);
    removeLocalStorageItem(REFRESH_TOKEN);
    removeLocalStorageItem(AUTH_USER);
  };

  return <AuthContext.Provider value={{ token, refreshToken, user, logout, login }}>{children}</AuthContext.Provider>;
}

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within an AuthProvider');
  return context;
};
