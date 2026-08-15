import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { useNavigate } from "react-router-dom";
import {
  clearSession,
  login as loginRequest,
  readSession,
  writeSession,
  type Session
} from "../lib/api";

type AuthContextValue = {
  session: Session | null;
  login: (email: string, password: string) => Promise<void>;
  logout: () => void;
};

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const navigate = useNavigate();
  const [session, setSession] = useState<Session | null>(() => readSession());

  useEffect(() => {
    const onUnauthorized = () => {
      setSession(null);
      navigate("/login", { replace: true });
    };
    window.addEventListener("invoicehub:unauthorized", onUnauthorized);
    return () => window.removeEventListener("invoicehub:unauthorized", onUnauthorized);
  }, [navigate]);

  const value = useMemo<AuthContextValue>(
    () => ({
      session,
      async login(email, password) {
        const response = await loginRequest(email, password);
        const next: Session = {
          accessToken: response.accessToken,
          displayName: response.displayName,
          role: response.role,
          expiresAt: response.expiresAt
        };
        writeSession(next);
        setSession(next);
      },
      logout() {
        clearSession();
        setSession(null);
        navigate("/login", { replace: true });
      }
    }),
    [navigate, session]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const value = useContext(AuthContext);
  if (!value) {
    throw new Error("useAuth must be used within AuthProvider");
  }
  return value;
}
