import React, { createContext, useState, useEffect } from 'react';
import { authService } from '../services/authService';

export const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(() => {
    const saved = localStorage.getItem('user');
    return saved ? JSON.parse(saved) : null;
  });
  const [patient, setPatient] = useState(null);
  const [loading, setLoading] = useState(true);

  const fetchCurrentUser = async () => {
    const token = localStorage.getItem('accessToken');
    if (!token) {
      setLoading(false);
      return;
    }

    try {
      const res = await authService.getCurrentUser();
      const userData = res?.data?.user || res?.user;
      const patientData = res?.data?.patient || res?.patient;

      if (userData) {
        setUser(userData);
        localStorage.setItem('user', JSON.stringify(userData));
        if (patientData) setPatient(patientData);
      }
    } catch (err) {
      console.error('Session verify failed:', err);
      setUser(null);
      setPatient(null);
      localStorage.removeItem('accessToken');
      localStorage.removeItem('user');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCurrentUser();
  }, []);

  const login = async (email, password) => {
    setLoading(true);
    try {
      const res = await authService.login(email, password);
      const userData = res?.data?.user || res?.user;
      const patientId = res?.data?.patientId || res?.patientId;

      if (userData) {
        setUser(userData);
        if (patientId) {
          setPatient({ _id: patientId });
        }
      }
      await fetchCurrentUser();
      return res;
    } finally {
      setLoading(false);
    }
  };

  const register = async (userData) => {
    setLoading(true);
    try {
      const res = await authService.register(userData);
      const userRes = res?.data?.user || res?.user;
      if (userRes) {
        setUser(userRes);
      }
      await fetchCurrentUser();
      return res;
    } finally {
      setLoading(false);
    }
  };

  const logout = async () => {
    await authService.logout();
    setUser(null);
    setPatient(null);
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        patient,
        loading,
        role: user?.role || null,
        isAuthenticated: !!user,
        login,
        register,
        logout,
        refreshProfile: fetchCurrentUser,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};
