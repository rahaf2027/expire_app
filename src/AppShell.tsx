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

  // A chef or employee tied to exactly one branch should not see a picker with
  // a single card in it — drop them straight into their branch.
  useEffect(() => {
    if (!profile || branchId) return;

    const remembered = localStorage.getItem(BRANCH_KEY);
    if (remembered && branches.some((b) => b.id === remembered)) {
      setBranchId(remembered);
      setView("dashboard");
      return;
    }

    const singleBranchRole = profile.role === "chef" || profile.role === "employee";
    if (singleBranchRole && branches.length === 1) {
      setBranchId(branches[0].id);
      setView("dashboard");
    }
  }, [profile, branches, branchId]);

  useEffect(() => {
    if (branchId) localStorage.setItem(BRANCH_KEY, branchId);
  }, [branchId]);

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

  const [returnToView, setReturnToView] = useState<View>("branches");

  const goToBranches = () => {
    setBranchId(null);
    localStorage.removeItem(BRANCH_KEY);
    setView("branches");
  };

  const goToUsersFromDashboard = () => {
    setReturnToView("dashboard");
    setView("users");
  };

  const goToUsersFromBranches = () => {
    setReturnToView("branches");
    setView("users");
  };

  if (view === "users") {
    return <UserManagementPage locale={locale} onBack={() => setView(returnToView)} />;
  }

  if (view === "dashboard" && branchId) {
    // A user with a single branch has nowhere to go back to.
    const canGoBack = branches.length > 1 || profile?.role === "master_admin" || profile?.role === "master_chef";
    return (
      <App
        branchId={branchId}
        canGoBack={canGoBack}
        onBack={goToBranches}
        locale={locale}
        onLocaleChange={setLocale}
        onManageUsers={goToUsersFromDashboard}
        onManageBranches={goToBranches}
        onSwitchBranch={(id) => {
          setBranchId(id);
        }}
      />
    );
  }

  return (
    <BranchListPage
      locale={locale}
      onPick={(id) => {
        setBranchId(id);
        setView("dashboard");
      }}
      onManageUsers={goToUsersFromBranches}
    />
  );
}
