/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */
import { useEffect, useState, type FormEvent } from "react";
import { ArrowLeft, ArrowRight, UserPlus, Loader2, AlertCircle, CheckCircle2, Users } from "lucide-react";
import { useAuth } from "../auth/AuthContext";
import { getAuthLocale } from "../auth/authLocale";
import { assignableRoles } from "../auth/permissions";
import { createAppUser, fetchManagedUsers, setUserActive } from "../lib/admin";
import type { ManagedUser, Role } from "../auth/types";
import { roleLabel } from "./BranchListPage";

export default function UserManagementPage({
  locale,
  onBack,
}: {
  locale: string;
  onBack: () => void;
}) {
  const t = getAuthLocale(locale);
  const rtl = locale === "ar";
  const { profile, branches } = useAuth();
  const roles = assignableRoles(profile?.role);

  const [users, setUsers] = useState<ManagedUser[]>([]);
  const [loadingUsers, setLoadingUsers] = useState(true);

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [role, setRole] = useState<Role>(roles[roles.length - 1] || "employee");
  const [branchId, setBranchId] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const needsBranch = role === "chef" || role === "employee";

  const reload = async () => {
    setLoadingUsers(true);
    try {
      setUsers(await fetchManagedUsers());
    } catch (err: any) {
      setError(err?.message || null);
    } finally {
      setLoadingUsers(false);
    }
  };

  useEffect(() => {
    void reload();
  }, []);

  useEffect(() => {
    if (!branchId && branches.length > 0) setBranchId(branches[0].id);
  }, [branches, branchId]);

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    if (busy) return;
    setError(null);
    setSuccess(false);
    setBusy(true);
    try {
      await createAppUser({
        email,
        password,
        fullName,
        role,
        branchIds: needsBranch && branchId ? [branchId] : [],
      });
      setEmail("");
      setPassword("");
      setFullName("");
      setSuccess(true);
      await reload();
    } catch (err: any) {
      setError(err?.message || t.genericSignInError);
    } finally {
      setBusy(false);
    }
  };

  const toggleActive = async (u: ManagedUser) => {
    setError(null);
    try {
      await setUserActive(u.id, !u.isActive);
      await reload();
    } catch (err: any) {
      setError(err?.message || null);
    }
  };

  const Back = rtl ? ArrowRight : ArrowLeft;
  const field =
    "w-full px-3.5 py-2.5 rounded-xl border border-slate-200 bg-slate-50 text-sm outline-none focus:border-blue-500 focus:bg-white focus:ring-2 focus:ring-blue-500/15 transition";

  return (
    <div className="min-h-screen bg-slate-50 antialiased" dir={rtl ? "rtl" : "ltr"}>
      <header className="bg-white border-b border-slate-200">
        <div className="max-w-3xl mx-auto px-4 py-4 flex items-center gap-3">
          <button
            type="button"
            onClick={onBack}
            className="w-9 h-9 rounded-xl bg-slate-100 hover:bg-slate-200 flex items-center justify-center transition shrink-0"
            aria-label={t.backToBranches}
          >
            <Back className="w-4 h-4 text-slate-600" />
          </button>
          <div className="min-w-0">
            <h1 className="text-lg font-bold text-slate-900">{t.manageUsers}</h1>
            <p className="text-xs text-slate-500">{t.manageUsersSubtitle}</p>
          </div>
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-4 py-8 space-y-6">
        <form onSubmit={submit} className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm space-y-3.5">
          <h2 className="flex items-center gap-2 text-sm font-bold text-slate-900">
            <UserPlus className="w-4 h-4 text-blue-600" />
            {t.addUser}
          </h2>

          <div className="grid sm:grid-cols-2 gap-3.5">
            <div>
              <label htmlFor="u-name" className="block text-xs font-bold text-slate-500 uppercase mb-1.5">
                {t.fullNameLabel}
              </label>
              <input id="u-name" required value={fullName} onChange={(e) => setFullName(e.target.value)} className={field} />
            </div>
            <div>
              <label htmlFor="u-email" className="block text-xs font-bold text-slate-500 uppercase mb-1.5">
                {t.emailLabel}
              </label>
              <input id="u-email" type="email" dir="ltr" required value={email} onChange={(e) => setEmail(e.target.value)} className={field} />
            </div>
            <div>
              <label htmlFor="u-pass" className="block text-xs font-bold text-slate-500 uppercase mb-1.5">
                {t.passwordLabel}
              </label>
              <input
                id="u-pass"
                type="text"
                dir="ltr"
                required
                minLength={8}
                autoComplete="new-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className={`${field} font-mono`}
              />
              <p className="text-[11px] text-slate-400 mt-1">{t.passwordHint}</p>
            </div>
            <div>
              <label htmlFor="u-role" className="block text-xs font-bold text-slate-500 uppercase mb-1.5">
                {t.roleLabel}
              </label>
              <select id="u-role" value={role} onChange={(e) => setRole(e.target.value as Role)} className={field}>
                {roles.map((r) => (
                  <option key={r} value={r}>
                    {roleLabel(r, locale)}
                  </option>
                ))}
              </select>
            </div>
            {needsBranch && (
              <div className="sm:col-span-2">
                <label htmlFor="u-branch" className="block text-xs font-bold text-slate-500 uppercase mb-1.5">
                  {t.branchAssignLabel}
                </label>
                <select id="u-branch" required value={branchId} onChange={(e) => setBranchId(e.target.value)} className={field}>
                  {branches.map((b) => (
                    <option key={b.id} value={b.id}>
                      {b.name.split(" / ")[0]}
                    </option>
                  ))}
                </select>
              </div>
            )}
          </div>

          {error && (
            <div role="alert" className="flex items-start gap-2 rounded-xl bg-red-50 border border-red-100 px-3 py-2.5">
              <AlertCircle className="w-4 h-4 text-red-600 shrink-0 mt-0.5" />
              <span className="text-xs font-semibold text-red-700 leading-relaxed">{error}</span>
            </div>
          )}
          {success && (
            <div className="flex items-center gap-2 rounded-xl bg-emerald-50 border border-emerald-100 px-3 py-2.5">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
              <span className="text-xs font-semibold text-emerald-700">{t.userCreated}</span>
            </div>
          )}

          <button
            type="submit"
            disabled={busy}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 disabled:bg-slate-300 text-white text-sm font-bold transition"
          >
            {busy && <Loader2 className="w-4 h-4 animate-spin" />}
            {t.createUserButton}
          </button>
        </form>

        <section className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
          <h2 className="flex items-center gap-2 text-sm font-bold text-slate-900 px-5 py-4 border-b border-slate-100">
            <Users className="w-4 h-4 text-slate-400" />
            {t.existingUsers}
          </h2>

          {loadingUsers ? (
            <div className="p-8 flex justify-center">
              <Loader2 className="w-5 h-5 animate-spin text-slate-300" />
            </div>
          ) : users.length === 0 ? (
            <p className="p-8 text-center text-sm text-slate-400">{t.noUsersYet}</p>
          ) : (
            <ul className="divide-y divide-slate-100">
              {users.map((u) => (
                <li key={u.id} className="px-5 py-3.5 flex items-center gap-3">
                  <div className="min-w-0 flex-1">
                    <p className="font-semibold text-sm text-slate-900 truncate">
                      {u.fullName || u.email}
                    </p>
                    <p className="text-xs text-slate-500 truncate" dir="ltr">
                      {u.email}
                    </p>
                    <p className="text-[11px] font-bold text-blue-600 mt-0.5">
                      {roleLabel(u.role, locale)}
                      {u.branchIds.length > 0 && (
                        <span className="text-slate-400 font-semibold"> · {u.branchIds.join(", ")}</span>
                      )}
                    </p>
                  </div>

                  <span
                    className={`px-2 py-0.5 rounded-full text-[11px] font-bold shrink-0 ${
                      u.isActive ? "bg-emerald-50 text-emerald-700" : "bg-slate-100 text-slate-500"
                    }`}
                  >
                    {u.isActive ? t.statusActive : t.statusInactive}
                  </span>

                  {u.id !== profile?.id && (
                    <button
                      type="button"
                      onClick={() => void toggleActive(u)}
                      className="px-2.5 py-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-600 text-[11px] font-bold transition shrink-0"
                    >
                      {u.isActive ? t.deactivate : t.activate}
                    </button>
                  )}
                </li>
              ))}
            </ul>
          )}
        </section>
      </main>
    </div>
  );
}
