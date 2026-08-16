import type { User } from "@supabase/supabase-js";
import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { supabase } from "@/lib/supabase/client";
import type { Profile } from "@/lib/supabase/database.types";
import { getAuthSnapshot, getProfile, signOut, touchLastSeen } from "@/services/auth";
import { getErrorMessage } from "@/services/errors";

type AuthContextValue = {
  user: User | null;
  profile: Profile | null;
  loading: boolean;
  error: string | null;
  refreshProfile: () => Promise<void>;
  logout: () => Promise<void>;
};

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refreshProfile = useCallback(async () => {
    if (!user) {
      setProfile(null);
      return;
    }
    setProfile(await getProfile(user.id));
  }, [user]);

  const logout = useCallback(async () => {
    await signOut();
    setUser(null);
    setProfile(null);
  }, []);

  useEffect(() => {
    let mounted = true;

    void getAuthSnapshot()
      .then((snapshot) => {
        if (!mounted) return;
        setUser(snapshot.user);
        setProfile(snapshot.profile);
        setError(null);
        if (snapshot.user) void touchLastSeen(snapshot.user.id);
      })
      .catch((authError: unknown) => {
        if (mounted) setError(getErrorMessage(authError, "Не удалось восстановить сессию."));
      })
      .finally(() => {
        if (mounted) setLoading(false);
      });

    const { data } = supabase.auth.onAuthStateChange((_event, session) => {
      const nextUser = session?.user ?? null;
      setUser(nextUser);

      if (!nextUser) {
        setProfile(null);
        return;
      }

      void getProfile(nextUser.id)
        .then(setProfile)
        .catch(() => setProfile(null));
      void touchLastSeen(nextUser.id);
    });

    return () => {
      mounted = false;
      data.subscription.unsubscribe();
    };
  }, []);

  const value = useMemo(
    () => ({ user, profile, loading, error, refreshProfile, logout }),
    [user, profile, loading, error, refreshProfile, logout],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const value = useContext(AuthContext);
  if (!value) throw new Error("useAuth must be used inside AuthProvider.");
  return value;
}
