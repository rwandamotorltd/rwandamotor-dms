"use client";

import React, { createContext, useContext, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { authApi } from "@/lib/api";
import type { AuthUser } from "@/types";

interface AuthContextValue {
  user: AuthUser | null;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<void>;
  logout: () => void;
  hasPermission: (key: string) => boolean;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    try {
      const stored = localStorage.getItem("auth_user");
      const token = localStorage.getItem("access_token");
      if (stored && token) {
        const parsed: AuthUser = JSON.parse(stored);
        // Back-fill for sessions created before permissions were added
        if (!parsed.permissions) parsed.permissions = [];
        setUser(parsed);
      }
    } catch { /* ignore */ }
    setIsLoading(false);
  }, []);

  const login = async (email: string, password: string) => {
    const res = await authApi.login(email, password);
    if (!res.success || !res.data) throw new Error(res.message ?? "Login failed");
    const { accessToken, userId, fullName, email: userEmail, role, permissions = [] } = res.data;
    localStorage.setItem("access_token", accessToken);
    const authUser: AuthUser = { userId, fullName, email: userEmail, role, permissions };
    localStorage.setItem("auth_user", JSON.stringify(authUser));
    setUser(authUser);
    router.push("/dashboard");
  };

  const logout = () => {
    localStorage.removeItem("access_token");
    localStorage.removeItem("auth_user");
    setUser(null);
    router.push("/login");
  };

  const hasPermission = (key: string): boolean => {
    if (!user) return false;
    // Admin always has full access
    if (user.role === "Admin") return true;
    return user.permissions.includes(key);
  };

  return (
    <AuthContext.Provider value={{ user, isLoading, login, logout, hasPermission }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}

/** Convenience hook — returns true if the current user has the given permission key. */
export function usePermission(key: string): boolean {
  const { hasPermission } = useAuth();
  return hasPermission(key);
}
