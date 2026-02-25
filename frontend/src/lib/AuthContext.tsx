"use client";

import React, { createContext, useContext, useState, useEffect, ReactNode } from "react";
import api from "./api";
import { User, AuthResponse } from "../types/auth";
import { useRouter } from "next/navigation";
import Cookies from "js-cookie";

interface AuthContextType {
  user: User | null;
  isLoading: boolean;
  login: (data: AuthResponse) => void;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    const fetchUser = async () => {
      const token = localStorage.getItem("accessToken");
      if (token) {
        try {
          const res = await api.get<User>("/auth/me/");
          setUser(res.data);
          // Ensure cookie is in sync
          Cookies.set("accessToken", token, { expires: 7 });
        } catch (err) {
          console.error("Failed to fetch user", err);
          localStorage.removeItem("accessToken");
          localStorage.removeItem("refreshToken");
          Cookies.remove("accessToken");
        }
      }
      setIsLoading(false);
    };

    fetchUser();
  }, []);

  const login = (data: AuthResponse) => {
    localStorage.setItem("accessToken", data.access);
    localStorage.setItem("refreshToken", data.refresh);
    Cookies.set("accessToken", data.access, { expires: 7 });
    setUser(data.user);
    router.push("/dashboard");
  };

  const logout = () => {
    localStorage.removeItem("accessToken");
    localStorage.removeItem("refreshToken");
    Cookies.remove("accessToken");
    setUser(null);
    router.push("/login");
  };

  return (
    <AuthContext.Provider value={{ user, isLoading, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}
