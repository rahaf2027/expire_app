/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */
import { useEffect, useState, type FormEvent } from "react";
import { Store, Plus, Loader2, AlertCircle, Users, LogOut, ChevronLeft, ChevronRight } from "lucide-react";
import { useAuth } from "../auth/AuthContext";
import { getAuthLocale } from "../auth/authLocale";
import { createBranch, fetchBranchStats, type BranchStats } from "../lib/admin";
import type { Role } from "../auth/types";

function slugify(input: string): string {
  return input
    .trim()
    .toLowerCase()
    .replace(/[^\p{L}\p{N}\s-]/gu, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-");
}

export function roleLabel(role: Role, locale: string): string {
  const t = getAuthLocale(locale);
  switch (role) {
    case "master_admin": return t.roleMasterAdmin;
    case "master_chef":  return t.roleMasterChef;
    case "chef":         return t.roleChef;
    default:             return t.roleEmployee;
  }
}

export default function BranchListPage({
  locale,
  onPick,
  onManageUsers,
}: {
  locale: string;
  onPick: (branchId: string) => void;
  onManageUsers: () => void;
}) {
  const t = getAuthLocale(locale);
  const rtl = locale === "ar";
  const { profile, branches, reloadBranches, signOut, can } = useAuth();

  const [stats, setStats] = useState<Record<string, BranchStats>>({});
  const [adding, setAdding] = useState(false);
  const [name, setName] = useState("");
  const [id, setId] = useState("");
  const [idTouched, setIdTouched] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchBranchStats().then(setStats);
  }, [branches.length]);

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    if (busy) return;
    setError(null);
    setBusy(true);
    try {
      const branchId = slugify(idTouched ? id : name);
      const created = await createBranch(branchId, name.trim());
      await reloadBranches();
      setName("");
      setId("");
      setIdTouched(false);
      setAdding(false);
      onPick(created.id);
    } catch (err: any) {
      setError(err?.message || t.genericSignInError);
    } finally {
      setBusy(false);
    }
  };

  const Chevron = rtl ? ChevronLeft : ChevronRight;

  return (
    <div className="min-h-screen bg-slate-50 antialiased" dir={rtl ? "rtl" : "ltr"}>
      <header className="bg-white border-b border-slate-200">
        <div className="max-w-4xl mx-auto px-4 py-4 flex items-center justify-between gap-3">
          <div className="min-w-0">
            <h1 className="text-lg font-bold text-slate-900 truncate">
              {profile?.fullName || profile?.email}
            </h1>
            <p className="text-xs font-semibold text-blue-600">
              {profile ? roleLabel(profile.role, locale) : ""}
            </p>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            {can("user.manage") && (
              <button
                type="button"
                onClick={onManageUsers}
                className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold transition"
              >
                <Users className="w-4 h-4" />
                <span className="hidden sm:inline">{t.manageUsers}</span>
              </button>
            )}
            <button
              type="button"
              onClick={() => void signOut()}
              className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-slate-100 hover:bg-red-50 hover:text-red-600 text-slate-700 text-xs font-bold transition"
            >
              <LogOut className="w-4 h-4" />
              <span className="hidden sm:inline">{t.signOut}</span>
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 py-8">
        <div className="flex items-end justify-between mb-5 gap-3">
          <div>
            <h2 className="text-xl font-bold text-slate-900">{t.chooseBranch}</h2>
            <p className="text-sm text-slate-500 mt-0.5">{t.chooseBranchSubtitle}</p>
          </div>
          {can("branch.create") && !adding && (
            <button
              type="button"
              onClick={() => setAdding(true)}
              className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold transition shadow-sm shrink-0"
            >
              <Plus className="w-4 h-4" />
              {t.addBranch}
            </button>
          )}
        </div>

        {adding && can("branch.create") && (
          <form
            onSubmit={submit}
            className="bg-white rounded-2xl border border-slate-200 p-5 mb-5 space-y-3.5 shadow-sm"
          >
            <div>
              <label htmlFor="branch-name" className="block text-xs font-bold text-slate-500 uppercase mb-1.5">
                {t.branchNameLabel}
              </label>
              <input
                id="branch-name"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 bg-slate-50 text-sm outline-none focus:border-blue-500 focus:bg-white focus:ring-2 focus:ring-blue-500/15 transition"
              />
            </div>
            <div>
              <label htmlFor="branch-id" className="block text-xs font-bold text-slate-500 uppercase mb-1.5">
                {t.branchIdLabel}
              </label>
              <input
                id="branch-id"
                dir="ltr"
                value={idTouched ? id : slugify(name)}
                onChange={(e) => {
                  setIdTouched(true);
                  setId(e.target.value);
                }}
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 bg-slate-50 text-sm font-mono outline-none focus:border-blue-500 focus:bg-white focus:ring-2 focus:ring-blue-500/15 transition"
              />
              <p className="text-[11px] text-slate-400 mt-1">{t.branchIdHint}</p>
            </div>

            {error && (
              <div role="alert" className="flex items-start gap-2 rounded-xl bg-red-50 border border-red-100 px-3 py-2.5">
                <AlertCircle className="w-4 h-4 text-red-600 shrink-0 mt-0.5" />
                <span className="text-xs font-semibold text-red-700 leading-relaxed">{error}</span>
              </div>
            )}

            <div className="flex gap-2 pt-1">
              <button
                type="submit"
                disabled={busy || !name.trim()}
                className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 disabled:bg-slate-300 text-white text-sm font-bold transition"
              >
                {busy && <Loader2 className="w-4 h-4 animate-spin" />}
                {busy ? t.creating : t.createBranchButton}
              </button>
              <button
                type="button"
                onClick={() => {
                  setAdding(false);
                  setError(null);
                }}
                className="px-4 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-sm font-bold transition"
              >
                ✕
              </button>
            </div>
          </form>
        )}

        {branches.length === 0 ? (
          <div className="bg-white rounded-2xl border border-dashed border-slate-300 p-10 text-center">
            <Store className="w-8 h-8 text-slate-300 mx-auto mb-3" />
            <p className="text-sm font-semibold text-slate-500">
              {can("branch.create") ? t.noBranchesYet : t.noBranchAssigned}
            </p>
          </div>
        ) : (
          <div className="grid gap-3 sm:grid-cols-2">
            {branches.map((b) => {
              const s = stats[b.id] || { total: 0, expiringSoon: 0 };
              return (
                <button
                  key={b.id}
                  type="button"
                  onClick={() => onPick(b.id)}
                  className="group bg-white rounded-2xl border border-slate-200 hover:border-blue-400 hover:shadow-md p-5 text-start transition flex items-center gap-4"
                >
                  <div className="w-11 h-11 rounded-xl bg-blue-50 group-hover:bg-blue-100 flex items-center justify-center shrink-0 transition">
                    <Store className="w-5 h-5 text-blue-600" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="font-bold text-slate-900 truncate">{b.name.split(" / ")[0]}</p>
                    <p className="text-xs text-slate-500 mt-0.5">
                      {s.total} {t.productCount}
                      {s.expiringSoon > 0 && (
                        <span className="text-amber-600 font-bold">
                          {" · "}
                          {s.expiringSoon} {t.expiringSoon}
                        </span>
                      )}
                    </p>
                  </div>
                  <Chevron className="w-5 h-5 text-slate-300 group-hover:text-blue-500 shrink-0 transition" />
                </button>
              );
            })}
          </div>
        )}
      </main>
    </div>
  );
}
