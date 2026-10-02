import { createContext, useContext, useEffect, useState } from "react";
import api from "../lib/api";

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(() => {
    const saved = localStorage.getItem("finance_user");
    return saved ? JSON.parse(saved) : null;
  });

  const [loading, setLoading] = useState(true);

  const saveAuth = (data) => {
    localStorage.setItem("finance_token", data.token);
    localStorage.setItem("finance_user", JSON.stringify(data.user));
    setUser(data.user);
  };

  const register = async (payload) => {
    const { data } = await api.post("/auth/register", payload);
    saveAuth(data);
    return data;
  };

  const login = async (payload) => {
    const { data } = await api.post("/auth/login", payload);
    saveAuth(data);
    return data;
  };

  const logout = () => {
    localStorage.removeItem("finance_token");
    localStorage.removeItem("finance_user");
    setUser(null);
  };

  const refreshUser = async () => {
    const token = localStorage.getItem("finance_token");

    if (!token) {
      setLoading(false);
      return;
    }

    try {
      const { data } = await api.get("/auth/me");
      localStorage.setItem("finance_user", JSON.stringify(data.user));
      setUser(data.user);
    } catch {
      logout();
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    refreshUser();
  }, []);

  return (
    <AuthContext.Provider
      value={{
        user,
        loading,
        isAuthenticated: Boolean(user),
        register,
        login,
        logout,
        refreshUser,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}