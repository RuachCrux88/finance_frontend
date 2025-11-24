"use client";

import { useEffect, useState } from "react";
import GoogleLoginButton from "@/components/GoogleLoginButton";
import { fetchMe } from "@/utils/session";
import type { User } from "@/types";
import { useLanguage } from "@/contexts/LanguageContext";

export default function Home() {
  const { t } = useLanguage();
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchMe()
      .then((u) => setUser(u))
      .catch(() => setUser(null))
      .finally(() => setLoading(false));
  }, []);

  const getGreeting = () => {
    if (!user) return null;
    
    return t("home.greeting", { name: user.name || user.email });
  };

  const getWelcomeMessage = () => {
    if (!user) return null;
    return t("home.welcomeBack");
  };

  if (loading) {
      return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <p className="text-white/80 text-sm">{t("common.loading")}</p>
        </div>
      );
    }

  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] space-y-8 w-full">
      {user ? (
        <>
          {/* Saludo de bienvenida/regreso */}
          <div className="text-center space-y-4">
            <h1 className="font-display text-3xl sm:text-4xl lg:text-5xl font-semibold text-white px-4">
              {getGreeting()}
            </h1>
            <p className="text-lg sm:text-xl text-white/80 px-4">
              {getWelcomeMessage()}
            </p>
      </div>

          {/* Información sobre funcionalidades */}
          <div className="w-full max-w-4xl mt-8 px-4">
            <h2 className="text-xl sm:text-2xl font-semibold text-white mb-6 text-center font-financial-bold">
              {t("home.whatCanYouDo")}
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        <div className="card-glass p-5">
                <h3 className="font-semibold text-white mb-2 font-financial-bold">{t("home.features.wallets.title")}</h3>
                <p className="text-sm text-white/80 font-financial">
                  {t("home.features.wallets.description")}
                </p>
              </div>
              <div className="card-glass p-5">
                <h3 className="font-semibold text-white mb-2 font-financial-bold">{t("home.features.dashboard.title")}</h3>
                <p className="text-sm text-white/80 font-financial">
                  {t("home.features.dashboard.description")}
                </p>
              </div>
              <div className="card-glass p-5">
                <h3 className="font-semibold text-white mb-2 font-financial-bold">{t("home.features.transactions.title")}</h3>
                <p className="text-sm text-white/80 font-financial">
                  {t("home.features.transactions.description")}
                </p>
              </div>
              <div className="card-glass p-5">
                <h3 className="font-semibold text-white mb-2 font-financial-bold">{t("home.features.goals.title")}</h3>
                <p className="text-sm text-white/80 font-financial">
                  {t("home.features.goals.description")}
                </p>
              </div>
      <div className="card-glass p-5">
                <h3 className="font-semibold text-white mb-2 font-financial-bold">{t("home.features.reminders.title")}</h3>
                <p className="text-sm text-white/80 font-financial">
                  {t("home.features.reminders.description")}
                </p>
                        </div>
              <div className="card-glass p-5">
                <h3 className="font-semibold text-white mb-2 font-financial-bold">{t("home.features.currencies.title")}</h3>
                <p className="text-sm text-white/80 font-financial">
                  {t("home.features.currencies.description")}
                </p>
                  </div>
                </div>
          </div>
        </>
      ) : (
        <>
          {/* Mensaje de bienvenida para usuarios no autenticados */}
          <div className="text-center space-y-4">
            <h1 className="font-display text-4xl sm:text-5xl font-semibold text-white mb-2">
              {t("home.welcomeTitle")}
            </h1>
            <p className="text-lg text-white/80 mb-2 font-financial">
              {t("home.welcomeSubtitle")}
            </p>
            <p className="text-sm text-white/80 mb-6 font-financial">
              {t("home.welcomeDescription")}
            </p>
      </div>

          {/* Formulario de login */}
          <div className="card-glass p-8 w-full max-w-md">
            <h2 className="text-2xl font-semibold text-white mb-4 text-center">
              {t("home.loginTitle")}
            </h2>
            <p className="text-white/80 mb-6 text-center font-financial">
              {t("home.loginDescription")}
            </p>
            <div className="flex justify-center">
              <GoogleLoginButton />
            </div>
          </div>

          {/* Información sobre funcionalidades */}
          <div className="w-full max-w-5xl mt-12">
            <h2 className="text-3xl font-semibold text-white mb-8 text-center">
              {t("home.whatCanYouDo")}
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              <div className="card-glass p-6">
                <h3 className="font-semibold text-white mb-3 text-center">{t("home.features.wallets.title")}</h3>
                <p className="text-sm text-white/80 text-center">
                  {t("home.features.wallets.description")}
                </p>
              </div>
              <div className="card-glass p-6">
                <h3 className="font-semibold text-white mb-3 text-center">{t("home.features.dashboard.title")}</h3>
                <p className="text-sm text-white/80 text-center">
                  {t("home.features.dashboard.description")}
                </p>
              </div>
              <div className="card-glass p-6">
                <h3 className="font-semibold text-white mb-3 text-center">{t("home.features.transactions.title")}</h3>
                <p className="text-sm text-white/80 text-center">
                  {t("home.features.transactions.description")}
                </p>
              </div>
              <div className="card-glass p-6">
                <h3 className="font-semibold text-white mb-3 text-center">{t("home.features.goals.title")}</h3>
                <p className="text-sm text-white/80 text-center">
                  {t("home.features.goals.description")}
                </p>
              </div>
              <div className="card-glass p-6">
                <h3 className="font-semibold text-white mb-3 text-center">{t("home.features.reminders.title")}</h3>
                <p className="text-sm text-white/80 text-center">
                  {t("home.features.reminders.description")}
                </p>
              </div>
              <div className="card-glass p-6">
                <h3 className="font-semibold text-white mb-3 text-center">{t("home.features.currencies.title")}</h3>
                <p className="text-sm text-white/80 text-center">
                  {t("home.features.currencies.description")}
                </p>
              </div>
            </div>
            
            {/* Sección adicional de beneficios */}
            <div className="mt-12 card-glass p-8">
              <h3 className="text-2xl font-semibold text-white mb-4 text-center">
                Características principales
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm text-white/80">
                <div className="flex items-start gap-3">
                  <span className="text-white font-semibold">✓</span>
                  <span>Interfaz intuitiva y fácil de usar</span>
                </div>
                <div className="flex items-start gap-3">
                  <span className="text-white font-semibold">✓</span>
                  <span>Análisis visual con gráficos y estadísticas</span>
          </div>
                <div className="flex items-start gap-3">
                  <span className="text-white font-semibold">✓</span>
                  <span>Seguridad con autenticación de Google</span>
        </div>
                <div className="flex items-start gap-3">
                  <span className="text-white font-semibold">✓</span>
                  <span>Acceso desde cualquier dispositivo</span>
              </div>
                <div className="flex items-start gap-3">
                  <span className="text-white font-semibold">✓</span>
                  <span>Historial completo de transacciones</span>
              </div>
                <div className="flex items-start gap-3">
                  <span className="text-white font-semibold">✓</span>
                  <span>Gestión de categorías personalizadas</span>
              </div>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
