/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Decides what the signed-in user sees: the branch picker, the user management
 * panel, or the branch dashboard itself.
 */
import { useEffect, useState } from "react";
import { Loader2, ShieldAlert, LogOut } from "lucide-react";
import App from "./App";
import LoginPage from "./pages/LoginPage";
import BranchListPage from "./pages/BranchListPage";
import UserManagementPage from "./pages/UserManagementPage";
import { useAuth } from "./auth/AuthContext";
import { getAuthLocale } from "./auth/authLocale";

const LOCALE_KEY = "expiry_tracker_locale";
const BRANCH_KEY = "expiry_tracker_branch";

type View = "branches" | "users" | "dashboard";

export default function AppShell() {
  const { session, profile, branches, loading, accountError, signOut } = useAuth();

  const [locale, setLocale] = useState<string>(
    () => localStorage.getItem(LOCALE_KEY) || "ar"
  );
  const [branchId, setBranchId] = useState<string | null>(null);
  const [view, setView] = useState<View>("branches");

  useEffect(() => {
    localStorage.setItem(LOCALE_KEY, locale);
  }, [locale]);

  // Helper to change view and push new entry into HTML5 history stack
  const changeView = (nextView: View, nextBranchId: string | null = branchId, replace = false) => {
    setView(nextView);
    setBranchId(nextBranchId);

    if (nextBranchId) {
      localStorage.setItem(BRANCH_KEY, nextBranchId);
    } else {
      localStorage.removeItem(BRANCH_KEY);
    }

    const stateObj = { view: nextView, branchId: nextBranchId };
    let path = "/";
    if (nextView === "dashboard" && nextBranchId) {
      path = `/dashboard?branch=${encodeURIComponent(nextBranchId)}`;
    } else if (nextView === "users") {
      path = "/users";
    } else if (nextView === "branches") {
      path = "/branches";
    }

    if (replace) {
      window.history.replaceState(stateObj, "", path);
    } else {
      window.history.pushState(stateObj, "", path);
    }
  };

  // Sync state when user presses Browser Back / Forward buttons (popstate)
  useEffect(() => {
    const handlePopState = (e: PopStateEvent) => {
      if (e.state && e.state.view) {
        setView(e.state.view);
        setBranchId(e.state.branchId || null);
      } else {
        // Parse from URL params or pathname
        const urlParams = new URLSearchParams(window.location.search);
        const bId = urlParams.get("branch");
        const pathname = window.location.pathname;

        if (pathname.includes("/users")) {
          setView("users");
        } else if (bId || pathname.includes("/dashboard")) {
          setView("dashboard");
          if (bId) setBranchId(bId);
        } else {
          setView("branches");
          setBranchId(null);
        }
      }
    };

    // Set initial history state if empty
    const initialPath = window.location.pathname;
    const initialBranch = new URLSearchParams(window.location.search).get("branch") || localStorage.getItem(BRANCH_KEY);
    
    let initialView: View = "branches";
    if (initialPath.includes("/users")) {
      initialView = "users";
    } else if (initialBranch || initialPath.includes("/dashboard")) {
      initialView = "dashboard";
    }

    window.history.replaceState({ view: initialView, branchId: initialBranch }, "", window.location.href);
    window.addEventListener("popstate", handlePopState);
    return () => window.removeEventListener("popstate", handlePopState);
  }, []);

  // A chef or employee tied to exactly one branch should not see a picker with
  // a single card in it — drop them straight into their branch.
  useEffect(() => {
    if (!profile || branchId) return;

    const remembered = localStorage.getItem(BRANCH_KEY);
    if (remembered && branches.some((b) => b.id === remembered)) {
      changeView("dashboard", remembered, true);
      return;
    }

    const singleBranchRole = profile.role === "chef" || profile.role === "employee";
    if (singleBranchRole && branches.length === 1) {
      changeView("dashboard", branches[0].id, true);
    }
  }, [profile, branches, branchId]);

  const t = getAuthLocale(locale);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <Loader2 className="w-6 h-6 animate-spin text-blue-500" />
      </div>
    );
  }

  if (!session) {
    return <LoginPage locale={locale} onLocaleChange={setLocale} />;
  }

  if (accountError) {
    const message =
      accountError === "deactivated"
        ? t.accountDeactivated
        : accountError === "noProfile"
        ? t.accountNoProfile
        : t.accountLoadFailed;

    return (
      <div
        className="min-h-screen flex items-center justify-center bg-slate-50 px-4"
        dir={locale === "ar" ? "rtl" : "ltr"}
      >
        <div className="w-full max-w-sm bg-white rounded-2xl border border-slate-200 shadow-sm p-7 text-center">
          <div className="w-12 h-12 rounded-2xl bg-red-50 flex items-center justify-center mx-auto mb-4">
            <ShieldAlert className="w-6 h-6 text-red-600" />
          </div>
          <p className="text-sm font-semibold text-slate-700 leading-relaxed mb-5">{message}</p>
          <button
            type="button"
            onClick={() => void signOut()}
            className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-sm font-bold transition"
          >
            <LogOut className="w-4 h-4" />
            {t.signOut}
          </button>
        </div>
      </div>
    );
  }

  const activeBranchMemory = branchId || localStorage.getItem(BRANCH_KEY);

  const handleGoBack = () => {
    if (view === "branches" && activeBranchMemory) {
      changeView("dashboard", activeBranchMemory);
    } else if (view === "users" && activeBranchMemory) {
      changeView("dashboard", activeBranchMemory);
    } else if (window.history.length > 1 && window.history.state && window.history.state.view) {
      window.history.back();
    } else {
      changeView("branches", null);
    }
  };

  if (view === "users") {
    return <UserManagementPage locale={locale} onBack={handleGoBack} />;
  }

  if (view === "dashboard" && branchId) {
    // A user with a single branch has nowhere to go back to.
    const canGoBack = branches.length > 1 || profile?.role === "master_admin" || profile?.role === "master_chef";
    return (
      <App
        branchId={branchId}
        canGoBack={canGoBack}
        onBack={handleGoBack}
        locale={locale}
        onLocaleChange={setLocale}
        onManageUsers={() => changeView("users", branchId)}
        onManageBranches={() => changeView("branches", null)}
        onSwitchBranch={(id) => changeView("dashboard", id)}
      />
    );
  }

  return (
    <BranchListPage
      locale={locale}
      onPick={(id) => changeView("dashboard", id)}
      onManageUsers={() => changeView("users", null)}
      activeBranchId={activeBranchMemory}
      onBackToActiveBranch={() => {
        if (activeBranchMemory) changeView("dashboard", activeBranchMemory);
      }}
    />
  );
}
