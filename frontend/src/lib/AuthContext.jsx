import React, { createContext, useState, useContext, useEffect } from 'react';

const AuthContext = createContext(null);

// Mock default user for development/standalone mode
const DEFAULT_USER = {
  id: 'user-demo-1',
  full_name: 'דמו משתמש',
  name: 'דמו משתמש',
  email: 'demo@example.com',
  role: 'user',
};

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isLoadingAuth, setIsLoadingAuth] = useState(true);
  const [authError, setAuthError] = useState(null);

  useEffect(() => {
    initAuth();
  }, []);

  const initAuth = async () => {
    try {
      setIsLoadingAuth(true);
      setAuthError(null);

      // Check localStorage for stored user
      const storedUser = localStorage.getItem('auth_user');
      
      if (storedUser) {
        const user = JSON.parse(storedUser);
        setUser(user);
        setIsAuthenticated(true);
      } else {
        // In standalone mode, use default mock user
        // In production with real auth, this would redirect to login
        setUser(DEFAULT_USER);
        setIsAuthenticated(true);
        localStorage.setItem('auth_user', JSON.stringify(DEFAULT_USER));
      }

      setIsLoadingAuth(false);
    } catch (error) {
      console.error('Auth initialization failed:', error);
      setAuthError({
        type: 'unknown',
        message: error.message || 'Failed to initialize authentication',
      });
      setIsLoadingAuth(false);
    }
  };

  const logout = (shouldRedirect = true) => {
    setUser(null);
    setIsAuthenticated(false);
    localStorage.removeItem('auth_user');

    if (shouldRedirect) {
      window.location.href = '/';
    }
  };

  const setAuthUser = (userData) => {
    setUser(userData);
    setIsAuthenticated(true);
    localStorage.setItem('auth_user', JSON.stringify(userData));
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        isAuthenticated,
        isLoadingAuth,
        authError,
        logout,
        setAuthUser,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
