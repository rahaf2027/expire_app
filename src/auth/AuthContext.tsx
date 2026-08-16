/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import type { Session } from "@supabase/supabase-js";
import { supabase } from "../lib/supabaseClient";
import { mapBranchRow, mapProfileRow, type BranchRecord, type Profile } from "./types";
import { can, type Action } from "./permissions";

interface AuthState {
  session: Session | null;
  profile: Profile | null;
  branches: BranchRecord[];
  loading: boolean;
  /** Set when a session exists but the account is unusable (deactivated / no profile). */
  accountError: string | null;
  signIn: (email: string, password: string) => Promise<void>;
  signOut: () => Promise<void>;
  reloadBranches: () => Promise<void>;
  can: (action: Action) => boolean;
}

const AuthCtx = createContext<AuthState | null>(null);

export function useAuth(): AuthState {
  const ctx = useContext(AuthCtx);
  if (!ctx) throw new Error("useAuth must be used inside <AuthProvider>");
  return ctx;
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [branches, setBranches] = useState<BranchRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [accountError, setAccountError] = useState<string | null>(null);

  // Guards against a slow response for a signed-out user overwriting newer state.
  const loadToken = useRef(0);

  const loadBranches = useCallback(async () => {
    const { data, error } = await supabase
      .from("branches")
      .select("*")
      .order("name", { ascending: true });
    if (error) {
      console.error("[Auth] Failed to load branches:", error);
      setBranches([]);
      return;
    }
    setBranches((data || []).map(mapBranchRow));
  }, []);

  const loadForSession = useCallback(
    async (next: Session | null) => {
      const token = ++loadToken.current;

      if (!next) {
        setProfile(null);
        setBranches([]);
        setAccountError(null);
        setLoading(false);
        return;
      }

      const { data, error } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", next.user.id)
        .maybeSingle();

      if (token !== loadToken.current) return; // superseded

      if (error) {
        console.error("[Auth] Failed to load profile:", error);
        setProfile(null);
        setAccountError("profileLoadFailed");
        setLoading(false);
        return;
      }

      if (!data) {
        setProfile(null);
        setAccountError("noProfile");
        setLoading(false);
        return;
      }

      const mapped = mapProfileRow(data);
      if (!mapped.isActive) {
        setProfile(mapped);
        setBranches([]);
        setAccountError("deactivated");
        setLoading(false);
        return;
      }

      setProfile(mapped);
      setAccountError(null);
      await loadBranches();
      if (token !== loadToken.current) return;
      setLoading(false);
    },
    [loadBranches]
  );

  useEffect(() => {
    let cancelled = false;

    supabase.auth.getSession().then(({ data }) => {
      if (cancelled) return;
      setSession(data.session);
      void loadForSession(data.session);
    });

    const { data: sub } = supabase.auth.onAuthStateChange((_event, next) => {
      setSession(next);
      void loadForSession(next);
    });

    return () => {
      cancelled = true;
      sub.subscription.unsubscribe();
    };
  }, [loadForSession]);

  const signIn = useCallback(async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({
      email: email.trim().toLowerCase(),
      password,
    });
    if (error) throw error;
  }, []);

  const signOut = useCallback(async () => {
    await supabase.auth.signOut();
    setSession(null);
    setProfile(null);
    setBranches([]);
    setAccountError(null);
  }, []);

  const value = useMemo<AuthState>(
    () => ({
      session,
      profile,
      branches,
      loading,
      accountError,
      signIn,
      signOut,
      reloadBranches: loadBranches,
      can: (action: Action) => can(profile?.role, action),
    }),
    [session, profile, branches, loading, accountError, signIn, signOut, loadBranches]
  );

  return <AuthCtx.Provider value={value}>{children}</AuthCtx.Provider>;
}
