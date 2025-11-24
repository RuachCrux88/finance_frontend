// src/components/Navbar.tsx
"use client";

import Link from "next/link";
import Image from "next/image";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import GoogleLoginButton from "@/components/GoogleLoginButton";
import { fetchMe, doLogout } from "@/utils/session";
import { useLanguage } from "@/contexts/LanguageContext";
import { api } from "@/lib/api";

export default function Navbar() {
  const pathname = usePathname();
  const router = useRouter();
  const { t } = useLanguage();
  const [me, setMe] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [streak, setStreak] = useState<{
    currentStreak: number;
    status: 'active' | 'danger' | 'lost' | 'none';
    longestStreak: number;
    longestStreakPeriod: { start: string; end: string } | null;
    lastActivityDate: string | null;
  } | null>(null);

  const links = [
    { href: "/", label: t("navbar.home") },
    { href: "/dashboard", label: t("navbar.dashboard") },
    { href: "/wallets", label: t("navbar.wallets") },
    { href: "/transactions", label: t("navbar.transactions") },
    { href: "/categories", label: t("navbar.categories") },
  ];

  useEffect(() => {
    fetchMe()
      .then((u) => {
        setMe(u);
        // Cargar racha si el usuario está autenticado
        if (u) {
          api('/transactions/streak')
            .then((data) => setStreak(data))
            .catch(() => setStreak(null));
        }
      })
      .catch(() => {
        setMe(null);
        setStreak(null);
      })
      .finally(() => setLoading(false));
  }, []);

  // Recargar racha cuando cambia la ruta (para actualizar después de crear transacciones)
  useEffect(() => {
    if (me) {
      api('/transactions/streak')
        .then((data) => setStreak(data))
        .catch(() => setStreak(null));
    }
  }, [pathname, me]);

  useEffect(() => {
    // Cerrar menú móvil al cambiar de ruta
    setMobileMenuOpen(false);
  }, [pathname]);

  const logout = async () => {
    await doLogout().catch(() => {});
    setMe(null);
    router.refresh();
  };

  return (
    <>
      {/* Botón hamburguesa para móvil */}
      <button
        onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
        className="fixed top-4 left-4 z-[60] lg:hidden p-3 rounded-lg bg-white/10 backdrop-blur-sm shadow-lg border border-white/20 text-white font-semibold"
        aria-label="Toggle menu"
      >
        {mobileMenuOpen ? "✕" : "☰"}
      </button>

      {/* Overlay para móvil */}
      {mobileMenuOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-[55] lg:hidden"
          onClick={() => setMobileMenuOpen(false)}
        />
      )}

      {/* Navbar */}
      <aside
        className={`fixed left-0 top-0 h-screen w-64 z-50 transform transition-transform duration-300 ease-in-out ${
          mobileMenuOpen ? "translate-x-0" : "-translate-x-full"
        } lg:translate-x-0`}
      >
        <nav className="h-full card-glass rounded-none rounded-r-2xl flex flex-col p-6 border-r border-white/10">
        {/* Logo y marca */}
        <Link href="/" className="flex items-center gap-3 mb-12 px-2">
          <div className="relative h-8 w-8 flex-shrink-0">
            <Image
              src="/coin-f.svg"
              alt="Finance Logo"
              fill
              className="object-contain filter brightness-0 invert"
              priority
            />
          </div>
          <span className="font-display text-xl font-semibold tracking-wide text-white uppercase">
            Finance
          </span>
        </Link>

        {/* Links de navegación */}
        <ul className="flex-1 space-y-2">
          {links.map((l) => {
            const active = pathname === l.href;
            return (
              <li key={l.href}>
                <Link
                  href={l.href}
                  className={`flex items-center gap-3 rounded-lg px-4 py-3 transition-all duration-200 uppercase text-sm font-medium ${
                    active
                      ? "bg-white/20 text-white backdrop-blur-sm"
                      : "text-white/70 hover:text-white hover:bg-white/10"
                  }`}
                >
                  <span>{l.label.toUpperCase()}</span>
                </Link>
              </li>
            );
          })}
          <li className="mt-2">
            <a
              href="https://drive.google.com/drive/folders/1fYgAQwcilhWWhJ4wDVInSbErAiw-H5Q9?usp=drive_link"
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-3 rounded-xl px-4 py-3 text-white/70 hover:text-white hover:bg-white/10 transition-all duration-200"
            >
              <span className="text-sm">{t("navbar.mobile")}</span>
            </a>
          </li>
        </ul>

        {/* Sección de usuario */}
        <div className="border-t border-white/20 pt-4 mt-4">
          {loading ? (
            <div className="px-4 py-2">
              <div className="h-4 bg-white/20 rounded animate-pulse" />
            </div>
          ) : me ? (
            <>
              <div className="px-4 py-2 mb-3">
                <p className="text-white text-sm font-financial">
                  {t("home.greeting", { name: me.name || me.email })}
                </p>
                {me.userCode && (
                  <div className="mt-2 px-3 py-1.5 rounded-lg bg-white/10 border border-white/20 backdrop-blur-sm">
                    <p className="text-xs text-white/70 font-medium mb-0.5 uppercase">Tu ID:</p>
                    <p className="text-sm font-mono font-bold text-white">{me.userCode}</p>
                  </div>
                )}
              </div>
              
              {/* Tarjeta de racha */}
              {streak && (
                <div className="px-4 py-3 mb-3 rounded-xl bg-white/10 backdrop-blur-sm border border-white/20 transition-all">
                  <div className="mb-2">
                    <span className="text-xs font-semibold text-white uppercase">
                      {streak.status === 'active' 
                        ? 'RACHA ACTIVA'
                        : streak.status === 'danger'
                        ? 'RACHA EN PELIGRO'
                        : streak.status === 'lost'
                        ? 'RACHA PERDIDA'
                        : 'SIN RACHA'}
                    </span>
                  </div>
                  <div className="space-y-1">
                    <div className="flex items-baseline gap-2">
                      <span className={`text-2xl font-bold ${
                        streak.status === 'active'
                          ? 'text-cyan-300'
                          : streak.status === 'danger'
                          ? 'text-blue-300'
                          : 'text-gray-300'
                      }`}>
                        {streak.currentStreak}
                      </span>
                      <span className="text-xs text-white/80">
                        {streak.currentStreak === 1 ? 'día' : 'días'} consecutivos
                      </span>
                    </div>
                    {streak.longestStreak > 0 && streak.longestStreakPeriod && (
                      <div className="text-xs text-white/70 pt-1 border-t border-white/20">
                        <p className="font-medium">Récord: {streak.longestStreak} días</p>
                        <p className="text-xs opacity-75">
                          {new Date(streak.longestStreakPeriod.start).toLocaleDateString('es-CO', { 
                            day: 'numeric', 
                            month: 'short' 
                          })} - {new Date(streak.longestStreakPeriod.end).toLocaleDateString('es-CO', { 
                            day: 'numeric', 
                            month: 'short',
                            year: 'numeric'
                          })}
                        </p>
                      </div>
                    )}
                    {streak.status === 'danger' && (
                      <p className="text-xs text-blue-300 font-medium mt-1">
                        Llena información hoy para mantener tu racha
                      </p>
                    )}
                    {streak.status === 'lost' && (
                      <p className="text-xs text-gray-300 font-medium mt-1">
                        Tu racha se perdió. ¡Empieza una nueva!
                      </p>
                    )}
                  </div>
                </div>
              )}

              <div className="space-y-2">
                <Link
                  href="/settings"
                  className="flex items-center gap-3 rounded-lg px-4 py-2.5 text-white/70 hover:text-white hover:bg-white/10 transition-all duration-200 uppercase text-xs font-medium"
                >
                  <span>{t("navbar.settings").toUpperCase()}</span>
                </Link>
                <button
                  onClick={logout}
                  className="w-full flex items-center gap-3 rounded-lg px-4 py-2.5 bg-white text-black hover:bg-white/90 transition-all duration-200 font-semibold shadow-md"
                >
                  <span className="text-sm uppercase">{t("navbar.logout")}</span>
                </button>
              </div>
            </>
          ) : (
            <div className="px-2">
              <GoogleLoginButton />
            </div>
          )}
        </div>
      </nav>
    </aside>
    </>
  );
}
