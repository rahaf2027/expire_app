import { useEffect, useState, type FormEvent, type MouseEvent } from "react";
import {
  Store,
  Plus,
  Loader2,
  AlertCircle,
  Users,
  LogOut,
  ChevronLeft,
  ChevronRight,
  Pencil,
  Trash2,
  RotateCcw,
  Trash,
  Check,
  X,
  AlertTriangle,
} from "lucide-react";
import { useAuth } from "../auth/AuthContext";
import { getAuthLocale } from "../auth/authLocale";
import {
  createBranch,
  updateBranch,
  deleteBranch,
  restoreBranch,
  fetchAllBranches,
  fetchBranchStats,
  type BranchStats,
} from "../lib/admin";
import type { BranchRecord, Role } from "../auth/types";

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
  activeBranchId,
  onBackToActiveBranch,
}: {
  locale: string;
  onPick: (branchId: string) => void;
  onManageUsers: () => void;
  activeBranchId?: string | null;
  onBackToActiveBranch?: () => void;
}) {
  const t = getAuthLocale(locale);
  const rtl = locale === "ar";
  const { profile, branches, reloadBranches, signOut, can } = useAuth();

  const [allBranches, setAllBranches] = useState<BranchRecord[]>([]);
  const [stats, setStats] = useState<Record<string, BranchStats>>({});
  const [tab, setTab] = useState<"active" | "trash">("active");

  const [adding, setAdding] = useState(false);
  const [name, setName] = useState("");
  const [id, setId] = useState("");
  const [idTouched, setIdTouched] = useState(false);

  const [editingBranchId, setEditingBranchId] = useState<string | null>(null);
  const [editingName, setEditingName] = useState("");

  const [undoToast, setUndoToast] = useState<{ branchId: string; branchName: string } | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadAll = async () => {
    try {
      setAllBranches(await fetchAllBranches());
    } catch {
      setAllBranches(branches);
    }
  };

  useEffect(() => {
    void loadAll();
    fetchBranchStats().then(setStats);
  }, [branches.length]);

  const activeBranches = allBranches.filter((b) => b.isActive);
  const trashBranches = allBranches.filter((b) => !b.isActive);

  const activeBranchObj = branches.find((b) => b.id === activeBranchId);

  const handleCreate = async (e: FormEvent) => {
    e.preventDefault();
    if (busy) return;
    setError(null);
    setBusy(true);
    try {
      const branchId = slugify(idTouched ? id : name);
      const created = await createBranch(branchId, name.trim());
      await reloadBranches();
      await loadAll();
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

  const handleUpdate = async (bId: string) => {
    if (!editingName.trim() || busy) return;
    setError(null);
    setBusy(true);
    try {
      await updateBranch(bId, editingName.trim());
      await reloadBranches();
      await loadAll();
      setEditingBranchId(null);
    } catch (err: any) {
      setError(err?.message || null);
    } finally {
      setBusy(false);
    }
  };

  const handleSoftDelete = async (b: BranchRecord, e: MouseEvent) => {
    e.stopPropagation();
    setError(null);
    setBusy(true);
    try {
      await deleteBranch(b.id, false);
      await reloadBranches();
      await loadAll();
      setUndoToast({ branchId: b.id, branchName: b.name });
    } catch (err: any) {
      setError(err?.message || null);
    } finally {
      setBusy(false);
    }
  };

  const handleRestore = async (bId: string, e?: MouseEvent) => {
    if (e) e.stopPropagation();
    setError(null);
    setBusy(true);
    try {
      await restoreBranch(bId);
      await reloadBranches();
      await loadAll();
      setUndoToast(null);
    } catch (err: any) {
      setError(err?.message || null);
    } finally {
      setBusy(false);
    }
  };

  const handlePermanentDelete = async (b: BranchRecord, e: MouseEvent) => {
    e.stopPropagation();
    const confirmMsg = locale === "ar"
      ? `⚠️ تحذير نهائي: هل أنت متأكد من حذف الفرع "${b.name}" بشكل كلي ونهائي من قواعد البيانات؟ سيتم حذف جميع منتجاته وسجلاته ولن يمكن استعادتها أبداً.`
      : `⚠️ PERMANENT DELETE: Are you sure you want to completely purge branch "${b.name}" and all its products from database?`;
    if (!window.confirm(confirmMsg)) return;

    setError(null);
    setBusy(true);
    try {
      await deleteBranch(b.id, true);
      await reloadBranches();
      await loadAll();
    } catch (err: any) {
      setError(err?.message || null);
    } finally {
      setBusy(false);
    }
  };

  const Chevron = rtl ? ChevronLeft : ChevronRight;

  return (
    <div className="min-h-screen bg-slate-50 antialiased pb-20" dir={rtl ? "rtl" : "ltr"}>
      <header className="bg-white border-b border-slate-200">
        <div className="max-w-4xl mx-auto px-4 py-4 flex items-center justify-between gap-3">
          <div className="min-w-0 flex items-center gap-3">
            {activeBranchId && onBackToActiveBranch && (
              <button
                type="button"
                onClick={onBackToActiveBranch}
                className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-blue-50 hover:bg-blue-100 text-blue-700 border border-blue-200 text-xs font-bold transition shadow-2xs cursor-pointer shrink-0"
                title={locale === "ar" ? "العودة إلى الفرع النشط" : "Back to active branch"}
              >
                <ChevronLeft className={`w-4 h-4 ${rtl ? "rotate-180" : ""}`} />
                <span>{locale === "ar" ? `العودة لفرع ${activeBranchObj?.name.split(" / ")[0] || activeBranchId}` : `Back to ${activeBranchObj?.name.split(" / ")[0] || activeBranchId}`}</span>
              </button>
            )}
            <div className="min-w-0">
              <h1 className="text-lg font-bold text-slate-900 truncate">
                {profile?.fullName || profile?.email}
              </h1>
              <p className="text-xs font-semibold text-blue-600">
                {profile ? roleLabel(profile.role, locale) : ""}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            {can("user.manage") && (
              <button
                type="button"
                onClick={onManageUsers}
                className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold transition cursor-pointer"
              >
                <Users className="w-4 h-4" />
                <span className="hidden sm:inline">{t.manageUsers}</span>
              </button>
            )}
            <button
              type="button"
              onClick={() => void signOut()}
              className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-slate-100 hover:bg-red-50 hover:text-red-600 text-slate-700 text-xs font-bold transition cursor-pointer"
            >
              <LogOut className="w-4 h-4" />
              <span className="hidden sm:inline">{t.signOut}</span>
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 py-8 space-y-6">
        {/* Navigation & Tabs Header */}
        <div className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-200 pb-4">
          <div>
            <h2 className="text-xl font-bold text-slate-900">{t.chooseBranch}</h2>
            <p className="text-sm text-slate-500 mt-0.5">{t.chooseBranchSubtitle}</p>
          </div>

          <div className="flex items-center gap-3">
            {/* View Tabs */}
            {(can("branch.create") || can("branch.delete")) && (
              <div className="flex items-center bg-slate-200/80 p-1 rounded-xl text-xs font-bold">
                <button
                  onClick={() => setTab("active")}
                  className={`px-3 py-1.5 rounded-lg transition cursor-pointer flex items-center gap-1.5 ${
                    tab === "active" ? "bg-white text-slate-900 shadow-2xs" : "text-slate-600 hover:text-slate-900"
                  }`}
                >
                  <Store className="w-3.5 h-3.5 text-blue-600" />
                  <span>{locale === "ar" ? "الأفرع المفعلة" : "Active Branches"}</span>
                  <span className="ml-1 px-1.5 py-0.2 rounded-full bg-blue-50 text-blue-600 font-black text-[10px]">
                    {activeBranches.length}
                  </span>
                </button>
                <button
                  onClick={() => setTab("trash")}
                  className={`px-3 py-1.5 rounded-lg transition cursor-pointer flex items-center gap-1.5 ${
                    tab === "trash" ? "bg-white text-slate-900 shadow-2xs" : "text-slate-600 hover:text-slate-900"
                  }`}
                >
                  <Trash className="w-3.5 h-3.5 text-slate-500" />
                  <span>{locale === "ar" ? "سلة المحذوفات" : "Trash"}</span>
                  {trashBranches.length > 0 && (
                    <span className="ml-1 px-1.5 py-0.2 rounded-full bg-red-50 text-red-600 font-black text-[10px]">
                      {trashBranches.length}
                    </span>
                  )}
                </button>
              </div>
            )}

            {can("branch.create") && !adding && (
              <button
                type="button"
                onClick={() => setAdding(true)}
                className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold transition shadow-sm shrink-0 cursor-pointer"
              >
                <Plus className="w-4 h-4" />
                {t.addBranch}
              </button>
            )}
          </div>
        </div>

        {error && (
          <div role="alert" className="flex items-start gap-2 rounded-2xl bg-red-50 border border-red-200 p-4">
            <AlertCircle className="w-5 h-5 text-red-600 shrink-0 mt-0.5" />
            <span className="text-sm font-semibold text-red-800 leading-relaxed">{error}</span>
          </div>
        )}

        {/* Add Branch Form */}
        {adding && can("branch.create") && (
          <form
            onSubmit={handleCreate}
            className="bg-white rounded-2xl border border-slate-200 p-5 space-y-3.5 shadow-sm"
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

            <div className="flex gap-2 pt-1">
              <button
                type="submit"
                disabled={busy || !name.trim()}
                className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 disabled:bg-slate-300 text-white text-sm font-bold transition cursor-pointer"
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
                className="px-4 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-sm font-bold transition cursor-pointer"
              >
                ✕
              </button>
            </div>
          </form>
        )}

        {/* Tab 1: Active Branches */}
        {tab === "active" && (
          activeBranches.length === 0 ? (
            <div className="bg-white rounded-2xl border border-dashed border-slate-300 p-10 text-center">
              <Store className="w-8 h-8 text-slate-300 mx-auto mb-3" />
              <p className="text-sm font-semibold text-slate-500">
                {can("branch.create") ? t.noBranchesYet : t.noBranchAssigned}
              </p>
            </div>
          ) : (
            <div className="grid gap-3 sm:grid-cols-2">
              {activeBranches.map((b) => {
                const s = stats[b.id] || { total: 0, expiringSoon: 0 };
                const isEditing = editingBranchId === b.id;

                if (isEditing) {
                  return (
                    <div key={b.id} className="bg-white rounded-2xl border-2 border-blue-500 p-5 shadow-sm space-y-3">
                      <label className="block text-xs font-bold text-slate-500 uppercase">
                        {locale === "ar" ? "تعديل اسم الفرع" : "Edit Branch Name"}
                      </label>
                      <input
                        value={editingName}
                        onChange={(e) => setEditingName(e.target.value)}
                        className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-slate-50 text-sm font-bold outline-none focus:border-blue-500"
                        autoFocus
                      />
                      <div className="flex items-center justify-end gap-2 pt-1">
                        <button
                          type="button"
                          onClick={() => setEditingBranchId(null)}
                          className="px-3 py-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold transition cursor-pointer"
                        >
                          {locale === "ar" ? "إلغاء" : "Cancel"}
                        </button>
                        <button
                          type="button"
                          disabled={busy || !editingName.trim()}
                          onClick={() => handleUpdate(b.id)}
                          className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold transition cursor-pointer shadow-2xs"
                        >
                          <Check className="w-3.5 h-3.5" />
                          <span>{locale === "ar" ? "حفظ" : "Save"}</span>
                        </button>
                      </div>
                    </div>
                  );
                }

                return (
                  <div
                    key={b.id}
                    onClick={() => onPick(b.id)}
                    className="group bg-white rounded-2xl border border-slate-200 hover:border-blue-400 hover:shadow-md p-5 text-start transition flex items-center justify-between gap-3 cursor-pointer"
                  >
                    <div className="flex items-center gap-3.5 min-w-0 flex-1">
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
                    </div>

                    <div className="flex items-center gap-1 shrink-0" onClick={(e) => e.stopPropagation()}>
                      {can("branch.edit") && (
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            setEditingBranchId(b.id);
                            setEditingName(b.name);
                          }}
                          className="p-2 rounded-xl bg-slate-50 hover:bg-blue-50 hover:text-blue-600 text-slate-400 transition cursor-pointer"
                          title={locale === "ar" ? "تعديل اسم الفرع" : "Edit Branch Name"}
                        >
                          <Pencil className="w-4 h-4" />
                        </button>
                      )}
                      {can("branch.delete") && (
                        <button
                          type="button"
                          onClick={(e) => handleSoftDelete(b, e)}
                          className="p-2 rounded-xl bg-slate-50 hover:bg-red-50 hover:text-red-600 text-slate-400 transition cursor-pointer"
                          title={locale === "ar" ? "حذف الفرع (نقل للسلة)" : "Delete Branch"}
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      )}
                      <Chevron className="w-5 h-5 text-slate-300 group-hover:text-blue-500 shrink-0 transition ml-1" />
                    </div>
                  </div>
                );
              })}
            </div>
          )
        )}

        {/* Tab 2: Branch Trash */}
        {tab === "trash" && (
          trashBranches.length === 0 ? (
            <div className="bg-white rounded-2xl border border-dashed border-slate-300 p-10 text-center">
              <Trash className="w-8 h-8 text-slate-300 mx-auto mb-3" />
              <p className="text-sm font-semibold text-slate-500">
                {locale === "ar" ? "سلة المحذوفات فارغة حالياً" : "Branch Trash is empty"}
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              <p className="text-xs font-bold text-slate-500 uppercase">
                {locale === "ar" ? "الأفرع المحذوفة مؤقتاً (يمكن استعادتها أو حذفها نهائياً):" : "Soft-deleted branches:"}
              </p>

              <div className="grid gap-3 sm:grid-cols-2">
                {trashBranches.map((b) => (
                  <div
                    key={b.id}
                    className="bg-red-50/40 rounded-2xl border border-red-100 p-5 flex items-center justify-between gap-3"
                  >
                    <div className="min-w-0 flex-1">
                      <p className="font-bold text-slate-900 truncate">{b.name}</p>
                      <p className="text-xs text-red-600 font-semibold mt-0.5">
                        {locale === "ar" ? "في سلة المحذوفات" : "In Trash"}
                      </p>
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      <button
                        type="button"
                        onClick={() => handleRestore(b.id)}
                        className="flex items-center gap-1 px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold transition cursor-pointer shadow-2xs"
                        title={locale === "ar" ? "استعادة الفرع" : "Restore Branch"}
                      >
                        <RotateCcw className="w-3.5 h-3.5" />
                        <span>{locale === "ar" ? "تراجع / استعادة" : "Restore"}</span>
                      </button>

                      <button
                        type="button"
                        onClick={(e) => handlePermanentDelete(b, e)}
                        className="flex items-center gap-1 px-3 py-1.5 rounded-xl bg-red-600 hover:bg-red-700 text-white text-xs font-bold transition cursor-pointer shadow-2xs"
                        title={locale === "ar" ? "حذف نهائي من قواعد البيانات" : "Permanent Delete"}
                      >
                        <X className="w-3.5 h-3.5" />
                        <span>{locale === "ar" ? "حذف نهائي" : "Delete"}</span>
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )
        )}
      </main>

      {/* Instant Undo Toast Notification Banner */}
      {undoToast && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 animate-in fade-in slide-in-from-bottom-4 duration-200">
          <div className="bg-slate-900 text-white px-5 py-3.5 rounded-2xl shadow-xl border border-slate-800 flex items-center gap-4">
            <div className="flex items-center gap-2 text-xs font-semibold">
              <Trash2 className="w-4 h-4 text-red-400" />
              <span>
                {locale === "ar"
                  ? `تم نقل الفرع "${undoToast.branchName}" إلى سلة المحذوفات.`
                  : `Moved "${undoToast.branchName}" to Trash.`}
              </span>
            </div>

            <button
              onClick={() => handleRestore(undoToast.branchId)}
              className="flex items-center gap-1.5 px-3 py-1 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold transition cursor-pointer shadow-2xs"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>{locale === "ar" ? "تراجع عن الحذف" : "Undo"}</span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
