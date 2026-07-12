import React, { createContext, useState, useEffect, useContext } from 'react';
import { auth } from '../services/api';

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const checkLoggedIn = async () => {
      try {
        const storedUser = auth.getCurrentUser();
        const token = localStorage.getItem('transitops_token');

        if (storedUser && token) {
          setUser(storedUser);
          // Optionally fetch fresh profile data
          try {
            const data = await auth.getMe();
            if (data.success) {
              setUser(data.data);
              localStorage.setItem('transitops_user', JSON.stringify(data.data));
            }
          } catch (e) {
            console.error('Token verification failed:', e);
            // If API returns 401, the interceptor will clear and redirect automatically
          }
        }
      } catch (err) {
        console.error('Auth verification error:', err);
      } finally {
        setLoading(false);
      }
    };

    checkLoggedIn();
  }, []);

  const loginUser = async (email, password) => {
    setLoading(true);
    try {
      const data = await auth.login(email, password);
      if (data.success) {
        setUser(data.user);
        return { success: true };
      }
      return { success: false, message: data.message };
    } catch (err) {
      return {
        success: false,
        message: err.response?.data?.message || 'Login failed. Please check your credentials.'
      };
    } finally {
      setLoading(false);
    }
  };

  const logoutUser = () => {
    auth.logout();
    setUser(null);
  };

  const value = {
    user,
    loading,
    isAuthenticated: !!user,
    login: loginUser,
    logout: logoutUser,
    hasRole: (roles) => {
      if (!user) return false;
      if (Array.isArray(roles)) {
        return roles.includes(user.role);
      }
      return user.role === roles;
    }
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
