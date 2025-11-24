"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { api } from "@/lib/api";
import { fetchMe, doLogout } from "@/utils/session";
import type { User } from "@/types";
import { useLanguage } from "@/contexts/LanguageContext";
import { Globe } from "phosphor-react";

// Generar cadena aleatoria de letras (mayúsculas y minúsculas, sin tildes)
function generateRandomString(length: number = 8): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz';
  let result = '';
  for (let i = 0; i < length; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
}

export default function SettingsPage() {
  const router = useRouter();
  const { language, setLanguage, t } = useLanguage();
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [deleteConfirm, setDeleteConfirm] = useState(false);
  const [deleteConfirmText, setDeleteConfirmText] = useState("");
  const [deleteConfirmCode, setDeleteConfirmCode] = useState("");
  const [deleting, setDeleting] = useState(false);

  // Generar código de confirmación cuando se monta el componente
  useEffect(() => {
    setDeleteConfirmCode(generateRandomString(8));
  }, []);

  useEffect(() => {
    (async () => {
      try {
        const me = await fetchMe();
        setUser(me);
      } catch (e: any) {
        setError(e.message || t("settings.errorLoadingUser"));
      } finally {
        setLoading(false);
      }
    })();
  }, [t]);

  async function handleDeleteAccount() {
    setError("");
    
    if (!deleteConfirm) {
      setError(t("settings.errorDeleteCheckbox"));
      return;
    }

    if (deleteConfirmText.trim() !== deleteConfirmCode) {
      setError(t("settings.errorDeleteCode", { code: deleteConfirmCode }));
      return;
    }

    if (!confirm(t("settings.deleteAccountTitle"))) {
      return;
    }

    setDeleting(true);
    setError("");
    try {
      await api("/users/me", {
        method: "DELETE",
      });
      await doLogout();
      router.push("/login");
    } catch (e: any) {
      setError(e.message || t("settings.errorDeletingAccount"));
      setDeleting(false);
    }
  }

  if (loading) {
    return (
      <div className="card-glass p-6 text-center">
        <p className="text-warm">{t("common.loading")}</p>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="card-glass p-6 text-center">
        <p className="text-blue-300">{error || t("settings.errorUserNotFound")}</p>
      </div>
    );
  }

  return (
    <div>
        <div className="space-y-6">
          {/* Encabezado */}
          <div className="card-glass p-6">
            <h1 className="text-2xl font-semibold text-warm-dark mb-2">{t("settings.title")}</h1>
            <p className="text-warm text-sm">{t("settings.subtitle")}</p>
          </div>

          {/* Información del usuario */}
          <div className="card-glass p-6">
            <h2 className="text-lg font-semibold text-warm-dark mb-4">{t("settings.personalInfo")}</h2>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-warm-dark mb-1.5">{t("settings.name")}</label>
                <div className="rounded-lg border border-white/20 bg-white/10 px-3 py-2 text-sm text-white cursor-default">
                  {user.name || t("settings.notSpecified")}
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-warm-dark mb-1.5">{t("settings.email")}</label>
                <div className="rounded-lg border border-white/20 bg-white/10 px-3 py-2 text-sm text-white cursor-default">
                  {user.email}
                </div>
              </div>
              {user.createdAt && (
                <div>
                  <label className="block text-sm font-medium text-warm-dark mb-1.5">{t("settings.registrationDate")}</label>
                  <div className="rounded-lg border border-white/20 bg-white/10 px-3 py-2 text-sm text-white cursor-default">
                    {new Date(user.createdAt).toLocaleDateString(language === "es" ? "es-CO" : "en-US", {
                      year: 'numeric',
                      month: 'long',
                      day: 'numeric'
                    })}
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Configuración de idioma */}
          <div className="card-glass p-6">
            <h2 className="text-lg font-semibold text-warm-dark mb-4">{t("settings.language")}</h2>
            <p className="text-warm text-sm mb-4">{t("settings.languageDescription")}</p>
            <div className="flex gap-3">
              <button
                onClick={() => setLanguage("es")}
                className={`flex items-center gap-2 px-4 py-2 rounded-lg border transition ${
                  language === "es"
                    ? "btn-orange text-white border-transparent"
                    : "border-white/20 text-white hover:bg-white/10"
                }`}
              >
                <Globe size={20} weight={language === "es" ? "fill" : "regular"} />
                <span className="font-medium">Español</span>
              </button>
              <button
                onClick={() => setLanguage("en")}
                className={`flex items-center gap-2 px-4 py-2 rounded-lg border transition ${
                  language === "en"
                    ? "btn-orange text-white border-transparent"
                    : "border-white/20 text-white hover:bg-white/10"
                }`}
              >
                <Globe size={20} weight={language === "en" ? "fill" : "regular"} />
                <span className="font-medium">English</span>
              </button>
            </div>
          </div>

          {/* Zona de peligro - Eliminar cuenta */}
          <div className="card-glass p-6 border-2 border-blue-200">
            <h2 className="text-lg font-semibold text-blue-300 mb-2">{t("settings.dangerZone")}</h2>
            <p className="text-warm text-sm mb-4">
              {t("settings.dangerZoneDescription")}
            </p>
            
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="deleteConfirm"
                  checked={deleteConfirm}
                  onChange={(e) => setDeleteConfirm(e.target.checked)}
                  className="w-4 h-4 rounded border-white/20 text-blue-500 focus:ring-blue-500"
                />
                <label htmlFor="deleteConfirm" className="text-sm text-warm-dark">
                  {t("settings.deleteAccountConfirm")}
                </label>
              </div>
              
              {deleteConfirm && (
                <div>
                  <label className="block text-sm font-medium text-warm-dark mb-1.5">
                    {t("settings.deleteAccountCode", { code: deleteConfirmCode })}
                  </label>
                  <input
                    type="text"
                    value={deleteConfirmText}
                    onChange={(e) => setDeleteConfirmText(e.target.value)}
                    placeholder={deleteConfirmCode}
                    className="w-full rounded-lg border border-white/20 bg-white/10 px-3 py-2 text-sm text-white placeholder:text-white/50 focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-500/50"
                  />
                </div>
              )}

              {error && (
                <p className="text-xs text-blue-300 font-medium">{error}</p>
              )}

              <button
                onClick={handleDeleteAccount}
                disabled={!deleteConfirm || deleteConfirmText.trim() !== deleteConfirmCode || deleting}
                className="w-full rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition"
              >
                {deleting ? t("settings.deleting") : t("settings.deleteAccountButton")}
              </button>
            </div>
          </div>
        </div>
    </div>
  );
}

