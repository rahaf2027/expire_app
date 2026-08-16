/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */
import { useState, type FormEvent } from "react";
import { LogIn, Loader2, AlertCircle, ShieldCheck } from "lucide-react";
import { useAuth } from "../auth/AuthContext";
import { getAuthLocale } from "../auth/authLocale";

const LOCALES = [
  { code: "ar", label: "العربية" },
  { code: "de", label: "Deutsch" },
  { code: "en", label: "English" },
  { code: "tr", label: "Türkçe" },
];

export default function LoginPage({
  locale,
  onLocaleChange,
}: {
  locale: string;
  onLocaleChange: (l: string) => void;
}) {
  const t = getAuthLocale(locale);
  const { signIn } = useAuth();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    if (busy) return;
    setError(null);
    setBusy(true);
    try {
      await signIn(email, password);
      // On success the auth listener swaps this page out; nothing to do here.
    } catch (err: any) {
      const msg = String(err?.message || "").toLowerCase();
      setError(
        msg.includes("invalid") || msg.includes("credentials")
          ? t.invalidCredentials
          : t.genericSignInError
      );
      setBusy(false);
    }
  };

  return (
    <div
      className="min-h-screen flex items-center justify-center bg-slate-50 px-4 py-10 antialiased"
      dir={locale === "ar" ? "rtl" : "ltr"}
    >
      <div className="w-full max-w-sm">
        <div className="flex flex-col items-center mb-8">
          <div className="w-14 h-14 rounded-2xl bg-blue-600 flex items-center justify-center shadow-lg shadow-blue-600/20 mb-4">
            <ShieldCheck className="w-7 h-7 text-white" strokeWidth={2.2} />
          </div>
          <h1 className="text-2xl font-bold text-slate-900">{t.signInTitle}</h1>
          <p className="text-sm text-slate-500 mt-1">{t.signInSubtitle}</p>
        </div>

        <form
          onSubmit={submit}
          className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 space-y-4"
        >
          <div>
            <label
              htmlFor="login-email"
              className="block text-xs font-bold text-slate-500 uppercase mb-1.5"
            >
              {t.emailLabel}
            </label>
            <input
              id="login-email"
              type="email"
              dir="ltr"
              autoComplete="username"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 bg-slate-50 text-slate-900 text-sm outline-none focus:border-blue-500 focus:bg-white focus:ring-2 focus:ring-blue-500/15 transition"
            />
          </div>

          <div>
            <label
              htmlFor="login-password"
              className="block text-xs font-bold text-slate-500 uppercase mb-1.5"
            >
              {t.passwordLabel}
            </label>
            <input
              id="login-password"
              type="password"
              dir="ltr"
              autoComplete="current-password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 bg-slate-50 text-slate-900 text-sm outline-none focus:border-blue-500 focus:bg-white focus:ring-2 focus:ring-blue-500/15 transition"
            />
          </div>

          {error && (
            <div
              role="alert"
              className="flex items-start gap-2 rounded-xl bg-red-50 border border-red-100 px-3 py-2.5"
            >
              <AlertCircle className="w-4 h-4 text-red-600 shrink-0 mt-0.5" />
              <span className="text-xs font-semibold text-red-700 leading-relaxed">{error}</span>
            </div>
          )}

          <button
            type="submit"
            disabled={busy}
            className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 disabled:bg-slate-300 text-white text-sm font-bold transition shadow-sm"
          >
            {busy ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                {t.signingIn}
              </>
            ) : (
              <>
                <LogIn className="w-4 h-4" />
                {t.signInButton}
              </>
            )}
          </button>
        </form>

        <div className="flex items-center justify-center gap-1 mt-6">
          {LOCALES.map((l) => (
            <button
              key={l.code}
              type="button"
              onClick={() => onLocaleChange(l.code)}
              className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition ${
                locale === l.code
                  ? "bg-slate-900 text-white"
                  : "text-slate-500 hover:bg-slate-200"
              }`}
            >
              {l.label}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
